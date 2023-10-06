import { ChecksumAddress, objectEquals, PorterClient } from '@nucypher/shared';

export type CohortJSON = {
  ursulaAddresses: ChecksumAddress[];
  porterUri: string;
};

export class Cohort {
  private constructor(
    public readonly ursulaAddresses: ChecksumAddress[],
    public readonly porterUri: string,
  ) {}

  public static async create(
    porterUri: string,
    numUrsulas: number,
    include: string[] = [],
    exclude: string[] = [],
  ) {
    const porter = new PorterClient(porterUri);
    const ursulas = await porter.getUrsulas(numUrsulas, exclude, include);
    const ursulaAddresses = ursulas.map((ursula) => ursula.checksumAddress);
    return new Cohort(ursulaAddresses, porterUri);
  }

  public static fromUrsulas(ursulas: ChecksumAddress[], porterUri: string) {
    return new Cohort(ursulas, porterUri);
  }
  public get numUrsulas(): number {
    return this.ursulaAddresses.length;
  }

  public toJSON() {
    return JSON.stringify(this.toObj());
  }

  public static fromJSON(json: string) {
    const config = JSON.parse(json);
    return Cohort.fromObj(config);
  }

  public static fromObj({ ursulaAddresses, porterUri }: CohortJSON) {
    return new Cohort(ursulaAddresses, porterUri);
  }

  public toObj(): CohortJSON {
    return {
      ursulaAddresses: this.ursulaAddresses,
      porterUri: this.porterUri,
    };
  }

  public equals(other: Cohort): boolean {
    return objectEquals(this.toObj(), other.toObj());
  }
}
