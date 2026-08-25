import { Writable } from "node:stream";
import { createInterface } from "node:readline";
import { HDNodeWallet, Mnemonic, getAddress } from "ethers";
import {
  assertNoExternalNetwork,
  BASE_PATH,
  parseAddressCount,
} from "./security.mjs";

let seedPhrase = "";
let mnemonic;
let masterNode;
let accountNode;
let publicNode;

const hiddenOutput = new Writable({
  write(_chunk, _encoding, callback) {
    callback();
  },
});

async function readHiddenSeed() {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    throw new Error("Для скрытого ввода seed-фразы требуется интерактивный TTY.");
  }

  process.stdout.write("Введите seed-фразу (ввод скрыт): ");
  const readline = createInterface({
    input: process.stdin,
    output: hiddenOutput,
    terminal: true,
  });

  try {
    return await new Promise((resolve) => readline.question("", resolve));
  } finally {
    readline.close();
    process.stdout.write("\n");
  }
}

try {
  assertNoExternalNetwork();
  const count = parseAddressCount(process.argv[2]);
  seedPhrase = (await readHiddenSeed()).trim().replace(/\s+/g, " ");

  if (!Mnemonic.isValidMnemonic(seedPhrase)) {
    throw new Error("Seed-фраза не прошла проверку BIP-39.");
  }

  mnemonic = Mnemonic.fromPhrase(seedPhrase);
  masterNode = HDNodeWallet.fromPhrase(mnemonic.phrase, "", "m");
  accountNode = HDNodeWallet.fromPhrase(mnemonic.phrase, "", BASE_PATH);
  publicNode = accountNode.neuter();

  console.log("\n=== ДАННЫЕ ДЛЯ СРАВНЕНИЯ ===\n");
  console.log(`DERIVATION PATH: ${BASE_PATH}`);
  console.log(`MASTER FINGERPRINT: ${masterNode.fingerprint}`);
  console.log(`ACCOUNT PUBLIC KEY: ${publicNode.publicKey}`);
  console.log(`XPUB: ${publicNode.extendedKey}`);

  for (let index = 0; index < count; index += 1) {
    const child = publicNode.deriveChild(index);
    console.log(`\nINDEX: ${index}`);
    console.log(`FULL DERIVATION PATH: ${BASE_PATH}/${index}`);
    console.log(`ETHEREUM ADDRESS: ${getAddress(child.address)}`);
    console.log(`COMPRESSED PUBLIC KEY: ${child.publicKey}`);
  }

  console.log("\nСравните XPUB и адреса с первоначальной бумажной записью. Данные не сохранены.\n");
} catch (error) {
  console.error(`ОШИБКА: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
} finally {
  seedPhrase = "";
  mnemonic = undefined;
  masterNode = undefined;
  accountNode = undefined;
  publicNode = undefined;
}
