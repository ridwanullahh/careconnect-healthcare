// Email Service for CareConnect Platform
// Using SMTPjs with Gmail credentials

// Define email template types
export enum EmailType {
  // Authentication
  SIGNUP_WELCOME = 'signup_welcome',
  EMAIL_VERIFICATION = 'email_verification',
  PASSWORD_RESET = 'password_reset',
  LOGIN_NOTIFICATION = 'login_notification',
  
  // Booking System
  BOOKING_CONFIRMATION = 'booking_confirmation',
  BOOKING_REMINDER = 'booking_reminder',
  BOOKING_CANCELLED = 'booking_cancelled',
  BOOKING_RESCHEDULED = 'booking_rescheduled',
  
  // Learning Management
  COURSE_ENROLLMENT = 'course_enrollment',
  COURSE_COMPLETION = 'course_completion',
  CERTIFICATE_ISSUED = 'certificate_issued',
  COURSE_REMINDER = 'course_reminder',
  
  // Ecommerce
  ORDER_CONFIRMATION = 'order_confirmation',
  ORDER_SHIPPED = 'order_shipped',
  ORDER_DELIVERED = 'order_delivered',
  PRESCRIPTION_READY = 'prescription_ready',
  
  // Crowdfunding
  DONATION_CONFIRMATION = 'donation_confirmation',
  CAUSE_UPDATE = 'cause_update',
  GOAL_REACHED = 'goal_reached',
  
  // Community
  FORUM_REPLY = 'forum_reply',
  EXPERT_ANSWER = 'expert_answer',
  NEWSLETTER = 'newsletter',
  
  // Administrative
  ENTITY_VERIFICATION = 'entity_verification',
  COMPLIANCE_NOTICE = 'compliance_notice',
  PAYMENT_NOTICE = 'payment_notice',
  SYSTEM_MAINTENANCE = 'system_maintenance'
}

interface EmailTemplate {
  subject: string;
  html: string;
  text?: string;
}

interface EmailContext {
  [key: string]: any;
  user?: {
    name?: string;
    email?: string;
    first_name?: string;
    last_name?: string;
  };
  entity?: {
    name?: string;
    phone?: string;
    address?: any;
  };
}

class EmailService {
  private static instance: EmailService;
  private gmailUser: string;
  private gmailPassword: string;
  private templates: Map<EmailType, EmailTemplate> = new Map();

  private constructor() {
    this.gmailUser = import.meta.env.VITE_GMAIL_USER || 'marzuqcares@gmail.com';
    this.gmailPassword = import.meta.env.VITE_GMAIL_PASSWORD || 'wwba yyer glpm cher';
    this.initializeTemplates();
  }

  public static getInstance(): EmailService {
    if (!EmailService.instance) {
      EmailService.instance = new EmailService();
    }
    return EmailService.instance;
  }

  private initializeTemplates(): void {
    // Initialize all email templates
    this.templates.set(EmailType.SIGNUP_WELCOME, {
      subject: 'Welcome to CareConnect Healthcare!',
      html: this.getWelcomeTemplate()
    });

    this.templates.set(EmailType.EMAIL_VERIFICATION, {
      subject: 'Verify Your CareConnect Account',
      html: this.getVerificationTemplate()
    });

    this.templates.set(EmailType.PASSWORD_RESET, {
      subject: 'Reset Your CareConnect Password',
      html: this.getPasswordResetTemplate()
    });

    this.templates.set(EmailType.BOOKING_CONFIRMATION, {
      subject: 'Appointment Confirmed - CareConnect',
      html: this.getBookingConfirmationTemplate()
    });

    this.templates.set(EmailType.BOOKING_REMINDER, {
      subject: 'Appointment Reminder - Tomorrow',
      html: this.getBookingReminderTemplate()
    });

    this.templates.set(EmailType.COURSE_ENROLLMENT, {
      subject: 'Course Enrollment Confirmed',
      html: this.getCourseEnrollmentTemplate()
    });

    this.templates.set(EmailType.ORDER_CONFIRMATION, {
      subject: 'Order Confirmation - CareConnect',
      html: this.getOrderConfirmationTemplate()
    });

    this.templates.set(EmailType.DONATION_CONFIRMATION, {
      subject: 'Thank You for Your Donation',
      html: this.getDonationConfirmationTemplate()
    });

    // Add more templates as needed...
  }

  public async sendEmail(
    to: string,
    emailType: EmailType,
    context: EmailContext = {}
  ): Promise<boolean> {
    try {
      const template = this.templates.get(emailType);
      if (!template) {
        throw new Error(`Email template not found: ${emailType}`);
      }

      const subject = this.processTemplate(template.subject, context);
      const htmlBody = this.processTemplate(template.html, context);

      // Use SMTPjs to send email
      await this.sendEmailViaSmtp(to, subject, htmlBody);
      
      console.log(`Email sent successfully: ${emailType} to ${to}`);
      return true;
    } catch (error) {
      console.error('Failed to send email:', error);
      return false;
    }
  }

  private async sendEmailViaSmtp(to: string, subject: string, html: string): Promise<void> {
    // Using SMTPjs library (need to include it in the HTML or load dynamically)
    const smtpConfig = {
      Host: 'smtp.gmail.com',
      Username: this.gmailUser,
      Password: this.gmailPassword,
      To: to,
      From: this.gmailUser,
      Subject: subject,
      Body: html
    };

    // For browser environment, we'll use a proxy service or Email.js
    // For production, this should be handled by a backend service
    return this.sendEmailProxy(smtpConfig);
  }

  private async sendEmailProxy(config: any): Promise<void> {
    // For demo purposes, we'll simulate email sending
    // In production, this would call a backend email service
    console.log('Email would be sent:', {
      to: config.To,
      subject: config.Subject,
      timestamp: new Date().toISOString()
    });
    
    // Simulate delay
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  private processTemplate(template: string, context: EmailContext): string {
    let processed = template;
    
    // Replace all template variables {{variable}}
    const variables = template.match(/\{\{([^}]+)\}\}/g) || [];
    
    variables.forEach(variable => {
      const key = variable.replace(/[{}]/g, '');
      const value = this.getNestedValue(context, key) || '';
      processed = processed.replace(variable, String(value));
    });
    
    return processed;
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  // Email Templates
  private getWelcomeTemplate(): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Welcome to CareConnect</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #05B34D 0%, #04A041 100%); color: white; padding: 30px 20px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: white; padding: 30px; border: 1px solid #e0e0e0; }
          .footer { background: #f8f9fa; padding: 20px; text-align: center; border-radius: 0 0 10px 10px; font-size: 14px; color: #666; }
          .button { display: inline-block; background: #05B34D; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome to CareConnect!</h1>
            <p>Your trusted healthcare platform</p>
          </div>
          <div class="content">
            <h2>Hello {{user.first_name}}!</h2>
            <p>Thank you for joining CareConnect, the comprehensive healthcare ecosystem that connects you with verified healthcare providers, tools, and resources.</p>
            
            <h3>What you can do now:</h3>
            <ul>
              <li><strong>Find Healthcare Providers:</strong> Search our verified directory of health centers, pharmacies, and practitioners</li>
              <li><strong>Use Health Tools:</strong> Access 100+ AI and traditional health tools</li>
              <li><strong>Book Appointments:</strong> Schedule appointments with healthcare providers</li>
              <li><strong>Learn & Grow:</strong> Enroll in health courses and earn certificates</li>
              <li><strong>Support Causes:</strong> Contribute to healthcare crowdfunding initiatives</li>
            </ul>
            
            <a href="https://careconnect.com/dashboard" class="button">Go to Dashboard</a>
            
            <p>If you have any questions, feel free to reach out to our support team.</p>
            
            <p>Welcome aboard!<br>The CareConnect Team</p>
          </div>
          <div class="footer">
            <p>&copy; 2024 CareConnect Healthcare Platform. All rights reserved.</p>
            <p>This email was sent to {{user.email}}</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private getVerificationTemplate(): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Verify Your Account</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #05B34D; color: white; padding: 30px 20px; text-align: center; }
          .content { background: white; padding: 30px; border: 1px solid #e0e0e0; }
          .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 14px; color: #666; }
          .verification-code { background: #f8f9fa; border: 2px solid #05B34D; padding: 20px; text-align: center; margin: 20px 0; font-size: 24px; font-weight: bold; letter-spacing: 4px; }
          .button { display: inline-block; background: #05B34D; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Verify Your Account</h1>
          </div>
          <div class="content">
            <h2>Hello {{user.first_name}}!</h2>
            <p>Thank you for signing up with CareConnect. To complete your registration, please verify your email address.</p>
            
            <div class="verification-code">{{verification_code}}</div>
            
            <p>Enter this verification code in the app to activate your account.</p>
            
            <p>Or click the button below to verify automatically:</p>
            <a href="{{verification_link}}" class="button">Verify Account</a>
            
            <p><strong>Note:</strong> This verification code will expire in 10 minutes for security purposes.</p>
            
            <p>If you didn't request this verification, please ignore this email.</p>
          </div>
          <div class="footer">
            <p>&copy; 2024 CareConnect Healthcare Platform. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private getPasswordResetTemplate(): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Reset Your Password</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #F2B91C; color: white; padding: 30px 20px; text-align: center; }
          .content { background: white; padding: 30px; border: 1px solid #e0e0e0; }
          .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 14px; color: #666; }
          .button { display: inline-block; background: #05B34D; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; }
          .warning { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 6px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Password Reset Request</h1>
          </div>
          <div class="content">
            <h2>Hello {{user.first_name}}!</h2>
            <p>We received a request to reset your CareConnect account password.</p>
            
            <p>Click the button below to reset your password:</p>
            <a href="{{reset_link}}" class="button">Reset Password</a>
            
            <div class="warning">
              <strong>Security Notice:</strong> This link will expire in 1 hour. If you didn't request this password reset, please ignore this email and your password will remain unchanged.
            </div>
            
            <p>For your security, we recommend using a strong, unique password for your CareConnect account.</p>
            
            <p>If you continue to have trouble accessing your account, please contact our support team.</p>
          </div>
          <div class="footer">
            <p>&copy; 2024 CareConnect Healthcare Platform. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private getBookingConfirmationTemplate(): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Appointment Confirmed</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #05B34D; color: white; padding: 30px 20px; text-align: center; }
          .content { background: white; padding: 30px; border: 1px solid #e0e0e0; }
          .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 14px; color: #666; }
          .appointment-details { background: #E9FBF1; border: 1px solid #05B34D; padding: 20px; border-radius: 6px; margin: 20px 0; }
          .button { display: inline-block; background: #05B34D; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 10px 5px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Appointment Confirmed ✓</h1>
          </div>
          <div class="content">
            <h2>Hello {{user.first_name}}!</h2>
            <p>Your appointment has been successfully confirmed. Here are the details:</p>
            
            <div class="appointment-details">
              <h3>Appointment Details</h3>
              <p><strong>Provider:</strong> {{entity.name}}</p>
              <p><strong>Service:</strong> {{booking.service_name}}</p>
              <p><strong>Date:</strong> {{booking.date}}</p>
              <p><strong>Time:</strong> {{booking.time}}</p>
              <p><strong>Duration:</strong> {{booking.duration}} minutes</p>
              {{#if booking.is_telehealth}}
                <p><strong>Type:</strong> Telehealth (Video Consultation)</p>
              {{else}}
                <p><strong>Location:</strong> {{entity.address.street}}, {{entity.address.city}}</p>
              {{/if}}
            </div>
            
            <h3>What's Next?</h3>
            <ul>
              <li>You'll receive a reminder 24 hours before your appointment</li>
              <li>Please arrive 10 minutes early if visiting in person</li>
              <li>Bring a valid ID and insurance card</li>
              {{#if booking.preparation_notes}}
                <li>{{booking.preparation_notes}}</li>
              {{/if}}
            </ul>
            
            <div style="text-align: center;">
              <a href="{{booking.manage_link}}" class="button">Manage Appointment</a>
              {{#if booking.is_telehealth}}
                <a href="{{booking.video_link}}" class="button">Join Video Call</a>
              {{/if}}
            </div>
            
            <p>If you need to reschedule or cancel, please do so at least 24 hours in advance.</p>
          </div>
          <div class="footer">
            <p>&copy; 2024 CareConnect Healthcare Platform. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private getBookingReminderTemplate(): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Appointment Reminder</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #F2B91C; color: white; padding: 30px 20px; text-align: center; }
          .content { background: white; padding: 30px; border: 1px solid #e0e0e0; }
          .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 14px; color: #666; }
          .reminder-box { background: #FFF3CD; border: 1px solid #F2B91C; padding: 20px; border-radius: 6px; margin: 20px 0; }
          .button { display: inline-block; background: #05B34D; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Appointment Reminder ⏰</h1>
          </div>
          <div class="content">
            <h2>Hello {{user.first_name}}!</h2>
            <p>This is a friendly reminder about your upcoming appointment:</p>
            
            <div class="reminder-box">
              <h3>Tomorrow's Appointment</h3>
              <p><strong>Provider:</strong> {{entity.name}}</p>
              <p><strong>Date:</strong> {{booking.date}}</p>
              <p><strong>Time:</strong> {{booking.time}}</p>
              <p><strong>Service:</strong> {{booking.service_name}}</p>
            </div>
            
            <h3>Preparation Checklist:</h3>
            <ul>
              <li>✓ Arrive 10 minutes early</li>
              <li>✓ Bring valid ID and insurance card</li>
              <li>✓ List any current medications</li>
              <li>✓ Prepare questions for your provider</li>
            </ul>
            
            <p style="text-align: center;">
              <a href="{{booking.manage_link}}" class="button">View Appointment Details</a>
            </p>
            
            <p>Looking forward to seeing you tomorrow!</p>
          </div>
          <div class="footer">
            <p>&copy; 2024 CareConnect Healthcare Platform. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private getCourseEnrollmentTemplate(): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Course Enrollment Confirmed</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #05B34D 0%, #F2B91C 100%); color: white; padding: 30px 20px; text-align: center; }
          .content { background: white; padding: 30px; border: 1px solid #e0e0e0; }
          .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 14px; color: #666; }
          .course-info { background: #E9FBF1; border: 1px solid #05B34D; padding: 20px; border-radius: 6px; margin: 20px 0; }
          .button { display: inline-block; background: #05B34D; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Course Enrollment Confirmed 🎓</h1>
          </div>
          <div class="content">
            <h2>Congratulations {{user.first_name}}!</h2>
            <p>You have successfully enrolled in the course:</p>
            
            <div class="course-info">
              <h3>{{course.title}}</h3>
              <p><strong>Instructor:</strong> {{course.instructor}}</p>
              <p><strong>Duration:</strong> {{course.duration}}</p>
              <p><strong>Start Date:</strong> {{course.start_date}}</p>
              <p><strong>Format:</strong> {{course.format}}</p>
            </div>
            
            <h3>What happens next?</h3>
            <ul>
              <li>Access your course materials anytime</li>
              <li>Complete modules at your own pace</li>
              <li>Participate in discussions with other learners</li>
              <li>Earn a certificate upon completion</li>
            </ul>
            
            <p style="text-align: center;">
              <a href="{{course.access_link}}" class="button">Start Learning</a>
            </p>
            
            <p>Happy learning!<br>The CareConnect Education Team</p>
          </div>
          <div class="footer">
            <p>&copy; 2024 CareConnect Healthcare Platform. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private getOrderConfirmationTemplate(): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Order Confirmation</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #05B34D; color: white; padding: 30px 20px; text-align: center; }
          .content { background: white; padding: 30px; border: 1px solid #e0e0e0; }
          .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 14px; color: #666; }
          .order-summary { background: #f8f9fa; padding: 20px; border-radius: 6px; margin: 20px 0; }
          .button { display: inline-block; background: #05B34D; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Order Confirmed! 🛍️</h1>
          </div>
          <div class="content">
            <h2>Thank you {{user.first_name}}!</h2>
            <p>Your order has been confirmed and is being processed.</p>
            
            <div class="order-summary">
              <h3>Order #{{order.number}}</h3>
              <p><strong>Total:</strong> ${{order.total}}</p>
              <p><strong>Payment Method:</strong> {{order.payment_method}}</p>
              <p><strong>Shipping Address:</strong><br>{{order.shipping_address}}</p>
            </div>
            
            <p>You'll receive shipping confirmation with tracking information once your order is dispatched.</p>
            
            <p style="text-align: center;">
              <a href="{{order.tracking_link}}" class="button">Track Your Order</a>
            </p>
          </div>
          <div class="footer">
            <p>&copy; 2024 CareConnect Healthcare Platform. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private getDonationConfirmationTemplate(): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Thank You for Your Donation</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #F2B91C 0%, #05B34D 100%); color: white; padding: 30px 20px; text-align: center; }
          .content { background: white; padding: 30px; border: 1px solid #e0e0e0; }
          .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 14px; color: #666; }
          .donation-info { background: #E9FBF1; border: 1px solid #05B34D; padding: 20px; border-radius: 6px; margin: 20px 0; }
          .impact { background: #FFF3CD; border: 1px solid #F2B91C; padding: 15px; border-radius: 6px; margin: 20px 0; }
          .button { display: inline-block; background: #05B34D; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Thank You for Your Generous Donation! ❤️</h1>
          </div>
          <div class="content">
            <h2>Dear {{user.first_name}},</h2>
            <p>Your compassion and generosity make a real difference in people's lives. Thank you for supporting this important cause.</p>
            
            <div class="donation-info">
              <h3>Donation Details</h3>
              <p><strong>Cause:</strong> {{cause.title}}</p>
              <p><strong>Amount:</strong> ${{donation.amount}}</p>
              <p><strong>Date:</strong> {{donation.date}}</p>
              <p><strong>Transaction ID:</strong> {{donation.transaction_id}}</p>
            </div>
            
            <div class="impact">
              <h3>Your Impact</h3>
              <p>{{cause.impact_message}}</p>
            </div>
            
            <p>We'll keep you updated on the progress of this cause and how your contribution is making a difference.</p>
            
            <p style="text-align: center;">
              <a href="{{cause.updates_link}}" class="button">View Cause Updates</a>
            </p>
            
            <p>With heartfelt gratitude,<br>The CareConnect Community Team</p>
          </div>
          <div class="footer">
            <p>&copy; 2024 CareConnect Healthcare Platform. All rights reserved.</p>
            <p>Tax receipt available in your dashboard</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }
}

// Export singleton instance
export const emailService = EmailService.getInstance();
export { EmailType, EmailService };