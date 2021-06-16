import * as umbral from 'umbral-pre';
import { encryptAndSign } from '../crypto/api';
import { NucypherKeyring } from '../crypto/keyring';
import { PolicyMessageKit } from '../crypto/kits';
import { DelegatingPower, SigningPower } from '../crypto/powers';
import { BlockchainPolicy, EnactedPolicy } from '../policies/policy';
import {
  HexEncodedBytes,
  UmbralKFrag,
  UmbralPublicKey,
  UmbralSigner,
} from '../types';
import { Bob } from './bob';
import { Porter, IUrsula } from './porter';

export class Alice {
  // TODO: Introduce more concise pattern for powers?
  private delegatingPower: DelegatingPower;
  private signingPower: SigningPower;

  constructor(signingPower: SigningPower, delegatingPower: DelegatingPower) {
    this.signingPower = signingPower;
    this.delegatingPower = delegatingPower;
  }

  public async grant(
    bob: Bob,
    label: string,
    m: number,
    n: number,
    expiration: Date,
    handpickedUrsulas?: IUrsula[]
  ): Promise<EnactedPolicy> {
    const quantity = 8; // TODO: Add as a default param?
    const durationPeriods = 30; // TODO Add as a default param?
    const ursulas = await Porter.getUrsulas(quantity, durationPeriods);
    const selectedUrsulas: IUrsula[] = handpickedUrsulas
      ? [...new Set([...ursulas, ...handpickedUrsulas])]
      : ursulas;

    const policy = await this.createPolicy(bob, label, m, n, expiration);
    const enactedPolicy = policy.enact(selectedUrsulas);

    Porter.publishTreasureMap(
      enactedPolicy.treasureMap,
      bob.getEncryptingPublicKey()
    );

    return enactedPolicy;
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

  private async generateKFrags(
    bob: Bob,
    label: string,
    m: number,
    n: number
  ): Promise<{
    delegatingPublicKey: UmbralPublicKey;
    kFrags: UmbralKFrag[];
  }> {
    const bobEncryptingKey = bob.getEncryptingPublicKey();
    const signer = this.signingPower.toUmbralSigner();
    return this.delegatingPower.generateKFrags(
      bobEncryptingKey,
      signer,
      label,
      m,
      n
    );
  }

  public async getPolicyEncryptingKeyFromLabel(
    label: HexEncodedBytes
  ): Promise<UmbralPublicKey> {
    return this.delegatingPower.getPublicKeyFromLabel(label);
  }

  public getSignerPublicKey(): UmbralPublicKey {
    return this.signingPower.getPublicKey();
  }

  public getSigner(): UmbralSigner {
    return this.signingPower.toUmbralSigner();
  }

  // public static revoke(revocations: RevocationRequest[]): RevocationResponse {
  //   return Porter.revoke(revocations);
  // }

  public encryptFor(ursula: IUrsula, payload: Buffer): PolicyMessageKit {
    const signer = this.getSigner();
    const recipientPk = umbral.PublicKey.fromBytes(
      Buffer.from(ursula.encryptingKey, 'hex')
    );
    return encryptAndSign(recipientPk, payload, signer);
  }

  public static fromPublicKey(pk: umbral.PublicKey): Alice {
    const signingPower = SigningPower.fromPublicKey(pk);
    const delegatingPower = DelegatingPower.fromPublicKey(pk);
    return new Alice(signingPower, delegatingPower);
  }

  public static fromKeyring(keyring: NucypherKeyring): Alice {
    const signingPower = keyring.deriveSigningPower();
    const delegatingPower = keyring.deriveDelegatingPower();
    return new Alice(signingPower, delegatingPower);
  }
}
