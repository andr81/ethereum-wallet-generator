import { HDNodeWallet } from "ethers";

// Public example. Supply the XPUB securely from your server code;
// do not pass it to this example on the command line in production.
//
// Two export levels exist and they need DIFFERENT derivation. Both reach the same
// standard BIP-44 address m/44'/60'/0'/0/<index>; mixing them up silently derives
// one level too deep and hands out addresses no ordinary wallet will show.

const index = 0;

// Account XPUB, m/44'/60'/0' (depth 3) -- the "Account Extended Public Key" field
// in BIP-39 tools, and what hardware wallets export.
const accountXpub = "xpub_REPLACE_WITH_YOUR_ACCOUNT_XPUB";
const fromAccount = HDNodeWallet.fromExtendedKey(accountXpub);
console.log(fromAccount.deriveChild(0).deriveChild(index).address);

// Branch XPUB, m/44'/60'/0'/0 (depth 4) -- the "BIP32 Extended Public Key" field.
const branchXpub = "xpub_REPLACE_WITH_YOUR_BRANCH_XPUB";
const fromBranch = HDNodeWallet.fromExtendedKey(branchXpub);
console.log(fromBranch.deriveChild(index).address);

// Guard your input: check .depth is the level your derivation assumes.
