import { Porter } from '../characters/porter';
import { ChecksumAddress } from '../types';
import { objectEquals } from '../utils';

export type CohortConfiguration = {
  readonly threshold: number;
  readonly shares: number;
  readonly porterUri: string;
};

export type CohortJSON = {
  ursulaAddresses: ChecksumAddress[];
  threshold: number;
  shares: number;
  porterUri: string;
};

export class Cohort {
  private constructor(
    public ursulaAddresses: ChecksumAddress[],
    public readonly configuration: CohortConfiguration
  ) {}

  public static async create(
    configuration: CohortConfiguration,
    include: string[] = [],
    exclude: string[] = []
  ) {
    if (configuration.threshold > configuration.shares) {
      throw new Error('Threshold cannot be greater than the number of shares');
    }
    // TODO: Remove this limitation after `nucypher-core@0.11.0` deployment
    const isMultipleOf2 = (n: number) => n % 2 === 0;
    if (!isMultipleOf2(configuration.shares)) {
      throw new Error('Number of shares must be a multiple of 2');
    }

    const porter = new Porter(configuration.porterUri);
    const ursulas = await porter.getUrsulas(
      configuration.shares,
      exclude,
      include.splice(0, configuration.shares)
    );
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

  public static fromObj({
    ursulaAddresses,
    threshold,
    shares,
    porterUri,
  }: CohortJSON) {
    const config = {
      threshold: threshold,
      shares: shares,
      porterUri: porterUri,
    };
    return new Cohort(ursulaAddresses, config);
  }

  public toObj(): CohortJSON {
    return {
      ursulaAddresses: this.ursulaAddresses,
      threshold: this.configuration.threshold,
      shares: this.configuration.shares,
      porterUri: this.configuration.porterUri,
    };
  }

  public equals(other: Cohort): boolean {
    return objectEquals(this.toObj(), other.toObj());
  }
}
