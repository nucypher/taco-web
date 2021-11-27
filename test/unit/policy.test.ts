import { BlockchainPolicy } from '../../src/policies/policy';

describe('blockchain policy', () => {

  describe('calculates policy value', () => {
    it('accepts missing rate', () => {
      const value = BlockchainPolicy.calculateValue(1, 1, 1, undefined);
      expect(value).toEqual(1);
    });

    it('accepts missing value', () => {
      const value = BlockchainPolicy.calculateValue(1, 1, undefined, 1);
      expect(value).toEqual(1);
    });

    it('rejects missing negative parameters', () => {
      const shares = -1;
      const call = () => BlockchainPolicy.calculateValue(shares, 1, 1, 1);
      expect(call).toThrow(`Negative policy parameters are not allowed: shares is ${shares}`);
    });

    it('rejects missing value and rate', () => {
      const value = undefined;
      const rate = undefined;
      const call = () => BlockchainPolicy.calculateValue(1, 1, undefined, undefined);
      expect(call).toThrow(`Either 'value' or 'rate'  must be provided for policy. Got value: ${value} and rate: ${rate}`);
    });

    it('rejects value not divisible by the number of shares', () => {
      const shares = 3;
      const value = 1;
      const call = () => BlockchainPolicy.calculateValue(shares, 1, value, undefined);
      expect(call).toThrow(`Policy value of ${value} wei cannot be divided into ${shares} shares without a remainder.`);
    });

    it('rejects value per node not divisible by the number of periods', () => {
      const paymentPeriods = 3;
      const value = 1;
      const call = () => BlockchainPolicy.calculateValue(1, paymentPeriods, value, undefined);
      expect(call).toThrow(`Policy value of ${value} wei per node cannot be divided by duration ` +
        `${paymentPeriods} periods without a remainder.`);
    });
  });
});
