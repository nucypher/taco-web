import * as lynxRegistryJson from '@nucypher/nucypher-contracts/deployment/artifacts/lynx.json';
import * as mainnetRegistryJson from '@nucypher/nucypher-contracts/deployment/artifacts/mainnet.json';
import * as fs from 'fs';
import * as path from 'path';
import * as tmp from 'tmp';
import { glob, runTypeChain } from 'typechain';

type Abi = unknown;

type DeployedContract = {
  address: string;
  abi: Abi;
};

type Contract = {
  name: string;
  abi: Abi;
};

type ContractRegistry = {
  [chainId: string]: Record<string, DeployedContract>;
};

const lynxRegistry: ContractRegistry = lynxRegistryJson;
const mainnetRegistry: ContractRegistry = mainnetRegistryJson;

const parseContractRegistry = (registry: ContractRegistry): Contract[] =>
  Object.keys(registry)
    .map((chainId) => {
      const networkRegistry = registry[chainId];
      return Object.keys(networkRegistry).map((contractName) => {
        const contract = networkRegistry[contractName];
        return { name: contractName, abi: contract.abi };
      });
    })
    .flat();

console.log(`Parsing contract registries`);
const lynxContracts = parseContractRegistry(lynxRegistry);
const mainnetContracts = parseContractRegistry(mainnetRegistry);
console.log(`Found ${lynxContracts.length} contracts on Lynx`);
console.log(`Found ${mainnetContracts.length} contracts on Mainnet`);
const allContracts = [...lynxContracts, ...mainnetContracts];

const SELECTED_CONTRACT_NAMES = [
  'Coordinator',
  'GlobalAllowList',
  'SubscriptionManager',
];
const selectedContracts = allContracts.filter(({ name }) =>
  SELECTED_CONTRACT_NAMES.includes(name),
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
