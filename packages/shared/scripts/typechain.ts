import * as fs from 'fs';
import * as path from 'path';

import * as tmp from 'tmp';
import { glob, runTypeChain } from 'typechain';

import {
  Contract,
  ContractName,
  contractNames,
  ContractRegistry,
  domainRegistry,
} from '../src';

const parseContractRegistry = (registry: ContractRegistry): Contract[] =>
  Object.keys(registry)
    .map((chainId) => {
      const networkRegistry = registry[chainId];
      return Object.keys(networkRegistry).map((contractName): Contract => {
        const contract = networkRegistry[contractName];
        return { name: contractName as ContractName, abi: contract.abi };
      });
    })
    .flat();

console.log(`Parsing contract registries`);

const allContracts = Object.entries(domainRegistry)
  .map(([domain, registry]) => {
    const contracts = parseContractRegistry(registry);
    console.log(`Found ${contracts.length} contracts on ${domain}`);
    return contracts;
  })
  .flat();

const selectedContracts = allContracts.filter(({ name }) =>
  contractNames.includes(name),
);
console.log(
  `Selected contracts: ${selectedContracts.map(({ name }) => name).join(', ')}`,
);

// Creating a temporary directory to store the ABIs
const tmpDir = tmp.dirSync({ unsafeCleanup: true });
console.log(`Created temporary directory ${tmpDir.name}`);

// Writing the ABIs to the temporary directory
const writeAbi = ({ name, abi }: Contract) => {
  const abiPath = path.join(tmpDir.name, `${name}.json`);
  if (!abi) {
    console.log(`Skipping ${name} because it has no ABI`);
    return;
  }
  fs.writeFileSync(abiPath, JSON.stringify(abi));
  console.log(`Wrote ABI for ${name} to ${abiPath}`);
};

selectedContracts.forEach(writeAbi);

const cwd = process.cwd();
const abiFilesGlob = glob(cwd, [`${tmpDir.name}/*.json`]);

// Running typechain
async function main() {
  const cwd = process.cwd();

  const result = await runTypeChain({
    cwd,
    filesToProcess: abiFilesGlob,
    allFiles: abiFilesGlob,
    outDir: `./src/contracts/ethers-typechain`,
    target: 'ethers-v5',
  });

  console.log(`typechain: Generated ${result.filesGenerated} files`);
}

main().catch(console.error);
