import { KeyFrag, PublicKey, Signer } from 'umbral-pre';

import { encryptAndSign } from '../crypto/api';
import { NucypherKeyring } from '../crypto/keyring';
import { PolicyMessageKit } from '../crypto/kits';
import { DelegatingPower, SigningPower } from '../crypto/powers';
import { BlockchainPolicy, EnactedPolicy } from '../policies/policy';
import { Bob } from './bob';
import { IUrsula, Porter } from './porter';

export class Alice {
  private delegatingPower: DelegatingPower;
  private signingPower: SigningPower;

  constructor(signingPower: SigningPower, delegatingPower: DelegatingPower) {
    this.signingPower = signingPower;
    this.delegatingPower = delegatingPower;
  }

  public static fromKeyring(keyring: NucypherKeyring): Alice {
    const signingPower = keyring.deriveSigningPower();
    const delegatingPower = keyring.deriveDelegatingPower();
    return new Alice(signingPower, delegatingPower);
  }

  public get verifyingKey(): PublicKey {
    return this.signingPower.publicKey;
  }

  public get signer(): Signer {
    return this.signingPower.signer;
  }

  public async getPolicyEncryptingKeyFromLabel(
    label: string
  ): Promise<PublicKey> {
    return this.delegatingPower.getPublicKeyFromLabel(label);
  }

  public async grant(
    bob: Bob,
    label: string,
    m: number,
    n: number,
    expiration: Date,
    handpickedUrsulas?: IUrsula[]
  ): Promise<EnactedPolicy> {
    const ursulas = await Porter.getUrsulas(n);
    const selectedUrsulas: IUrsula[] = handpickedUrsulas
      ? [...new Set([...ursulas, ...handpickedUrsulas])]
      : ursulas;

    const policy = await this.createPolicy(bob, label, m, n, expiration);
    const enactedPolicy = policy.enact(selectedUrsulas);

    await Porter.publishTreasureMap(
      enactedPolicy.treasureMap,
      bob.encryptingPublicKey
    );

    return enactedPolicy;
  }

  public encryptFor(
    recipientPublicKey: PublicKey,
    payload: Buffer
  ): PolicyMessageKit {
    return encryptAndSign(
      recipientPublicKey,
      payload,
      this.signer,
      this.signer.verifyingKey()
    );
  }

  private async createPolicy(
    bob: Bob,
    label: string,
    m: number,
    n: number,
    expiration: Date
  ): Promise<BlockchainPolicy> {
    const { delegatingPublicKey, kFrags } = await this.generateKFrags(
      bob,
      label,
      m,
      n
    );
    // TODO: Validate policy parameters
    return new BlockchainPolicy(
      this,
      label,
      expiration,
      bob,
      kFrags,
      delegatingPublicKey,
      m
    );
  }

  public async generateKFrags(
    bob: Bob,
    label: string,
    m: number,
    n: number
  ): Promise<{
    delegatingPublicKey: PublicKey;
    kFrags: KeyFrag[];
  }> {
    return this.delegatingPower.generateKFrags(
      bob.encryptingPublicKey,
      this.signer,
      label,
      m,
      n
    );
  }
}
