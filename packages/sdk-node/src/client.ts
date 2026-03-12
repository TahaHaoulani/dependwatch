import type { ApiCallEvent, DependWatchConfig } from './types';

const DEFAULT_BASE = 'https://app.dependwatch.app';
const DEFAULT_FLUSH_MS = 5000;
const DEFAULT_MAX_BATCH = 50;
const MAX_RETRIES = 3;
const RETRY_BASE_MS = 1000;

function getBaseUrl(): string {
  if (typeof process !== 'undefined' && process.env?.DEPENDWATCH_INGEST_URL) {
    return process.env.DEPENDWATCH_INGEST_URL;
  }
  if (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL;
  }
  return DEFAULT_BASE;
}

export class DependWatchClient {
  private queue: ApiCallEvent[] = [];
  private timer: ReturnType<typeof setInterval> | null = null;
  private config: Required<Pick<DependWatchConfig, 'baseUrl' | 'flushIntervalMs' | 'maxBatchSize' | 'environment'>> & {
    ingestKey: string;
  };

  constructor(config: DependWatchConfig) {
    const baseUrl = config.baseUrl ?? getBaseUrl();
    this.config = {
      ingestKey: config.ingestKey,
      baseUrl: baseUrl.replace(/\/$/, ''),
      flushIntervalMs: config.flushIntervalMs ?? DEFAULT_FLUSH_MS,
      maxBatchSize: config.maxBatchSize ?? DEFAULT_MAX_BATCH,
      environment: config.environment ?? (process.env.NODE_ENV === 'production' ? 'prod' : 'dev'),
    };
    this.scheduleFlush();
  }

  private scheduleFlush() {
    if (this.timer) return;
    this.timer = setInterval(() => {
      this.flush().catch(() => {});
    }, this.config.flushIntervalMs);
    if (this.timer.unref) this.timer.unref();
  }

  private async sendBatch(events: ApiCallEvent[]): Promise<boolean> {
    const url = `${this.config.baseUrl}/api/ingest`;
    let lastErr: Error | null = null;
    for (let i = 0; i < MAX_RETRIES; i++) {
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.config.ingestKey}`,
          },
          body: JSON.stringify({ events }),
        });
        if (res.ok) return true;
        lastErr = new Error(`HTTP ${res.status}`);
      } catch (e) {
        lastErr = e instanceof Error ? e : new Error(String(e));
      }
      const delay = RETRY_BASE_MS * Math.pow(2, i);
      await new Promise((r) => setTimeout(r, delay));
    }
    if (lastErr) {
      console.warn('[DependWatch] ingest failed after retries:', lastErr.message);
    }
    return false;
  }

  track(event: ApiCallEvent): void {
    const env = event.environment ?? this.config.environment;
    const normalized: ApiCallEvent = {
      ...event,
      provider: event.provider?.slice(0, 64) ?? 'unknown',
      environment: env,
      error_message: event.error_message?.slice(0, 512),
      error_type: event.error_type?.slice(0, 64),
    };
    this.queue.push(normalized);
    if (this.queue.length >= this.config.maxBatchSize) {
      this.flush().catch(() => {});
    }
  }

  async flush(): Promise<void> {
    if (this.queue.length === 0) return;
    const batch = this.queue.splice(0, this.config.maxBatchSize);
    try {
      await this.sendBatch(batch);
    } catch {
      this.queue.unshift(...batch);
    }
  }

  close(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.flush().catch(() => {});
  }
}

let defaultClient: DependWatchClient | null = null;

export function init(config: DependWatchConfig): DependWatchClient {
  const key = config?.ingestKey;
  if (typeof key !== 'string' || !key.trim()) {
    throw new Error('DependWatch: ingestKey is required. Pass your project ingest key (e.g. from process.env.DEPENDWATCH_INGEST_KEY).');
  }
  if (defaultClient) defaultClient.close();
  defaultClient = new DependWatchClient(config);
  return defaultClient;
}

export function getClient(): DependWatchClient | null {
  return defaultClient;
}

let noInitWarned = false;
export function track(event: ApiCallEvent): void {
  if (!defaultClient) {
    if (!noInitWarned && typeof console !== 'undefined' && console.warn) {
      noInitWarned = true;
      console.warn('[DependWatch] track() called before init() — events are not sent. Call init({ ingestKey, ... }) first.');
    }
    return;
  }
  defaultClient.track(event);
}
