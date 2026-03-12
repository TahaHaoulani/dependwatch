# Caching in Dependwatch

## Default mechanism: Redis if configured, otherwise in-memory

All application caching in Dependwatch uses **`@/lib/cache`**. There is no separate “in-memory only” or “Redis only” path for general caching.

- **When Redis is configured** (`REDIS_URL` set and `REDIS_ENABLED` not `false`): the cache uses Redis. Same process or multiple instances share the same cache.
- **When Redis is not configured or unavailable**: the cache falls back to an in-memory store (per process). Deploy/restart clears it.

## API (lib/cache)

Use these from `@/lib/cache` for any caching need:

| Function | Use |
|----------|-----|
| `cacheKey(parts: string[])` | Build a namespaced key (e.g. `cacheKey(['session_version', userId])`). |
| `cacheGet(key)` | Get value (string or null). |
| `cacheSet(key, value, ttlSeconds?)` | Set value with TTL. |
| `cacheDel(key)` | Delete one key. |
| `cacheDelByPrefix(prefix)` | Delete all keys with a prefix. |
| `cacheGetOrSet(key, factory, options?)` | Get or compute and set (with TTL). Use for “compute once, cache for N seconds”. |

Values are strings. Serialize (e.g. `JSON.stringify`) for objects. `cacheGetOrSet` supports `parseJson` for automatic JSON parse/stringify.

## Configuration

- **Redis**: Set `REDIS_URL` (e.g. `redis://localhost:6379`). Set `REDIS_ENABLED=false` to force in-memory even when `REDIS_URL` is set. Optional `REDIS_PREFIX` (default `dw`) namespaces keys.
- **No Redis**: Omit `REDIS_URL` or set `REDIS_ENABLED=false`; the app uses the in-memory fallback with no extra config.

## Where it’s used

- **Auth**: Session version (`lib/auth.ts`) — avoids DB on every `/api/auth/session`.
- **Workspace / project**: `getWorkspaceById`, `getWorkspacesForUser`, `getProjectById`, `getProjectsForWorkspace` (request-scoped + TTL via cache).
- **Subscription**: Workspace subscription lookup.
- **Overview / intelligence**: Cached API responses by project and range.
- **Billing usage**: Cached by workspace and period.
- **Stripe webhooks**: Idempotency keys.
- **Contact form**: Rate limit by IP (Redis or in-memory).
- **MCP tools**: Cached overview/metrics.

Rate limiting (`lib/rate-limit`) and distributed locks (`lib/locks`) use Redis when available with their own fallbacks (in-memory and DB respectively); they are not general key-value caches.

## Rule for new code

For any new feature that needs TTL or request-scoped caching, use **`@/lib/cache`** only. Do not add new in-memory `Map`s or direct Redis clients for application cache data. That keeps behavior consistent and ensures Redis is used when configured.
