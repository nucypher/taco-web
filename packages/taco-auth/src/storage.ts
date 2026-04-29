import { z } from 'zod';

import { AuthSignature } from './index.js';

interface IStorage {
  getItem(key: string): string | null;

  setItem(key: string, value: string): void;

  removeItem(key: string): void;
}

class BrowserStorage implements IStorage {
  public getItem(key: string): string | null {
    return localStorage.getItem(key);
  }

  public setItem(key: string, value: string): void {
    localStorage.setItem(key, value);
  }

  public removeItem(key: string): void {
    localStorage.removeItem(key);
  }
}

class NodeStorage implements IStorage {
  private storage: Record<string, string> = {};

  public getItem(key: string): string | null {
    return this.storage[key] || null;
  }

  public setItem(key: string, value: string): void {
    this.storage[key] = value;
  }

  public removeItem(key: string) {
    delete this.storage[key];
  }
}

export class LocalStorage<T extends AuthSignature> {
  private storage: IStorage;
  private signatureSchema: z.ZodSchema;

  constructor(signatureSchema: z.ZodSchema) {
    this.storage =
      typeof localStorage === 'undefined'
        ? new NodeStorage()
        : new BrowserStorage();
    this.signatureSchema = signatureSchema;
  }

  public getAuthSignature(key: string): T | null {
    const asJson = this.storage.getItem(key);
    if (!asJson) {
      return null;
    }
    return this.signatureSchema.parse(JSON.parse(asJson));
  }

  public setAuthSignature(key: string, authSignature: T): void {
    const asJson = JSON.stringify(authSignature);
    this.storage.setItem(key, asJson);
  }

  public clear(key: string): void {
    this.storage.removeItem(key);
  }
}
