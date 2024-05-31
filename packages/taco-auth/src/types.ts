import { FormattedEIP4361 } from './eip4361';
import { FormattedEIP712 } from './eip712';

export interface AuthSignature {
  signature: string;
  address: string;
  scheme: 'EIP712' | 'EIP4361';
  typedData: FormattedEIP712 | FormattedEIP4361;
}
