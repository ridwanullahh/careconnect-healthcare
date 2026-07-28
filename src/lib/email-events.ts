// Email Event Trigger System
// Automatically sends notifications when platform events occur

import {
  emailService,
  NotificationType,
  sendWelcomeEmail,
  sendAppointmentConfirmation,
  sendLoginAlert,
  sendCourseEnrollmentConfirmation,
  sendOrderConfirmation,
  sendDonationConfirmation,
  sendPasswordResetEmail,
  sendEmailVerification,
  sendProviderVerificationApproved,
  sendVitalSignsAlert
} from './email-notifications';

// Event types that trigger email notifications
export enum EmailEvent {
  // User Authentication Events
  USER_REGISTERED = 'user_registered',
  USER_LOGIN = 'user_login',
  PASSWORD_RESET_REQUESTED = 'password_reset_requested',
  EMAIL_VERIFICATION_REQUESTED = 'email_verification_requested',
  SUSPICIOUS_LOGIN = 'suspicious_login',
  ACCOUNT_LOCKED = 'account_locked',
  
  // Appointment Events
  APPOINTMENT_BOOKED = 'appointment_booked',
  APPOINTMENT_CONFIRMED = 'appointment_confirmed',
  APPOINTMENT_REMINDER_24H = 'appointment_reminder_24h',
  APPOINTMENT_REMINDER_1H = 'appointment_reminder_1h',
  APPOINTMENT_CANCELLED = 'appointment_cancelled',
  APPOINTMENT_RESCHEDULED = 'appointment_rescheduled',
  APPOINTMENT_COMPLETED = 'appointment_completed',
  APPOINTMENT_NO_SHOW = 'appointment_no_show',
  
  // Health & Medical Events
  HEALTH_ASSESSMENT_COMPLETED = 'health_assessment_completed',
  VITAL_SIGNS_ABNORMAL = 'vital_signs_abnormal',
  TEST_RESULTS_AVAILABLE = 'test_results_available',
  MEDICATION_REMINDER = 'medication_reminder',
  PRESCRIPTION_READY = 'prescription_ready',
  
  // Learning Events
  COURSE_ENROLLED = 'course_enrolled',
  COURSE_COMPLETED = 'course_completed',
  CERTIFICATE_EARNED = 'certificate_earned',
  ASSIGNMENT_DUE = 'assignment_due',
  QUIZ_COMPLETED = 'quiz_completed',
  
  // E-commerce Events
  ORDER_PLACED = 'order_placed',
  ORDER_CONFIRMED = 'order_confirmed',
  ORDER_SHIPPED = 'order_shipped',
  ORDER_DELIVERED = 'order_delivered',
  ORDER_CANCELLED = 'order_cancelled',
  PAYMENT_FAILED = 'payment_failed',
  REFUND_PROCESSED = 'refund_processed',
  
  // Community & Social Events
  DONATION_MADE = 'donation_made',
  CAUSE_GOAL_REACHED = 'cause_goal_reached',
  FORUM_POST_REPLIED = 'forum_post_replied',
  COMMUNITY_JOINED = 'community_joined',
  
  // Provider Events
  PROVIDER_VERIFICATION_APPROVED = 'provider_verification_approved',
  PROVIDER_VERIFICATION_REJECTED = 'provider_verification_rejected',
  NEW_PATIENT_REVIEW = 'new_patient_review',
  NEW_BOOKING_REQUEST = 'new_booking_request',
  PATIENT_MESSAGE_RECEIVED = 'patient_message_received',
  
  // System Events
  MAINTENANCE_SCHEDULED = 'maintenance_scheduled',
  SECURITY_BREACH_DETECTED = 'security_breach_detected',
  SUBSCRIPTION_EXPIRED = 'subscription_expired',
  NEWSLETTER_SUBSCRIPTION = 'newsletter_subscription',
  FEATURE_ANNOUNCEMENT = 'feature_announcement'
}

// Event data interface
interface EmailEventData {
  userEmail: string;
  userName: string;
  eventData: any;
  userId?: string;
  timestamp?: Date;
}

// Email Event Handler Class
class EmailEventHandler {
  private static instance: EmailEventHandler;
  private eventListeners: Map<EmailEvent, Array<(data: EmailEventData) => Promise<void>>> = new Map();

  private constructor() {
    this.initializeDefaultHandlers();
  }

  public static getInstance(): EmailEventHandler {
    if (!EmailEventHandler.instance) {
      EmailEventHandler.instance = new EmailEventHandler();
    }
    return EmailEventHandler.instance;
  }

  // Initialize default email handlers for all events
  private initializeDefaultHandlers() {
    // User Authentication Handlers
    this.on(EmailEvent.USER_REGISTERED, this.handleUserRegistered.bind(this));
    this.on(EmailEvent.SUSPICIOUS_LOGIN, this.handleSuspiciousLogin.bind(this));
    this.on(EmailEvent.PASSWORD_RESET_REQUESTED, this.handlePasswordReset.bind(this));
    this.on(EmailEvent.EMAIL_VERIFICATION_REQUESTED, this.handleEmailVerification.bind(this));
    
    // Appointment Handlers
    this.on(EmailEvent.APPOINTMENT_BOOKED, this.handleAppointmentBooked.bind(this));
    this.on(EmailEvent.APPOINTMENT_REMINDER_24H, this.handleAppointmentReminder.bind(this));
    this.on(EmailEvent.APPOINTMENT_CANCELLED, this.handleAppointmentCancelled.bind(this));
    this.on(EmailEvent.APPOINTMENT_NO_SHOW, this.handleAppointmentNoShow.bind(this));
    
    // Health & Medical Handlers
    this.on(EmailEvent.VITAL_SIGNS_ABNORMAL, this.handleVitalSignsAbnormal.bind(this));
    this.on(EmailEvent.TEST_RESULTS_AVAILABLE, this.handleTestResults.bind(this));
    this.on(EmailEvent.PRESCRIPTION_READY, this.handlePrescriptionReady.bind(this));
    
    // Learning Handlers
    this.on(EmailEvent.COURSE_ENROLLED, this.handleCourseEnrolled.bind(this));
    this.on(EmailEvent.COURSE_COMPLETED, this.handleCourseCompleted.bind(this));
    this.on(EmailEvent.CERTIFICATE_EARNED, this.handleCertificateEarned.bind(this));
    this.on(EmailEvent.ASSIGNMENT_DUE, this.handleAssignmentDue.bind(this));
    
    // E-commerce Handlers
    this.on(EmailEvent.ORDER_PLACED, this.handleOrderPlaced.bind(this));
    this.on(EmailEvent.ORDER_SHIPPED, this.handleOrderShipped.bind(this));
    this.on(EmailEvent.PAYMENT_FAILED, this.handlePaymentFailed.bind(this));
    
    // Community Handlers
    this.on(EmailEvent.DONATION_MADE, this.handleDonationMade.bind(this));
    this.on(EmailEvent.FORUM_POST_REPLIED, this.handleForumReply.bind(this));
    
    // Provider Handlers
    this.on(EmailEvent.PROVIDER_VERIFICATION_APPROVED, this.handleProviderVerificationApproved.bind(this));
    this.on(EmailEvent.NEW_BOOKING_REQUEST, this.handleNewBookingRequest.bind(this));
  }

  // Register event listener
  public on(event: EmailEvent, handler: (data: EmailEventData) => Promise<void>) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(handler);
  }

  // Trigger email event
  public async trigger(event: EmailEvent, data: EmailEventData) {
    try {
      console.log(`Triggering email event: ${event}`, data);
      
      const handlers = this.eventListeners.get(event);
      if (handlers) {
        // Execute all handlers for this event
        await Promise.all(handlers.map(handler => handler(data)));
      }
    } catch (error) {
      console.error(`Failed to trigger email event ${event}:`, error);
    }
  }

  // Event Handler Methods
  private async handleUserRegistered(data: EmailEventData) {
    await sendWelcomeEmail(data.userEmail, data.userName);
  }

  private async handleSuspiciousLogin(data: EmailEventData) {
    await sendLoginAlert(data.userEmail, data.userName, data.eventData);
  }

  private async handlePasswordReset(data: EmailEventData) {
    await sendPasswordResetEmail(data.userEmail, data.userName, data.eventData.resetToken);
  }

  private async handleEmailVerification(data: EmailEventData) {
    await sendEmailVerification(data.userEmail, data.userName, data.eventData.verificationCode);
  }

  private async handleAppointmentBooked(data: EmailEventData) {
    await sendAppointmentConfirmation(data.userEmail, data.userName, data.eventData);
  }

  private async handleAppointmentReminder(data: EmailEventData) {
    await emailService.sendNotification({
      type: NotificationType.APPOINTMENT_REMINDER,
      recipient: data.userEmail,
      recipientName: data.userName,
      data: {
        recipientName: data.userName,
        ...data.eventData
      },
      priority: 'high'
    });
  }

  private async handleAppointmentCancelled(data: EmailEventData) {
    await emailService.sendNotification({
      type: NotificationType.APPOINTMENT_CANCELLED,
      recipient: data.userEmail,
      recipientName: data.userName,
      data: {
        recipientName: data.userName,
        ...data.eventData
      },
      priority: 'high'
    });
  }

  private async handleAppointmentNoShow(data: EmailEventData) {
    await emailService.sendNotification({
      type: NotificationType.APPOINTMENT_NO_SHOW,
      recipient: data.userEmail,
      recipientName: data.userName,
      data: {
        recipientName: data.userName,
        ...data.eventData,
        rescheduleUrl: `${window.location.origin}/appointments/reschedule`,
        contactUrl: `${window.location.origin}/contact`
      },
      priority: 'normal'
    });
  }

  private async handleVitalSignsAbnormal(data: EmailEventData) {
    await sendVitalSignsAlert(data.userEmail, data.userName, data.eventData);
  }

  private async handleTestResults(data: EmailEventData) {
    await emailService.sendNotification({
      type: NotificationType.TEST_RESULTS_AVAILABLE,
      recipient: data.userEmail,
      recipientName: data.userName,
      data: {
        recipientName: data.userName,
        ...data.eventData,
        resultsUrl: `${window.location.origin}/health/test-results`
      },
      priority: 'high'
    });
  }

  private async handlePrescriptionReady(data: EmailEventData) {
    await emailService.sendNotification({
      type: NotificationType.PRESCRIPTION_READY,
      recipient: data.userEmail,
      recipientName: data.userName,
      data: {
        recipientName: data.userName,
        ...data.eventData
      },
      priority: 'high'
    });
  }

  private async handleCourseEnrolled(data: EmailEventData) {
    await sendCourseEnrollmentConfirmation(data.userEmail, data.userName, data.eventData);
  }

  private async handleCourseCompleted(data: EmailEventData) {
    await emailService.sendNotification({
      type: NotificationType.COURSE_COMPLETED,
      recipient: data.userEmail,
      recipientName: data.userName,
      data: {
        recipientName: data.userName,
        ...data.eventData
      },
      priority: 'normal'
    });
  }

  private async handleCertificateEarned(data: EmailEventData) {
    await emailService.sendNotification({
      type: NotificationType.CERTIFICATE_EARNED,
      recipient: data.userEmail,
      recipientName: data.userName,
      data: {
        recipientName: data.userName,
        ...data.eventData,
        certificateUrl: `${window.location.origin}/certificates/${data.eventData.certificateId}`
      },
      priority: 'normal'
    });
  }

  private async handleAssignmentDue(data: EmailEventData) {
    await emailService.sendNotification({
      type: NotificationType.ASSIGNMENT_DUE,
      recipient: data.userEmail,
      recipientName: data.userName,
      data: {
        recipientName: data.userName,
        ...data.eventData
      },
      priority: 'normal'
    });
  }

  private async handleOrderPlaced(data: EmailEventData) {
    await sendOrderConfirmation(data.userEmail, data.userName, data.eventData);
  }

  private async handleOrderShipped(data: EmailEventData) {
    await emailService.sendNotification({
      type: NotificationType.ORDER_SHIPPED,
      recipient: data.userEmail,
      recipientName: data.userName,
      data: {
        recipientName: data.userName,
        ...data.eventData,
        trackingUrl: `${window.location.origin}/orders/track/${data.eventData.orderId}`
      },
      priority: 'normal'
    });
  }

  private async handlePaymentFailed(data: EmailEventData) {
    await emailService.sendNotification({
      type: NotificationType.PAYMENT_FAILED,
      recipient: data.userEmail,
      recipientName: data.userName,
      data: {
        recipientName: data.userName,
        ...data.eventData,
        paymentUrl: `${window.location.origin}/payment/retry/${data.eventData.orderId}`
      },
      priority: 'high'
    });
  }

  private async handleDonationMade(data: EmailEventData) {
    await sendDonationConfirmation(data.userEmail, data.userName, data.eventData);
  }

  private async handleForumReply(data: EmailEventData) {
    await emailService.sendNotification({
      type: NotificationType.FORUM_REPLY,
      recipient: data.userEmail,
      recipientName: data.userName,
      data: {
        recipientName: data.userName,
        ...data.eventData,
        postUrl: `${window.location.origin}/community/posts/${data.eventData.postId}`
      },
      priority: 'low'
    });
  }

  private async handleProviderVerificationApproved(data: EmailEventData) {
    await sendProviderVerificationApproved(data.userEmail, data.userName);
  }

  private async handleNewBookingRequest(data: EmailEventData) {
    await emailService.sendNotification({
      type: NotificationType.BOOKING_REQUEST,
      recipient: data.userEmail,
      recipientName: data.userName,
      data: {
        recipientName: data.userName,
        ...data.eventData,
        bookingUrl: `${window.location.origin}/provider/bookings/${data.eventData.bookingId}`
      },
      priority: 'high'
    });
  }
}

// Export singleton instance
export const emailEventHandler = EmailEventHandler.getInstance();

// Convenience functions for triggering common events
export const triggerUserRegistered = async (userEmail: string, userName: string) => {
  await emailEventHandler.trigger(EmailEvent.USER_REGISTERED, {
    userEmail,
    userName,
    eventData: {}
  });
};

export const triggerAppointmentBooked = async (
  userEmail: string,
  userName: string,
  appointmentData: any
) => {
  await emailEventHandler.trigger(EmailEvent.APPOINTMENT_BOOKED, {
    userEmail,
    userName,
    eventData: appointmentData
  });
};

export const triggerOrderPlaced = async (
  userEmail: string,
  userName: string,
  orderData: any
) => {
  await emailEventHandler.trigger(EmailEvent.ORDER_PLACED, {
    userEmail,
    userName,
    eventData: orderData
  });
};

export const triggerCourseEnrolled = async (
  userEmail: string,
  userName: string,
  courseData: any
) => {
  await emailEventHandler.trigger(EmailEvent.COURSE_ENROLLED, {
    userEmail,
    userName,
    eventData: courseData
  });
};

export const triggerDonationMade = async (
  userEmail: string,
  userName: string,
  donationData: any
) => {
  await emailEventHandler.trigger(EmailEvent.DONATION_MADE, {
    userEmail,
    userName,
    eventData: donationData
  });
};

export const triggerVitalSignsAlert = async (
  userEmail: string,
  userName: string,
  vitalSignsData: any
) => {
  await emailEventHandler.trigger(EmailEvent.VITAL_SIGNS_ABNORMAL, {
    userEmail,
    userName,
    eventData: vitalSignsData
  });
};

// Scheduled notifications helper
export const scheduleAppointmentReminders = () => {
  // This would typically be called by a background job
  // For demo purposes, we'll check for appointments needing reminders
  setInterval(async () => {
    try {
      // Get appointments needing 24h reminders
      // This would query the database for appointments tomorrow
      // For now, we'll simulate this
      console.log('Checking for appointment reminders...');
    } catch (error) {
      console.error('Failed to send appointment reminders:', error);
    }
  }, 60 * 60 * 1000); // Check every hour
};

// Initialize the email event system
export const initializeEmailEvents = () => {
  console.log('Email event system initialized');
  scheduleAppointmentReminders();
};
