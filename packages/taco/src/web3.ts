export interface Eip712TypedData {
  types: {
    Wallet: { name: string; type: string }[];
  };
  domain: {
    salt: string;
    chainId: number;
    name: string;
    version: string;
  };
  message: {
    blockHash: string;
    address: string;
    blockNumber: number;
    signatureText: string;
  };
}

export interface FormattedTypedData extends Eip712TypedData {
  primaryType: 'Wallet';
  types: {
    EIP712Domain: { name: string; type: string }[];
    Wallet: { name: string; type: string }[];
  };
}
