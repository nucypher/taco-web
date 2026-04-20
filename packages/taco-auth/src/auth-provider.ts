import { AuthSignature } from './auth-sig.js';

export interface AuthProvider {
  getOrCreateAuthSignature(): Promise<AuthSignature>;
}
