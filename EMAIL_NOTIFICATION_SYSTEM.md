# CareConnect Email Notification System

## Overview

The CareConnect platform features a comprehensive email notification system that automatically sends 25+ types of email notifications for various platform events. The system uses SMTPjs with Gmail integration and provides rich, healthcare-branded HTML templates.

## Features

- **25+ Notification Types**: Covers authentication, appointments, health alerts, learning, e-commerce, community, and system notifications
- **Rich HTML Templates**: Healthcare-branded email templates with responsive design
- **Event-Driven Architecture**: Automatic email triggers based on platform events
- **Priority System**: High, normal, low, and urgent priority levels
- **Queue Management**: Batch processing and rate limiting
- **Security Monitoring**: Login alerts and suspicious activity detection

## Notification Types

### Authentication & Account (6 types)
- `WELCOME_EMAIL` - New user registration
- `EMAIL_VERIFICATION` - Email address verification
- `PASSWORD_RESET` - Password reset requests
- `ACCOUNT_LOCKED` - Security lockout notifications
- `PROFILE_UPDATED` - Profile change confirmations
- `LOGIN_ALERT` - New login notifications

### Appointments & Bookings (6 types)
- `APPOINTMENT_CONFIRMED` - Booking confirmations
- `APPOINTMENT_REMINDER` - 24-hour and 1-hour reminders
- `APPOINTMENT_CANCELLED` - Cancellation notifications
- `APPOINTMENT_RESCHEDULED` - Schedule change alerts
- `APPOINTMENT_COMPLETED` - Post-visit follow-ups
- `APPOINTMENT_NO_SHOW` - Missed appointment handling

### Health Tools & Results (5 types)
- `HEALTH_ASSESSMENT_COMPLETE` - Assessment results
- `HEALTH_REMINDER` - Custom health reminders
- `MEDICATION_REMINDER` - Medicine schedule alerts
- `VITAL_SIGNS_ALERT` - Abnormal readings (URGENT priority)
- `TEST_RESULTS_AVAILABLE` - Lab and diagnostic results

### Learning Management System (6 types)
- `COURSE_ENROLLED` - Enrollment confirmations
- `COURSE_COMPLETED` - Completion certificates
- `CERTIFICATE_EARNED` - Achievement notifications
- `COURSE_REMINDER` - Progress reminders
- `ASSIGNMENT_DUE` - Due date alerts
- `QUIZ_RESULTS` - Quiz score notifications

### E-commerce & Orders (7 types)
- `ORDER_CONFIRMED` - Purchase confirmations
- `ORDER_SHIPPED` - Shipping notifications
- `ORDER_DELIVERED` - Delivery confirmations
- `ORDER_CANCELLED` - Cancellation notices
- `PRESCRIPTION_READY` - Pharmacy pickup alerts
- `PAYMENT_FAILED` - Payment issue notifications
- `REFUND_PROCESSED` - Refund confirmations

### Community & Causes (5 types)
- `CAUSE_DONATION_CONFIRMED` - Donation receipts
- `CAUSE_GOAL_REACHED` - Fundraising milestones
- `CAUSE_UPDATE` - Campaign updates
- `FORUM_REPLY` - Discussion responses
- `COMMUNITY_WELCOME` - Community onboarding

### Provider Notifications (5 types)
- `VERIFICATION_APPROVED` - Provider approval
- `VERIFICATION_REJECTED` - Verification issues
- `NEW_REVIEW_RECEIVED` - Patient reviews
- `BOOKING_REQUEST` - New appointment requests
- `PATIENT_MESSAGE` - Patient communications

### System Notifications (6 types)
- `NEWSLETTER_SUBSCRIPTION` - Newsletter confirmations
- `SECURITY_ALERT` - Security breach notifications
- `MAINTENANCE_NOTICE` - System maintenance alerts
- `FEATURE_ANNOUNCEMENT` - New feature releases
- `SUBSCRIPTION_EXPIRED` - Subscription renewals
- `DATA_BACKUP_COMPLETE` - Backup confirmations

## Usage Examples

### Basic Usage

```typescript
import { emailService, NotificationType } from './lib/email-notifications';

// Send a welcome email
await emailService.sendNotification({
  type: NotificationType.WELCOME_EMAIL,
  recipient: 'user@example.com',
  recipientName: 'John Doe',
  data: {
    recipientName: 'John Doe',
    dashboardUrl: 'https://careconnect.com/dashboard'
  },
  priority: 'normal'
});
```

### Using Helper Functions

```typescript
import { 
  sendWelcomeEmail,
  sendAppointmentConfirmation,
  sendOrderConfirmation 
} from './lib/email-notifications';

// Welcome new user
await sendWelcomeEmail('user@example.com', 'John Doe');

// Confirm appointment
await sendAppointmentConfirmation('patient@example.com', 'Jane Smith', {
  appointmentId: '123',
  providerName: 'Dr. Johnson',
  appointmentDate: '2024-01-15',
  appointmentTime: '10:00 AM',
  serviceName: 'General Checkup',
  location: '123 Health St, Medical City'
});

// Confirm order
await sendOrderConfirmation('customer@example.com', 'Bob Wilson', {
  orderId: '456',
  orderNumber: 'ORD-001',
  totalAmount: '$150.00',
  items: ['Multivitamins', 'Blood Pressure Monitor']
});
```

### Using Event Triggers

```typescript
import { 
  emailEventHandler,
  EmailEvent,
  triggerUserRegistered,
  triggerAppointmentBooked,
  triggerOrderPlaced
} from './lib/email-events';

// Trigger user registration event (automatically sends welcome + verification)
await triggerUserRegistered('newuser@example.com', 'Alice Johnson');

// Trigger appointment booking
await triggerAppointmentBooked('patient@example.com', 'John Doe', {
  appointmentId: '789',
  providerName: 'Dr. Smith',
  appointmentDate: '2024-01-20',
  appointmentTime: '2:00 PM'
});

// Trigger order placement
await triggerOrderPlaced('customer@example.com', 'Mary Brown', {
  orderId: '321',
  orderNumber: 'ORD-002',
  totalAmount: '$75.50'
});
```

## Integration Points

### Authentication System
Email notifications are automatically triggered for:
- User registration (welcome + email verification)
- Login events (security monitoring)
- Password resets
- Account lockouts

### Booking System
```typescript
// In booking confirmation logic
import { triggerAppointmentBooked } from './lib/email-events';

const confirmBooking = async (bookingData) => {
  // ... booking logic
  
  // Trigger confirmation email
  await triggerAppointmentBooked(
    bookingData.patientEmail,
    bookingData.patientName,
    bookingData
  );
};
```

### E-commerce Integration
```typescript
// In order processing
import { triggerOrderPlaced } from './lib/email-events';

const processOrder = async (orderData) => {
  // ... order processing
  
  // Send confirmation email
  await triggerOrderPlaced(
    orderData.customerEmail,
    orderData.customerName,
    orderData
  );
};
```

### Health Monitoring
```typescript
// In health assessment completion
import { emailEventHandler, EmailEvent } from './lib/email-events';

const completeHealthAssessment = async (assessmentData) => {
  // ... assessment logic
  
  // Trigger results email
  await emailEventHandler.trigger(EmailEvent.HEALTH_ASSESSMENT_COMPLETED, {
    userEmail: assessmentData.userEmail,
    userName: assessmentData.userName,
    eventData: {
      assessmentType: assessmentData.type,
      score: assessmentData.score,
      recommendations: assessmentData.recommendations
    }
  });
};
```

## Email Templates

### Template Variables
All templates support variable substitution using `{{variableName}}` syntax:

```html
<h2>Hello {{recipientName}}!</h2>
<p>Your appointment with {{providerName}} is confirmed for {{appointmentDate}} at {{appointmentTime}}.</p>
<a href="{{dashboardUrl}}">View Details</a>
```

### Healthcare Branding
All templates feature:
- CareConnect green (#05B34D) primary color
- Professional healthcare styling
- Responsive design for mobile devices
- Consistent footer with unsubscribe options
- Accessibility-compliant markup

### Custom Templates
To create a custom template:

```typescript
private getCustomTemplate(): string {
  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <title>Custom Notification</title>
    <style>
      .container { max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; }
      .header { background: #05B34D; padding: 20px; text-align: center; }
      .header h1 { color: white; margin: 0; }
      .content { padding: 30px 20px; background: white; }
      .button { background: #05B34D; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1>Custom Notification</h1>
      </div>
      <div class="content">
        <h2>Hello {{recipientName}}!</h2>
        <p>{{customMessage}}</p>
        <p><a href="{{actionUrl}}" class="button">Take Action</a></p>
      </div>
    </div>
  </body>
  </html>
  `;
}
```

## Configuration

### SMTP Settings
The system uses Gmail SMTP with the following configuration:

```typescript
this.smtpConfig = {
  host: 'smtp.gmail.com',
  username: 'marzuqcares@gmail.com',
  password: 'wwba yyer glpm cher', // App-specific password
  port: 587,
  secure: false // Use TLS
};
```

### Priority Levels
- `urgent` - Critical health alerts, security breaches
- `high` - Appointment confirmations, payment issues
- `normal` - Welcome emails, course enrollments
- `low` - Newsletter subscriptions, forum replies

## Error Handling

The system includes comprehensive error handling:
- Failed emails are logged and can be retried
- Email sending failures don't break the main application flow
- Graceful degradation when SMTPjs is unavailable
- Detailed error logging for debugging

## Development vs Production

### Development Mode
- Emails are simulated and logged to console
- No actual emails sent unless SMTPjs is loaded
- Detailed logging for debugging

### Production Mode
- Full email sending via SMTPjs
- Rate limiting and queue management
- Error monitoring and alerting
- Email delivery tracking

## Best Practices

1. **Use Event Triggers**: Prefer event-driven notifications over direct calls
2. **Handle Errors**: Always wrap email calls in try-catch blocks
3. **Respect Privacy**: Check user preferences before sending marketing emails
4. **Rate Limiting**: Use the queue system for bulk operations
5. **Template Testing**: Test all templates across different email clients
6. **Accessibility**: Ensure templates work with screen readers
7. **Mobile Optimization**: Test templates on mobile devices
8. **Spam Compliance**: Follow CAN-SPAM Act guidelines

## Monitoring and Analytics

### Email Metrics
- Send success/failure rates
- Delivery timestamps
- User engagement tracking
- Error analysis

### Debugging
- Console logs for development
- Error tracking in production
- Email queue status monitoring
- Template rendering validation

## Future Enhancements

- **Personalization**: AI-driven content personalization
- **A/B Testing**: Template optimization
- **Analytics Dashboard**: Email performance metrics
- **Template Builder**: Visual email template editor
- **Multi-language**: Internationalization support
- **Rich Media**: Image and video support
- **Delivery Tracking**: Read receipts and click tracking
- **Integration**: Third-party email service providers

---

For technical support or feature requests, contact the development team or refer to the platform documentation.
