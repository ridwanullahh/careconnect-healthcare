// Enhanced Notifications & Email System (Client-Only)
import { githubDB, collections } from './database';

export interface NotificationTemplate {
  id: string;
  type: string;
  title: string;
  messageTemplate: string;
  emailTemplate?: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  category: 'system' | 'health' | 'social' | 'payment' | 'appointment' | 'emergency';
  isActive: boolean;
  variables: string[]; // Available template variables
  createdAt: string;
  updatedAt: string;
}

export interface NotificationPreference {
  id: string;
  userId: string;
  type: string;
  inApp: boolean;
  email: boolean;
  frequency: 'immediate' | 'hourly' | 'daily' | 'weekly' | 'never';
  quietHours: {
    enabled: boolean;
    startTime: string; // HH:MM
    endTime: string; // HH:MM
  };
  createdAt: string;
  updatedAt: string;
}

export interface EmailEvent {
  id: string;
  userId: string;
  email: string;
  type: string;
  subject: string;
  htmlContent: string;
  status: 'pending' | 'sent' | 'failed' | 'bounced' | 'unsubscribed';
  providerId?: string; // EmailJS service ID
  templateId?: string;
  templateParams?: Record<string, any>;
  scheduledFor?: string;
  sentAt?: string;
  failureReason?: string;
  attempts: number;
  metadata: Record<string, any>;
  createdAt: string;
}

export class NotificationService {
  // Initialize EmailJS (client-safe email service)
  static initializeEmailJS(): void {
    // @ts-ignore - EmailJS loaded externally
    if (typeof emailjs !== 'undefined') {
      emailjs.init(process.env.REACT_APP_EMAILJS_PUBLIC_KEY);
    }
  }

  // Create notification
  static async createNotification(
    userId: string,
    type: string,
    title: string,
    message: string,
    data?: Record<string, any>,
    priority: 'low' | 'normal' | 'high' | 'urgent' = 'normal'
  ): Promise<void> {
    // Check user preferences
    const preference = await this.getUserNotificationPreference(userId, type);
    
    // Check quiet hours
    if (preference?.quietHours.enabled && this.isQuietHours(preference.quietHours)) {
      // Schedule for later
      const scheduledTime = this.getNextActiveTime(preference.quietHours);
      await this.scheduleNotification(userId, type, title, message, data, priority, scheduledTime);
      return;
    }

    // Create in-app notification if enabled
    if (!preference || preference.inApp) {
      await githubDB.create(collections.notifications, {
        id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId,
        type,
        title,
        message,
        data: data || {},
        priority,
        createdAt: new Date().toISOString(),
        read: false
      });
    }

    // Send email if enabled and user hasn't unsubscribed
    if (preference?.email !== false && await this.canSendEmail(userId, type)) {
      await this.sendEmailNotification(userId, type, title, message, data);
    }
  }

  // Schedule notification for later
  static async scheduleNotification(
    userId: string,
    type: string,
    title: string,
    message: string,
    data?: Record<string, any>,
    priority: 'low' | 'normal' | 'high' | 'urgent' = 'normal',
    scheduledFor: string = new Date().toISOString()
  ): Promise<void> {
    await githubDB.create(collections.scheduled_emails, {
      id: `sched_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      type,
      title,
      message,
      data: data || {},
      priority,
      scheduledFor,
      status: 'pending',
      createdAt: new Date().toISOString()
    });
  }

  // Send email notification using EmailJS
  static async sendEmailNotification(
    userId: string,
    type: string,
    title: string,
    message: string,
    data?: Record<string, any>
  ): Promise<void> {
    try {
      const user = await githubDB.findById(collections.users, userId);
      if (!user?.email) return;

      // Check unsubscribe status
      const unsubscribed = await githubDB.findOne(collections.unsubscribe_records, {
        email: user.email,
        type: 'notifications'
      });

      if (unsubscribed) return;

      const emailEvent: EmailEvent = {
        id: `email_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId,
        email: user.email,
        type,
        subject: title,
        htmlContent: await this.generateEmailHTML(type, title, message, data),
        status: 'pending',
        templateId: process.env.REACT_APP_EMAILJS_TEMPLATE_ID || 'default',
        templateParams: {
          to_email: user.email,
          to_name: user.full_name || user.email,
          subject: title,
          message: message,
          ...data
        },
        attempts: 0,
        metadata: data || {},
        createdAt: new Date().toISOString()
      };

      await githubDB.create(collections.analytics_events, {
        id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        action: 'email_notification_created',
        entityType: 'email',
        entityId: emailEvent.id,
        userId,
        data: emailEvent,
        timestamp: new Date().toISOString()
      });

      // Send email using EmailJS
      await this.sendEmailViaEmailJS(emailEvent);

    } catch (error) {
      console.error('Failed to send email notification:', error);
    }
  }

  // Send email via EmailJS
  private static async sendEmailViaEmailJS(emailEvent: EmailEvent): Promise<void> {
    try {
      // @ts-ignore - EmailJS loaded externally
      if (typeof emailjs === 'undefined') {
        throw new Error('EmailJS not initialized');
      }

      // @ts-ignore
      const response = await emailjs.send(
        process.env.REACT_APP_EMAILJS_SERVICE_ID,
        emailEvent.templateId!,
        emailEvent.templateParams
      );

      // Update email event status
      await githubDB.update(collections.analytics_events, emailEvent.id, {
        data: {
          ...emailEvent,
          status: 'sent',
          sentAt: new Date().toISOString(),
          providerId: response.text
        }
      });

    } catch (error) {
      console.error('EmailJS send failed:', error);
      
      // Update email event with failure
      await githubDB.update(collections.analytics_events, emailEvent.id, {
        data: {
          ...emailEvent,
          status: 'failed',
          failureReason: error.message,
          attempts: emailEvent.attempts + 1
        }
      });
    }
  }

  // Generate email HTML content
  private static async generateEmailHTML(
    type: string,
    title: string,
    message: string,
    data?: Record<string, any>
  ): Promise<string> {
    const template = await this.getNotificationTemplate(type);
    
    let htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>${title}</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f5f5f5; }
        .container { background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .header { text-align: center; border-bottom: 2px solid #007bff; padding-bottom: 20px; margin-bottom: 30px; }
        .logo { font-size: 24px; font-weight: bold; color: #007bff; margin-bottom: 10px; }
        .title { font-size: 20px; color: #333; margin-bottom: 20px; }
        .message { line-height: 1.6; color: #555; margin-bottom: 30px; }
        .button { display: inline-block; background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 10px 0; }
        .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; color: #666; font-size: 12px; }
        .unsubscribe { margin-top: 20px; }
        .unsubscribe a { color: #666; text-decoration: none; }
        .priority-high { border-left: 4px solid #ff9500; }
        .priority-urgent { border-left: 4px solid #ff4444; }
    </style>
</head>
<body>
    <div class="container ${this.getPriorityClass(data?.priority)}">
        <div class="header">
            <div class="logo">CareConnect</div>
        </div>
        
        <div class="title">${title}</div>
        <div class="message">${message}</div>`;

    // Add action button if provided
    if (data?.actionUrl) {
      htmlContent += `<a href="${data.actionUrl}" class="button">${data.actionText || 'View Details'}</a>`;
    }

    // Add additional content based on type
    if (type === 'appointment_reminder' && data) {
      htmlContent += `
        <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <strong>Appointment Details:</strong><br>
            Date: ${data.appointmentDate}<br>
            Time: ${data.appointmentTime}<br>
            Provider: ${data.providerName}<br>
            Location: ${data.location || 'Online'}
        </div>`;
    }

    htmlContent += `
        <div class="footer">
            <p>This notification was sent from CareConnect Health Platform.</p>
            <div class="unsubscribe">
                <a href="{{unsubscribe_url}}">Unsubscribe from notifications</a>
            </div>
        </div>
    </div>
</body>
</html>`;

    return htmlContent;
  }

  // Get priority CSS class
  private static getPriorityClass(priority?: string): string {
    switch (priority) {
      case 'high':
        return 'priority-high';
      case 'urgent':
        return 'priority-urgent';
      default:
        return '';
    }
  }

  // Check if current time is in quiet hours
  private static isQuietHours(quietHours: NotificationPreference['quietHours']): boolean {
    if (!quietHours.enabled) return false;

    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    
    return currentTime >= quietHours.startTime && currentTime <= quietHours.endTime;
  }

  // Get next active time after quiet hours
  private static getNextActiveTime(quietHours: NotificationPreference['quietHours']): string {
    const now = new Date();
    const [endHour, endMinute] = quietHours.endTime.split(':').map(Number);
    
    const nextActive = new Date(now);
    nextActive.setHours(endHour, endMinute, 0, 0);
    
    // If end time is today but already passed, move to next day
    if (nextActive <= now) {
      nextActive.setDate(nextActive.getDate() + 1);
    }
    
    return nextActive.toISOString();
  }

  // Get user notification preference
  static async getUserNotificationPreference(userId: string, type: string): Promise<NotificationPreference | null> {
    return await githubDB.findOne(collections.user_preferences, {
      userId,
      type
    });
  }

  // Update user notification preference
  static async updateNotificationPreference(
    userId: string,
    type: string,
    preferences: Partial<NotificationPreference>
  ): Promise<NotificationPreference> {
    const existing = await this.getUserNotificationPreference(userId, type);
    
    const preferenceData: NotificationPreference = {
      id: existing?.id || `pref_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      type,
      inApp: preferences.inApp ?? true,
      email: preferences.email ?? true,
      frequency: preferences.frequency ?? 'immediate',
      quietHours: preferences.quietHours ?? {
        enabled: false,
        startTime: '22:00',
        endTime: '08:00'
      },
      createdAt: existing?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (existing) {
      await githubDB.update(collections.user_preferences, existing.id, preferenceData);
    } else {
      await githubDB.create(collections.user_preferences, preferenceData);
    }

    return preferenceData;
  }

  // Check if user can receive email for this type
  static async canSendEmail(userId: string, type: string): Promise<boolean> {
    const user = await githubDB.findById(collections.users, userId);
    if (!user?.email) return false;

    // Check global unsubscribe
    const globalUnsubscribe = await githubDB.findOne(collections.unsubscribe_records, {
      email: user.email,
      type: 'all'
    });

    if (globalUnsubscribe) return false;

    // Check type-specific unsubscribe
    const typeUnsubscribe = await githubDB.findOne(collections.unsubscribe_records, {
      email: user.email,
      type
    });

    return !typeUnsubscribe;
  }

  // Get notification template
  static async getNotificationTemplate(type: string): Promise<NotificationTemplate | null> {
    return await githubDB.findOne(collections.analytics_events, {
      action: 'notification_template',
      entityType: 'template',
      'data.type': type
    });
  }

  // Process scheduled notifications
  static async processScheduledNotifications(): Promise<void> {
    const now = new Date().toISOString();
    const scheduled = await githubDB.findMany(collections.scheduled_emails, {
      status: 'pending',
      scheduledFor: { $lte: now }
    });

    for (const notification of scheduled) {
      try {
        await this.createNotification(
          notification.userId,
          notification.type,
          notification.title,
          notification.message,
          notification.data,
          notification.priority
        );

        // Mark as sent
        await githubDB.update(collections.scheduled_emails, notification.id, {
          status: 'sent',
          sentAt: new Date().toISOString()
        });

      } catch (error) {
        console.error('Failed to process scheduled notification:', error);
        
        // Mark as failed
        await githubDB.update(collections.scheduled_emails, notification.id, {
          status: 'failed',
          failureReason: error.message
        });
      }
    }
  }

  // Mark notification as read
  static async markAsRead(notificationId: string, userId: string): Promise<void> {
    const notification = await githubDB.findById(collections.notifications, notificationId);
    
    if (notification && notification.userId === userId) {
      await githubDB.update(collections.notifications, notificationId, {
        read: true,
        readAt: new Date().toISOString()
      });
    }
  }

  // Mark all notifications as read
  static async markAllAsRead(userId: string): Promise<void> {
    const notifications = await githubDB.findMany(collections.notifications, {
      userId,
      read: false
    });

    for (const notification of notifications) {
      await githubDB.update(collections.notifications, notification.id, {
        read: true,
        readAt: new Date().toISOString()
      });
    }
  }

  // Get user notifications
  static async getUserNotifications(
    userId: string,
    page: number = 1,
    limit: number = 20,
    unreadOnly: boolean = false
  ): Promise<{ notifications: any[]; total: number; unreadCount: number }> {
    const filter: any = { userId };
    if (unreadOnly) filter.read = false;

    let notifications = await githubDB.findMany(collections.notifications, filter);
    
    // Sort by creation date (newest first)
    notifications.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const total = notifications.length;
    const unreadCount = notifications.filter(n => !n.read).length;
    
    // Paginate
    const start = (page - 1) * limit;
    const paginatedNotifications = notifications.slice(start, start + limit);

    return {
      notifications: paginatedNotifications,
      total,
      unreadCount
    };
  }

  // Delete notification
  static async deleteNotification(notificationId: string, userId: string): Promise<void> {
    const notification = await githubDB.findById(collections.notifications, notificationId);
    
    if (notification && notification.userId === userId) {
      await githubDB.delete(collections.notifications, notificationId);
    }
  }

  // Unsubscribe from notifications
  static async unsubscribeFromNotifications(
    email: string,
    type: string = 'all',
    token?: string
  ): Promise<void> {
    // Verify token if provided
    if (token) {
      const subscription = await githubDB.findOne(collections.newsletter_subscriptions, {
        unsubscribeToken: token
      });
      
      if (!subscription || subscription.email !== email) {
        throw new Error('Invalid unsubscribe token');
      }
    }

    // Add unsubscribe record
    await githubDB.create(collections.unsubscribe_records, {
      id: `unsub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      email,
      type,
      unsubscribedAt: new Date().toISOString(),
      token
    });
  }

  // Get notification statistics
  static async getNotificationStats(userId: string): Promise<{
    total: number;
    unread: number;
    byType: Record<string, number>;
    byPriority: Record<string, number>;
  }> {
    const notifications = await githubDB.findMany(collections.notifications, { userId });
    
    const stats = {
      total: notifications.length,
      unread: notifications.filter(n => !n.read).length,
      byType: {} as Record<string, number>,
      byPriority: {} as Record<string, number>
    };

    notifications.forEach(notification => {
      // Count by type
      stats.byType[notification.type] = (stats.byType[notification.type] || 0) + 1;
      
      // Count by priority
      stats.byPriority[notification.priority] = (stats.byPriority[notification.priority] || 0) + 1;
    });

    return stats;
  }
}

export default NotificationService;