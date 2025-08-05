/**
 * Alerting System
 * Manages alert notifications, escalation, and delivery channels
 * for performance issues and system failures.
 */

import { EventEmitter } from 'events';
import fs from 'fs/promises';
import { join } from 'path';

export class AlertingSystem extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.options = {
      // Alert channels
      channels: {
        console: { enabled: true },
        file: { enabled: true, path: './logs/alerts.log' },
        webhook: { enabled: false, url: null, timeout: 5000 },
        email: { enabled: false, smtp: null }
      },
      
      // Alert rules
      rules: {
        escalation: {
          enabled: true,
          timeToEscalate: 300000, // 5 minutes
          maxEscalationLevel: 3
        },
        grouping: {
          enabled: true,
          groupWindow: 60000, // 1 minute
          maxGroupSize: 10
        },
        suppression: {
          enabled: true,
          suppressionWindow: 300000, // 5 minutes
          maxSuppressedAlerts: 100
        }
      },
      
      // Alert priorities
      priorities: {
        critical: { level: 1, escalate: true, immediate: true },
        warning: { level: 2, escalate: false, immediate: false },
        info: { level: 3, escalate: false, immediate: false }
      },
      
      // Notification settings
      notifications: {
        batchSize: 10,
        batchInterval: 30000, // 30 seconds
        retryAttempts: 3,
        retryDelay: 5000 // 5 seconds
      },
      
      ...options
    };

    this.alertQueue = [];
    this.alertHistory = new Map();
    this.suppressedAlerts = new Map();
    this.escalatedAlerts = new Map();
    this.groupedAlerts = new Map();
    this.notificationQueue = [];
    
    this.isProcessing = false;
    this.processingInterval = null;
    
    this.initializeChannels();
  }

  /**
   * Initialize alert channels
   */
  initializeChannels() {
    // Set up file logging if enabled
    if (this.options.channels.file.enabled) {
      this.ensureLogDirectory();
    }
  }

  /**
   * Start alert processing
   */
  start() {
    if (this.isProcessing) return;
    
    this.isProcessing = true;
    this.processingInterval = setInterval(() => {
      this.processAlertQueue();
      this.processNotificationQueue();
      this.checkEscalations();
      this.cleanupOldAlerts();
    }, 1000); // Process every second

    this.emit('alertingStarted');
    console.log('Alerting system started');
  }

  /**
   * Stop alert processing
   */
  stop() {
    if (!this.isProcessing) return;
    
    this.isProcessing = false;
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }

    this.emit('alertingStopped');
    console.log('Alerting system stopped');
  }

  /**
   * Process an incoming alert
   */
  async processAlert(alert) {
    try {
      // Validate alert
      if (!this.validateAlert(alert)) {
        throw new Error('Invalid alert format');
      }

      // Enrich alert with metadata
      const enrichedAlert = this.enrichAlert(alert);

      // Check if alert should be suppressed
      if (this.shouldSuppressAlert(enrichedAlert)) {
        this.suppressAlert(enrichedAlert);
        return;
      }

      // Check if alert should be grouped
      if (this.options.rules.grouping.enabled) {
        const grouped = this.tryGroupAlert(enrichedAlert);
        if (grouped) {
          return;
        }
      }

      // Add to processing queue
      this.alertQueue.push(enrichedAlert);
      this.emit('alertQueued', enrichedAlert);

    } catch (error) {
      this.emit('alertProcessingError', { alert, error: error.message });
      console.error('Error processing alert:', error.message);
    }
  }

  /**
   * Process alert queue
   */
  async processAlertQueue() {
    if (this.alertQueue.length === 0) return;

    const alertsToProcess = this.alertQueue.splice(0, this.options.notifications.batchSize);
    
    for (const alert of alertsToProcess) {
      try {
        await this.deliverAlert(alert);
        this.alertHistory.set(alert.id, {
          ...alert,
          processedAt: Date.now(),
          status: 'delivered'
        });
      } catch (error) {
        this.handleDeliveryError(alert, error);
      }
    }
  }

  /**
   * Deliver alert through configured channels
   */
  async deliverAlert(alert) {
    const deliveryPromises = [];

    // Console channel
    if (this.options.channels.console.enabled) {
      deliveryPromises.push(this.deliverToConsole(alert));
    }

    // File channel
    if (this.options.channels.file.enabled) {
      deliveryPromises.push(this.deliverToFile(alert));
    }

    // Webhook channel
    if (this.options.channels.webhook.enabled && this.options.channels.webhook.url) {
      deliveryPromises.push(this.deliverToWebhook(alert));
    }

    // Email channel
    if (this.options.channels.email.enabled && this.options.channels.email.smtp) {
      deliveryPromises.push(this.deliverToEmail(alert));
    }

    // Wait for all deliveries
    const results = await Promise.allSettled(deliveryPromises);
    
    // Check for delivery failures
    const failures = results.filter(r => r.status === 'rejected');
    if (failures.length > 0) {
      throw new Error(`Failed to deliver to ${failures.length} channels`);
    }

    this.emit('alertDelivered', alert);
  }

  /**
   * Deliver alert to console
   */
  async deliverToConsole(alert) {
    const timestamp = new Date(alert.timestamp).toISOString();
    const severity = alert.severity.toUpperCase();
    const message = `[${timestamp}] [${severity}] ${alert.message}`;
    
    switch (alert.severity) {
      case 'critical':
        console.error(`🚨 ${message}`);
        break;
      case 'warning':
        console.warn(`⚠️  ${message}`);
        break;
      default:
        console.log(`ℹ️  ${message}`);
    }
  }

  /**
   * Deliver alert to file
   */
  async deliverToFile(alert) {
    const logEntry = {
      timestamp: new Date(alert.timestamp).toISOString(),
      id: alert.id,
      type: alert.type,
      severity: alert.severity,
      message: alert.message,
      data: alert.data,
      source: alert.source
    };

    const logLine = JSON.stringify(logEntry) + '\n';
    await fs.appendFile(this.options.channels.file.path, logLine);
  }

  /**
   * Deliver alert to webhook
   */
  async deliverToWebhook(alert) {
    const payload = {
      alert: {
        id: alert.id,
        type: alert.type,
        severity: alert.severity,
        message: alert.message,
        timestamp: alert.timestamp,
        data: alert.data,
        source: alert.source
      },
      system: {
        name: 'Legacy Code AI Refactor',
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'development'
      }
    };

    // Use dynamic import for fetch (Node.js 18+)
    const { default: fetch } = await import('node-fetch');
    
    const response = await fetch(this.options.channels.webhook.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Legacy-Code-AI-Refactor-Alerting/1.0.0'
      },
      body: JSON.stringify(payload),
      timeout: this.options.channels.webhook.timeout
    });

    if (!response.ok) {
      throw new Error(`Webhook delivery failed: ${response.status} ${response.statusText}`);
    }
  }

  /**
   * Deliver alert to email
   */
  async deliverToEmail(alert) {
    // This would integrate with an email service
    // For now, we'll just log that email would be sent
    console.log(`📧 Email alert would be sent: ${alert.message}`);
    
    // In a real implementation, you would use nodemailer or similar:
    /*
    const nodemailer = require('nodemailer');
    const transporter = nodemailer.createTransporter(this.options.channels.email.smtp);
    
    await transporter.sendMail({
      from: this.options.channels.email.from,
      to: this.options.channels.email.to,
      subject: `[${alert.severity.toUpperCase()}] ${alert.type}`,
      text: alert.message,
      html: this.generateEmailHTML(alert)
    });
    */
  }

  /**
   * Validate alert format
   */
  validateAlert(alert) {
    return alert &&
           typeof alert.id === 'string' &&
           typeof alert.type === 'string' &&
           typeof alert.severity === 'string' &&
           typeof alert.message === 'string' &&
           typeof alert.timestamp === 'number' &&
           ['critical', 'warning', 'info'].includes(alert.severity);
  }

  /**
   * Enrich alert with additional metadata
   */
  enrichAlert(alert) {
    return {
      ...alert,
      source: 'legacy-code-ai-refactor',
      hostname: require('os').hostname(),
      pid: process.pid,
      enrichedAt: Date.now(),
      priority: this.options.priorities[alert.severity] || this.options.priorities.info
    };
  }

  /**
   * Check if alert should be suppressed
   */
  shouldSuppressAlert(alert) {
    if (!this.options.rules.suppression.enabled) return false;

    const suppressionKey = `${alert.type}_${alert.severity}`;
    const suppressed = this.suppressedAlerts.get(suppressionKey);

    if (suppressed) {
      const timeSinceLastAlert = Date.now() - suppressed.lastSeen;
      if (timeSinceLastAlert < this.options.rules.suppression.suppressionWindow) {
        return true;
      }
    }

    return false;
  }

  /**
   * Suppress an alert
   */
  suppressAlert(alert) {
    const suppressionKey = `${alert.type}_${alert.severity}`;
    const existing = this.suppressedAlerts.get(suppressionKey);

    if (existing) {
      existing.count++;
      existing.lastSeen = Date.now();
      existing.lastAlert = alert;
    } else {
      this.suppressedAlerts.set(suppressionKey, {
        key: suppressionKey,
        count: 1,
        firstSeen: Date.now(),
        lastSeen: Date.now(),
        firstAlert: alert,
        lastAlert: alert
      });
    }

    this.emit('alertSuppressed', { alert, suppressionKey });
  }

  /**
   * Try to group alert with similar alerts
   */
  tryGroupAlert(alert) {
    const groupKey = `${alert.type}_${alert.severity}`;
    const existing = this.groupedAlerts.get(groupKey);

    if (existing) {
      const timeSinceFirst = Date.now() - existing.firstSeen;
      if (timeSinceFirst < this.options.rules.grouping.groupWindow &&
          existing.alerts.length < this.options.rules.grouping.maxGroupSize) {
        
        existing.alerts.push(alert);
        existing.lastSeen = Date.now();
        existing.count++;
        
        this.emit('alertGrouped', { alert, groupKey, group: existing });
        return true;
      }
    } else {
      this.groupedAlerts.set(groupKey, {
        key: groupKey,
        alerts: [alert],
        count: 1,
        firstSeen: Date.now(),
        lastSeen: Date.now()
      });
      
      // Schedule group processing
      setTimeout(() => {
        this.processAlertGroup(groupKey);
      }, this.options.rules.grouping.groupWindow);
      
      return true;
    }

    return false;
  }

  /**
   * Process a group of alerts
   */
  processAlertGroup(groupKey) {
    const group = this.groupedAlerts.get(groupKey);
    if (!group) return;

    this.groupedAlerts.delete(groupKey);

    if (group.count === 1) {
      // Single alert, process normally
      this.alertQueue.push(group.alerts[0]);
    } else {
      // Multiple alerts, create summary alert
      const summaryAlert = this.createGroupSummaryAlert(group);
      this.alertQueue.push(summaryAlert);
    }

    this.emit('alertGroupProcessed', { groupKey, group });
  }

  /**
   * Create summary alert for grouped alerts
   */
  createGroupSummaryAlert(group) {
    const firstAlert = group.alerts[0];
    const lastAlert = group.alerts[group.alerts.length - 1];

    return {
      id: `group_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: firstAlert.type,
      severity: firstAlert.severity,
      message: `${group.count} similar alerts: ${firstAlert.message}`,
      timestamp: group.firstSeen,
      data: {
        groupKey: group.key,
        alertCount: group.count,
        timeSpan: group.lastSeen - group.firstSeen,
        firstAlert: firstAlert,
        lastAlert: lastAlert,
        allAlerts: group.alerts.map(a => ({ id: a.id, timestamp: a.timestamp, message: a.message }))
      },
      source: 'alerting-system-grouping',
      isGrouped: true
    };
  }

  /**
   * Check for alerts that need escalation
   */
  checkEscalations() {
    if (!this.options.rules.escalation.enabled) return;

    const now = Date.now();
    
    for (const [alertId, alertData] of this.alertHistory) {
      if (alertData.status !== 'delivered' || !alertData.priority.escalate) continue;
      
      const escalation = this.escalatedAlerts.get(alertId);
      const timeSinceDelivery = now - alertData.processedAt;
      
      if (!escalation && timeSinceDelivery > this.options.rules.escalation.timeToEscalate) {
        this.escalateAlert(alertData);
      } else if (escalation && escalation.level < this.options.rules.escalation.maxEscalationLevel) {
        const timeSinceLastEscalation = now - escalation.lastEscalated;
        if (timeSinceLastEscalation > this.options.rules.escalation.timeToEscalate) {
          this.escalateAlert(alertData, escalation.level + 1);
        }
      }
    }
  }

  /**
   * Escalate an alert
   */
  escalateAlert(alert, level = 1) {
    const escalatedAlert = {
      ...alert,
      id: `escalated_${alert.id}_${level}`,
      message: `[ESCALATED L${level}] ${alert.message}`,
      severity: level >= 2 ? 'critical' : alert.severity,
      timestamp: Date.now(),
      isEscalated: true,
      escalationLevel: level,
      originalAlert: alert.id
    };

    this.escalatedAlerts.set(alert.id, {
      level,
      lastEscalated: Date.now(),
      escalatedAlert
    });

    this.alertQueue.push(escalatedAlert);
    this.emit('alertEscalated', { originalAlert: alert, escalatedAlert, level });
  }

  /**
   * Process notification queue
   */
  processNotificationQueue() {
    // This would handle batched notifications, rate limiting, etc.
    // For now, it's a placeholder for future enhancements
  }

  /**
   * Handle delivery errors
   */
  handleDeliveryError(alert, error) {
    console.error(`Failed to deliver alert ${alert.id}:`, error.message);
    
    // Add to retry queue or mark as failed
    this.alertHistory.set(alert.id, {
      ...alert,
      processedAt: Date.now(),
      status: 'failed',
      error: error.message
    });

    this.emit('alertDeliveryFailed', { alert, error: error.message });
  }

  /**
   * Clean up old alerts and data
   */
  cleanupOldAlerts() {
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours

    // Clean up alert history
    for (const [alertId, alertData] of this.alertHistory) {
      if (now - alertData.processedAt > maxAge) {
        this.alertHistory.delete(alertId);
      }
    }

    // Clean up suppressed alerts
    for (const [key, suppressed] of this.suppressedAlerts) {
      if (now - suppressed.lastSeen > this.options.rules.suppression.suppressionWindow * 2) {
        this.suppressedAlerts.delete(key);
      }
    }

    // Clean up escalated alerts
    for (const [alertId, escalation] of this.escalatedAlerts) {
      if (now - escalation.lastEscalated > maxAge) {
        this.escalatedAlerts.delete(alertId);
      }
    }
  }

  /**
   * Ensure log directory exists
   */
  async ensureLogDirectory() {
    try {
      const logDir = require('path').dirname(this.options.channels.file.path);
      await fs.mkdir(logDir, { recursive: true });
    } catch (error) {
      console.warn('Failed to create log directory:', error.message);
    }
  }

  /**
   * Get alerting statistics
   */
  getStatistics() {
    return {
      queueSize: this.alertQueue.length,
      totalProcessed: this.alertHistory.size,
      suppressed: this.suppressedAlerts.size,
      escalated: this.escalatedAlerts.size,
      grouped: this.groupedAlerts.size,
      isProcessing: this.isProcessing,
      channels: Object.keys(this.options.channels).filter(c => this.options.channels[c].enabled)
    };
  }

  /**
   * Get alert history
   */
  getAlertHistory(limit = 100) {
    return Array.from(this.alertHistory.values())
      .sort((a, b) => b.processedAt - a.processedAt)
      .slice(0, limit);
  }

  /**
   * Get suppressed alerts summary
   */
  getSuppressedAlerts() {
    return Array.from(this.suppressedAlerts.values());
  }

  /**
   * Configure alert channel
   */
  configureChannel(channelName, config) {
    if (this.options.channels[channelName]) {
      this.options.channels[channelName] = { ...this.options.channels[channelName], ...config };
      this.emit('channelConfigured', { channelName, config });
    }
  }

  /**
   * Test alert delivery
   */
  async testAlert(channelName = null) {
    const testAlert = {
      id: `test_${Date.now()}`,
      type: 'test',
      severity: 'info',
      message: 'Test alert from alerting system',
      timestamp: Date.now(),
      data: { test: true }
    };

    if (channelName) {
      // Test specific channel
      switch (channelName) {
        case 'console':
          await this.deliverToConsole(testAlert);
          break;
        case 'file':
          await this.deliverToFile(testAlert);
          break;
        case 'webhook':
          await this.deliverToWebhook(testAlert);
          break;
        case 'email':
          await this.deliverToEmail(testAlert);
          break;
        default:
          throw new Error(`Unknown channel: ${channelName}`);
      }
    } else {
      // Test all channels
      await this.processAlert(testAlert);
    }

    this.emit('testAlertSent', { testAlert, channelName });
  }

  /**
   * Cleanup alerting system
   */
  cleanup() {
    this.stop();
    this.removeAllListeners();
    
    // Clear data
    this.alertQueue.length = 0;
    this.alertHistory.clear();
    this.suppressedAlerts.clear();
    this.escalatedAlerts.clear();
    this.groupedAlerts.clear();
    this.notificationQueue.length = 0;
  }
}