import { HDNodeWallet, Mnemonic, getAddress } from "ethers";
import {
  ACCOUNT_PATH,
  assertNoExternalNetwork,
  BASE_PATH,
  DEFAULT_ADDRESS_COUNT,
  MAX_ADDRESS_COUNT,
  parseAddressCount,
} from "./security.mjs";

const TEST_MNEMONIC = "test test test test test test test test test test test junk";
const EXPECTED_ADDRESS = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";

// The generator builds its phrase with Mnemonic.fromEntropy over 32 random bytes.
// Exercising that path needs a deterministic vector, so this uses 32 zero bytes —
// the public BIP-39 "abandon ... art" mnemonic. It is never a real secret.
const TEST_ENTROPY = new Uint8Array(32);
const EXPECTED_24_WORD_PHRASE =
  "abandon abandon abandon abandon abandon abandon abandon abandon " +
  "abandon abandon abandon abandon abandon abandon abandon abandon " +
  "abandon abandon abandon abandon abandon abandon abandon art";
const EXPECTED_24_WORD_ADDRESS = "0xF278cF59F82eDcf871d630F28EcC8056f25C1cdb";

function check(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function rejects(rawValue) {
  try {
    parseAddressCount(rawValue);
  } catch {
    return true;
  }
  return false;
}

try {
  assertNoExternalNetwork();

  const accountNode = HDNodeWallet.fromPhrase(TEST_MNEMONIC, "", "m").derivePath(BASE_PATH);
  const privateChild = accountNode.deriveChild(0);
  const xpub = accountNode.neuter().extendedKey;
  const publicChild = HDNodeWallet.fromExtendedKey(xpub).deriveChild(0);

  check(
    getAddress(privateChild.address) === EXPECTED_ADDRESS,
    `Address ${BASE_PATH}/0 did not match the expected one: ${privateChild.address}`,
  );
  check(
    getAddress(publicChild.address) === getAddress(privateChild.address),
    "The XPUB-derived address did not match the private HD node address.",
  );

  // The two export keys must land on the same standard BIP-44 addresses, each via
  // its own derivation. Getting this wrong hands a server foreign addresses.
  const accountPublic = HDNodeWallet.fromExtendedKey(
    HDNodeWallet.fromPhrase(TEST_MNEMONIC, "", "m").derivePath(ACCOUNT_PATH).neuter().extendedKey,
  );
  const branchPublic = HDNodeWallet.fromExtendedKey(xpub);
  check(accountPublic.depth === 3, `Account XPUB must be at depth 3, got ${accountPublic.depth}.`);
  check(branchPublic.depth === 4, `Branch XPUB must be at depth 4, got ${branchPublic.depth}.`);
  for (let index = 0; index < 3; index += 1) {
    const expected = getAddress(
      HDNodeWallet.fromPhrase(TEST_MNEMONIC, "", `${BASE_PATH}/${index}`).address,
    );
    check(
      getAddress(branchPublic.deriveChild(index).address) === expected,
      `Branch XPUB child(${index}) did not match ${BASE_PATH}/${index}.`,
    );
    check(
      getAddress(accountPublic.deriveChild(0).deriveChild(index).address) === expected,
      `Account XPUB child(0).child(${index}) did not match ${BASE_PATH}/${index}.`,
    );
  }

  const generated = Mnemonic.fromEntropy(TEST_ENTROPY);
  check(
    generated.phrase === EXPECTED_24_WORD_PHRASE,
    "Mnemonic.fromEntropy over 32 bytes did not produce the expected 24-word phrase.",
  );
  const generatedChild = HDNodeWallet.fromPhrase(generated.phrase, "", "m")
    .derivePath(BASE_PATH)
    .deriveChild(0);
  check(
    getAddress(generatedChild.address) === EXPECTED_24_WORD_ADDRESS,
    `The 24-word vector produced ${generatedChild.address} instead of ${EXPECTED_24_WORD_ADDRESS}.`,
  );

  check(
    parseAddressCount(undefined) === DEFAULT_ADDRESS_COUNT,
    "An omitted count did not fall back to the default.",
  );
  check(parseAddressCount("1") === 1, "Count 1 was not accepted.");
  check(
    parseAddressCount(String(MAX_ADDRESS_COUNT)) === MAX_ADDRESS_COUNT,
    `Count ${MAX_ADDRESS_COUNT} was not accepted.`,
  );
  for (const rejected of ["0", String(MAX_ADDRESS_COUNT + 1), "-1", "1.5", "abc", "", "1e3", "0x10"]) {
    check(rejects(rejected), `Count ${JSON.stringify(rejected)} should have been rejected.`);
  }

  console.log("SELF-TEST: OK");
  console.log(`Path: ${BASE_PATH}/0`);
  console.log(`Expected address: ${EXPECTED_ADDRESS}`);
  console.log("The XPUB-derived address matches the private HD node address.");
  console.log("Account XPUB (depth 3) and branch XPUB (depth 4) agree on the same addresses.");
  console.log(`24-word entropy vector resolves to ${EXPECTED_24_WORD_ADDRESS}.`);
  console.log("Address-count validation accepts 1 and 1000 and rejects out-of-range input.");
  console.log("No external network interfaces present.");
  console.log(
    "WARNING: both test seed phrases used here are public and must never hold money.",
  );
} catch (error) {
  console.error(`SELF-TEST: FAILED: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}
