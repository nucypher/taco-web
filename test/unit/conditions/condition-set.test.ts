import { ConditionSet } from '../../../src/conditions';
import { ContractCondition } from '../../../src/conditions/base';
import { ERC721Balance } from '../../../src/conditions/predefined';
import { TEST_CHAIN_ID, TEST_CONTRACT_ADDR } from '../testVariables';

describe('condition set', () => {
  describe('serialization', () => {
    const condition_set = new ConditionSet(
      new ERC721Balance({
        chain: TEST_CHAIN_ID,
        contractAddress: TEST_CONTRACT_ADDR,
      })
    );

    it('serializes to and from json', async () => {
      const conditionSetJson = condition_set.toJson();
      expect(conditionSetJson).toBeDefined();
      expect(conditionSetJson).toContain('chain');
      expect(conditionSetJson).toContain(TEST_CHAIN_ID.toString());
      expect(conditionSetJson).toContain('contractAddress');
      expect(conditionSetJson).toContain(TEST_CONTRACT_ADDR.toString());
      expect(conditionSetJson).toContain('standardContractType');
      expect(conditionSetJson).toContain('ERC721');
      expect(conditionSetJson).toContain('method');
      expect(conditionSetJson).toContain('balanceOf');

      const conditionSetFromJson = ConditionSet.fromJSON(conditionSetJson);
      expect(conditionSetFromJson).toBeDefined();
      expect(conditionSetFromJson.condition).toBeInstanceOf(ContractCondition);
    });
  });
});
