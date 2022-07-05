import {
  EncryptedTreasureMap,
  PublicKey,
  SecretKey,
} from '@nucypher/nucypher-core';

import { fromHexString } from '../utils';

import { Enrico } from './enrico';
import { tDecDecrypter } from './universal_bob';

const tDecConfig: { [key: string]: { [key: string]: any } } = {
  ibex_test: {
    policyEncryptingKey: PublicKey.fromBytes(
      fromHexString(
        '02b99c57a2bbbcdc125f0bdc191d6153de6ab4b841070979f14fbc6d42774bed62'
      )
    ),
    encryptedTreasureMap: EncryptedTreasureMap.fromBytes(
      fromHexString(
        '454d61700001000092c4620236b52cf415f325d7e955a35b70bff300293048d61f5390025d6651dfe3dba11903c0be54dc4e9292ca2b0fb013995c3de64a0ddf558415a11309b537108e7be2023786558e569ff2333913ee6fe1c5660b5b3adaa72af6270c3102e726fab20fcfc502c646973ff59ba6a829435fcdc326cc4a4ffc0cdb50c36bb6e89598a1cf0b6b058187cbcc50fd702f038244748ef597a021d8d6cb6695d1c4826204aba1d0f90a1c50be332d209f15f6d4137b040acea9005fec3c56ad724e2c5550d7255124044d730cece1fb49d832e4454d5cf4970f08e97cb622cf8dc76b7671df46fdd40d3579bbec51109b76f0373f89ccaef9496ad64fa28e97807850398f8b30d24c407a9ab073442bce7e17bb1f923ea022a519eb147d4641791f38ca1a79bedd7003ee63bad1739431a9c9dc8381dab514e8339311649176e1c6e6cf1a9ee3df31ba8cd133acffe00521fcb8727ab48be7fb9879ee295c89991b077b9a4ab7dec833da6a22cd2a289de4d1802352562e5a45661de7fa545fb0c78b50ba37a1d4e5a815f8c3960346c4c2a68d7eb8300084c6748cfa05be3d7b5d18059cbafd3d1f504087b583117b0f3d56134efaa446fb11b4b909e1109b7bcf1c25f748de04ba28df2c2fcd3550ea199f1ee877c0e460f0b74d352bdce333306ffaaebac0b0b84506e68d2bfde75b6b7382bd3897b4f5e85a87c66e73eaf7a88aefc1b865a6e2a06ba1cd6b1b1168010c7504c2ef62a008d9932c79ea8b414b25a8bb8524cf823d91b1868a497c43ce89e7e629ce2a3a981228e9a1694797ccd39d97bdf2ab085eea49e0a969921a6a9d6648068dbaf32fc67cdb8f39092acef15eddd0e7c5b3faa4dea1220e8673a5eba5349a7c8fdc97cac342ec7ea210ce9af6e43333813a3eae032f4b96de24a9956b74baf207987b0d56f82ff10ebfd4cea5a74b5d9ed5b9669866f90f8e58e703de5404c963a68ecb11719065a2af8076b6544b0a5b8a62a797ad3ca8f75f6b910ebf4140dbc1db69e2f4483cceec58ca64da377f055dda4691a99b84f552bfb169b8f23a89e2687cfd7273497378132d95677cdd35102a317a9856e589a58d9a19873b80c05adaffd6b0bd9fc1c5d746966e6aeab2dfa1721eab14e1931f'
      )
    ),
    publisherVerifyingKey: PublicKey.fromBytes(
      fromHexString(
        '028bdbd002064d953ec2f34f5af25a956dc47f6ee847005fa83cb754e7d38b5514'
      )
    ),
    verifyingKey: SecretKey.fromBytes(
      fromHexString(
        'f487dcf994bfd51b9cb8afc4052aa7bb9e8c2a5782b01740e67de42a6b57a89e'
      )
    ),
    decryptingKey: SecretKey.fromBytes(
      fromHexString(
        '1ae4cee96c7b74010eb0ebfecaf416691f62f1c18e55394d588831df58ff3837'
      )
    ),
  },
};

export const makeTDecDecrypter = (
  configLabel: string,
  porterUri: string
): tDecDecrypter => {
  return new tDecDecrypter(
    porterUri,
    tDecConfig[configLabel]['policyEncryptingKey'],
    tDecConfig[configLabel]['encryptedTreasureMap'],
    tDecConfig[configLabel]['publisherVerifyingKey'],
    tDecConfig[configLabel]['decryptingKey'],
    tDecConfig[configLabel]['verifyingKey']
  );
};

export const makeTDecEncrypter = (configLabel: string): Enrico => {
  return new Enrico(
    tDecConfig[configLabel]['policyEncryptingKey'],
    tDecConfig[configLabel]['publisherVerifyingKey']
  );
};
