import { db, portfolioAlerts, alertNotifications, type InsertPortfolioAlert, type InsertAlertNotification } from '../../db/index.js';
import { eq, and, desc } from 'drizzle-orm';
import { logger } from '../../utils/logger.js';

export type AlertType = 'price_change' | 'portfolio_value' | 'liquidation_risk' | 'custom';

export interface AlertRules {
  type: AlertType;
  conditions: {
    token?: string;
    chain?: string;
    threshold?: number;
    direction?: 'above' | 'below';
    percentage?: number;
  };
}

export async function createAlert(
  userId: number,
  name: string,
  alertType: AlertType,
  rules: AlertRules
): Promise<any> {
  const insertAlert: InsertPortfolioAlert = {
    userId,
    name,
    alertType,
    rules: rules as any,
    isActive: true,
  };

  const [alert] = await db.insert(portfolioAlerts).values(insertAlert).returning();

  logger.info('Alert created', { userId, alertId: alert.id, name, alertType });

  return alert;
}

export async function listUserAlerts(userId: number): Promise<any[]> {
  const alerts = await db.query.portfolioAlerts.findMany({
    where: eq(portfolioAlerts.userId, userId),
    orderBy: [desc(portfolioAlerts.createdAt)],
  });

  return alerts;
}

export async function getAlert(userId: number, alertId: number): Promise<any | null> {
  const alert = await db.query.portfolioAlerts.findFirst({
    where: and(eq(portfolioAlerts.id, alertId), eq(portfolioAlerts.userId, userId)),
  });

  return alert;
}

export async function updateAlert(
  userId: number,
  alertId: number,
  updates: { name?: string; rules?: AlertRules; isActive?: boolean }
): Promise<any> {
  const alert = await getAlert(userId, alertId);

  if (!alert) {
    throw new Error('Alert not found');
  }

  const [updatedAlert] = await db
    .update(portfolioAlerts)
    .set({
      ...updates,
      rules: updates.rules ? (updates.rules as any) : undefined,
      updatedAt: new Date(),
    })
    .where(eq(portfolioAlerts.id, alertId))
    .returning();

  logger.info('Alert updated', { userId, alertId, updates });

  return updatedAlert;
}

export async function deleteAlert(userId: number, alertId: number): Promise<void> {
  const alert = await getAlert(userId, alertId);

  if (!alert) {
    throw new Error('Alert not found');
  }

  await db.delete(portfolioAlerts).where(eq(portfolioAlerts.id, alertId));

  logger.info('Alert deleted', { userId, alertId });
}

export async function createNotification(
  userId: number,
  alertId: number,
  title: string,
  message: string,
  severity: 'info' | 'warning' | 'critical',
  metadata?: any
): Promise<any> {
  const insertNotification: InsertAlertNotification = {
    userId,
    alertId,
    title,
    message,
    severity,
    metadata: metadata || {},
    isRead: false,
  };

  const [notification] = await db.insert(alertNotifications).values(insertNotification).returning();

  logger.info('Notification created', { userId, alertId, notificationId: notification.id, severity });

  return notification;
}

export async function getUserNotifications(
  userId: number,
  includeRead: boolean = false
): Promise<any[]> {
  const whereConditions = includeRead
    ? eq(alertNotifications.userId, userId)
    : and(eq(alertNotifications.userId, userId), eq(alertNotifications.isRead, false));

  const notifications = await db.query.alertNotifications.findMany({
    where: whereConditions,
    orderBy: [desc(alertNotifications.createdAt)],
    limit: 50,
  });

  return notifications;
}

export async function markNotificationAsRead(userId: number, notificationId: number): Promise<any> {
  const notification = await db.query.alertNotifications.findFirst({
    where: and(eq(alertNotifications.id, notificationId), eq(alertNotifications.userId, userId)),
  });

  if (!notification) {
    throw new Error('Notification not found');
  }

  const [updated] = await db
    .update(alertNotifications)
    .set({ isRead: true })
    .where(eq(alertNotifications.id, notificationId))
    .returning();

  logger.info('Notification marked as read', { userId, notificationId });

  return updated;
}

export async function markAllNotificationsAsRead(userId: number): Promise<number> {
  const result = await db
    .update(alertNotifications)
    .set({ isRead: true })
    .where(and(eq(alertNotifications.userId, userId), eq(alertNotifications.isRead, false)));

  logger.info('All notifications marked as read', { userId });

  return result.rowCount || 0;
}
