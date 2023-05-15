import { Condition, ConditionSet, Operator } from '../../../src/conditions';
import { ERC721Balance } from '../../../src/conditions/predefined';
import {
  TEST_CHAIN_ID,
  TEST_CONTRACT_ADDR,
  TEST_CONTRACT_ADDR_2,
} from '../testVariables';

describe('condition set', () => {
  describe('validation', () => {
    const cond1 = new ERC721Balance({
      contractAddress: TEST_CONTRACT_ADDR,
    });
    const cond2 = new ERC721Balance({
      contractAddress: TEST_CONTRACT_ADDR_2,
    });

    it('validates on a correct set', async () => {
      const validSets = [[cond1, Operator.AND, cond2], [cond1]].map(
        (set) => new ConditionSet(set)
      );

      validSets.forEach((set) => {
        expect(set.validate()).toBeTruthy();
      });
    });

    it('throws on an invalid set', async () => {
      const setWithInvalidLength = new ConditionSet([cond1, cond2]);
      expect(() => setWithInvalidLength.validate()).toThrow(
        'conditions must be odd length, every other element being an operator'
      );

      const setWithOperatorInsteadOfComparator = new ConditionSet([
        cond1,
        Operator.AND,
        Operator.AND,
      ]);
      expect(() => setWithOperatorInsteadOfComparator.validate()).toThrow(
        'index 2 must be a Condition, got Operator instead'
      );

      const setWithConditionInsteadOfOperator = new ConditionSet([
        cond1,
        cond2,
        cond1,
      ]);
      expect(() => setWithConditionInsteadOfOperator.validate()).toThrow(
        'index 1 must be an Operator, got ERC721Balance instead'
      );
    });
  });

  describe('serialization', () => {
    it('serializes to and from json', async () => {
      const set = new ConditionSet([
        new ERC721Balance({
          chain: TEST_CHAIN_ID,
          contractAddress: TEST_CONTRACT_ADDR,
        }),
      ]);
      const setJson = set.toJson();
      expect(setJson).toBeDefined();
      expect(setJson).toContain('chain');
      expect(setJson).toContain(TEST_CHAIN_ID.toString());
      expect(setJson).toContain('contractAddress');
      expect(setJson).toContain(TEST_CONTRACT_ADDR.toString());

      const setFromJson = ConditionSet.fromJSON(setJson);
      expect(setFromJson).toBeDefined();
      expect(setFromJson.conditions.length).toEqual(1);
      expect(setFromJson.conditions[0]).toBeInstanceOf(Condition); // TODO: This should arguably be an ERC721Balance
    });
  });
});
