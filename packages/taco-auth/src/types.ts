import type { SiweMessage } from 'siwe';

import { FormattedEip712 } from './eip712';

export interface TypedSignature {
    signature: string;
    address: string;
    scheme: 'EIP712' | 'EIP4361';
    typedData: FormattedEip712 | SiweMessage;
  }
