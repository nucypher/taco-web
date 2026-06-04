export class TtlCache {
  private readonly ttlMs: number;
  private readonly store = new Map<string, { data: unknown; expiry: number }>();

  constructor(ttlMs: number) {
    this.ttlMs = ttlMs;
  }

  get<T>(key: string): T | undefined {
    const entry = this.store.get(key);
    if (entry && Date.now() < entry.expiry) {
      return entry.data as T;
    }
    this.store.delete(key);
    return undefined;
  }

  set(key: string, data: unknown): void {
    this.store.set(key, { data, expiry: Date.now() + this.ttlMs });
  }

  clear(): void {
    this.store.clear();
  }
}
