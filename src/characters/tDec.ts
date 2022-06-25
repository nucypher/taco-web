import { Bob } from './bob';
import { Alice } from './alice';
import { SecretKey } from '@nucypher/nucypher-core';
import type { Web3Provider } from '@ethersproject/providers'

export const makeTDecEncrypter = (provider: Web3Provider, porterUri: string): Alice => {
    const secretKey = SecretKey.fromBytes(Buffer.from('God Alice secret key'))
    return Alice.fromSecretKey({ porterUri }, secretKey, provider)
  }

  export const makeTDecDecrypter = (porterUri: string): Bob => {
    const secretKey = SecretKey.fromBytes(Buffer.from('Universal Bob secret key'))
    return Bob.fromSecretKey({ porterUri }, secretKey)
  }