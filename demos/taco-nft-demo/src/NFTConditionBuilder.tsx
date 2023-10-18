import { conditions } from '@nucypher/taco';
import { useEthers } from '@usedapp/core';
import React, { useState } from 'react';

interface Props {
  condition?: conditions.Condition | undefined;
  setConditions: (value: conditions.Condition) => void;
  enabled: boolean;
}

export const NFTConditionBuilder = ({
  condition,
  setConditions,
  enabled,
}: Props) => {
  const { library } = useEthers();
  const goerliNFTAddress = '0x932Ca55B9Ef0b3094E8Fa82435b3b4c50d713043'; // https://goerli-nfts.vercel.app/
  const [contractAddress, setContractAddress] = useState(goerliNFTAddress);
  const [tokenId, setTokenId] = useState('');
  const [chain, setChain] = useState(5);

  if (!enabled || !library) {
    return <></>;
  }

  const makeInput = (
    onChange = (e: any) => console.log(e),
    defaultValue?: string | number,
  ) => (
    <input
      type="string"
      onChange={(e: any) => onChange(e.target.value)}
      defaultValue={defaultValue}
    />
  );

  const makeChainInput = (
    onChange = (e: any) => console.log(e),
    defaultValue?: number,
  ) => (
    <input
      type="number"
      onChange={(e: any) => onChange(Number.parseInt(e.target.value))}
      defaultValue={defaultValue}
    />
  );

  const contractAddressInput = makeInput(setContractAddress, goerliNFTAddress);
  const tokenIdInput = makeInput(setTokenId);
  const chainInput = makeChainInput(setChain, 5);

  const makeCondition = (): conditions.Condition => {
    if (tokenId) {
      return new conditions.ContractCondition({
        conditionType: 'contract',
        contractAddress,
        chain,
        standardContractType: 'ERC721',
        method: 'ownerOf',
        parameters: [parseInt(tokenId, 10)],
        returnValueTest: {
          comparator: '==',
          value: ':userAddress',
        },
      });
    }
    return new conditions.ContractCondition({
      conditionType: 'contract',
      contractAddress,
      chain,
      standardContractType: 'ERC721',
      method: 'balanceOf',
      parameters: [':userAddress'],
      returnValueTest: {
        comparator: '>',
        value: '0',
      },
    });
  };

  const onCreateCondition = (e: any) => {
    e.preventDefault();
    setConditions(makeCondition());
  };

  const prettyPrint = (obj: object | string) => {
    if (typeof obj === 'string') {
      obj = JSON.parse(obj);
    }
    return JSON.stringify(obj, null, 2);
  };

  return (
    <>
      <h2>Step 1 - Create A Conditioned Access Policy</h2>
      <div>
        <div>
          <h3>Customize your NFT-Condition</h3>
          <div>
            <p>
              You can mint an NFT{' '}
              <a href="https://goerli-nfts.vercel.app/">here</a> or use your own
              contract.
            </p>
          </div>
          <div>
            <p>ERC721 Contract Address {contractAddressInput}</p>
            <p>(Optional) TokenId {tokenIdInput}</p>
            <p>Chain Id {chainInput}</p>
          </div>
          <button onClick={onCreateCondition}>Create Conditions</button>
        </div>
        {condition && (
          <div>
            <h3>Condition JSON:</h3>
            <textarea readOnly={true} disabled={true} rows={15}>{prettyPrint(condition?.toObj() ?? {})}</textarea>
          </div>
        )}
      </div>
    </>
  );
};
