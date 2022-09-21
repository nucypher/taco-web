import { PublicKey } from '@nucypher/nucypher-core';

import { Porter } from '../characters/porter';
import { ChecksumAddress } from '../types';

export type Ursula = {
  readonly checksumAddress: ChecksumAddress;
  readonly uri: string;
  readonly encryptingKey: PublicKey;
};

type CohortParameters = {
  porterUri: string;
  threshold: number;
  shares?: number;
  include?: ChecksumAddress[];
  exclude?: ChecksumAddress[];
};

type CohortJSON = {
  ursulaAddresses: ChecksumAddress[];
  threshold: number;
  porterUri: string;
};

export class Cohort {
  private constructor(
    public readonly ursulaAddresses: ChecksumAddress[],
    public readonly threshold: number,
    public readonly porterUri: string
  ) {}

  public static async create({
    porterUri,
    threshold,
    shares = 0,
    include = [],
    exclude = [],
  }: CohortParameters) {
    if (shares == 0 && include.length == 0) {
      throw new TypeError('Shares is 0 and Include is an empty array');
    }
    if (shares == 0 && include.length > 0) {
      shares = include.length;
    }

    const porter = new Porter(porterUri);
    const ursulas = await porter.getUrsulas(shares, exclude, include);
    const ursulaAddresses = ursulas.map((ursula) => ursula.checksumAddress);
    return new Cohort(ursulaAddresses, threshold, porterUri);
  }

  public get shares(): number {
    return this.ursulaAddresses.length;
  }

  public toJSON() {
    return JSON.stringify(this.toObj());
  }

  public static fromJSON(json: string) {
    const config = JSON.parse(json);
    return Cohort.fromObj(config);
  }

  public static fromObj({ ursulaAddresses, threshold, porterUri }: CohortJSON) {
    return new Cohort(ursulaAddresses, threshold, porterUri);
  }

  public toObj() {
    return {
      ursulaAddresses: this.ursulaAddresses,
      threshold: this.threshold,
      porterUri: this.porterUri,
    };
  }
}
