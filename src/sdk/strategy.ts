import {
    SecretKey,
  } from '@nucypher/nucypher-core';
import { ethers } from 'ethers';

import { Cohort } from './cohort';
import { Alice } from '../characters/alice';

export class Strategy {
  
  constructor(
    cohort: Cohort,
    startDate: Date,
    endDate: Date,
    alice: Alice
  ) {
  }

  public static create(
    cohort: Cohort,
    startDate: Date,
    endDate: Date,
    porterUri: string,
    provider: ethers.providers.Web3Provider,
    aliceSecretKey?: SecretKey,
    dkgAlice?: boolean
  ) {
    if (dkgAlice == true) {
      throw new TypeError('DKG Alice is not yet implemented');
    }
    if (typeof(aliceSecretKey) == 'undefined') {
      aliceSecretKey = SecretKey.random()
    }

    const configuration = { porterUri };
    const alice = Alice.fromSecretKey(configuration, aliceSecretKey, provider);

    return new Strategy(
      cohort,
      startDate,
      endDate,
      alice
      )
    }

  public static fromJson() {}

  public static toJson() {}

  public static deploy() {}

  public static update() {}

  public static revoke() {}

  public static attachConditions() {}

  public get encrypter(): any {
      return this.encrypter;
  }

  public get decrypter(): any {
      return this.decrypter;
  }
}