import { randomBytes } from "node:crypto";
import { HDNodeWallet, Mnemonic, getAddress } from "ethers";
import {
  assertNoExternalNetwork,
  BASE_PATH,
  parseAddressCount,
  wipeBytes,
} from "./security.mjs";

let entropy;
let mnemonic;

try {
  assertNoExternalNetwork();
  const count = parseAddressCount(process.argv[2]);

  entropy = randomBytes(32);
  mnemonic = Mnemonic.fromEntropy(entropy);

  const masterNode = HDNodeWallet.fromPhrase(mnemonic.phrase, "", "m");
  const accountNode = HDNodeWallet.fromPhrase(mnemonic.phrase, "", BASE_PATH);
  const publicNode = accountNode.neuter();

  console.log("\n=== СЕКРЕТНЫЕ ДАННЫЕ: ПЕРЕПИШИТЕ НА БУМАГУ ===\n");
  console.log(`SEED PHRASE: ${mnemonic.phrase}`);
  console.log(`DERIVATION PATH: ${BASE_PATH}`);
  console.log(`MASTER FINGERPRINT: ${masterNode.fingerprint}`);
  console.log(`ACCOUNT PUBLIC KEY: ${publicNode.publicKey}`);
  console.log(`XPUB: ${publicNode.extendedKey}`);

  for (let index = 0; index < count; index += 1) {
    const child = publicNode.deriveChild(index);
    console.log(`\n--- ADDRESS ${index} ---`);
    console.log(`INDEX: ${index}`);
    console.log(`FULL DERIVATION PATH: ${BASE_PATH}/${index}`);
    console.log(`ETHEREUM ADDRESS: ${getAddress(child.address)}`);
    console.log(`COMPRESSED PUBLIC KEY: ${child.publicKey}`);
  }

  console.log(
    "\nВНИМАНИЕ: seed-фраза полностью контролирует ETH и все ERC-20 токены на этих адресах. " +
      "Не храните её на компьютере и никому не передавайте.\n",
  );
} catch (error) {
  console.error(`ОШИБКА: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
} finally {
  wipeBytes(entropy);
  mnemonic = undefined;
}

