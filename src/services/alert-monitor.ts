import cron from 'node-cron';
import { EventEmitter } from 'events';
import { db, portfolioAlerts, wallets } from '../db/index.js';
import { eq, and } from 'drizzle-orm';
import { logger } from '../utils/logger.js';
import { AuraAdapter } from '../core/aura-adapter.js';
import * as AlertTools from '../tools/alerts/alerts.js';

export class AlertMonitor extends EventEmitter {
  private auraAdapter: AuraAdapter;
  private cronJob: cron.ScheduledTask | null = null;
  private isRunning = false;

  constructor(auraApiKey: string) {
    super();
    this.auraAdapter = new AuraAdapter({
      apiUrl: process.env.AURA_API_URL || 'https://aura.adex.network',
      apiKey: auraApiKey,
      timeout: 30000
    });
  }

  start() {
    if (this.cronJob) {
      logger.warn('AlertMonitor already running');
      return;
    }

    // Run every 5 minutes
    this.cronJob = cron.schedule('*/5 * * * *', async () => {
      await this.checkAlerts();
    });

    logger.info('🔔 AlertMonitor started - checking alerts every 5 minutes');

    // Also run immediately on startup for testing
    setTimeout(() => this.checkAlerts(), 5000);
  }

  stop() {
    if (this.cronJob) {
      this.cronJob.stop();
      this.cronJob = null;
      logger.info('AlertMonitor stopped');
    }
  }

  private async checkAlerts() {
    if (this.isRunning) {
      logger.debug('Alert check already in progress, skipping...');
      return;
    }

    this.isRunning = true;
    const startTime = Date.now();

    try {
      logger.info('🔍 Starting alert check cycle...');

      const activeAlerts = await db.query.portfolioAlerts.findMany({
        where: eq(portfolioAlerts.isActive, true),
      });

      logger.info(`Found ${activeAlerts.length} active alerts to check`);

      let checkedCount = 0;
      let triggeredCount = 0;

      for (const alert of activeAlerts) {
        try {
          const triggered = await this.checkSingleAlert(alert);
          checkedCount++;
          
          if (triggered) {
            triggeredCount++;
          }
        } catch (error) {
          logger.error(`Error checking alert ${alert.id}:`, error);
        }
      }

      const duration = Date.now() - startTime;
      logger.info(
        `✅ Alert check completed: ${checkedCount} checked, ${triggeredCount} triggered (${duration}ms)`
      );
    } catch (error) {
      logger.error('Error in alert check cycle:', error);
    } finally {
      this.isRunning = false;
    }
  }

  private async checkSingleAlert(alert: any): Promise<boolean> {
    const rules = alert.rules as any;

    if (!rules || !rules.type) {
      logger.warn(`Alert ${alert.id} has invalid rules`);
      return false;
    }

    switch (alert.alertType) {
      case 'price_change':
        return await this.checkPriceAlert(alert, rules);
      case 'portfolio_value':
        return await this.checkPortfolioAlert(alert, rules);
      case 'liquidation_risk':
        return await this.checkLiquidationAlert(alert, rules);
      default:
        logger.debug(`Unsupported alert type: ${alert.alertType}`);
        return false;
    }
  }

  private async checkPriceAlert(alert: any, rules: any): Promise<boolean> {
    try {
      const { conditions } = rules;
      
      if (!conditions || !conditions.token) {
        return false;
      }

      // Get user's active wallet to check portfolio
      const activeWallet = await db.query.wallets.findFirst({
        where: and(eq(wallets.userId, alert.userId), eq(wallets.isActive, true)),
      });

      if (!activeWallet) {
        logger.debug(`No active wallet for user ${alert.userId}, skipping alert ${alert.id}`);
        return false;
      }

      // Get portfolio balance to find token price
      const portfolio = await this.auraAdapter.getPortfolioBalance(activeWallet.address);
      
      // Find the token in portfolio
      const token = portfolio.tokens?.find(
        (t: any) => t.symbol?.toUpperCase() === conditions.token?.toUpperCase()
      );

      if (!token || !token.usd) {
        logger.debug(`Token ${conditions.token} not found in portfolio for alert ${alert.id}`);
        return false;
      }

      const currentPrice = parseFloat(String(token.usd));
      const threshold = parseFloat(conditions.threshold);

      let triggered = false;
      let changePercent = 0;

      if (conditions.direction === 'above' && currentPrice > threshold) {
        triggered = true;
        changePercent = ((currentPrice - threshold) / threshold) * 100;
      } else if (conditions.direction === 'below' && currentPrice < threshold) {
        triggered = true;
        changePercent = ((threshold - currentPrice) / threshold) * 100;
      }

      if (triggered) {
        await this.createNotification(alert, {
          title: `${conditions.token} Price Alert Triggered`,
          message: `${conditions.token} is now $${currentPrice.toFixed(2)} (${conditions.direction} $${threshold})`,
          severity: 'warning',
          metadata: {
            token: conditions.token,
            currentPrice,
            threshold,
            direction: conditions.direction,
            changePercent: changePercent.toFixed(2),
          },
        });

        logger.info(
          `🚨 Price alert triggered: ${conditions.token} $${currentPrice} (${conditions.direction} $${threshold})`
        );
      }

      return triggered;
    } catch (error) {
      logger.error(`Error checking price alert ${alert.id}:`, error);
      return false;
    }
  }

  private async checkPortfolioAlert(alert: any, rules: any): Promise<boolean> {
    try {
      const { conditions } = rules;

      if (!conditions || !conditions.threshold) {
        return false;
      }

      const activeWallet = await db.query.wallets.findFirst({
        where: and(eq(wallets.userId, alert.userId), eq(wallets.isActive, true)),
      });

      if (!activeWallet) {
        return false;
      }

      const portfolio = await this.auraAdapter.getPortfolioBalance(activeWallet.address);
      
      // Calculate total portfolio value
      let totalValue = parseFloat(portfolio.native || '0');
      
      if (portfolio.tokens) {
        for (const token of portfolio.tokens) {
          const tokenUsd = token.usd || 0;
          totalValue += tokenUsd;
        }
      }

      const threshold = parseFloat(conditions.threshold);
      let triggered = false;

      if (conditions.direction === 'above' && totalValue > threshold) {
        triggered = true;
      } else if (conditions.direction === 'below' && totalValue < threshold) {
        triggered = true;
      }

      if (triggered) {
        await this.createNotification(alert, {
          title: 'Portfolio Value Alert',
          message: `Your portfolio is now $${totalValue.toFixed(2)} (${conditions.direction} $${threshold})`,
          severity: 'info',
          metadata: {
            currentValue: totalValue,
            threshold,
            direction: conditions.direction,
          },
        });

        logger.info(`💼 Portfolio alert triggered: $${totalValue} (${conditions.direction} $${threshold})`);
      }

      return triggered;
    } catch (error) {
      logger.error(`Error checking portfolio alert ${alert.id}:`, error);
      return false;
    }
  }

  private async checkLiquidationAlert(alert: any, rules: any): Promise<boolean> {
    // Placeholder for liquidation risk checking
    // Would need DeFi position data from AURA API
    logger.debug(`Liquidation alerts not yet implemented for alert ${alert.id}`);
    return false;
  }

  private async createNotification(alert: any, notificationData: {
    title: string;
    message: string;
    severity: 'info' | 'warning' | 'critical';
    metadata?: any;
  }) {
    try {
      // Check if notification was already created recently (prevent spam)
      const recentNotifications = await AlertTools.getUserNotifications(alert.userId, true);
      const existingRecent = recentNotifications.find(
        (n) =>
          n.alertId === alert.id &&
          new Date(n.createdAt).getTime() > Date.now() - 60 * 60 * 1000 // Within last hour
      );

      if (existingRecent) {
        logger.debug(`Skipping duplicate notification for alert ${alert.id} (already triggered in last hour)`);
        return;
      }

      const notification = await AlertTools.createNotification(
        alert.userId,
        alert.id,
        notificationData.title,
        notificationData.message,
        notificationData.severity,
        notificationData.metadata
      );

      // Emit event for SSE clients
      this.emit('notification', {
        userId: alert.userId,
        notification: notification,
        alertId: alert.id,
        timestamp: new Date().toISOString()
      });

      logger.info(`📢 Notification emitted for user ${alert.userId}`);
    } catch (error) {
      logger.error(`Error creating notification for alert ${alert.id}:`, error);
    }
  }

  async manualCheck() {
    logger.info('🔍 Manual alert check triggered');
    await this.checkAlerts();
  }
}
