import { EIP1271_AUTH_METHOD, EIP1271AuthSignature } from './auth';


export class EIP1271AuthProvider {
  constructor(
    public readonly contractAddress: string,
    public readonly chain: number,
    public readonly dataHash: string,
    public readonly signature: string,
  ) {}

  public async getOrCreateAuthSignature(): Promise<EIP1271AuthSignature> {
    return {
      signature: this.signature,
      address: this.contractAddress,
      scheme: EIP1271_AUTH_METHOD,
      typedData: {
        chain: this.chain,
        dataHash: this.dataHash,
      },
    };
  }
}
