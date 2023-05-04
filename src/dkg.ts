import { ethers } from 'ethers';
import {
  AggregatedTranscript,
  EthereumAddress,
  PublicKey as FerveoPublicKey,
  Transcript,
  Validator,
  ValidatorMessage,
} from 'ferveo-wasm';

import { DkgCoordinatorAgent } from './agents/coordinator';
import { fromHexString } from './utils';

export class DkgClient {
  constructor(
    private readonly provider: ethers.providers.Web3Provider,
    public readonly ritualId: number
  ) {}

  public async verifyRitual(): Promise<boolean> {
    const ritual = await DkgCoordinatorAgent.getRitual(
      this.provider,
      this.ritualId
    );
    const participants = await DkgCoordinatorAgent.getParticipants(
      this.provider,
      this.ritualId
    );

    const validatorMessages = participants.map((p) => {
      const validatorAddress = EthereumAddress.fromString(p.node);
      const publicKey = FerveoPublicKey.fromBytes(fromHexString(p.publicKey));
      const validator = new Validator(validatorAddress, publicKey);
      const transcript = Transcript.fromBytes(fromHexString(p.transcript));
      return new ValidatorMessage(validator, transcript);
    });
    const aggregate = new AggregatedTranscript(validatorMessages);

    return aggregate.verify(ritual.dkgSize, validatorMessages);
  }
}
