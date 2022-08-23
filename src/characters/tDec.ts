import {
  EncryptedTreasureMap,
  PublicKey,
  SecretKey,
} from '@nucypher/nucypher-core';
import axios from 'axios';
import { ethers } from 'ethers';

import { EnactedPolicy } from '../policies/policy';
import { fromHexString } from '../utils';

import { Alice } from './alice';
import { Bob } from './bob';
import { Enrico } from './enrico';
import { tDecDecrypter } from './universal-bob';

async function getTDecConfig(
  configLabel: string
): Promise<Record<string, string>> {
  const { data } = await axios.get(
    'https://raw.githubusercontent.com/nucypher/network-keys/master/network-keys.json'
  );
  return data[configLabel];
}

export async function generateTDecEntities(
  threshold: number,
  shares: number,
  provider: ethers.providers.Web3Provider,
  label: string,
  startDate: Date,
  endDate: Date,
  porterUri: string,
  aliceSecretKey: SecretKey = SecretKey.random()
): Promise<readonly [Enrico, tDecDecrypter, EnactedPolicy, any]> {
  // const configuration = defaultConfiguration(chainId);
  const configuration = { porterUri };
  const bobSecretKey = SecretKey.random();
  const universalBob = new Bob(configuration, bobSecretKey);

  const godAlice = Alice.fromSecretKey(configuration, aliceSecretKey, provider);
  const policyParams = {
    bob: universalBob,
    label,
    threshold,
    shares,
    startDate,
    endDate,
  };
  const policy = await godAlice.grant(
    policyParams
    // includeUrsulas,
    // excludeUrsulas
  );

  const encrypter = new Enrico(policy.policyKey, godAlice.verifyingKey);

  const decrypter = new tDecDecrypter(
    porterUri,
    policy.policyKey,
    policy.encryptedTreasureMap,
    godAlice.verifyingKey,
    bobSecretKey,
    bobSecretKey
  );

  const config_json = {"policy_encrypting_key": policy.policyKey,
                "encrypted_treasure_map": policy.encryptedTreasureMap,
                "alice_verifying_key": godAlice.verifyingKey,
                "bob_secret_key": bobSecretKey}
  return [encrypter, decrypter, policy, config_json];
}

export async function TDecEntitiesFromConfig(
  config_json: any,
  porterUri: string
): Promise<readonly [Enrico, tDecDecrypter]> {
  const encrypter = new Enrico(config_json["policy_encrypting_key"], config_json["alice_verifying_key"]);

  const decrypter = new tDecDecrypter(
    porterUri,
    config_json["policy_encrypting_key"],
    config_json["encrypted_treasure_map"],
    config_json["alice_verifying_key"],
    config_json["bob_secret_key"],
    config_json["bob_secret_key"]
  );
  return [encrypter, decrypter]
}

export async function makeTDecDecrypter(
  configLabel: string,
  porterUri: string
): Promise<tDecDecrypter> {
  const config = await getTDecConfig(configLabel);
  return new tDecDecrypter(
    porterUri,
    PublicKey.fromBytes(fromHexString(config['policy_public_key'])),
    EncryptedTreasureMap.fromBytes(fromHexString(config['treasure_map'])),
    PublicKey.fromBytes(fromHexString(config['alice_verifying_key'])),
    SecretKey.fromBytes(fromHexString(config['bob_encrypting_secret'])),
    SecretKey.fromBytes(fromHexString(config['bob_verifying_secret']))
  );
}

export async function makeTDecEncrypter(configLabel: string): Promise<Enrico> {
  const config = await getTDecConfig(configLabel);
  return new Enrico(
    PublicKey.fromBytes(fromHexString(config['policy_public_key'])),
    PublicKey.fromBytes(fromHexString(config['alice_verifying_key']))
  );
}
