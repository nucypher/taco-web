import {
  ContractConditionProps,
  ContractConditionType,
  FunctionAbiProps,
  ReturnValueTestProps,
  RpcConditionProps,
  RpcConditionType,
  TimeConditionMethod,
  TimeConditionProps,
  TimeConditionType,
} from '@nucypher/shared';

export const aliceSecretKeyBytes = new Uint8Array([
  55, 82, 190, 189, 203, 164, 60, 148, 36, 86, 46, 123, 63, 152, 215, 113, 174,
  86, 244, 44, 23, 227, 197, 68, 5, 85, 116, 31, 208, 152, 88, 53,
]);

export const bobSecretKeyBytes = new Uint8Array([
  116, 235, 55, 52, 105, 173, 92, 147, 29, 141, 83, 26, 93, 253, 255, 155, 147,
  229, 2, 106, 176, 205, 33, 168, 23, 213, 233, 200, 238, 11, 193, 153,
]);

export const TEST_CONTRACT_ADDR = '0x0000000000000000000000000000000000000001';
export const TEST_CONTRACT_ADDR_2 =
  '0x0000000000000000000000000000000000000002';
export const TEST_CHAIN_ID = 5;

export const testReturnValueTest: ReturnValueTestProps = {
  index: 0,
  comparator: '>',
  value: '100',
};

export const testTimeConditionObj: TimeConditionProps = {
  conditionType: TimeConditionType,
  returnValueTest: {
    index: 0,
    comparator: '>',
    value: '100',
  },
  method: TimeConditionMethod,
  chain: 5,
};

export const testRpcConditionObj: RpcConditionProps = {
  conditionType: RpcConditionType,
  chain: TEST_CHAIN_ID,
  method: 'eth_getBalance',
  parameters: ['0x1e988ba4692e52Bc50b375bcC8585b95c48AaD77'],
  returnValueTest: testReturnValueTest,
};

export const testContractConditionObj: ContractConditionProps = {
  conditionType: ContractConditionType,
  contractAddress: '0x0000000000000000000000000000000000000000',
  chain: 5,
  standardContractType: 'ERC20',
  method: 'balanceOf',
  parameters: ['0x1e988ba4692e52Bc50b375bcC8585b95c48AaD77'],
  returnValueTest: testReturnValueTest,
};

export const testFunctionAbi: FunctionAbiProps = {
  name: 'myFunction',
  type: 'function',
  stateMutability: 'view',
  inputs: [
    {
      internalType: 'address',
      name: 'account',
      type: 'address',
    },
    {
      internalType: 'uint256',
      name: 'myCustomParam',
      type: 'uint256',
    },
  ],
  outputs: [
    {
      internalType: 'uint256',
      name: 'someValue',
      type: 'uint256',
    },
  ],
};
