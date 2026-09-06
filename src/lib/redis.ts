/** In-process TTL cache with distributed Redis / ElastiCache client interface */
const store = new Map<string, { value: string; expiresAt: number }>();

export const redis = {
  async get(key: string): Promise<string | null> {
    const entry = store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      store.delete(key);
      return null;
    }
    return entry.value;
  },

  async set(key: string, value: string, ttlSeconds = 3600): Promise<void> {
    store.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
  },

  async incr(key: string): Promise<number> {
    const current = await this.get(key);
    const next = (parseInt(current ?? "0", 10) || 0) + 1;
    await this.set(key, String(next), 86400);
    return next;
  },
};

export async function throttle(key: string, maxPerHour: number): Promise<boolean> {
  const count = await redis.incr(`throttle:${key}`);
  return count <= maxPerHour;
}
