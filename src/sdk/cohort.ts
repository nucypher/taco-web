import { Porter } from '../characters/porter';
import { ChecksumAddress } from '../types';

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
    include = [],
    exclude = []
  ) {
    const porter = new Porter(configuration.porterUri);
    const ursulas = await porter.getUrsulas(
      configuration.shares,
      exclude,
      include
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
}
