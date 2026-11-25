import { Redis } from '@upstash/redis';

// Persistencia en Upstash Redis. Vercel (Marketplace → Upstash) inyecta KV_REST_API_*;
// si la creás directo en upstash.com, usá UPSTASH_REDIS_REST_*.
const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;

type Store = {
  get<T>(key: string): Promise<T | null>;
  set(key: string, value: unknown): Promise<void>;
  /** Toma todas las claves para `owner` o ninguna. ttlSec null = sin vencimiento. */
  lockAll(keys: string[], owner: string, ttlSec: number | null): Promise<boolean>;
  /** Libera solo las claves que siguen siendo de `owner`. */
  unlockAll(keys: string[], owner: string): Promise<void>;
  anyLocked(keys: string[]): Promise<boolean>;
};

const UNLOCK = `if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) end return 0`;

function redisStore(redis: Redis): Store {
  const s: Store = {
    get: (key) => redis.get(key),
    set: async (key, value) => void (await redis.set(key, value)),
    async lockAll(keys, owner, ttlSec) {
      const taken: string[] = [];
      for (const k of keys) {
        const ok = ttlSec ? await redis.set(k, owner, { nx: true, ex: ttlSec }) : await redis.set(k, owner, { nx: true });
        if (!ok) {
          await s.unlockAll(taken, owner);
          return false;
        }
        taken.push(k);
      }
      return true;
    },
    async unlockAll(keys, owner) {
      for (const k of keys) await redis.eval(UNLOCK, [k], [owner]);
    },
    anyLocked: async (keys) => keys.length > 0 && (await redis.exists(...keys)) > 0,
  };
  return s;
}

// shortcut: en desarrollo sin Upstash se guarda en memoria (se pierde al reiniciar); en producción Upstash es obligatorio.
function memoryStore(): Store {
  const data = new Map<string, { v: unknown; exp: number | null }>();
  const live = (k: string) => {
    const e = data.get(k);
    if (e && e.exp !== null && e.exp < Date.now()) data.delete(k);
    return data.get(k);
  };
  return {
    get: async <T,>(k: string) => (live(k)?.v as T) ?? null,
    set: async (k, v) => void data.set(k, { v: structuredClone(v), exp: null }),
    async lockAll(keys, owner, ttlSec) {
      if (keys.some((k) => live(k))) return false;
      for (const k of keys) data.set(k, { v: owner, exp: ttlSec ? Date.now() + ttlSec * 1000 : null });
      return true;
    },
    async unlockAll(keys, owner) {
      for (const k of keys) if (live(k)?.v === owner) data.delete(k);
    },
    anyLocked: async (keys) => keys.some((k) => live(k)),
  };
}

const g = globalThis as unknown as { __lfStore?: Store };

export function store(): Store {
  if (g.__lfStore) return g.__lfStore;
  if (url && token) return (g.__lfStore = redisStore(new Redis({ url, token })));
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Falta configurar Upstash Redis (UPSTASH_REDIS_REST_URL y UPSTASH_REDIS_REST_TOKEN).');
  }
  console.warn('[store] Sin Upstash: guardando reservas en memoria (solo para desarrollo).');
  return (g.__lfStore = memoryStore());
}
