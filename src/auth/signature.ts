import { ethers } from 'ethers';

export function generateNonce(): string {
  return Math.floor(Math.random() * 1000000).toString();
}

export function createSignMessage(walletAddress: string, nonce: string): string {
  return `Welcome to AURA MCP Server!\n\nClick to sign in and accept the Terms of Service.\n\nThis request will not trigger a blockchain transaction or cost any gas fees.\n\nWallet address:\n${walletAddress}\n\nNonce:\n${nonce}`;
}

export function verifySignature(
  message: string,
  signature: string,
  expectedAddress: string
): boolean {
  try {
    const recoveredAddress = ethers.verifyMessage(message, signature);
    return recoveredAddress.toLowerCase() === expectedAddress.toLowerCase();
  } catch (error) {
    console.error('Signature verification error:', error);
    return false;
  }
}

export function isValidEthereumAddress(address: string): boolean {
  return ethers.isAddress(address);
}
