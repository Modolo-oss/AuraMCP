import { db, users, type InsertUser } from '../../db/index.js';
import { eq } from 'drizzle-orm';
import { generateToken } from '../../auth/jwt.js';
import { createSignMessage, verifySignature, isValidEthereumAddress, generateNonce } from '../../auth/signature.js';
import { logger } from '../../utils/logger.js';

const noncesStore: Map<string, { nonce: string; timestamp: number }> = new Map();
const NONCE_EXPIRY = 5 * 60 * 1000;

function cleanupExpiredNonces() {
  const now = Date.now();
  for (const [address, data] of noncesStore.entries()) {
    if (now - data.timestamp > NONCE_EXPIRY) {
      noncesStore.delete(address);
    }
  }
}

export async function requestNonce(walletAddress: string): Promise<{ nonce: string; message: string }> {
  if (!isValidEthereumAddress(walletAddress)) {
    throw new Error('Invalid Ethereum address format');
  }

  cleanupExpiredNonces();

  const nonce = generateNonce();
  const message = createSignMessage(walletAddress, nonce);

  noncesStore.set(walletAddress.toLowerCase(), {
    nonce,
    timestamp: Date.now(),
  });

  logger.info('Generated nonce for wallet', { walletAddress });

  return { nonce, message };
}

export async function verifyAndLogin(
  walletAddress: string,
  signature: string
): Promise<{ token: string; user: any; isNewUser: boolean }> {
  if (!isValidEthereumAddress(walletAddress)) {
    throw new Error('Invalid Ethereum address format');
  }

  const nonceData = noncesStore.get(walletAddress.toLowerCase());

  if (!nonceData) {
    throw new Error('Nonce not found or expired. Please request a new nonce.');
  }

  if (Date.now() - nonceData.timestamp > NONCE_EXPIRY) {
    noncesStore.delete(walletAddress.toLowerCase());
    throw new Error('Nonce expired. Please request a new nonce.');
  }

  const message = createSignMessage(walletAddress, nonceData.nonce);
  const isValid = verifySignature(message, signature, walletAddress);

  if (!isValid) {
    throw new Error('Invalid signature. Please try signing again.');
  }

  noncesStore.delete(walletAddress.toLowerCase());

  let user = await db.query.users.findFirst({
    where: eq(users.walletAddress, walletAddress.toLowerCase()),
  });

  let isNewUser = false;

  if (!user) {
    const insertUser: InsertUser = {
      walletAddress: walletAddress.toLowerCase(),
    };

    const [newUser] = await db.insert(users).values(insertUser).returning();
    user = newUser;
    isNewUser = true;

    logger.info('New user registered', { userId: user.id, walletAddress });
  } else {
    logger.info('User logged in', { userId: user.id, walletAddress });
  }

  const token = generateToken({
    userId: user.id,
    walletAddress: user.walletAddress,
  });

  return {
    token,
    user: {
      id: user.id,
      walletAddress: user.walletAddress,
      username: user.username,
      createdAt: user.createdAt,
    },
    isNewUser,
  };
}

export async function getUserById(userId: number) {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    with: {
      wallets: true,
      preferences: true,
    },
  });

  if (!user) {
    throw new Error('User not found');
  }

  return user;
}
