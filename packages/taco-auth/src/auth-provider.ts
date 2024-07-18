import { AuthSignature } from './auth-sig';

export interface AuthProvider {
  getOrCreateAuthSignature(): Promise<AuthSignature>;
}
