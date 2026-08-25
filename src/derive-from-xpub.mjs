import { HDNodeWallet } from "ethers";

// Public example. Supply the XPUB securely from your server code;
// do not pass it to this example on the command line in production.
const xpub = "xpub_REPLACE_WITH_YOUR_ACCOUNT_XPUB";
const index = 0;

const publicNode = HDNodeWallet.fromExtendedKey(xpub);
const child = publicNode.deriveChild(index);
console.log(child.address);

