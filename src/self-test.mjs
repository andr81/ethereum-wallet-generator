import { HDNodeWallet, Mnemonic, getAddress } from "ethers";
import {
  ACCOUNT_PATH,
  accountPath,
  MAX_ACCOUNT_INDEX,
  parseAccountIndex,
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

// BIP-44 account 1 of the same public phrase, recorded with an independent
// implementation (Python bip_utils), so this does not check ethers against itself.
const ACCOUNT_1_XPUB =
  "xpub6Ce9NcJvTk372KjsGfWqbcex5DumjpNquQLApoeQUavSCjEc823BV1tb4rXUuPuht8h2hSxkg2EXUaKUJmniJvRZAELxypsCzBFdtosmV76";
const ACCOUNT_1_DEPOSITS = [
  "0x8C8d35429F74ec245F8Ef2f4Fd1e551cFF97d650",
  "0x40FBBE484b8Ee6139Af08446950B088e10b2306A",
  "0x2b382887D362cCae885a421C978c7e998D3c95a6",
];
const ACCOUNT_1_GAS_WALLET = "0xcbE3C273fd195410Af072C9E731ebc8bf2de041d";
const ACCOUNT_0_GAS_WALLET = "0x4b39F7b0624b9dB86AD293686bc38B903142dbBc";

function check(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function rejects(rawValue, parse = parseAddressCount) {
  try {
    parse(rawValue);
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

  // A second project on the same seed lives on its own account: none of its
  // deposit addresses or its gas wallet may coincide with account 0.
  check(accountPath(0) === ACCOUNT_PATH, `accountPath(0) must equal ${ACCOUNT_PATH}.`);
  const master = HDNodeWallet.fromPhrase(TEST_MNEMONIC, "", "m");
  const account1 = master.derivePath(accountPath(1));
  const account1Public = HDNodeWallet.fromExtendedKey(account1.neuter().extendedKey);
  check(account1Public.extendedKey === ACCOUNT_1_XPUB, "Account 1 XPUB did not match the vector.");
  check(account1Public.depth === 3, `Account 1 XPUB must be at depth 3, got ${account1Public.depth}.`);
  check(account1Public.index === 0x80000001, "Account 1 XPUB must carry hardened index 1'.");
  check(
    HDNodeWallet.fromExtendedKey(account1.extendedKey).neuter().extendedKey === ACCOUNT_1_XPUB,
    "Account 1 XPRV does not neuter to the account 1 XPUB.",
  );
  const account0Addresses = new Set([ACCOUNT_0_GAS_WALLET]);
  for (let index = 0; index < 3; index += 1) {
    account0Addresses.add(getAddress(accountPublic.deriveChild(0).deriveChild(index).address));
  }
  ACCOUNT_1_DEPOSITS.forEach((expected, index) => {
    const derived = getAddress(account1Public.deriveChild(0).deriveChild(index).address);
    check(derived === expected, `Account 1 deposit ${index} was ${derived}, expected ${expected}.`);
    check(!account0Addresses.has(derived), `Account 1 deposit ${index} collides with account 0.`);
  });
  const gas0 = getAddress(accountPublic.deriveChild(1).deriveChild(0).address);
  const gas1 = getAddress(account1Public.deriveChild(1).deriveChild(0).address);
  check(gas0 === ACCOUNT_0_GAS_WALLET, `Account 0 gas wallet was ${gas0}.`);
  check(gas1 === ACCOUNT_1_GAS_WALLET, `Account 1 gas wallet was ${gas1}.`);
  check(parseAccountIndex("0") === 0 && parseAccountIndex("1") === 1, "Account 0/1 rejected.");
  check(
    parseAccountIndex(String(MAX_ACCOUNT_INDEX)) === MAX_ACCOUNT_INDEX,
    "The largest account index was rejected.",
  );
  for (const rejected of ["", "-1", "01", "1.5", "1e3", "0x1", String(MAX_ACCOUNT_INDEX + 1), undefined]) {
    check(
      rejects(rejected, parseAccountIndex),
      `Account ${JSON.stringify(rejected)} should have been rejected.`,
    );
  }

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
  console.log("Account 1 matches independent vectors and shares no address with account 0.");
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
