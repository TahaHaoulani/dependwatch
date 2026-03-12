import { startSpan } from './span';
import { track } from './client';
import type { ApiCallEvent } from './types';

export interface WrapOptions {
  provider: string;
  service_name?: string;
  endpoint?: string;
  method?: string;
  estimated_cost_usd?: number;
}

export async function wrap<T>(
  options: WrapOptions,
  fn: () => Promise<T>
): Promise<T> {
  const span = startSpan(options);
  try {
    const result = await fn();
    span.ok(200);
    return result;
  } catch (err) {
    const statusCode = (err as { statusCode?: number })?.statusCode ?? 500;
    const message = err instanceof Error ? err.message : String(err);
    const name = err instanceof Error ? err.name : 'Error';
    span.fail(statusCode, name, message.slice(0, 512));
    throw err;
  }
}

export function trackCompleted(event: Omit<ApiCallEvent, 'environment'>): void {
  try {
    track(event);
  } catch {
    // never throw
  }
}
