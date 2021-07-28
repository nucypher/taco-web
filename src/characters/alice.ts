import { Provider } from '@ethersproject/providers';
import { KeyFrag, PublicKey, Signer } from 'umbral-pre';

import { encryptAndSign } from '../crypto/api';
import { NucypherKeyring } from '../crypto/keyring';
import {
  DelegatingPower,
  SigningPower,
  TransactingPower,
} from '../crypto/powers';
import { PolicyMessageKit } from '../kits/message';
import { BlockchainPolicy, EnactedPolicy } from '../policies/policy';
import { Configuration } from '../types';

import { Bob } from './bob';
import { IUrsula, Porter } from './porter';

export class Alice {
  private config: Configuration;
  private porter: Porter;
  private delegatingPower: DelegatingPower;
  private signingPower: SigningPower;
  // TODO: This is the only visible transacting power
  //       Should powers be visible or should they be used indirectly?
  public readonly transactingPower: TransactingPower;

  constructor(
    config: Configuration,
    signingPower: SigningPower,
    delegatingPower: DelegatingPower,
    transactingPower: TransactingPower
  ) {
    this.config = config;
    this.porter = new Porter(config.porterUri);
    this.signingPower = signingPower;
    this.delegatingPower = delegatingPower;
    this.transactingPower = transactingPower;
  }

  public static fromKeyring(
    config: Configuration,
    keyring: NucypherKeyring
  ): Alice {
    const signingPower = keyring.deriveSigningPower();
    const delegatingPower = keyring.deriveDelegatingPower();
    const transactingPower = keyring.deriveTransactingPower();
    return new Alice(config, signingPower, delegatingPower, transactingPower);
  }

  public connect(provider: Provider) {
    this.transactingPower.connect(provider);
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
    const ursulas = await this.porter.getUrsulas(n);
    const selectedUrsulas: IUrsula[] = handpickedUrsulas
      ? [...new Set([...ursulas, ...handpickedUrsulas])]
      : ursulas;

    const policy = await this.createPolicy(bob, label, m, n, expiration);
    const enactedPolicy = await policy.enact(selectedUrsulas);

    await this.porter.publishTreasureMap(
      enactedPolicy.treasureMap,
      bob.encryptingPublicKey
    );

    return enactedPolicy;
  }

  public encryptFor(
    recipientPublicKey: PublicKey,
    payload: Uint8Array
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
