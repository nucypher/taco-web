import type { SiweMessage } from '@didtools/cacao';

import { FormattedEip712 } from './eip712';

export interface TypedSignature {
    signature: string;
    address: string;
    scheme: 'EIP712' | 'SIWE';
    typedData: FormattedEip712 | SiweMessage;
  }
