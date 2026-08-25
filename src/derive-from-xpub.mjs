import { HDNodeWallet } from "ethers";

// Публичный пример. Подставляйте XPUB безопасным способом в коде сервера;
// не передавайте его этому примеру через командную строку в production.
const xpub = "xpub_REPLACE_WITH_YOUR_ACCOUNT_XPUB";
const index = 0;

const publicNode = HDNodeWallet.fromExtendedKey(xpub);
const child = publicNode.deriveChild(index);
console.log(child.address);

