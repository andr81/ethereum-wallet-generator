import { HDNodeWallet, getAddress } from "ethers";
import { assertNoExternalNetwork, BASE_PATH } from "./security.mjs";

const TEST_MNEMONIC = "test test test test test test test test test test test junk";
const EXPECTED_ADDRESS = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";

try {
  assertNoExternalNetwork();

  const accountNode = HDNodeWallet.fromPhrase(TEST_MNEMONIC, "", BASE_PATH);
  const privateChild = accountNode.deriveChild(0);
  const xpub = accountNode.neuter().extendedKey;
  const publicNode = HDNodeWallet.fromExtendedKey(xpub);
  const publicChild = publicNode.deriveChild(0);

  if (getAddress(privateChild.address) !== EXPECTED_ADDRESS) {
    throw new Error(
      `Address ${BASE_PATH}/0 did not match the expected one: ${privateChild.address}`,
    );
  }

  if (getAddress(publicChild.address) !== getAddress(privateChild.address)) {
    throw new Error("The XPUB-derived address did not match the private HD node address.");
  }

  console.log("SELF-TEST: OK");
  console.log(`Path: ${BASE_PATH}/0`);
  console.log(`Expected address: ${EXPECTED_ADDRESS}`);
  console.log("The XPUB-derived address matches the private HD node address.");
  console.log("No external network interfaces present.");
  console.log(
    "WARNING: the test seed phrase used here is public and must never hold money.",
  );
} catch (error) {
  console.error(`SELF-TEST: FAILED: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}
