import { db, preparedTransactions, type InsertPreparedTransaction } from '../db/index.js';
import { eq, lt } from 'drizzle-orm';
import { customAlphabet } from 'nanoid';

const nanoid = customAlphabet('abcdefghijklmnopqrstuvwxyz0123456789', 12);

export async function savePreparedTransaction(
  txData: any,
  chainId: number,
  fromToken: string,
  toToken: string,
  amount: string
): Promise<string> {
  const id = nanoid();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

  const insertData: InsertPreparedTransaction = {
    id,
    txData,
    chainId,
    fromToken,
    toToken,
    amount,
    expiresAt,
  };

  await db.insert(preparedTransactions).values(insertData);

  return id;
}

export async function getPreparedTransaction(id: string): Promise<any> {
  const tx = await db.query.preparedTransactions.findFirst({
    where: eq(preparedTransactions.id, id),
  });

  if (!tx) {
    return null;
  }

  if (new Date() > tx.expiresAt) {
    await db.delete(preparedTransactions).where(eq(preparedTransactions.id, id));
    return null;
  }

  return tx;
}

export async function cleanupExpiredTransactions(): Promise<number> {
  const result = await db
    .delete(preparedTransactions)
    .where(lt(preparedTransactions.expiresAt, new Date()));

  return result.rowCount || 0;
}
