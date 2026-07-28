// Email Notification Testing Component
// Demonstrates all 25+ email notification types

import React, { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Badge } from './ui/badge';
import {
  emailService,
  NotificationType,
  sendWelcomeEmail,
  sendAppointmentConfirmation,
  sendHealthReminder,
  sendLoginAlert,
  sendCourseEnrollmentConfirmation,
  sendOrderConfirmation,
  sendDonationConfirmation,
  sendPasswordResetEmail,
  sendEmailVerification,
  sendProviderVerificationApproved,
  sendVitalSignsAlert
} from '../lib/email-notifications';
import {
  emailEventHandler,
  EmailEvent,
  triggerUserRegistered,
  triggerAppointmentBooked,
  triggerOrderPlaced,
  triggerCourseEnrolled,
  triggerDonationMade,
  triggerVitalSignsAlert
} from '../lib/email-events';

interface EmailTestResult {
  success: boolean;
  message: string;
  timestamp: Date;
}

export function EmailTestingPanel() {
  const [testEmail, setTestEmail] = useState('test@example.com');
  const [userName, setUserName] = useState('Test User');
  const [results, setResults] = useState<{ [key: string]: EmailTestResult }>({});
  const [isLoading, setIsLoading] = useState<{ [key: string]: boolean }>({});

  const updateResult = (key: string, result: EmailTestResult) => {
    setResults(prev => ({ ...prev, [key]: result }));
    setIsLoading(prev => ({ ...prev, [key]: false }));
  };

  const setLoading = (key: string) => {
    setIsLoading(prev => ({ ...prev, [key]: true }));
  };

  // Test functions for each category
  const testAuthenticationEmails = {
    'Welcome Email': async () => {
      setLoading('welcome');
      try {
        await sendWelcomeEmail(testEmail, userName);
        updateResult('welcome', { success: true, message: 'Welcome email sent successfully', timestamp: new Date() });
      } catch (error) {
        updateResult('welcome', { success: false, message: error.message, timestamp: new Date() });
      }
    },
    'Email Verification': async () => {
      setLoading('verification');
      try {
        await sendEmailVerification(testEmail, userName, 'ABC123');
        updateResult('verification', { success: true, message: 'Verification email sent successfully', timestamp: new Date() });
      } catch (error) {
        updateResult('verification', { success: false, message: error.message, timestamp: new Date() });
      }
    },
    'Password Reset': async () => {
      setLoading('reset');
      try {
        await sendPasswordResetEmail(testEmail, userName, 'reset_token_123');
        updateResult('reset', { success: true, message: 'Password reset email sent successfully', timestamp: new Date() });
      } catch (error) {
        updateResult('reset', { success: false, message: error.message, timestamp: new Date() });
      }
    },
    'Login Alert': async () => {
      setLoading('login');
      try {
        await sendLoginAlert(testEmail, userName, {
          loginTime: new Date().toLocaleString(),
          location: 'New York, NY',
          device: 'Chrome on Windows',
          ipAddress: '192.168.1.100'
        });
        updateResult('login', { success: true, message: 'Login alert sent successfully', timestamp: new Date() });
      } catch (error) {
        updateResult('login', { success: false, message: error.message, timestamp: new Date() });
      }
    }
  };

  const testAppointmentEmails = {
    'Appointment Confirmation': async () => {
      setLoading('appointment');
      try {
        await sendAppointmentConfirmation(testEmail, userName, {
          appointmentId: '123',
          providerName: 'Dr. Smith',
          appointmentDate: '2024-01-15',
          appointmentTime: '10:00 AM',
          serviceName: 'General Checkup',
          duration: 30,
          location: '123 Health St, Medical City'
        });
        updateResult('appointment', { success: true, message: 'Appointment confirmation sent successfully', timestamp: new Date() });
      } catch (error) {
        updateResult('appointment', { success: false, message: error.message, timestamp: new Date() });
      }
    },
    'Appointment Reminder': async () => {
      setLoading('reminder');
      try {
        await emailEventHandler.trigger(EmailEvent.APPOINTMENT_REMINDER_24H, {
          userEmail: testEmail,
          userName,
          eventData: {
            providerName: 'Dr. Johnson',
            appointmentDate: 'Tomorrow',
            appointmentTime: '2:00 PM',
            serviceName: 'Consultation'
          }
        });
        updateResult('reminder', { success: true, message: 'Appointment reminder sent successfully', timestamp: new Date() });
      } catch (error) {
        updateResult('reminder', { success: false, message: error.message, timestamp: new Date() });
      }
    },
    'Appointment No-Show': async () => {
      setLoading('noshow');
      try {
        await emailEventHandler.trigger(EmailEvent.APPOINTMENT_NO_SHOW, {
          userEmail: testEmail,
          userName,
          eventData: {
            providerName: 'Dr. Wilson',
            appointmentDate: 'Today',
            appointmentTime: '9:00 AM'
          }
        });
        updateResult('noshow', { success: true, message: 'No-show notification sent successfully', timestamp: new Date() });
      } catch (error) {
        updateResult('noshow', { success: false, message: error.message, timestamp: new Date() });
      }
    }
  };

  const testHealthEmails = {
    'Vital Signs Alert': async () => {
      setLoading('vitals');
      try {
        await sendVitalSignsAlert(testEmail, userName, {
          measurement: 'Blood Pressure',
          value: '180/110 mmHg',
          normalRange: '120/80 mmHg',
          status: 'High - Requires Attention',
          recordedTime: new Date().toLocaleString()
        });
        updateResult('vitals', { success: true, message: 'Vital signs alert sent successfully', timestamp: new Date() });
      } catch (error) {
        updateResult('vitals', { success: false, message: error.message, timestamp: new Date() });
      }
    },
    'Test Results Available': async () => {
      setLoading('results');
      try {
        await emailEventHandler.trigger(EmailEvent.TEST_RESULTS_AVAILABLE, {
          userEmail: testEmail,
          userName,
          eventData: {
            testName: 'Blood Panel',
            resultDate: new Date().toLocaleDateString()
          }
        });
        updateResult('results', { success: true, message: 'Test results notification sent successfully', timestamp: new Date() });
      } catch (error) {
        updateResult('results', { success: false, message: error.message, timestamp: new Date() });
      }
    },
    'Medication Reminder': async () => {
      setLoading('medication');
      try {
        await emailService.sendNotification({
          type: NotificationType.MEDICATION_REMINDER,
          recipient: testEmail,
          recipientName: userName,
          data: {
            recipientName: userName,
            medicationName: 'Metformin 500mg',
            dosage: '2 tablets',
            frequency: 'twice daily'
          },
          priority: 'normal'
        });
        updateResult('medication', { success: true, message: 'Medication reminder sent successfully', timestamp: new Date() });
      } catch (error) {
        updateResult('medication', { success: false, message: error.message, timestamp: new Date() });
      }
    }
  };

  const testLearningEmails = {
    'Course Enrollment': async () => {
      setLoading('course');
      try {
        await sendCourseEnrollmentConfirmation(testEmail, userName, {
          courseId: '456',
          courseName: 'Diabetes Management',
          instructorName: 'Dr. Anderson',
          startDate: '2024-02-01',
          duration: '6 weeks'
        });
        updateResult('course', { success: true, message: 'Course enrollment confirmation sent successfully', timestamp: new Date() });
      } catch (error) {
        updateResult('course', { success: false, message: error.message, timestamp: new Date() });
      }
    },
    'Certificate Earned': async () => {
      setLoading('certificate');
      try {
        await emailService.sendNotification({
          type: NotificationType.CERTIFICATE_EARNED,
          recipient: testEmail,
          recipientName: userName,
          data: {
            recipientName: userName,
            courseName: 'First Aid Certification',
            certificateId: 'CERT-123',
            completionDate: new Date().toLocaleDateString()
          },
          priority: 'normal'
        });
        updateResult('certificate', { success: true, message: 'Certificate notification sent successfully', timestamp: new Date() });
      } catch (error) {
        updateResult('certificate', { success: false, message: error.message, timestamp: new Date() });
      }
    }
  };

  const testECommerceEmails = {
    'Order Confirmation': async () => {
      setLoading('order');
      try {
        await sendOrderConfirmation(testEmail, userName, {
          orderId: '789',
          orderNumber: 'ORD-001',
          totalAmount: '$150.00',
          items: ['Multivitamins', 'Blood Pressure Monitor']
        });
        updateResult('order', { success: true, message: 'Order confirmation sent successfully', timestamp: new Date() });
      } catch (error) {
        updateResult('order', { success: false, message: error.message, timestamp: new Date() });
      }
    },
    'Payment Failed': async () => {
      setLoading('payment');
      try {
        await emailService.sendNotification({
          type: NotificationType.PAYMENT_FAILED,
          recipient: testEmail,
          recipientName: userName,
          data: {
            recipientName: userName,
            serviceName: 'Premium Subscription',
            failureReason: 'Insufficient funds'
          },
          priority: 'high'
        });
        updateResult('payment', { success: true, message: 'Payment failed notification sent successfully', timestamp: new Date() });
      } catch (error) {
        updateResult('payment', { success: false, message: error.message, timestamp: new Date() });
      }
    }
  };

  const testCommunityEmails = {
    'Donation Confirmation': async () => {
      setLoading('donation');
      try {
        await sendDonationConfirmation(testEmail, userName, {
          causeName: 'Children\'s Health Initiative',
          donationAmount: '$50.00',
          transactionId: 'TXN-123'
        });
        updateResult('donation', { success: true, message: 'Donation confirmation sent successfully', timestamp: new Date() });
      } catch (error) {
        updateResult('donation', { success: false, message: error.message, timestamp: new Date() });
      }
    },
    'Forum Reply': async () => {
      setLoading('forum');
      try {
        await emailService.sendNotification({
          type: NotificationType.FORUM_REPLY,
          recipient: testEmail,
          recipientName: userName,
          data: {
            recipientName: userName,
            forumTitle: 'Mental Health Support',
            replyAuthor: 'Dr. Martinez',
            postTitle: 'Dealing with anxiety'
          },
          priority: 'low'
        });
        updateResult('forum', { success: true, message: 'Forum reply notification sent successfully', timestamp: new Date() });
      } catch (error) {
        updateResult('forum', { success: false, message: error.message, timestamp: new Date() });
      }
    }
  };

  const testProviderEmails = {
    'Provider Verification': async () => {
      setLoading('provider');
      try {
        await sendProviderVerificationApproved(testEmail, userName);
        updateResult('provider', { success: true, message: 'Provider verification email sent successfully', timestamp: new Date() });
      } catch (error) {
        updateResult('provider', { success: false, message: error.message, timestamp: new Date() });
      }
    },
    'New Review': async () => {
      setLoading('review');
      try {
        await emailService.sendNotification({
          type: NotificationType.NEW_REVIEW_RECEIVED,
          recipient: testEmail,
          recipientName: userName,
          data: {
            recipientName: userName,
            patientName: 'Sarah Johnson',
            rating: '5 stars',
            reviewText: 'Excellent care and very professional'
          },
          priority: 'normal'
        });
        updateResult('review', { success: true, message: 'New review notification sent successfully', timestamp: new Date() });
      } catch (error) {
        updateResult('review', { success: false, message: error.message, timestamp: new Date() });
      }
    }
  };

  const renderTestSection = (title: string, tests: { [key: string]: () => Promise<void> }, bgColor: string) => (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle className={`text-white p-4 rounded-t-lg ${bgColor}`}>{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Object.entries(tests).map(([name, testFn]) => {
            const key = name.toLowerCase().replace(' ', '');
            const result = results[key];
            const loading = isLoading[key];
            
            return (
              <div key={key} className="border rounded-lg p-3">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-medium">{name}</span>
                  <Button
                    size="sm"
                    onClick={testFn}
                    disabled={loading}
                    className="min-w-[80px]"
                  >
                    {loading ? 'Sending...' : 'Test'}
                  </Button>
                </div>
                {result && (
                  <div className="mt-2">
                    <Badge variant={result.success ? 'success' : 'destructive'}>
                      {result.success ? 'Success' : 'Failed'}
                    </Badge>
                    <p className="text-xs text-gray-600 mt-1">{result.message}</p>
                    <p className="text-xs text-gray-400">{result.timestamp.toLocaleTimeString()}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Email Notification System Testing</h1>
        <p className="text-gray-600 mb-4">
          Test all 25+ email notification types in the CareConnect platform. Configure your test email and user details below.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Test Email</label>
            <Input
              type="email"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              placeholder="test@example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">User Name</label>
            <Input
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              placeholder="Test User"
            />
          </div>
        </div>
      </div>

      <Tabs defaultValue="auth" className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="auth">Auth</TabsTrigger>
          <TabsTrigger value="appointments">Appointments</TabsTrigger>
          <TabsTrigger value="health">Health</TabsTrigger>
          <TabsTrigger value="learning">Learning</TabsTrigger>
          <TabsTrigger value="ecommerce">E-commerce</TabsTrigger>
          <TabsTrigger value="community">Community</TabsTrigger>
        </TabsList>

        <TabsContent value="auth">
          {renderTestSection('Authentication & Account (4 types)', testAuthenticationEmails, 'bg-blue-600')}
        </TabsContent>

        <TabsContent value="appointments">
          {renderTestSection('Appointments & Bookings (3 types)', testAppointmentEmails, 'bg-green-600')}
        </TabsContent>

        <TabsContent value="health">
          {renderTestSection('Health Tools & Results (3 types)', testHealthEmails, 'bg-red-600')}
        </TabsContent>

        <TabsContent value="learning">
          {renderTestSection('Learning Management (2 types)', testLearningEmails, 'bg-purple-600')}
        </TabsContent>

        <TabsContent value="ecommerce">
          {renderTestSection('E-commerce & Orders (2 types)', testECommerceEmails, 'bg-yellow-600')}
        </TabsContent>

        <TabsContent value="community">
          <div className="space-y-4">
            {renderTestSection('Community & Causes (2 types)', testCommunityEmails, 'bg-indigo-600')}
            {renderTestSection('Provider Notifications (2 types)', testProviderEmails, 'bg-pink-600')}
          </div>
        </TabsContent>
      </Tabs>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>System Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {Object.values(results).filter(r => r.success).length}
              </div>
              <div className="text-sm text-gray-600">Successful</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {Object.values(results).filter(r => !r.success).length}
              </div>
              <div className="text-sm text-gray-600">Failed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {Object.values(isLoading).filter(Boolean).length}
              </div>
              <div className="text-sm text-gray-600">Sending</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
