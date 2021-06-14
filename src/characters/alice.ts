import { NucypherKeyring } from '../crypto/keyring';
import { DelegatingPower, SigningPower } from '../crypto/powers';
import { BlockchainPolicy } from '../policy';
import {
  HexEncodedBytes,
  UmbralKFrags,
  UmbralPublicKey,
  UmbralSigner,
} from '../types';
import { Bob } from './bob';
import { Porter, Ursula } from './porter';

export class Alice {
  private keyring: NucypherKeyring;
  // TODO: Introduce more concise pattern for powers?
  private delegatingPower: DelegatingPower;
  private signingPower: SigningPower;

  constructor(keyring: NucypherKeyring) {
    this.keyring = keyring;
    this.delegatingPower = keyring.deriveDelegatingPower();
    this.signingPower = keyring.deriveSigningPower();
  }

  public async grant(
    bob: Bob,
    label: string,
    m: number,
    n: number,
    expiration: Date,
    handpickedUrsulas?: Ursula[]
  ): Promise<void> {
    const quantity = 0; // TODO: Add as a default param?
    const durationPeriods = 0; // TODO Add as a default param?
    const ursulas = Porter.getUrsulas(quantity, durationPeriods);
    const selectedUrsulas: Ursula[] = handpickedUrsulas
      ? [...new Set([...ursulas, ...handpickedUrsulas])]
      : ursulas;

    const policy = await this.createPolicy(bob, label, m, n, expiration);
    const enactedPolicy = policy.enact(selectedUrsulas);

    Porter.publishTreasureMap(
      enactedPolicy.treasureMap,
      bob.getEncryptingKey()
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
    // TODO: Handle federated policy?
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
    kFrags: UmbralKFrags[];
  }> {
    const bobEncryptingKey = bob.getEncryptingKey();
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
}
