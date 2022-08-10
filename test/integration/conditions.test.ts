import { Operator } from '../../src/policies/conditions'


const TEST_CONDITIONS = {
    ERC20_balance: {
        contractAddress: "0xadd9d957170DF6f33982001E4C22eCcDd5539118",
        standardContractType: "ERC20",
        "chain": "ethereum",
        "method": "balanceOf",
        "parameters": [
            ":userAddress"
        ],
        "returnValueTest": {
            "comparator": ">",
            "value": "0"
        }
    }
}


describe('operator', () => {
    it('should validate Operator operator validation', async () => {
        const op = new Operator('or')
        expect(op.operator).toEqual('or');
        expect(() => {
            const badop = new Operator('then')
        }).toThrow();
    })
})