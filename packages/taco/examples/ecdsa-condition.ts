import { ECDSACondition } from '../src/conditions/base/ecdsa';

// Example 1: Practical ECDSA condition - attestation with hardcoded message, dynamic signature
const attestationCondition = new ECDSACondition({
  message: 'I attest that I am authorized to access this data and agree to use it responsibly',
  signature: ':userSignature', // User provides signature at runtime
  verifyingKey: '04a34b99f22c790c4e36b2b3c2c35a36db06226e41c692fc82b8b56ac1c540c5bd5b8dec5235a0fa8722476c7709c02559e3aa73aa03918ba2d492eea75abea235',
  curve: 'SECP256k1',
});

// Example 2: ECDSA condition with context variables
const dynamicECDSACondition = new ECDSACondition({
  message: ':userMessage',
  signature: ':userSignature',
  verifyingKey: '04a34b99f22c790c4e36b2b3c2c35a36db06226e41c692fc82b8b56ac1c540c5bd5b8dec5235a0fa8722476c7709c02559e3aa73aa03918ba2d492eea75abea235',
  curve: 'SECP256k1',
});

// Example 3: ECDSA condition with different curve
const p256ECDSACondition = new ECDSACondition({
  message: 'Authenticated message',
  signature: ':ecdsaSignature',
  verifyingKey: '04a34b99f22c790c4e36b2b3c2c35a36db06226e41c692fc82b8b56ac1c540c5bd5b8dec5235a0fa8722476c7709c02559e3aa73aa03918ba2d492eea75abea235',
  curve: 'NIST256p',
});

// Example 4: Using defaults for message and signature
const defaultECDSACondition = new ECDSACondition({
  message: ':ecdsaMessage', // Default context variable
  signature: ':ecdsaSignature', // Default context variable
  verifyingKey: '04a34b99f22c790c4e36b2b3c2c35a36db06226e41c692fc82b8b56ac1c540c5bd5b8dec5235a0fa8722476c7709c02559e3aa73aa03918ba2d492eea75abea235',
  curve: 'SECP256k1', // Default curve
});

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
    verifyingKey: ':userPublicKey',
    curve: 'SECP256k1',
  }),
]);

// Example 7: Edwards curve example (Ed25519)
const ed25519Condition = new ECDSACondition({
  message: 'Edwards curve signature verification',
  signature: ':ed25519Signature',
  verifyingKey: 'a34b99f22c790c4e36b2b3c2c35a36db06226e41c692fc82b8b56ac1c540c5bd',
  curve: 'Ed25519',
});

// Example 8: Brainpool curve example
const brainpoolCondition = new ECDSACondition({
  message: 'Brainpool P-256 verification',
  signature: ':brainpoolSignature', 
  verifyingKey: '04a34b99f22c790c4e36b2b3c2c35a36db06226e41c692fc82b8b56ac1c540c5bd5b8dec5235a0fa8722476c7709c02559e3aa73aa03918ba2d492eea75abea235',
  curve: 'BRAINPOOLP256r1',
});

// Example 9: NIST P-384 curve 
const p384Condition = new ECDSACondition({
  message: 'High-security P-384 verification',
  signature: ':p384Signature',
  verifyingKey: '04a34b99f22c790c4e36b2b3c2c35a36db06226e41c692fc82b8b56ac1c540c5bd5b8dec5235a0fa8722476c7709c02559e3aa73aa03918ba2d492eea75abea235',
  curve: 'NIST384p',
}); 