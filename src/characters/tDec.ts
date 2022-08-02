import {
  EncryptedTreasureMap,
  PublicKey,
  SecretKey,
} from '@nucypher/nucypher-core';
import axios from 'axios';

import { fromHexString } from '../utils';

import { Enrico } from './enrico';
import { tDecDecrypter } from './universal_bob';

async function getTDecConfig(
  configLabel: string
): Promise<{ [key: string]: any }> {
  const { data, status } = await axios.get(
    'https://raw.githubusercontent.com/nucypher/network-keys/master/network-keys.json'
  );
  return data[configLabel];
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
  console.log(config);
  return new Enrico(
    PublicKey.fromBytes(fromHexString(config['policy_public_key'])),
    PublicKey.fromBytes(fromHexString(config['alice_verifying_key']))
  );
}
