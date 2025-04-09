/**
 * Errors during encryption.
 */
export class EncryptionError extends Error {
    readonly code: EncryptionErrorCode;

    constructor(code: EncryptionErrorCode) {
        let message: string;
        switch (code) {
            case EncryptionErrorCode.PlaintextTooLarge:
                message = 'Plaintext is too large to encrypt';
                break;
            default:
                message = 'Unknown encryption error';
        }
        super(message);
        this.name = 'EncryptionError';
        this.code = code;
    }
}

/**
 * Error codes for encryption operations.
 */
export enum EncryptionErrorCode {
    PlaintextTooLarge = 'PlaintextTooLarge',
}

/**
 * Errors during decryption.
 */
export class DecryptionError extends Error {
    readonly code: DecryptionErrorCode;
    readonly details?: string;

    constructor(code: DecryptionErrorCode, details?: string) {
        let message: string;
        switch (code) {
            case DecryptionErrorCode.CiphertextTooShort:
                message = 'The ciphertext must include the nonce';
                break;
            case DecryptionErrorCode.AuthenticationFailed:
                message = 'Decryption of ciphertext failed: ' +
                    'either someone tampered with the ciphertext or ' +
                    'you are using an incorrect decryption key.';
                break;
            case DecryptionErrorCode.DeserializationFailed:
                message = details ? `deserialization failed: ${details}` : 'deserialization failed';
                break;
            default:
                message = 'Unknown decryption error';
        }
        super(message);
        this.name = 'DecryptionError';
        this.code = code;
    }
}

/**
 * Error codes for decryption operations.
 */
export enum DecryptionErrorCode {
    CiphertextTooShort = 'CiphertextTooShort',
    AuthenticationFailed = 'AuthenticationFailed',
    DeserializationFailed = 'DeserializationFailed',
}
