import { db, wallets, type InsertWallet } from '../../db/index.js';
import { eq, and } from 'drizzle-orm';
import { isValidEthereumAddress } from '../../auth/signature.js';
import { logger } from '../../utils/logger.js';

export async function addWallet(
  userId: number,
  address: string,
  label: string
): Promise<any> {
  if (!isValidEthereumAddress(address)) {
    throw new Error('Invalid Ethereum address format');
  }

  const existing = await db.query.wallets.findFirst({
    where: and(
      eq(wallets.userId, userId),
      eq(wallets.address, address.toLowerCase())
    ),
  });

  if (existing) {
    throw new Error('Wallet already added');
  }

  const userWallets = await db.query.wallets.findMany({
    where: eq(wallets.userId, userId),
  });

  const isFirstWallet = userWallets.length === 0;

  const insertWallet: InsertWallet = {
    userId,
    address: address.toLowerCase(),
    label,
    isActive: isFirstWallet,
  };

  const [wallet] = await db.insert(wallets).values(insertWallet).returning();

  logger.info('Wallet added', { userId, walletId: wallet.id, address, label });

  return wallet;
}

export async function removeWallet(userId: number, walletId: number): Promise<void> {
  const wallet = await db.query.wallets.findFirst({
    where: and(eq(wallets.id, walletId), eq(wallets.userId, userId)),
  });

  if (!wallet) {
    throw new Error('Wallet not found');
  }

  await db.delete(wallets).where(eq(wallets.id, walletId));

  logger.info('Wallet removed', { userId, walletId });

  if (wallet.isActive) {
    const remainingWallets = await db.query.wallets.findMany({
      where: eq(wallets.userId, userId),
    });

    if (remainingWallets.length > 0) {
      await db
        .update(wallets)
        .set({ isActive: true })
        .where(eq(wallets.id, remainingWallets[0].id));
    }
  }
}

export async function switchActiveWallet(userId: number, walletId: number): Promise<any> {
  const wallet = await db.query.wallets.findFirst({
    where: and(eq(wallets.id, walletId), eq(wallets.userId, userId)),
  });

  if (!wallet) {
    throw new Error('Wallet not found');
  }

  await db
    .update(wallets)
    .set({ isActive: false })
    .where(eq(wallets.userId, userId));

  await db
    .update(wallets)
    .set({ isActive: true })
    .where(eq(wallets.id, walletId));

  logger.info('Active wallet switched', { userId, walletId });

  const updatedWallet = await db.query.wallets.findFirst({
    where: eq(wallets.id, walletId),
  });

  return updatedWallet;
}

export async function listUserWallets(userId: number): Promise<any[]> {
  const userWallets = await db.query.wallets.findMany({
    where: eq(wallets.userId, userId),
    orderBy: (wallets, { desc }) => [desc(wallets.isActive), desc(wallets.createdAt)],
  });

  return userWallets;
}

export async function getActiveWallet(userId: number): Promise<any | null> {
  const activeWallet = await db.query.wallets.findFirst({
    where: and(eq(wallets.userId, userId), eq(wallets.isActive, true)),
  });

  return activeWallet;
}
