import { ECDSACondition } from '../src/conditions/base/ecdsa';

// Example 1: ECDSA condition with hardcoded message, dynamic signature
const attestationCondition = new ECDSACondition({
  message:
    'I attest that I am authorized to access this data and agree to use it responsibly',
  signature: ':userSignature', // User provides signature at runtime
  curve: 'SECP256k1',
});

// Example 2: ECDSA condition with context variables
const dynamicECDSACondition = new ECDSACondition({
  message: ':userMessage',
  signature: ':userSignature',
  curve: 'SECP256k1',
});

// Example 3: ECDSA condition with different curve
const p256ECDSACondition = new ECDSACondition({
  message: 'hello world',
  signature: ':signature',
  curve: 'NIST256p',
});

// This ECDSA condition uses the default context variables
const defaultECDSACondition = new ECDSACondition({
  message: ':message', // Default context variable
  signature: ':signature', // Default context variable
  curve: 'SECP256k1',
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
    curve: 'SECP256k1',
  }),
]);

// Example 7: Edwards curve example (Ed25519)
const ed25519Condition = new ECDSACondition({
  message: 'Edwards curve signature verification',
  signature: ':ed25519Signature',
  curve: 'Ed25519',
});

// Example 8: Brainpool curve example
const brainpoolCondition = new ECDSACondition({
  message: 'Brainpool P-256 verification',
  signature: ':brainpoolSignature',
  curve: 'BRAINPOOLP256r1',
});

// Example 9: NIST P-384 curve
const p384Condition = new ECDSACondition({
  message: 'High-security P-384 verification',
  signature: ':p384Signature',
  curve: 'NIST384p',
});
