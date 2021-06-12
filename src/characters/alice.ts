import { NucypherKeyring } from '../crypto/keyring';
import { DelegatingPower, SigningPower } from '../crypto/powers';
import { BlockchainPolicy } from '../policy';
import { HexEncodedBytes, UmbralPublicKey, KeyFrags } from '../types';
import { Bob } from './bob';
import {
  Porter,
  RevocationRequestDto,
  RevocationResultDto,
  Ursula,
} from './porter';

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

  public grant(
    bob: Bob,
    label: string,
    m: number,
    n: number,
    expiration: Date,
    handpickedUrsulas?: Ursula[]
  ): void {
    const quantity = 0; // TODO: Add as a default param?
    const durationPeriods = 0; // TODO Add as a default param?
    const ursulas = Porter.getUrsulas(quantity, durationPeriods);
    const selectedUrsulas: Ursula[] = handpickedUrsulas
      ? [...new Set([...ursulas, ...handpickedUrsulas])]
      : ursulas;

    const policy = this.createPolicy(bob, label, m, n, expiration);
    const { enactedPolicy, enactPolicyTx } = policy.enact(selectedUrsulas);

    Porter.publishTreasureMap(
      enactedPolicy.treasureMap.toBytes(),
      bob.getEncryptingKey()
    );
  }

  private createPolicy(
    bob: Bob,
    label: string,
    m: number,
    n: number,
    expiration: Date
  ): BlockchainPolicy {
    const { delegatingPublicKey, kFrags } = this.generateKFrags(
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

  private generateKFrags(
    bob: Bob,
    label: string,
    m: number,
    n: number
  ): KeyFrags {
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

  public getPolicyEncryptingKeyFromLabel(
    label: HexEncodedBytes
  ): UmbralPublicKey {
    return this.delegatingPower.getPublicKeyFromLabel(label);
  }

  public getSignerPublicKey(): UmbralPublicKey {
    throw new Error('Method not implemented.');
  }

  public static revoke(
    revocations: RevocationRequestDto[]
  ): RevocationResultDto {
    return Porter.revoke(revocations);
  }
}
