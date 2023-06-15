import { Condition, ConditionSet } from '../../../src/conditions';
import { ERC721Balance } from '../../../src/conditions/predefined';
import { TEST_CHAIN_ID, TEST_CONTRACT_ADDR } from '../testVariables';

describe('condition set', () => {
  describe('serialization', () => {
    it('serializes to and from json', async () => {
      const set = new ConditionSet(
        new ERC721Balance({
          chain: TEST_CHAIN_ID,
          contractAddress: TEST_CONTRACT_ADDR,
        })
      );
      const setJson = set.toJson();
      expect(setJson).toBeDefined();
      expect(setJson).toContain('chain');
      expect(setJson).toContain(TEST_CHAIN_ID.toString());
      expect(setJson).toContain('contractAddress');
      expect(setJson).toContain(TEST_CONTRACT_ADDR.toString());

      const setFromJson = ConditionSet.fromJSON(setJson);
      expect(setFromJson).toBeDefined();
      expect(setFromJson.condition).toBeInstanceOf(Condition); // TODO: This should arguably be an ERC721Balance
    });
  });
});
