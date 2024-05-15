interface IStorage {
  getItem(key: string): string | null;

  setItem(key: string, value: string): void;
}

class BrowserStorage implements IStorage {
  getItem(key: string): string | null {
    return localStorage.getItem(key);
  }

  setItem(key: string, value: string): void {
    localStorage.setItem(key, value);
  }
}

class NodeStorage implements IStorage {
  private storage: Record<string, string> = {};

  getItem(key: string): string | null {
    return this.storage[key] || null;
  }

  setItem(key: string, value: string): void {
    this.storage[key] = value;
  }
}

export class LocalStorage {
  private storage: IStorage;

  constructor() {
    this.storage =
      typeof localStorage === 'undefined'
        ? new NodeStorage()
        : new BrowserStorage();
  }

  getItem(key: string): string | null {
    return this.storage.getItem(key);
  }

  setItem(key: string, value: string): void {
    this.storage.setItem(key, value);
  }
}
