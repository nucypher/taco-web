import { ECDSACondition } from '../src/conditions/base/ecdsa';

// Example of creating an ECDSA condition
console.log('=== ECDSA Condition Example ===');

// Example 1: Basic ECDSA condition with static values
const basicECDSACondition = new ECDSACondition({
  message: 'Hello, world!',
  signature: '304402206e41b6b588af8a85c9a9b2e8b4e2b6e1b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9',
  verifyingKey: '04a34b99f22c790c4e36b2b3c2c35a36db06226e41c692fc82b8b56ac1c540c5bd5b8dec5235a0fa8722476c7709c02559e3aa73aa03918ba2d492eea75abea235',
  curve: 'SECP256k1',
});

console.log('Basic ECDSA Condition:');
console.log(JSON.stringify(basicECDSACondition.toObj(), null, 2));

// Example 2: ECDSA condition with context variables
const dynamicECDSACondition = new ECDSACondition({
  message: ':userMessage',
  signature: ':userSignature',
  verifyingKey: '04a34b99f22c790c4e36b2b3c2c35a36db06226e41c692fc82b8b56ac1c540c5bd5b8dec5235a0fa8722476c7709c02559e3aa73aa03918ba2d492eea75abea235',
  curve: 'secp256k1',
});

console.log('\nDynamic ECDSA Condition (with context variables):');
console.log(JSON.stringify(dynamicECDSACondition.toObj(), null, 2));

// Example 3: ECDSA condition with different curve
const p256ECDSACondition = new ECDSACondition({
  message: 'Authenticated message',
  signature: ':ecdsaSignature',
  verifyingKey: '04a34b99f22c790c4e36b2b3c2c35a36db06226e41c692fc82b8b56ac1c540c5bd5b8dec5235a0fa8722476c7709c02559e3aa73aa03918ba2d492eea75abea235',
  curve: 'secp256r1',
});

console.log('\nECDSA Condition with P-256 curve:');
console.log(JSON.stringify(p256ECDSACondition.toObj(), null, 2));

// Example 4: Using defaults for message and signature
const defaultECDSACondition = new ECDSACondition({
  message: ':ecdsaMessage', // Default context variable
  signature: ':ecdsaSignature', // Default context variable
  verifyingKey: '04a34b99f22c790c4e36b2b3c2c35a36db06226e41c692fc82b8b56ac1c540c5bd5b8dec5235a0fa8722476c7709c02559e3aa73aa03918ba2d492eea75abea235',
  curve: 'secp256k1', // Default curve
});

console.log('\nECDSA Condition with defaults:');
console.log(JSON.stringify(defaultECDSACondition.toObj(), null, 2));

// Example 5: Complex usage with compound condition
import { CompoundCondition } from '../src/conditions/compound-condition';
import { TimeCondition } from '../src/conditions/base/time';

const timeCondition = new TimeCondition({
  returnValueTest: {
    comparator: '>=',
    value: 1643723400,
  },
  chain: 1,
  method: 'blocktime',
});

const compoundCondition = CompoundCondition.and([
  basicECDSACondition,
  timeCondition,
]);

console.log('\nCompound condition with ECDSA and time conditions:');
console.log(JSON.stringify(compoundCondition.toObj(), null, 2));

// Example 6: Real-world usage scenario
console.log('\n=== Real-world Usage Scenario ===');

// This condition checks that:
// 1. The current time is after a specific timestamp
// 2. The user has provided a valid ECDSA signature for a specific message
const authorizationCondition = CompoundCondition.and([
  new TimeCondition({
    returnValueTest: {
      comparator: '>=',
      value: Math.floor(Date.now() / 1000), // Current timestamp
    },
    chain: 1,
    method: 'blocktime',
  }),
  new ECDSACondition({
    message: 'I authorize access to this encrypted data',
    signature: ':userSignature',
    verifyingKey: ':userPublicKey',
    curve: 'secp256k1',
  }),
]);

console.log('Authorization condition:');
console.log(JSON.stringify(authorizationCondition.toObj(), null, 2));

console.log('\n=== Supported Curves ===');
console.log('The ECDSA condition supports the following curves:');
console.log('- secp256k1 (Bitcoin, Ethereum)');
console.log('- secp256r1 (P-256, widely used in TLS)');
console.log('- secp384r1 (P-384)');
console.log('- secp521r1 (P-521)');

console.log('\n=== Context Variables ===');
console.log('The following context variables are commonly used:');
console.log('- :ecdsaMessage (default) - The message that was signed');
console.log('- :ecdsaSignature (default) - The signature to verify');
console.log('- :userAddress - The user\'s address (from taco-auth)');
console.log('- Custom context variables like :userMessage, :userSignature, etc.');

console.log('\n=== Usage Notes ===');
console.log('1. The verifying key must be provided as a hex string');
console.log('2. The signature must be provided as a hex string');
console.log('3. The message can be a string or a context variable');
console.log('4. The curve defaults to secp256k1 if not specified');
console.log('5. Context variables are resolved at execution time'); 