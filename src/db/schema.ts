import { pgTable, text, timestamp, integer, boolean, jsonb, serial, varchar, unique } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  walletAddress: varchar('wallet_address', { length: 42 }).notNull().unique(),
  username: varchar('username', { length: 100 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const wallets = pgTable('wallets', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  address: varchar('address', { length: 42 }).notNull(),
  label: varchar('label', { length: 50 }).notNull(),
  isActive: boolean('is_active').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  uniqueUserAddress: unique().on(table.userId, table.address),
}));

export const userPreferences = pgTable('user_preferences', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }).unique(),
  riskTolerance: varchar('risk_tolerance', { length: 20 }).default('medium'),
  language: varchar('language', { length: 10 }).default('en'),
  notificationSettings: jsonb('notification_settings').default({}),
  displaySettings: jsonb('display_settings').default({}),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const conversationHistory = pgTable('conversation_history', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  role: varchar('role', { length: 20 }).notNull(),
  content: text('content').notNull(),
  metadata: jsonb('metadata').default({}),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const portfolioAlerts = pgTable('portfolio_alerts', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 100 }).notNull(),
  alertType: varchar('alert_type', { length: 50 }).notNull(),
  rules: jsonb('rules').notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const alertNotifications = pgTable('alert_notifications', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  alertId: integer('alert_id').references(() => portfolioAlerts.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 200 }).notNull(),
  message: text('message').notNull(),
  severity: varchar('severity', { length: 20 }).default('info').notNull(),
  isRead: boolean('is_read').default(false).notNull(),
  metadata: jsonb('metadata').default({}),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const auditLogs = pgTable('audit_logs', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id, { onDelete: 'set null' }),
  action: varchar('action', { length: 100 }).notNull(),
  details: jsonb('details').default({}),
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const usersRelations = relations(users, ({ many, one }) => ({
  wallets: many(wallets),
  preferences: one(userPreferences),
  conversations: many(conversationHistory),
  alerts: many(portfolioAlerts),
  notifications: many(alertNotifications),
  auditLogs: many(auditLogs),
}));

export const walletsRelations = relations(wallets, ({ one }) => ({
  user: one(users, {
    fields: [wallets.userId],
    references: [users.id],
  }),
}));

export const userPreferencesRelations = relations(userPreferences, ({ one }) => ({
  user: one(users, {
    fields: [userPreferences.userId],
    references: [users.id],
  }),
}));

export const conversationHistoryRelations = relations(conversationHistory, ({ one }) => ({
  user: one(users, {
    fields: [conversationHistory.userId],
    references: [users.id],
  }),
}));

export const portfolioAlertsRelations = relations(portfolioAlerts, ({ one, many }) => ({
  user: one(users, {
    fields: [portfolioAlerts.userId],
    references: [users.id],
  }),
  notifications: many(alertNotifications),
}));

export const alertNotificationsRelations = relations(alertNotifications, ({ one }) => ({
  user: one(users, {
    fields: [alertNotifications.userId],
    references: [users.id],
  }),
  alert: one(portfolioAlerts, {
    fields: [alertNotifications.alertId],
    references: [portfolioAlerts.id],
  }),
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  user: one(users, {
    fields: [auditLogs.userId],
    references: [users.id],
  }),
}));

export const preparedTransactions = pgTable('prepared_transactions', {
  id: varchar('id', { length: 16 }).primaryKey(),
  txData: jsonb('tx_data').notNull(),
  chainId: integer('chain_id').notNull(),
  fromToken: varchar('from_token', { length: 100 }).notNull(),
  toToken: varchar('to_token', { length: 100 }).notNull(),
  amount: varchar('amount', { length: 50 }).notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const invoices = pgTable('invoices', {
  id: varchar('id', { length: 32 }).primaryKey(),
  toolName: varchar('tool_name', { length: 100 }).notNull(),
  amount: varchar('amount', { length: 20 }).notNull(),
  asset: varchar('asset', { length: 10 }).notNull().default('USDC'),
  receiver: varchar('receiver', { length: 42 }).notNull(),
  description: text('description'),
  status: varchar('status', { length: 20 }).notNull().default('pending'),
  txHash: varchar('tx_hash', { length: 66 }),
  paidAt: timestamp('paid_at'),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  metadata: jsonb('metadata').default({}),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export type Wallet = typeof wallets.$inferSelect;
export type InsertWallet = typeof wallets.$inferInsert;

export type UserPreferences = typeof userPreferences.$inferSelect;
export type InsertUserPreferences = typeof userPreferences.$inferInsert;

export type ConversationHistory = typeof conversationHistory.$inferSelect;
export type InsertConversationHistory = typeof conversationHistory.$inferInsert;

export type PortfolioAlert = typeof portfolioAlerts.$inferSelect;
export type InsertPortfolioAlert = typeof portfolioAlerts.$inferInsert;

export type AlertNotification = typeof alertNotifications.$inferSelect;
export type InsertAlertNotification = typeof alertNotifications.$inferInsert;

export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = typeof auditLogs.$inferInsert;

export type PreparedTransaction = typeof preparedTransactions.$inferSelect;
export type InsertPreparedTransaction = typeof preparedTransactions.$inferInsert;

export type Invoice = typeof invoices.$inferSelect;
export type InsertInvoice = typeof invoices.$inferInsert;

export const chatSessions = pgTable('chat_sessions', {
  id: varchar('id', { length: 32 }).primaryKey(),
  walletAddress: varchar('wallet_address', { length: 42 }),
  title: varchar('title', { length: 200 }).default('New Chat'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const chatMessages = pgTable('chat_messages', {
  id: serial('id').primaryKey(),
  sessionId: varchar('session_id', { length: 32 }).notNull().references(() => chatSessions.id, { onDelete: 'cascade' }),
  role: varchar('role', { length: 20 }).notNull(),
  content: text('content').notNull(),
  toolCalls: jsonb('tool_calls'),
  metadata: jsonb('metadata').default({}),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const chatSessionsRelations = relations(chatSessions, ({ many }) => ({
  messages: many(chatMessages),
}));

export const chatMessagesRelations = relations(chatMessages, ({ one }) => ({
  session: one(chatSessions, {
    fields: [chatMessages.sessionId],
    references: [chatSessions.id],
  }),
}));

export type ChatSession = typeof chatSessions.$inferSelect;
export type InsertChatSession = typeof chatSessions.$inferInsert;

export type ChatMessage = typeof chatMessages.$inferSelect;
export type InsertChatMessage = typeof chatMessages.$inferInsert;
