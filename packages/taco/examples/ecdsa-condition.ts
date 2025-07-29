import { ECDSACondition } from '../src/conditions/base/ecdsa';

// Example verifying keys (public keys) - in production these would come from actual key pairs
const EXAMPLE_VERIFYING_KEY_SECP256K1 =
  '0437a1c9c0e8ff7a2e0e0a9b5a8c3d5b7e9f1c3e5a7b9d1f3e5c7a9b1d3f5e7c9a1e3f5a7b9c1d3e5f7a9b1c3d5e7f9a1b3c5d7e9f1a3b5c7d9e1f3a5';
const EXAMPLE_VERIFYING_KEY_NIST256P =
  '0423456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
const EXAMPLE_VERIFYING_KEY_ED25519 =
  '0fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210fedcba987654321';

// Example 1: ECDSA condition with hardcoded message, dynamic signature
const attestationCondition = new ECDSACondition({
  message:
    'I attest that I am authorized to access this data and agree to use it responsibly',
  signature: ':userSignature', // User provides signature at runtime
  verifyingKey: EXAMPLE_VERIFYING_KEY_SECP256K1,
  curve: 'SECP256k1',
});

// Example 2: ECDSA condition with context variables
const dynamicECDSACondition = new ECDSACondition({
  message: ':userMessage',
  signature: ':userSignature',
  verifyingKey: EXAMPLE_VERIFYING_KEY_SECP256K1,
  curve: 'SECP256k1',
});

// Example 3: ECDSA condition with different curve
const p256ECDSACondition = new ECDSACondition({
  message: 'hello world',
  signature: ':signature',
  verifyingKey: EXAMPLE_VERIFYING_KEY_NIST256P,
  curve: 'NIST256p',
});

// This ECDSA condition uses the default context variables (:message and :signature)
const defaultECDSACondition = new ECDSACondition({
  message: ':message', // Default context variable
  signature: ':signature', // Default context variable
  verifyingKey: EXAMPLE_VERIFYING_KEY_SECP256K1,
  curve: 'SECP256k1',
});

// For compound conditions with multiple ECDSA conditions, use custom context parameters
// to avoid variable name conflicts
const compoundECDSACondition = new CompoundCondition({
  operator: 'and',
  operands: [
    new ECDSACondition({
      message: ':message1', // Custom context parameter
      signature: ':signature1', // Custom context parameter
      verifyingKey: EXAMPLE_VERIFYING_KEY_SECP256K1,
      curve: 'SECP256k1',
    }),
    new ECDSACondition({
      message: ':message2', // Different context parameter
      signature: ':signature2', // Different context parameter
      verifyingKey: EXAMPLE_VERIFYING_KEY_NIST256P,
      curve: 'NIST256p',
    }),
  ],
});

// Example 5: Complex usage with compound condition
import { TimeCondition } from '../src/conditions/base/time';
import { CompoundCondition } from '../src/conditions/compound-condition';

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

// Example 6: Real-world usage scenario
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
    verifyingKey: EXAMPLE_VERIFYING_KEY_SECP256K1,
    curve: 'SECP256k1',
  }),
]);

// Example 7: Edwards curve example (Ed25519)
const ed25519Condition = new ECDSACondition({
  message: 'Edwards curve signature verification',
  signature: ':ed25519Signature',
  verifyingKey: EXAMPLE_VERIFYING_KEY_ED25519,
  curve: 'Ed25519',
});

// Example 8: Brainpool curve example
const brainpoolCondition = new ECDSACondition({
  message: 'Brainpool P-256 verification',
  signature: ':brainpoolSignature',
  verifyingKey: EXAMPLE_VERIFYING_KEY_SECP256K1,
  curve: 'BRAINPOOLP256r1',
});

// Example 9: NIST P-384 curve
const p384Condition = new ECDSACondition({
  message: 'High-security P-384 verification',
  signature: ':p384Signature',
  verifyingKey: EXAMPLE_VERIFYING_KEY_NIST256P,
  curve: 'NIST384p',
});
