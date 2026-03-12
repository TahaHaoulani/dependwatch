import { getClient, track } from './client';
import type { ApiCallEvent } from './types';

export interface SpanOptions {
  provider: string;
  service_name?: string;
  endpoint?: string;
  method?: string;
  estimated_cost_usd?: number;
}

export class Span {
  private start: number;
  private options: SpanOptions;
  private ended = false;

  constructor(options: SpanOptions) {
    this.start = Date.now();
    this.options = options;
  }

  end(success: boolean, statusCode?: number, errorType?: string, errorMessage?: string): void {
    if (this.ended) return;
    this.ended = true;
    const durationMs = Date.now() - this.start;
    const event: ApiCallEvent = {
      ...this.options,
      duration_ms: durationMs,
      success,
      status_code: statusCode,
      error_type: errorType,
      error_message: errorMessage,
    };
    try {
      track(event);
    } catch {
      // never throw
    }
  }

  fail(statusCode?: number, errorType?: string, errorMessage?: string): void {
    this.end(false, statusCode, errorType, errorMessage);
  }

  ok(statusCode?: number): void {
    this.end(true, statusCode);
  }
}

export function startSpan(options: SpanOptions): Span {
  return new Span(options);
}
