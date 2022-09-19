import { PublicKey } from '@nucypher/nucypher-core';
import { ChecksumAddress } from '../types';
import { Porter } from '../characters/porter';

export type Ursula = {
    readonly checksumAddress: ChecksumAddress;
    readonly uri: string;
    readonly encryptingKey: PublicKey;
  };
interface CohortParameters {
    porterUri: string;
    threshold: number;
    shares?: number;
    include?: ChecksumAddress[];
    exclude?: ChecksumAddress[];
}

export class Cohort {
    constructor(
        public readonly ursulaAddresses: ChecksumAddress[],
        public readonly threshold: number,
    ) {
        this.ursulaAddresses = ursulaAddresses;
        this.threshold = threshold;
    }

    public static async create({
        porterUri,
        threshold,
        shares = 0,
        include = [],
        exclude = []
    }: CohortParameters) {
        if (shares == 0 && include.length == 0) {
            throw new TypeError('Shares is 0 and Include is an empty array');
        }
        if (shares == 0 && include.length > 0) {
            shares = include.length;
        }

        const porter = new Porter(porterUri);
        const ursulas = await porter.getUrsulas(
            shares,
            exclude,
            include);
        const ursulaAddresses = ursulas.map((ursula) => ursula.checksumAddress);
        return new Cohort(ursulaAddresses, threshold);
    }
  
    public static fromJson() {}

    public static toJson() {}

}
