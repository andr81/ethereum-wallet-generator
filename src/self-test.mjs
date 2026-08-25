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
      `Адрес ${BASE_PATH}/0 не совпал с ожидаемым: ${privateChild.address}`,
    );
  }

  if (getAddress(publicChild.address) !== getAddress(privateChild.address)) {
    throw new Error("Адрес из XPUB не совпал с адресом из приватного HD-узла.");
  }

  console.log("SELF-TEST: OK");
  console.log(`Путь: ${BASE_PATH}/0`);
  console.log(`Ожидаемый адрес: ${EXPECTED_ADDRESS}`);
  console.log("Адрес из XPUB совпадает с адресом из приватного HD-узла.");
  console.log("Внешние сетевые интерфейсы отсутствуют.");
  console.log(
    "ВНИМАНИЕ: использованная тестовая seed-фраза публична и категорически не подходит для денег.",
  );
} catch (error) {
  console.error(`SELF-TEST: FAILED: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}
