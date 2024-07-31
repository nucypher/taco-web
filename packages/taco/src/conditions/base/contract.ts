import { ETH_ADDRESS_REGEXP } from '@nucypher/shared';
import { ethers } from 'ethers';
import { z } from 'zod';

import { Condition } from '../condition';
import { OmitConditionType, paramOrContextParamSchema } from '../shared';

import { rpcConditionSchema } from './rpc';

// TODO: Consider replacing with `z.unknown`:
//    Since Solidity types are tied to Solidity version, we may not be able to accurately represent them in Zod.
//    Alternatively, find a TS Solidity type lib.
const EthBaseTypes: [string, ...string[]] = [
  'bool',
  'string',
  'address',
  'address payable',
  ...Array.from({ length: 32 }, (_v, i) => `bytes${i + 1}`),
  'bytes',
  ...Array.from({ length: 32 }, (_v, i) => `uint${8 * (i + 1)}`),
  ...Array.from({ length: 32 }, (_v, i) => `int${8 * (i + 1)}`),
];

type AbiVariable = {
  name: string;
  type: string;
  internalType: string;
};

const functionAbiVariableSchema = z
  .object({
    name: z.string(),
    type: z.enum(EthBaseTypes),
    internalType: z.enum(EthBaseTypes), // TODO: Do we need to validate this?
  })
  .strict();

export const humanReadableAbiSchema = z
  .string()
  .refine(
    (abi) => {
      try {
        toJsonAbiFormat(abi);
        return true;
      } catch (e) {
        return false;
      }
    },
    {
      message: 'Invalid Human-Readable ABI format',
    },
  )
  .transform(toJsonAbiFormat);

const functionAbiSchema = z
  .object({
    name: z.string(),
    type: z.literal('function'),
    inputs: z.array(functionAbiVariableSchema).min(0),
    outputs: z.array(functionAbiVariableSchema).nonempty(),
    stateMutability: z.union([z.literal('view'), z.literal('pure')]),
  })
  .strict()
  .refine(
    (functionAbi) => {
      let asInterface;
      try {
        asInterface = new ethers.utils.Interface(JSON.stringify([functionAbi]));
      } catch (e) {
        return false;
      }

      const functionsInAbi = Object.values(asInterface.functions || {});
      return functionsInAbi.length === 1;
    },
    {
      message: '"functionAbi" must contain a single function definition',
      path: ['functionAbi'],
    },
  )
  .refine(
    (functionAbi) => {
      const asInterface = new ethers.utils.Interface(
        JSON.stringify([functionAbi]),
      );
      const nrOfInputs = asInterface.fragments[0].inputs.length;
      return functionAbi.inputs.length === nrOfInputs;
    },
    {
      message: '"parameters" must have the same length as "functionAbi.inputs"',
      path: ['parameters'],
    },
  );

function toJsonAbiFormat(humanReadableAbi: string) {
  const abiWithoutFunctionKeyword = humanReadableAbi.replace(
    /^function\s+/,
    '',
  );
  const fragment = ethers.utils.FunctionFragment.from(
    abiWithoutFunctionKeyword,
  );
  const jsonAbi = JSON.parse(fragment.format(ethers.utils.FormatTypes.json));

  const filteredJsonAbi = {
    name: jsonAbi.name,
    type: jsonAbi.type,
    stateMutability: jsonAbi.stateMutability,
    inputs: jsonAbi.inputs.map((input: AbiVariable) => ({
      ...input,
      internalType: input.type,
    })),
    outputs: jsonAbi.outputs.map((output: AbiVariable) => ({
      ...output,
      internalType: output.type,
    })),
  };

  return filteredJsonAbi;
}

export type FunctionAbiProps = z.infer<typeof functionAbiSchema>;

export const ContractConditionType = 'contract';

export const contractConditionSchema = rpcConditionSchema
  .extend({
    conditionType: z
      .literal(ContractConditionType)
      .default(ContractConditionType),
    contractAddress: z.string().regex(ETH_ADDRESS_REGEXP).length(42),
    standardContractType: z.enum(['ERC20', 'ERC721']).optional(),
    method: z.string(),
    functionAbi: z
      .union([functionAbiSchema, humanReadableAbiSchema])
      .optional(),
    parameters: z.array(paramOrContextParamSchema),
  })
  // Adding this custom logic causes the return type to be ZodEffects instead of ZodObject
  // https://github.com/colinhacks/zod/issues/2474
  .refine(
    // A check to see if either 'standardContractType' or 'functionAbi' is set
    (data) => Boolean(data.standardContractType) !== Boolean(data.functionAbi),
    {
      message:
        "At most one of the fields 'standardContractType' and 'functionAbi' must be defined",
      path: ['standardContractType'],
    },
  );

export type ContractConditionProps = z.infer<typeof contractConditionSchema>;
export class ContractCondition extends Condition {
  constructor(value: OmitConditionType<ContractConditionProps>) {
    if (typeof value.functionAbi === 'string') {
      value.functionAbi = toJsonAbiFormat(value.functionAbi);
    }
    super(contractConditionSchema, {
      conditionType: ContractConditionType,
      ...value,
    });
  }
}
