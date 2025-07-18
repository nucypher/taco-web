import { ECDSACondition } from '../src/conditions/base/ecdsa';

// Example of creating an ECDSA condition
console.log('=== ECDSA Condition Example ===');

// Example 1: Practical ECDSA condition - attestation with hardcoded message, dynamic signature
// This is useful for scenarios where users must sign a specific agreement or attestation
const attestationCondition = new ECDSACondition({
  message: 'I attest that I am authorized to access this data and agree to use it responsibly',
  signature: ':userSignature', // User provides signature at runtime
  verifyingKey: '04a34b99f22c790c4e36b2b3c2c35a36db06226e41c692fc82b8b56ac1c540c5bd5b8dec5235a0fa8722476c7709c02559e3aa73aa03918ba2d492eea75abea235',
  curve: 'SECP256k1',
});

console.log('Practical ECDSA Condition (Attestation):');
console.log(JSON.stringify(attestationCondition.toObj(), null, 2));
console.log('Note: User must sign the exact message "I attest..." with their private key to gain access');

// Example 2: ECDSA condition with context variables
const dynamicECDSACondition = new ECDSACondition({
  message: ':userMessage',
  signature: ':userSignature',
  verifyingKey: '04a34b99f22c790c4e36b2b3c2c35a36db06226e41c692fc82b8b56ac1c540c5bd5b8dec5235a0fa8722476c7709c02559e3aa73aa03918ba2d492eea75abea235',
  curve: 'SECP256k1',
});

console.log('\nDynamic ECDSA Condition (with context variables):');
console.log(JSON.stringify(dynamicECDSACondition.toObj(), null, 2));

// Example 3: ECDSA condition with different curve
const p256ECDSACondition = new ECDSACondition({
  message: 'Authenticated message',
  signature: ':ecdsaSignature',
  verifyingKey: '04a34b99f22c790c4e36b2b3c2c35a36db06226e41c692fc82b8b56ac1c540c5bd5b8dec5235a0fa8722476c7709c02559e3aa73aa03918ba2d492eea75abea235',
  curve: 'NIST256p',
});

console.log('\nECDSA Condition with P-256 curve:');
console.log(JSON.stringify(p256ECDSACondition.toObj(), null, 2));

// Example 4: Using defaults for message and signature
const defaultECDSACondition = new ECDSACondition({
  message: ':ecdsaMessage', // Default context variable
  signature: ':ecdsaSignature', // Default context variable
  verifyingKey: '04a34b99f22c790c4e36b2b3c2c35a36db06226e41c692fc82b8b56ac1c540c5bd5b8dec5235a0fa8722476c7709c02559e3aa73aa03918ba2d492eea75abea235',
  curve: 'SECP256k1', // Default curve
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
  attestationCondition,
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
    curve: 'SECP256k1',
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

console.log('\n=== Practical Use Cases ===');
console.log('1. Attestation Pattern (Example 1): Fixed message + dynamic signature');
console.log('   - User must sign a specific agreement or attestation');
console.log('   - Verifies user consent to specific terms');
console.log('   - Common for compliance and legal requirements');

console.log('\n2. Dynamic Pattern (Example 2): Context variables for both message and signature');
console.log('   - Most flexible approach');
console.log('   - Message and signature provided at decryption time');
console.log('   - Useful for challenge-response scenarios');

console.log('\n3. User Identity Pattern (Example 6): User address as message');
console.log('   - Proves control of both wallet and ECDSA key');
console.log('   - Combines wallet authentication with custom key verification');
console.log('   - Useful for multi-factor authentication');

console.log('\n=== Anti-Patterns to Avoid ===');
console.log('❌ DO NOT hardcode both message AND signature:');
console.log('   - This makes the condition always pass or always fail');
console.log('   - No dynamic verification occurs');
console.log('   - Not useful for access control');
console.log('   - Example: { message: "fixed", signature: "0x123...", ... }');

console.log('\n✅ DO use these patterns instead:');
console.log('   - Fixed message + dynamic signature (attestations)');
console.log('   - Dynamic message + dynamic signature (flexible auth)');
console.log('   - Context variables for runtime resolution'); 