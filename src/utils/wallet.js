export function normalizeWallet(wallet) {
  return String(wallet || "").trim().toLowerCase();
}

export function isValidEvmAddress(wallet) {
  return /^0x[a-fA-F0-9]{40}$/.test(String(wallet || "").trim());
}

export function parseWalletList(text) {
  return String(text || "")
    .split(/[\n,\s]+/)
    .map(normalizeWallet)
    .filter(Boolean);
}