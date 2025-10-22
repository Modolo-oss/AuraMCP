import { db, conversationHistory, type InsertConversationHistory } from '../../db/index.js';
import { eq, desc } from 'drizzle-orm';
import { logger } from '../../utils/logger.js';

export type MessageRole = 'user' | 'assistant' | 'system';

export interface ConversationMessage {
  role: MessageRole;
  content: string;
  metadata?: {
    wallet?: string;
    action?: string;
    timestamp?: string;
    [key: string]: any;
  };
}

export async function saveMessage(
  userId: number,
  role: MessageRole,
  content: string,
  metadata?: any
): Promise<any> {
  const insertMessage: InsertConversationHistory = {
    userId,
    role,
    content,
    metadata: metadata || {},
  };

  const [message] = await db.insert(conversationHistory).values(insertMessage).returning();

  logger.info('Conversation message saved', { userId, role, messageId: message.id });

  return message;
}

export async function getConversationHistory(
  userId: number,
  limit: number = 50
): Promise<any[]> {
  const messages = await db.query.conversationHistory.findMany({
    where: eq(conversationHistory.userId, userId),
    orderBy: [desc(conversationHistory.createdAt)],
    limit,
  });

  return messages.reverse();
}

export async function getRecentContext(
  userId: number,
  messageCount: number = 10
): Promise<ConversationMessage[]> {
  const messages = await getConversationHistory(userId, messageCount);

  return messages.map((msg) => ({
    role: msg.role as MessageRole,
    content: msg.content,
    metadata: msg.metadata as any,
  }));
}

export async function clearConversationHistory(userId: number): Promise<number> {
  const result = await db.delete(conversationHistory).where(eq(conversationHistory.userId, userId));

  logger.info('Conversation history cleared', { userId });

  return result.rowCount || 0;
}

export async function getConversationStats(userId: number): Promise<{
  totalMessages: number;
  userMessages: number;
  assistantMessages: number;
  lastMessageAt: Date | null;
}> {
  const messages = await db.query.conversationHistory.findMany({
    where: eq(conversationHistory.userId, userId),
  });

  const stats = {
    totalMessages: messages.length,
    userMessages: messages.filter((m) => m.role === 'user').length,
    assistantMessages: messages.filter((m) => m.role === 'assistant').length,
    lastMessageAt: messages.length > 0 ? messages[messages.length - 1].createdAt : null,
  };

  return stats;
}
