// Comprehensive Email Notification System
import { dbHelpers, collections } from '../database';

// Email Template Types
export enum EmailTemplateType {
  // Account & Authentication
  WELCOME = 'welcome',
  EMAIL_VERIFICATION = 'email_verification',
  PASSWORD_RESET = 'password_reset',
  ACCOUNT_ACTIVATED = 'account_activated',
  
  // Appointments & Booking
  APPOINTMENT_CONFIRMATION = 'appointment_confirmation',
  APPOINTMENT_REMINDER = 'appointment_reminder',
  APPOINTMENT_CANCELLED = 'appointment_cancelled',
  APPOINTMENT_RESCHEDULED = 'appointment_rescheduled',
  
  // Courses & Learning
  COURSE_ENROLLMENT = 'course_enrollment',
  COURSE_COMPLETION = 'course_completion',
  CERTIFICATE_ISSUED = 'certificate_issued',
  COURSE_REMINDER = 'course_reminder',
  
  // Community & Support
  NEW_FORUM_REPLY = 'new_forum_reply',
  COMMUNITY_WELCOME = 'community_welcome',
  POST_MODERATED = 'post_moderated',
  
  // Donations & Causes
  DONATION_CONFIRMATION = 'donation_confirmation',
  DONATION_RECEIPT = 'donation_receipt',
  CAUSE_UPDATE = 'cause_update',
  
  // Health Tools & Reports
  HEALTH_REPORT_READY = 'health_report_ready',
  TOOL_REMINDER = 'tool_reminder',
  
  // Provider Services
  VERIFICATION_APPROVED = 'verification_approved',
  VERIFICATION_REJECTED = 'verification_rejected',
  NEW_PATIENT_MESSAGE = 'new_patient_message',
  SUBSCRIPTION_RENEWAL = 'subscription_renewal',
  
  // E-commerce
  ORDER_CONFIRMATION = 'order_confirmation',
  ORDER_SHIPPED = 'order_shipped',
  ORDER_DELIVERED = 'order_delivered',
  PRESCRIPTION_READY = 'prescription_ready',
  
  // System Notifications
  MAINTENANCE_NOTICE = 'maintenance_notice',
  SECURITY_ALERT = 'security_alert'
}

// Email Priority Levels
export enum EmailPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent'
}

// Email Configuration
interface EmailConfig {
  user: string;
  password: string;
  host: string;
  port: number;
  secure: boolean;
}

// Email Template Interface
interface EmailTemplate {
  id: string;
  type: EmailTemplateType;
  subject: string;
  htmlContent: string;
  textContent: string;
  variables: string[];
  priority: EmailPriority;
}

// Email Queue Item
interface EmailQueueItem {
  id: string;
  to: string;
  template: EmailTemplateType;
  variables: Record<string, any>;
  priority: EmailPriority;
  scheduledAt?: Date;
  attempts: number;
  maxAttempts: number;
  status: 'pending' | 'sent' | 'failed' | 'cancelled';
  createdAt: Date;
  sentAt?: Date;
  error?: string;
}

// Email Service Class
export class EmailService {
  private static instance: EmailService;
  private config: EmailConfig;
  private templates: Map<EmailTemplateType, EmailTemplate>;

  private constructor() {
    this.config = {
      user: import.meta.env.VITE_GMAIL_USER || '',
      password: import.meta.env.VITE_GMAIL_PASSWORD || '',
      host: 'smtp.gmail.com',
      port: 587,
      secure: false
    };
    
    this.templates = new Map();
    this.initializeTemplates();
  }

  public static getInstance(): EmailService {
    if (!EmailService.instance) {
      EmailService.instance = new EmailService();
    }
    return EmailService.instance;
  }

  // Initialize Email Templates
  private initializeTemplates() {
    const templates: EmailTemplate[] = [
      {
        id: 'welcome',
        type: EmailTemplateType.WELCOME,
        subject: 'Welcome to CareConnect Healthcare Platform!',
        htmlContent: this.getWelcomeTemplate(),
        textContent: 'Welcome to CareConnect! Your healthcare journey starts here.',
        variables: ['firstName', 'lastName', 'loginUrl'],
        priority: EmailPriority.NORMAL
      },
      {
        id: 'appointment_confirmation',
        type: EmailTemplateType.APPOINTMENT_CONFIRMATION,
        subject: 'Appointment Confirmed - {{providerName}}',
        htmlContent: this.getAppointmentConfirmationTemplate(),
        textContent: 'Your appointment with {{providerName}} has been confirmed for {{appointmentDate}} at {{appointmentTime}}.',
        variables: ['patientName', 'providerName', 'appointmentDate', 'appointmentTime', 'serviceType', 'location', 'instructions'],
        priority: EmailPriority.HIGH
      },
      {
        id: 'appointment_reminder',
        type: EmailTemplateType.APPOINTMENT_REMINDER,
        subject: 'Reminder: Appointment Tomorrow - {{providerName}}',
        htmlContent: this.getAppointmentReminderTemplate(),
        textContent: 'Reminder: Your appointment with {{providerName}} is scheduled for tomorrow at {{appointmentTime}}.',
        variables: ['patientName', 'providerName', 'appointmentDate', 'appointmentTime', 'location', 'preparationInstructions'],
        priority: EmailPriority.HIGH
      },
      {
        id: 'course_enrollment',
        type: EmailTemplateType.COURSE_ENROLLMENT,
        subject: 'Successfully Enrolled: {{courseName}}',
        htmlContent: this.getCourseEnrollmentTemplate(),
        textContent: 'You have successfully enrolled in {{courseName}}. Start learning today!',
        variables: ['studentName', 'courseName', 'instructorName', 'courseUrl', 'startDate', 'duration'],
        priority: EmailPriority.NORMAL
      },
      {
        id: 'donation_confirmation',
        type: EmailTemplateType.DONATION_CONFIRMATION,
        subject: 'Thank You for Your Donation - {{causeName}}',
        htmlContent: this.getDonationConfirmationTemplate(),
        textContent: 'Thank you for your generous donation of ${{amount}} to {{causeName}}.',
        variables: ['donorName', 'causeName', 'amount', 'transactionId', 'receiptUrl', 'causeUrl'],
        priority: EmailPriority.NORMAL
      }
    ];

    templates.forEach(template => {
      this.templates.set(template.type, template);
    });
  }

  // Send Email
  public async sendEmail(
    to: string,
    templateType: EmailTemplateType,
    variables: Record<string, any>,
    priority: EmailPriority = EmailPriority.NORMAL,
    scheduledAt?: Date
  ): Promise<boolean> {
    try {
      // Add to queue
      const queueItem: EmailQueueItem = {
        id: crypto.randomUUID(),
        to,
        template: templateType,
        variables,
        priority,
        scheduledAt,
        attempts: 0,
        maxAttempts: 3,
        status: 'pending',
        createdAt: new Date()
      };

      await dbHelpers.create(collections.notifications, {
        type: 'email',
        ...queueItem
      });

      // Process immediately if not scheduled
      if (!scheduledAt || scheduledAt <= new Date()) {
        return await this.processEmailQueue(queueItem);
      }

      return true;
    } catch (error) {
      console.error('Failed to send email:', error);
      return false;
    }
  }

  // Process Email Queue
  private async processEmailQueue(queueItem: EmailQueueItem): Promise<boolean> {
    try {
      const template = this.templates.get(queueItem.template);
      if (!template) {
        throw new Error(`Template not found: ${queueItem.template}`);
      }

      // Replace variables in template
      const subject = this.replaceVariables(template.subject, queueItem.variables);
      const htmlContent = this.replaceVariables(template.htmlContent, queueItem.variables);
      const textContent = this.replaceVariables(template.textContent, queueItem.variables);

      // Send email using SMTP.JS (for browser environments)
      const emailData = {
        SecureToken: this.generateSecureToken(),
        To: queueItem.to,
        From: this.config.user,
        Subject: subject,
        Body: htmlContent
      };

      // In a real implementation, you would use a proper email service
      // For now, we'll simulate the email sending
      const success = await this.simulateEmailSend(emailData);

      // Update queue item status
      await this.updateQueueItemStatus(queueItem.id, success ? 'sent' : 'failed');

      return success;
    } catch (error) {
      console.error('Failed to process email queue:', error);
      await this.updateQueueItemStatus(queueItem.id, 'failed', error.message);
      return false;
    }
  }

  // Simulate Email Send (replace with actual SMTP implementation)
  private async simulateEmailSend(emailData: any): Promise<boolean> {
    try {
      console.log('Sending email:', {
        to: emailData.To,
        subject: emailData.Subject,
        timestamp: new Date().toISOString()
      });
      
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Simulate 95% success rate
      return Math.random() > 0.05;
    } catch (error) {
      console.error('Email send simulation failed:', error);
      return false;
    }
  }

  // Update Queue Item Status
  private async updateQueueItemStatus(id: string, status: string, error?: string) {
    try {
      await dbHelpers.update(collections.notifications, id, {
        status,
        error,
        sentAt: status === 'sent' ? new Date() : undefined
      });
    } catch (err) {
      console.error('Failed to update queue item status:', err);
    }
  }

  // Replace Variables in Template
  private replaceVariables(template: string, variables: Record<string, any>): string {
    let result = template;
    Object.keys(variables).forEach(key => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      result = result.replace(regex, variables[key] || '');
    });
    return result;
  }

  // Generate Secure Token (placeholder)
  private generateSecureToken(): string {
    return 'secure_token_placeholder';
  }

  // Email Templates
  private getWelcomeTemplate(): string {
    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Welcome to CareConnect</title>
    </head>
    <body style="font-family: 'Arial', sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #05B34D 0%, #04A041 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
        <h1 style="margin: 0; font-size: 28px;">Welcome to CareConnect!</h1>
        <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Your healthcare journey starts here</p>
      </div>
      
      <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
        <h2 style="color: #05B34D; margin-top: 0;">Hello {{firstName}} {{lastName}}!</h2>
        
        <p>We're excited to welcome you to the CareConnect Healthcare Platform. You now have access to:</p>
        
        <ul style="color: #666; line-height: 2;">
          <li><strong>Healthcare Directory:</strong> Find verified providers near you</li>
          <li><strong>100+ Health Tools:</strong> AI-powered health assessments and calculators</li>
          <li><strong>Learning Platform:</strong> Expert-led health courses and certifications</li>
          <li><strong>Community Support:</strong> Connect with others on similar health journeys</li>
          <li><strong>Telemedicine:</strong> Virtual consultations with healthcare providers</li>
        </ul>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="{{loginUrl}}" style="background: #05B34D; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Start Exploring</a>
        </div>
        
        <p style="color: #666; font-size: 14px; border-top: 1px solid #eee; padding-top: 20px; margin-top: 30px;">
