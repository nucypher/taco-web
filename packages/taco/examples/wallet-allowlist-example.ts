/**
 * Example demonstrating how to use the WalletAllowlistCondition
 * 
 * This is a gas-free, off-chain condition that grants decryption permissions
 * to a predefined list of wallet addresses.
 */

async function walletAllowlistExample() {
  // Import the relevant modules
  const taco = await import('../src/index');
  const { predefined } = await import('../src/conditions');

  console.log('Wallet Allowlist Example');

  // Create a simple condition allowing specific wallet addresses to decrypt
  // Addresses must be in checksummed format 
  // The condition is satisfied when the requester proves control of one of the
  // specified addresses (through wallet signature verification handled by auth providers)
  const walletCondition = new predefined.walletAllowlist.WalletOwnership({
    addresses: [
      '0x1e988ba4692e52Bc50b375bcC8585b95c48AaD77',
      '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
      '0x0000000000000000000000000000000000000001',
    ],
  });

  // View the condition's object representation - what gets stored on-chain
  console.log('Wallet Allowlist Condition:', walletCondition.toObj());

  // In a real app, you would encrypt data with this condition
  // const encrypter = await taco.conditions.getEncrypter({
  //   conditions: walletCondition,
  // });
  // const ciphertext = await encrypter.encrypt('secret data');

  // Check if a specific address is in the allowlist
  const addresses = walletCondition.toObj().addresses;
  const addressToCheck = '0x1e988ba4692e52Bc50b375bcC8585b95c48AaD77';
  const isAllowed = addresses.some(
    (addr: string) => addr.toLowerCase() === addressToCheck.toLowerCase()
  );

  console.log(`Is address ${addressToCheck} allowed? ${isAllowed}`);

  // Check a non-allowed address
  const nonAllowedAddress = '0x0000000000000000000000000000000000000099';
  const isNonAllowedAddressAllowed = addresses.some(
    (addr: string) => addr.toLowerCase() === nonAllowedAddress.toLowerCase()
  );

  console.log(
    `Is address ${nonAllowedAddress} allowed? ${isNonAllowedAddressAllowed}`
  );
}

walletAllowlistExample().catch(console.error);
