import { describe, it, expect, beforeEach } from 'vitest';
import { cacheGet, cacheSet, cacheDel, cacheGetOrSet, cacheKey } from '@/lib/cache';

describe('cache', () => {
  beforeEach(async () => {
    await cacheDel(cacheKey(['test', 'key']));
  });

  it('cacheKey builds namespaced key', () => {
    const k = cacheKey(['a', 'b', 'c']);
    expect(k).toContain('a');
    expect(k).toContain('b');
    expect(k).toContain('c');
  });

  it('set and get', async () => {
    const k = cacheKey(['test', 'key']);
    await cacheSet(k, 'value', 60);
    const v = await cacheGet(k);
    expect(v).toBe('value');
  });

  it('getOrSet computes and caches', async () => {
    const k = cacheKey(['test', 'getOrSet']);
    let calls = 0;
    const v1 = await cacheGetOrSet(
      k,
      async () => {
        calls++;
        return { x: 1 };
      },
      { ttlSeconds: 60 }
    );
    expect(v1).toEqual({ x: 1 });
    expect(calls).toBe(1);
    const v2 = await cacheGetOrSet(
      k,
      async () => {
        calls++;
        return { x: 2 };
      },
      { ttlSeconds: 60 }
    );
    expect(v2).toEqual({ x: 1 });
    expect(calls).toBe(1);
  });

  it('del removes key', async () => {
    const k = cacheKey(['test', 'key']);
    await cacheSet(k, 'v', 60);
    expect(await cacheGet(k)).toBe('v');
    await cacheDel(k);
    expect(await cacheGet(k)).toBeNull();
  });
});
