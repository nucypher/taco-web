import { WebIrys } from '@irys/sdk';
import { providers } from 'ethers';

import { IRYS_NODE_URL, RPC_URL } from './config';

export const getWebIrys = async (provider: providers.Provider) => {
  const token = 'matic';
  const wallet = { rpcUrl: RPC_URL, name: 'ethersv5', provider };
  const webIrys = new WebIrys({ url: IRYS_NODE_URL, token, wallet });
  await webIrys.ready();
  return webIrys;
};

export const uploadData = async (webIrys: WebIrys, data: unknown): Promise<string> => {
  const dataToUpload = JSON.stringify(data);
  const receipt = await webIrys.upload(dataToUpload);
  console.log(`Data uploaded ==> https://gateway.irys.xyz/${receipt.id}`);
  return receipt.id;
};

export const downloadData = async (receiptId: string): Promise<unknown> => {
  const response = await fetch(`https://gateway.irys.xyz/${receiptId}`);
  const dataJson = await response.text();
  return JSON.parse(dataJson);
};
