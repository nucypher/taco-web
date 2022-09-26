import { PublicKey } from '@nucypher/nucypher-core';

import { Porter } from '../characters/porter';
import { ChecksumAddress } from '../types';

export type Ursula = {
  readonly checksumAddress: ChecksumAddress;
  readonly uri: string;
  readonly encryptingKey: PublicKey;
};

type Immutable<T> = {
    readonly [K in keyof T]: Immutable<T[K]>;
}

export type CohortConfiguration = Immutable<{
  threshold: number;
  shares: number;
  porterUri: string;
}>;

type CohortJSON = {
  ursulaAddresses: ChecksumAddress[];
  threshold: number;
  shares: number;
  porterUri: string;
};

export class Cohort {
  private constructor(
    public ursulaAddresses: ChecksumAddress[],
    public readonly configuration: CohortConfiguration,
  ) {}

  public static async create(
    configuration: CohortConfiguration,
    include = [],
    exclude = []
    ) {
    const porter = new Porter(configuration.porterUri);
    const ursulas = await porter.getUrsulas(configuration.shares, exclude, include);
    const ursulaAddresses = ursulas.map((ursula) => ursula.checksumAddress);
    return new Cohort(ursulaAddresses, configuration);
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

  private static fromObj({
    ursulaAddresses,
    threshold,
    shares,
    porterUri,
  }: CohortJSON) {
    const config = {
        threshold: threshold,
        shares: shares,
        porterUri: porterUri
    }
    return new Cohort(ursulaAddresses, config);
  }

  private toObj() {
    return {
      ursulaAddresses: this.ursulaAddresses,
      threshold: this.configuration.threshold,
      shares: this.configuration.shares,
      porterUri: this.configuration.porterUri,
    };
  }
}
