type CacheEntry<T> = {
  promise: Promise<T>;
  data?: T;
  expiry: number;
};

interface CacheOptions {
  ttl?: number;
  forceRefresh?: boolean;
}

class RequestCache {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private cache = new Map<string, CacheEntry<any>>();

  get<T>(key: string, fetcher: () => Promise<T>, options: CacheOptions = {}): Promise<T> {
    const ttl = options.ttl ?? 60_000;
    const now = Date.now();
    const cached = this.cache.get(key);

    if (!options.forceRefresh && cached && cached.expiry > now) {
      return cached.promise;
    }

    const promise = fetcher()
      .then((data) => {
        this.cache.set(key, { promise, data, expiry: Date.now() + ttl });
        return data;
      })
      .catch((err) => {
        this.cache.delete(key);
        throw err;
      });

    this.cache.set(key, { promise, expiry: now + ttl });
    return promise;
  }

  peek<T>(key: string): T | undefined {
    return this.cache.get(key)?.data;
  }

  invalidate(key: string) {
    this.cache.delete(key);
  }

  invalidatePrefix(prefix: string) {
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) this.cache.delete(key);
    }
  }

  clear() {
    this.cache.clear();
  }
}

export const requestCache = new RequestCache();
