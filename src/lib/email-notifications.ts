// Comprehensive Email Notification System with SMTPJS
// Note: SMTPjs is loaded via CDN in index.html

// Email notification types (25+ types)
export enum NotificationType {
  // Authentication & Account
  WELCOME_EMAIL = 'welcome_email',
  EMAIL_VERIFICATION = 'email_verification',
  PASSWORD_RESET = 'password_reset',
  ACCOUNT_LOCKED = 'account_locked',
  PROFILE_UPDATED = 'profile_updated',
  LOGIN_ALERT = 'login_alert',
  
  // Appointments & Bookings
  APPOINTMENT_CONFIRMED = 'appointment_confirmed',
  APPOINTMENT_REMINDER = 'appointment_reminder',
  APPOINTMENT_CANCELLED = 'appointment_cancelled',
  APPOINTMENT_RESCHEDULED = 'appointment_rescheduled',
  APPOINTMENT_COMPLETED = 'appointment_completed',
  APPOINTMENT_NO_SHOW = 'appointment_no_show',
  
  // Health Tools & Results
  HEALTH_ASSESSMENT_COMPLETE = 'health_assessment_complete',
  HEALTH_REMINDER = 'health_reminder',
  MEDICATION_REMINDER = 'medication_reminder',
  VITAL_SIGNS_ALERT = 'vital_signs_alert',
  TEST_RESULTS_AVAILABLE = 'test_results_available',
  
  // Learning Management System
  COURSE_ENROLLED = 'course_enrolled',
  COURSE_COMPLETED = 'course_completed',
  CERTIFICATE_EARNED = 'certificate_earned',
  COURSE_REMINDER = 'course_reminder',
  ASSIGNMENT_DUE = 'assignment_due',
  QUIZ_RESULTS = 'quiz_results',
  
  // E-commerce & Orders
  ORDER_CONFIRMED = 'order_confirmed',
  ORDER_SHIPPED = 'order_shipped',
  ORDER_DELIVERED = 'order_delivered',
  ORDER_CANCELLED = 'order_cancelled',
  PRESCRIPTION_READY = 'prescription_ready',
  PAYMENT_FAILED = 'payment_failed',
  REFUND_PROCESSED = 'refund_processed',
  
  // Community & Causes
  CAUSE_DONATION_CONFIRMED = 'cause_donation_confirmed',
  CAUSE_GOAL_REACHED = 'cause_goal_reached',
  CAUSE_UPDATE = 'cause_update',
  FORUM_REPLY = 'forum_reply',
  COMMUNITY_WELCOME = 'community_welcome',
  
  // Provider Notifications
  VERIFICATION_APPROVED = 'verification_approved',
  VERIFICATION_REJECTED = 'verification_rejected',
  NEW_REVIEW_RECEIVED = 'new_review_received',
  BOOKING_REQUEST = 'booking_request',
  PATIENT_MESSAGE = 'patient_message',
  
  // System Notifications
  NEWSLETTER_SUBSCRIPTION = 'newsletter_subscription',
  SECURITY_ALERT = 'security_alert',
  MAINTENANCE_NOTICE = 'maintenance_notice',
  FEATURE_ANNOUNCEMENT = 'feature_announcement',
  SUBSCRIPTION_EXPIRED = 'subscription_expired',
  DATA_BACKUP_COMPLETE = 'data_backup_complete'
}

export interface EmailTemplate {
  subject: string;
  htmlContent: string;
  textContent: string;
  variables?: Record<string, string>;
}

export interface NotificationData {
  type: NotificationType;
  recipient: string;
  recipientName?: string;
  data: Record<string, any>;
  priority: 'high' | 'normal' | 'low';
  scheduledFor?: Date;
}

class EmailNotificationService {
  private static instance: EmailNotificationService;
  private smtpConfig: any;
  
  private constructor() {
    // SMTP configuration with Gmail credentials
    this.smtpConfig = {
      host: 'smtp.gmail.com',
      username: 'marzuqcares@gmail.com',
      password: 'wwba yyer glpm cher',
      port: 587,
      secure: false // Use TLS
    };
  }

  public static getInstance(): EmailNotificationService {
    if (!EmailNotificationService.instance) {
      EmailNotificationService.instance = new EmailNotificationService();
    }
    return EmailNotificationService.instance;
  }

  // Send notification email
  public async sendNotification(notification: NotificationData): Promise<boolean> {
    try {
      const template = this.getEmailTemplate(notification.type, notification.data);
      const processedTemplate = this.processTemplate(template, notification.data);

      // Use SMTPjs (loaded via CDN) to send email
      const emailParams = {
        Host: this.smtpConfig.host,
        Username: this.smtpConfig.username,
        Password: this.smtpConfig.password,
        To: notification.recipient,
        From: `CareConnect Healthcare <${this.smtpConfig.username}>`,
        Subject: processedTemplate.subject,
        Body: processedTemplate.htmlContent
      };

      // Check if Email is available (loaded via CDN)
      if (typeof (window as any).Email !== 'undefined') {
        const result = await (window as any).Email.send(emailParams);
        
        // Log the email send event
        this.logEmailEvent({
          type: notification.type,
          recipient: notification.recipient,
          status: result === 'OK' ? 'sent' : 'failed',
          timestamp: new Date(),
          messageId: result
        });

        return result === 'OK';
      } else {
        console.warn('SMTPjs not loaded. Email sending disabled.');
        
        // In development, just log the email details
        this.logEmailEvent({
          type: notification.type,
          recipient: notification.recipient,
          status: 'simulated',
          timestamp: new Date(),
          subject: processedTemplate.subject
        });
        
        return true;
      }
    } catch (error) {
      console.error('Email sending failed:', error);
      
      // Log the email failure event
      this.logEmailEvent({
        type: notification.type,
        recipient: notification.recipient,
        status: 'failed',
        error: error.message,
        timestamp: new Date()
      });
      
      return false;
    }
  }

  // Get email template based on notification type
  private getEmailTemplate(type: NotificationType, data: any): EmailTemplate {
    const templates: Record<NotificationType, EmailTemplate> = {
      [NotificationType.WELCOME_EMAIL]: {
        subject: 'Welcome to CareConnect - Your Healthcare Journey Starts Here!',
        htmlContent: this.getWelcomeEmailTemplate(),
        textContent: 'Welcome to CareConnect! We\'re excited to have you join our healthcare community.'
      },
      
      [NotificationType.EMAIL_VERIFICATION]: {
        subject: 'Verify Your CareConnect Email Address',
        htmlContent: this.getEmailVerificationTemplate(),
        textContent: 'Please verify your email address to complete your CareConnect registration.'
      },
      
      [NotificationType.APPOINTMENT_CONFIRMED]: {
        subject: 'Appointment Confirmed - {{providerName}}',
        htmlContent: this.getAppointmentConfirmedTemplate(),
        textContent: 'Your appointment with {{providerName}} has been confirmed for {{appointmentDate}} at {{appointmentTime}}.'
      },
      
      [NotificationType.APPOINTMENT_REMINDER]: {
        subject: 'Appointment Reminder - Tomorrow at {{appointmentTime}}',
        htmlContent: this.getAppointmentReminderTemplate(),
        textContent: 'Reminder: You have an appointment tomorrow at {{appointmentTime}} with {{providerName}}.'
      },
      
      [NotificationType.COURSE_ENROLLED]: {
        subject: 'Course Enrollment Confirmed - {{courseName}}',
        htmlContent: this.getCourseEnrollmentTemplate(),
        textContent: 'You have successfully enrolled in {{courseName}}. Start learning at your own pace.'
      },
      
      [NotificationType.ORDER_CONFIRMED]: {
        subject: 'Order Confirmation #{{orderNumber}}',
        htmlContent: this.getOrderConfirmationTemplate(),
        textContent: 'Your order #{{orderNumber}} has been confirmed and is being processed.'
      },
      
      [NotificationType.CAUSE_DONATION_CONFIRMED]: {
        subject: 'Thank You for Your Donation to {{causeName}}',
        htmlContent: this.getDonationConfirmationTemplate(),
        textContent: 'Thank you for your generous donation of ${{donationAmount}} to {{causeName}}.'
      },
      
      [NotificationType.VERIFICATION_APPROVED]: {
        subject: 'Congratulations! Your CareConnect Profile is Verified',
        htmlContent: this.getVerificationApprovedTemplate(),
        textContent: 'Your CareConnect healthcare provider profile has been approved and verified.'
      },
      
      [NotificationType.HEALTH_REMINDER]: {
        subject: 'Health Reminder: {{reminderTitle}}',
        htmlContent: this.getHealthReminderTemplate(),
        textContent: 'Health reminder: {{reminderTitle}} - {{reminderMessage}}'
      },
      
      [NotificationType.NEWSLETTER_SUBSCRIPTION]: {
        subject: 'Welcome to CareConnect Health Newsletter',
        htmlContent: this.getNewsletterSubscriptionTemplate(),
        textContent: 'Thank you for subscribing to the CareConnect Health Newsletter.'
      },

      // Add all other notification types...
      [NotificationType.PASSWORD_RESET]: {
        subject: 'Reset Your CareConnect Password',
        htmlContent: this.getPasswordResetTemplate(),
        textContent: 'Click the link to reset your CareConnect password.'
      },
      
      [NotificationType.ACCOUNT_LOCKED]: {
        subject: 'CareConnect Account Security Alert',
        htmlContent: this.getAccountLockedTemplate(),
        textContent: 'Your CareConnect account has been temporarily locked for security.'
      },
      
      [NotificationType.PROFILE_UPDATED]: {
        subject: 'Profile Updated Successfully',
        htmlContent: this.getProfileUpdatedTemplate(),
        textContent: 'Your CareConnect profile has been updated successfully.'
      },
      
      [NotificationType.APPOINTMENT_CANCELLED]: {
        subject: 'Appointment Cancelled - {{providerName}}',
        htmlContent: this.getAppointmentCancelledTemplate(),
        textContent: 'Your appointment with {{providerName}} on {{appointmentDate}} has been cancelled.'
      },
      
      [NotificationType.APPOINTMENT_RESCHEDULED]: {
        subject: 'Appointment Rescheduled - {{providerName}}',
        htmlContent: this.getAppointmentRescheduledTemplate(),
        textContent: 'Your appointment with {{providerName}} has been rescheduled.'
      },
      
      [NotificationType.APPOINTMENT_COMPLETED]: {
        subject: 'Thank You - Appointment Complete',
        htmlContent: this.getAppointmentCompletedTemplate(),
        textContent: 'Thank you for visiting {{providerName}}. Please leave a review.'
      },
      
      [NotificationType.HEALTH_ASSESSMENT_COMPLETE]: {
        subject: 'Your Health Assessment Results',
        htmlContent: this.getHealthAssessmentTemplate(),
        textContent: 'Your health assessment is complete. View your results in your dashboard.'
      },
      
      [NotificationType.MEDICATION_REMINDER]: {
        subject: 'Medication Reminder: {{medicationName}}',
        htmlContent: this.getMedicationReminderTemplate(),
        textContent: 'Reminder to take your {{medicationName}} medication.'
      },
      
      [NotificationType.COURSE_COMPLETED]: {
        subject: 'Congratulations! Course Completed - {{courseName}}',
        htmlContent: this.getCourseCompletedTemplate(),
        textContent: 'Congratulations on completing {{courseName}}!'
      },
      
      [NotificationType.CERTIFICATE_EARNED]: {
        subject: 'Certificate Earned - {{courseName}}',
        htmlContent: this.getCertificateEarnedTemplate(),
        textContent: 'You have earned a certificate for completing {{courseName}}.'
      },
      
      [NotificationType.COURSE_REMINDER]: {
        subject: 'Continue Your Learning - {{courseName}}',
        htmlContent: this.getCourseReminderTemplate(),
        textContent: 'Continue learning in your enrolled course: {{courseName}}.'
      },
      
      [NotificationType.ORDER_SHIPPED]: {
        subject: 'Order Shipped #{{orderNumber}}',
        htmlContent: this.getOrderShippedTemplate(),
        textContent: 'Your order #{{orderNumber}} has been shipped.'
      },
      
      [NotificationType.ORDER_DELIVERED]: {
        subject: 'Order Delivered #{{orderNumber}}',
        htmlContent: this.getOrderDeliveredTemplate(),
        textContent: 'Your order #{{orderNumber}} has been delivered.'
      },
      
      [NotificationType.ORDER_CANCELLED]: {
        subject: 'Order Cancelled #{{orderNumber}}',
        htmlContent: this.getOrderCancelledTemplate(),
        textContent: 'Your order #{{orderNumber}} has been cancelled.'
      },
      
      [NotificationType.PRESCRIPTION_READY]: {
        subject: 'Prescription Ready for Pickup',
        htmlContent: this.getPrescriptionReadyTemplate(),
        textContent: 'Your prescription is ready for pickup at {{pharmacyName}}.'
      },
      
      [NotificationType.CAUSE_GOAL_REACHED]: {
        subject: 'Goal Reached! {{causeName}} Update',
        htmlContent: this.getCauseGoalReachedTemplate(),
        textContent: 'Great news! {{causeName}} has reached its fundraising goal.'
      },
      
      [NotificationType.CAUSE_UPDATE]: {
        subject: 'Update from {{causeName}}',
        htmlContent: this.getCauseUpdateTemplate(),
        textContent: 'There\'s an update from {{causeName}} that you supported.'
      },
      
      [NotificationType.VERIFICATION_REJECTED]: {
        subject: 'CareConnect Verification Update Required',
        htmlContent: this.getVerificationRejectedTemplate(),
        textContent: 'Your CareConnect verification requires additional documentation.'
      },
      
      [NotificationType.NEW_REVIEW_RECEIVED]: {
        subject: 'New Patient Review Received',
        htmlContent: this.getNewReviewTemplate(),
        textContent: 'You have received a new patient review on CareConnect.'
      },
      
      [NotificationType.SECURITY_ALERT]: {
        subject: 'CareConnect Security Alert',
        htmlContent: this.getSecurityAlertTemplate(),
        textContent: 'Security alert: Unusual activity detected on your CareConnect account.'
      },
      
      [NotificationType.MAINTENANCE_NOTICE]: {
        subject: 'CareConnect Maintenance Scheduled',
        htmlContent: this.getMaintenanceNoticeTemplate(),
        textContent: 'CareConnect will undergo scheduled maintenance.'
      },
      
      [NotificationType.FEATURE_ANNOUNCEMENT]: {
        subject: 'New Features Available on CareConnect',
        htmlContent: this.getFeatureAnnouncementTemplate(),
        textContent: 'Discover new features now available on CareConnect.'
      },

      // Additional notification types
      [NotificationType.LOGIN_ALERT]: {
        subject: 'New Login Detected - CareConnect',
        htmlContent: this.getLoginAlertTemplate(),
        textContent: 'A new login was detected on your CareConnect account.'
      },

      [NotificationType.APPOINTMENT_NO_SHOW]: {
        subject: 'Missed Appointment - {{providerName}}',
        htmlContent: this.getAppointmentNoShowTemplate(),
        textContent: 'You missed your appointment with {{providerName}} today.'
      },

      [NotificationType.VITAL_SIGNS_ALERT]: {
        subject: 'Vital Signs Alert - CareConnect',
        htmlContent: this.getVitalSignsAlertTemplate(),
        textContent: 'Your vital signs require attention. Please consult your healthcare provider.'
      },

      [NotificationType.TEST_RESULTS_AVAILABLE]: {
        subject: 'Test Results Available - {{testName}}',
        htmlContent: this.getTestResultsTemplate(),
        textContent: 'Your {{testName}} results are now available in your CareConnect portal.'
      },

      [NotificationType.ASSIGNMENT_DUE]: {
        subject: 'Assignment Due Tomorrow - {{courseName}}',
        htmlContent: this.getAssignmentDueTemplate(),
        textContent: 'Your assignment for {{courseName}} is due tomorrow.'
      },

      [NotificationType.QUIZ_RESULTS]: {
        subject: 'Quiz Results Available - {{courseName}}',
        htmlContent: this.getQuizResultsTemplate(),
        textContent: 'Your quiz results for {{courseName}} are now available.'
      },

      [NotificationType.PAYMENT_FAILED]: {
        subject: 'Payment Failed - Action Required',
        htmlContent: this.getPaymentFailedTemplate(),
        textContent: 'Your payment for {{serviceName}} could not be processed.'
      },

      [NotificationType.REFUND_PROCESSED]: {
        subject: 'Refund Processed - {{amount}}',
        htmlContent: this.getRefundProcessedTemplate(),
        textContent: 'Your refund of {{amount}} has been processed successfully.'
      },

      [NotificationType.FORUM_REPLY]: {
        subject: 'New Reply to Your Post - {{forumTitle}}',
        htmlContent: this.getForumReplyTemplate(),
        textContent: 'Someone replied to your post in {{forumTitle}}.'
      },

      [NotificationType.COMMUNITY_WELCOME]: {
        subject: 'Welcome to the CareConnect Community!',
        htmlContent: this.getCommunityWelcomeTemplate(),
        textContent: 'Welcome to the CareConnect community forum!'
      },

      [NotificationType.BOOKING_REQUEST]: {
        subject: 'New Booking Request - {{patientName}}',
        htmlContent: this.getBookingRequestTemplate(),
        textContent: 'You have a new booking request from {{patientName}}.'
      },

      [NotificationType.PATIENT_MESSAGE]: {
        subject: 'New Message from {{patientName}}',
        htmlContent: this.getPatientMessageTemplate(),
        textContent: 'You have a new message from {{patientName}}.'
      },

      [NotificationType.SUBSCRIPTION_EXPIRED]: {
        subject: 'Subscription Expired - Renew Now',
        htmlContent: this.getSubscriptionExpiredTemplate(),
        textContent: 'Your CareConnect subscription has expired. Renew to continue using premium features.'
      },

      [NotificationType.DATA_BACKUP_COMPLETE]: {
        subject: 'Data Backup Complete - CareConnect',
        htmlContent: this.getDataBackupCompleteTemplate(),
        textContent: 'Your data backup has been completed successfully.'
      }
    };

    return templates[type] || templates[NotificationType.WELCOME_EMAIL];
  }

  // Process template variables
  private processTemplate(template: EmailTemplate, data: any): EmailTemplate {
    const processContent = (content: string) => {
      let processedContent = content;
      Object.keys(data).forEach(key => {
        const placeholder = `{{${key}}}`;
        processedContent = processedContent.replace(new RegExp(placeholder, 'g'), data[key] || '');
      });
      return processedContent;
    };

    return {
      subject: processContent(template.subject),
      htmlContent: processContent(template.htmlContent),
      textContent: processContent(template.textContent)
    };
  }

  // Log email events for tracking
  private logEmailEvent(event: any) {
    // In production, this would log to database
    console.log('Email Event:', event);
  }

  // Email Template Methods
  private getWelcomeEmailTemplate(): string {
    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Welcome to CareConnect</title>
      <style>
        .container { max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; }
        .header { background: #05B34D; padding: 20px; text-align: center; }
        .header h1 { color: white; margin: 0; }
        .content { padding: 30px 20px; background: white; }
        .button { background: #05B34D; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; }
        .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #666; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Welcome to CareConnect!</h1>
        </div>
        <div class="content">
          <h2>Hello {{recipientName}}!</h2>
          <p>Welcome to CareConnect, your comprehensive healthcare platform. We're excited to have you join our community of patients, healthcare providers, and wellness enthusiasts.</p>
          
          <h3>What you can do with CareConnect:</h3>
          <ul>
            <li>Find and book appointments with verified healthcare providers</li>
            <li>Access 100+ AI-powered health tools and calculators</li>
            <li>Enroll in health education courses and earn certificates</li>
            <li>Support community health causes</li>
            <li>Get personalized health insights and reminders</li>
          </ul>
          
          <p>Ready to get started?</p>
          <p><a href="{{dashboardUrl}}" class="button">Go to Your Dashboard</a></p>
          
          <p>If you have any questions, our support team is here to help at support@careconnect.health</p>
          
          <p>Best regards,<br>The CareConnect Team</p>
        </div>
        <div class="footer">
          <p>© 2024 CareConnect Healthcare Platform. All rights reserved.</p>
          <p>You received this email because you signed up for CareConnect.</p>
        </div>
      </div>
    </body>
    </html>
    `;
  }

  private getEmailVerificationTemplate(): string {
    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Verify Your Email</title>
      <style>
        .container { max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; }
        .header { background: #05B34D; padding: 20px; text-align: center; }
        .header h1 { color: white; margin: 0; }
        .content { padding: 30px 20px; background: white; }
        .button { background: #05B34D; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; }
        .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #666; }
        .verification-code { background: #E9FBF1; padding: 20px; text-align: center; font-size: 24px; font-weight: bold; color: #05B34D; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Verify Your Email Address</h1>
        </div>
        <div class="content">
          <h2>Hello {{recipientName}}!</h2>
          <p>Thank you for signing up with CareConnect. To complete your registration, please verify your email address.</p>
          
          <div class="verification-code">
            {{verificationCode}}
          </div>
          
          <p>Or click the button below to verify your email:</p>
          <p><a href="{{verificationUrl}}" class="button">Verify Email Address</a></p>
          
          <p>This verification link will expire in 24 hours.</p>
          
          <p>If you didn't create a CareConnect account, you can safely ignore this email.</p>
          
          <p>Best regards,<br>The CareConnect Team</p>
        </div>
        <div class="footer">
          <p>© 2024 CareConnect Healthcare Platform. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
    `;
  }

  private getAppointmentConfirmedTemplate(): string {
    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Appointment Confirmed</title>
      <style>
        .container { max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; }
        .header { background: #05B34D; padding: 20px; text-align: center; }
        .header h1 { color: white; margin: 0; }
        .content { padding: 30px 20px; background: white; }
        .appointment-details { background: #E9FBF1; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .button { background: #05B34D; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; }
        .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #666; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Appointment Confirmed</h1>
        </div>
        <div class="content">
          <h2>Hello {{recipientName}}!</h2>
          <p>Your appointment has been confirmed. Here are the details:</p>
          
          <div class="appointment-details">
            <h3>Appointment Details</h3>
            <p><strong>Provider:</strong> {{providerName}}</p>
            <p><strong>Service:</strong> {{serviceName}}</p>
            <p><strong>Date:</strong> {{appointmentDate}}</p>
            <p><strong>Time:</strong> {{appointmentTime}}</p>
            <p><strong>Duration:</strong> {{duration}}</p>
            <p><strong>Location:</strong> {{location}}</p>
            {{#if isTelemedicine}}
            <p><strong>Type:</strong> Virtual Appointment</p>
            {{/if}}
          </div>
          
          <p><strong>Preparation Instructions:</strong></p>
          <p>{{preparationInstructions}}</p>
          
          <p>Need to reschedule or cancel? Use the buttons below:</p>
          <p>
            <a href="{{rescheduleUrl}}" class="button" style="background: #F2B91C; color: #000;">Reschedule</a>
            <a href="{{cancelUrl}}" class="button" style="background: #dc3545;">Cancel</a>
          </p>
          
          <p>We'll send you a reminder 24 hours before your appointment.</p>
          
          <p>Best regards,<br>The CareConnect Team</p>
        </div>
        <div class="footer">
          <p>© 2024 CareConnect Healthcare Platform. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
    `;
  }

  // Add other template methods...
  private getAppointmentReminderTemplate(): string {
    return this.getBasicTemplate('Appointment Reminder', 'Don\'t forget about your appointment tomorrow!');
  }

  private getCourseEnrollmentTemplate(): string {
    return this.getBasicTemplate('Course Enrollment Confirmed', 'You\'ve successfully enrolled in {{courseName}}.');
  }

  private getOrderConfirmationTemplate(): string {
    return this.getBasicTemplate('Order Confirmation', 'Your order #{{orderNumber}} has been confirmed.');
  }

  private getDonationConfirmationTemplate(): string {
    return this.getBasicTemplate('Donation Confirmation', 'Thank you for your generous donation of ${{donationAmount}}.');
  }

  private getVerificationApprovedTemplate(): string {
    return this.getBasicTemplate('Profile Verified', 'Congratulations! Your healthcare provider profile has been verified.');
  }

  private getHealthReminderTemplate(): string {
    return this.getBasicTemplate('Health Reminder', '{{reminderMessage}}');
  }

  private getNewsletterSubscriptionTemplate(): string {
    return this.getBasicTemplate('Newsletter Subscription', 'Thank you for subscribing to our health newsletter.');
  }

  // Add placeholder methods for remaining templates
  private getPasswordResetTemplate(): string {
    return this.getBasicTemplate('Password Reset', 'Click the link to reset your password.');
  }

  private getAccountLockedTemplate(): string {
    return this.getBasicTemplate('Account Security', 'Your account has been temporarily locked for security.');
  }

  private getProfileUpdatedTemplate(): string {
    return this.getBasicTemplate('Profile Updated', 'Your profile has been updated successfully.');
  }

  private getAppointmentCancelledTemplate(): string {
    return this.getBasicTemplate('Appointment Cancelled', 'Your appointment has been cancelled.');
  }

  private getAppointmentRescheduledTemplate(): string {
    return this.getBasicTemplate('Appointment Rescheduled', 'Your appointment has been rescheduled.');
  }

  private getAppointmentCompletedTemplate(): string {
    return this.getBasicTemplate('Appointment Complete', 'Thank you for your visit. Please consider leaving a review.');
  }

  private getHealthAssessmentTemplate(): string {
    return this.getBasicTemplate('Health Assessment Complete', 'Your health assessment results are ready.');
  }

  private getMedicationReminderTemplate(): string {
    return this.getBasicTemplate('Medication Reminder', 'Time to take your {{medicationName}} medication.');
  }

  private getCourseCompletedTemplate(): string {
    return this.getBasicTemplate('Course Completed', 'Congratulations on completing {{courseName}}!');
  }

  private getCertificateEarnedTemplate(): string {
    return this.getBasicTemplate('Certificate Earned', 'You\'ve earned a certificate for {{courseName}}.');
  }

  private getCourseReminderTemplate(): string {
    return this.getBasicTemplate('Course Reminder', 'Continue your learning journey in {{courseName}}.');
  }

  private getOrderShippedTemplate(): string {
    return this.getBasicTemplate('Order Shipped', 'Your order #{{orderNumber}} is on its way!');
  }

  private getOrderDeliveredTemplate(): string {
    return this.getBasicTemplate('Order Delivered', 'Your order #{{orderNumber}} has been delivered.');
  }

  private getOrderCancelledTemplate(): string {
    return this.getBasicTemplate('Order Cancelled', 'Your order #{{orderNumber}} has been cancelled.');
  }

  private getPrescriptionReadyTemplate(): string {
    return this.getBasicTemplate('Prescription Ready', 'Your prescription is ready for pickup.');
  }

  private getCauseGoalReachedTemplate(): string {
    return this.getBasicTemplate('Goal Reached!', '{{causeName}} has reached its fundraising goal!');
  }

  private getCauseUpdateTemplate(): string {
    return this.getBasicTemplate('Cause Update', 'There\'s an update from {{causeName}}.');
  }

  private getVerificationRejectedTemplate(): string {
    return this.getBasicTemplate('Verification Update Required', 'Additional documentation needed for verification.');
  }

  private getNewReviewTemplate(): string {
    return this.getBasicTemplate('New Review Received', 'You have received a new patient review.');
  }

  private getSecurityAlertTemplate(): string {
    return this.getBasicTemplate('Security Alert', 'Unusual activity detected on your account.');
  }

  private getMaintenanceNoticeTemplate(): string {
    return this.getBasicTemplate('Maintenance Scheduled', 'CareConnect will undergo scheduled maintenance.');
  }

  private getFeatureAnnouncementTemplate(): string {
    return this.getBasicTemplate('New Features Available', 'Discover new features on CareConnect.');
  }

  // Additional template methods for new notification types
  private getLoginAlertTemplate(): string {
    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Login Alert</title>
      <style>
        .container { max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; }
        .header { background: #F2B91C; padding: 20px; text-align: center; }
        .header h1 { color: white; margin: 0; }
        .content { padding: 30px 20px; background: white; }
        .alert-box { background: #FFF3CD; border: 1px solid #F2B91C; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .button { background: #05B34D; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; }
        .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #666; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🔐 Login Alert</h1>
        </div>
        <div class="content">
          <h2>Hello {{recipientName}}!</h2>
          <div class="alert-box">
            <h3>New Login Detected</h3>
            <p><strong>Time:</strong> {{loginTime}}</p>
            <p><strong>Location:</strong> {{location}}</p>
            <p><strong>Device:</strong> {{device}}</p>
            <p><strong>IP Address:</strong> {{ipAddress}}</p>
          </div>
          <p>If this was you, you can safely ignore this email. If you don't recognize this login, please secure your account immediately.</p>
          <p><a href="{{securityUrl}}" class="button">Review Security Settings</a></p>
          <p>Best regards,<br>The CareConnect Security Team</p>
        </div>
        <div class="footer">
          <p>© 2024 CareConnect Healthcare Platform. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
    `;
  }

  private getAppointmentNoShowTemplate(): string {
    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Missed Appointment</title>
      <style>
        .container { max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; }
        .header { background: #dc3545; padding: 20px; text-align: center; }
        .header h1 { color: white; margin: 0; }
        .content { padding: 30px 20px; background: white; }
        .missed-details { background: #f8d7da; border: 1px solid #dc3545; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .button { background: #05B34D; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 5px; }
        .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #666; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Missed Appointment</h1>
        </div>
        <div class="content">
          <h2>Hello {{recipientName}}!</h2>
          <div class="missed-details">
            <h3>Appointment Details</h3>
            <p><strong>Provider:</strong> {{providerName}}</p>
            <p><strong>Date:</strong> {{appointmentDate}}</p>
            <p><strong>Time:</strong> {{appointmentTime}}</p>
            <p><strong>Status:</strong> No-show</p>
          </div>
          <p>We noticed you missed your scheduled appointment today. We understand that unexpected situations can arise.</p>
          <p>Would you like to reschedule your appointment?</p>
          <p>
            <a href="{{rescheduleUrl}}" class="button">Reschedule Appointment</a>
            <a href="{{contactUrl}}" class="button" style="background: #6c757d;">Contact Provider</a>
          </p>
          <p>Please note that some providers may charge a no-show fee as per their policy.</p>
          <p>Best regards,<br>The CareConnect Team</p>
        </div>
        <div class="footer">
          <p>© 2024 CareConnect Healthcare Platform. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
    `;
  }

  private getVitalSignsAlertTemplate(): string {
    return this.getBasicTemplate('Vital Signs Alert', 'Your vital signs reading of {{value}} for {{measurement}} requires attention.');
  }

  private getTestResultsTemplate(): string {
    return this.getBasicTemplate('Test Results Available', 'Your {{testName}} results are now available in your portal.');
  }

  private getAssignmentDueTemplate(): string {
    return this.getBasicTemplate('Assignment Due Tomorrow', 'Your assignment for {{courseName}} is due tomorrow.');
  }

  private getQuizResultsTemplate(): string {
    return this.getBasicTemplate('Quiz Results Available', 'Your quiz results for {{courseName}} are ready to view.');
  }

  private getPaymentFailedTemplate(): string {
    return this.getBasicTemplate('Payment Failed', 'Your payment for {{serviceName}} could not be processed. Please update your payment method.');
  }

  private getRefundProcessedTemplate(): string {
    return this.getBasicTemplate('Refund Processed', 'Your refund of {{amount}} has been processed successfully.');
  }

  private getForumReplyTemplate(): string {
    return this.getBasicTemplate('New Forum Reply', 'Someone replied to your post in {{forumTitle}}.');
  }

  private getCommunityWelcomeTemplate(): string {
    return this.getBasicTemplate('Welcome to Community', 'Welcome to the CareConnect community forum!');
  }

  private getBookingRequestTemplate(): string {
    return this.getBasicTemplate('New Booking Request', 'You have a new booking request from {{patientName}}.');
  }

  private getPatientMessageTemplate(): string {
    return this.getBasicTemplate('New Patient Message', 'You have a new message from {{patientName}}.');
  }

  private getSubscriptionExpiredTemplate(): string {
    return this.getBasicTemplate('Subscription Expired', 'Your CareConnect subscription has expired. Renew to continue using premium features.');
  }

  private getDataBackupCompleteTemplate(): string {
    return this.getBasicTemplate('Data Backup Complete', 'Your data backup has been completed successfully.');
  }

  // Basic template for simple notifications
  private getBasicTemplate(title: string, message: string): string {
    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>${title}</title>
      <style>
        .container { max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; }
        .header { background: #05B34D; padding: 20px; text-align: center; }
        .header h1 { color: white; margin: 0; }
        .content { padding: 30px 20px; background: white; }
        .button { background: #05B34D; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; }
        .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #666; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>${title}</h1>
        </div>
        <div class="content">
          <h2>Hello {{recipientName}}!</h2>
          <p>${message}</p>
          <p>Visit your <a href="{{dashboardUrl}}" class="button">CareConnect Dashboard</a> for more details.</p>
          <p>Best regards,<br>The CareConnect Team</p>
        </div>
        <div class="footer">
          <p>© 2024 CareConnect Healthcare Platform. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
    `;
  }
}

// Export singleton instance
export const emailService = EmailNotificationService.getInstance();

// Helper functions for common notification scenarios
export const sendWelcomeEmail = async (userEmail: string, userName: string) => {
  return await emailService.sendNotification({
    type: NotificationType.WELCOME_EMAIL,
    recipient: userEmail,
    recipientName: userName,
    data: {
      recipientName: userName,
      dashboardUrl: `${window.location.origin}/dashboard`
    },
    priority: 'normal'
  });
};

export const sendAppointmentConfirmation = async (
  userEmail: string, 
  userName: string, 
  appointmentDetails: any
) => {
  return await emailService.sendNotification({
    type: NotificationType.APPOINTMENT_CONFIRMED,
    recipient: userEmail,
    recipientName: userName,
    data: {
      recipientName: userName,
      ...appointmentDetails,
      rescheduleUrl: `${window.location.origin}/appointments/reschedule/${appointmentDetails.appointmentId}`,
      cancelUrl: `${window.location.origin}/appointments/cancel/${appointmentDetails.appointmentId}`
    },
    priority: 'high'
  });
};

export const sendHealthReminder = async (
  userEmail: string, 
  userName: string, 
  reminderDetails: any
) => {
  return await emailService.sendNotification({
    type: NotificationType.HEALTH_REMINDER,
    recipient: userEmail,
    recipientName: userName,
    data: {
      recipientName: userName,
      ...reminderDetails,
      dashboardUrl: `${window.location.origin}/dashboard`
    },
    priority: 'normal'
  });
};

// Additional helper functions for new notification types
export const sendLoginAlert = async (
  userEmail: string,
  userName: string,
  loginDetails: any
) => {
  return await emailService.sendNotification({
    type: NotificationType.LOGIN_ALERT,
    recipient: userEmail,
    recipientName: userName,
    data: {
      recipientName: userName,
      ...loginDetails,
      securityUrl: `${window.location.origin}/profile/security`
    },
    priority: 'high'
  });
};

export const sendCourseEnrollmentConfirmation = async (
  userEmail: string,
  userName: string,
  courseDetails: any
) => {
  return await emailService.sendNotification({
    type: NotificationType.COURSE_ENROLLED,
    recipient: userEmail,
    recipientName: userName,
    data: {
      recipientName: userName,
      ...courseDetails,
      courseUrl: `${window.location.origin}/courses/${courseDetails.courseId}`
    },
    priority: 'normal'
  });
};

export const sendOrderConfirmation = async (
  userEmail: string,
  userName: string,
  orderDetails: any
) => {
  return await emailService.sendNotification({
    type: NotificationType.ORDER_CONFIRMED,
    recipient: userEmail,
    recipientName: userName,
    data: {
      recipientName: userName,
      ...orderDetails,
      orderUrl: `${window.location.origin}/orders/${orderDetails.orderId}`
    },
    priority: 'high'
  });
};

export const sendDonationConfirmation = async (
  userEmail: string,
  userName: string,
  donationDetails: any
) => {
  return await emailService.sendNotification({
    type: NotificationType.CAUSE_DONATION_CONFIRMED,
    recipient: userEmail,
    recipientName: userName,
    data: {
      recipientName: userName,
      ...donationDetails,
      receiptUrl: `${window.location.origin}/donations/receipt/${donationDetails.transactionId}`
    },
    priority: 'normal'
  });
};

export const sendPasswordResetEmail = async (
  userEmail: string,
  userName: string,
  resetToken: string
) => {
  return await emailService.sendNotification({
    type: NotificationType.PASSWORD_RESET,
    recipient: userEmail,
    recipientName: userName,
    data: {
      recipientName: userName,
      resetUrl: `${window.location.origin}/reset-password?token=${resetToken}`
    },
    priority: 'high'
  });
};

export const sendEmailVerification = async (
  userEmail: string,
  userName: string,
  verificationCode: string
) => {
  return await emailService.sendNotification({
    type: NotificationType.EMAIL_VERIFICATION,
    recipient: userEmail,
    recipientName: userName,
    data: {
      recipientName: userName,
      verificationCode,
      verificationUrl: `${window.location.origin}/verify-email?code=${verificationCode}&email=${encodeURIComponent(userEmail)}`
    },
    priority: 'high'
  });
};

export const sendProviderVerificationApproved = async (
  providerEmail: string,
  providerName: string
) => {
  return await emailService.sendNotification({
    type: NotificationType.VERIFICATION_APPROVED,
    recipient: providerEmail,
    recipientName: providerName,
    data: {
      recipientName: providerName,
      dashboardUrl: `${window.location.origin}/provider/dashboard`
    },
    priority: 'high'
  });
};

export const sendVitalSignsAlert = async (
  userEmail: string,
  userName: string,
  vitalSignsData: any
) => {
  return await emailService.sendNotification({
    type: NotificationType.VITAL_SIGNS_ALERT,
    recipient: userEmail,
    recipientName: userName,
    data: {
      recipientName: userName,
      ...vitalSignsData,
      emergencyContactUrl: `${window.location.origin}/emergency-contacts`
    },
    priority: 'urgent'
  });
};

// Queue for batch email processing
export class EmailQueue {
  private static queue: NotificationData[] = [];
  private static processing = false;

  static async addToQueue(notification: NotificationData) {
    this.queue.push(notification);
    if (!this.processing) {
      this.processQueue();
    }
  }

  private static async processQueue() {
    this.processing = true;
    
    while (this.queue.length > 0) {
      const notification = this.queue.shift();
      if (notification) {
        try {
          await emailService.sendNotification(notification);
          // Add delay between emails to respect rate limits
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
          console.error('Failed to send queued email:', error);
        }
      }
    }
    
    this.processing = false;
  }
}