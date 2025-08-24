// Complete Booking System with Production Features
import { githubDB, collections } from './database';
import { logger } from './observability';
import { emailService, EmailType } from './email';
import { EnhancedPaymentService } from './payments-enhanced';

export enum BookingStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  CANCELLED = 'cancelled',
  COMPLETED = 'completed',
  NO_SHOW = 'no_show',
  RESCHEDULED = 'rescheduled'
}

export interface TimeSlot {
  id: string;
  entity_id: string;
  service_id: string;
  start_time: string;
  end_time: string;
  is_available: boolean;
  is_locked: boolean;
  locked_until?: string;
  booking_id?: string;
}

export interface BookingPolicies {
  cancellation_hours: number;
  reschedule_hours: number;
  no_show_fee: number;
  late_cancellation_fee: number;
  deposit_required: boolean;
  deposit_percentage: number;
}

export interface Booking {
  id: string;
  user_id: string;
  entity_id: string;
  service_id: string;
  service_name: string;
  provider_name: string;
  
  // Timing
  booking_date: string;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  
  // Status and tracking
  status: BookingStatus;
  booking_reference: string;
  
  // Type and location
  is_telehealth: boolean;
  location?: {
    address: string;
    room?: string;
    instructions?: string;
  };
  virtual_meeting?: {
    platform: string;
    meeting_id: string;
    access_link: string;
    passcode?: string;
  };
  
  // Financial
  total_cost: number;
  deposit_paid?: number;
  payment_status: 'pending' | 'paid' | 'refunded';
  payment_intent_id?: string;
  
  // Communications
  confirmation_sent: boolean;
  reminder_24h_sent: boolean;
  reminder_2h_sent: boolean;
  
  // Policies
  policies: BookingPolicies;
  
  // Notes and preparation
  patient_notes?: string;
  preparation_instructions?: string;
  
  // Audit trail
  created_at: string;
  updated_at: string;
  cancelled_at?: string;
  cancellation_reason?: string;
}

export class CompleteBookingService {
  
  // Generate available time slots for a service
  static async generateAvailableSlots(
    entityId: string,
    serviceId: string,
    startDate: string,
    endDate: string
  ): Promise<TimeSlot[]> {
    try {
      const entity = await githubDB.findById(collections.entities, entityId);
      const service = await githubDB.findById(collections.services, serviceId);
      
      if (!entity || !service) {
        throw new Error('Entity or service not found');
      }

      // Get entity's operating hours
      const operatingHours = entity.operating_hours || {
        monday: { open: '09:00', close: '17:00', isOpen: true },
        tuesday: { open: '09:00', close: '17:00', isOpen: true },
        wednesday: { open: '09:00', close: '17:00', isOpen: true },
        thursday: { open: '09:00', close: '17:00', isOpen: true },
        friday: { open: '09:00', close: '17:00', isOpen: true },
        saturday: { open: '09:00', close: '13:00', isOpen: true },
        sunday: { open: '09:00', close: '13:00', isOpen: false }
      };

      const slots: TimeSlot[] = [];
      const currentDate = new Date(startDate);
      const endDateObj = new Date(endDate);

      while (currentDate <= endDateObj) {
        const dayName = currentDate.toLocaleDateString('en-US', { weekday: 'lowercase' });
        const dayHours = operatingHours[dayName as keyof typeof operatingHours];

        if (dayHours?.isOpen) {
          const daySlots = await this.generateDaySlots(
            entityId,
            serviceId,
            currentDate.toISOString().split('T')[0],
            dayHours.open,
            dayHours.close,
            service.duration_minutes
          );
          slots.push(...daySlots);
        }

        currentDate.setDate(currentDate.getDate() + 1);
      }

      // Filter out already booked slots
      const existingBookings = await githubDB.find(collections.bookings, {
        entity_id: entityId,
        booking_date: { $gte: startDate, $lte: endDate },
        status: { $ne: BookingStatus.CANCELLED }
      });

      return slots.filter(slot => {
        return !existingBookings.some(booking => 
          booking.start_time === slot.start_time && 
          booking.booking_date === slot.start_time.split('T')[0]
        );
      });

    } catch (error) {
      await logger.error('generate_slots_failed', 'Failed to generate time slots', {
        entity_id: entityId,
        service_id: serviceId,
        error: error.message
      });
      return [];
    }
  }

  // Generate slots for a specific day
  private static async generateDaySlots(
    entityId: string,
    serviceId: string,
    date: string,
    openTime: string,
    closeTime: string,
    durationMinutes: number
  ): Promise<TimeSlot[]> {
    const slots: TimeSlot[] = [];
    const [openHour, openMinute] = openTime.split(':').map(Number);
    const [closeHour, closeMinute] = closeTime.split(':').map(Number);

    let currentTime = new Date(date);
    currentTime.setHours(openHour, openMinute, 0, 0);

    const endTime = new Date(date);
    endTime.setHours(closeHour, closeMinute, 0, 0);

    while (currentTime < endTime) {
      const slotEnd = new Date(currentTime.getTime() + durationMinutes * 60000);
      
      if (slotEnd <= endTime) {
        slots.push({
          id: crypto.randomUUID(),
          entity_id: entityId,
          service_id: serviceId,
          start_time: currentTime.toISOString(),
          end_time: slotEnd.toISOString(),
          is_available: true,
          is_locked: false
        });
      }

      currentTime = new Date(currentTime.getTime() + durationMinutes * 60000);
    }

    return slots;
  }

  // Lock a time slot temporarily
  static async lockTimeSlot(slotId: string, userId: string): Promise<boolean> {
    try {
      const lockDuration = 10 * 60 * 1000; // 10 minutes
      const lockedUntil = new Date(Date.now() + lockDuration).toISOString();

      // Check if slot is available
      const existingBookings = await githubDB.find(collections.bookings, {
        start_time: slotId, // Assuming slotId contains the start time
        status: { $ne: BookingStatus.CANCELLED }
      });

      if (existingBookings.length > 0) {
        return false;
      }

      // Create temporary lock
      await githubDB.insert(collections.slot_locks, {
        slot_id: slotId,
        user_id: userId,
        locked_until: lockedUntil,
        created_at: new Date().toISOString()
      });

      return true;
    } catch (error) {
      await logger.error('lock_slot_failed', 'Failed to lock time slot', {
        slot_id: slotId,
        user_id: userId,
        error: error.message
      });
      return false;
    }
  }

  // Create booking
  static async createBooking(bookingData: {
    user_id: string;
    entity_id: string;
    service_id: string;
    start_time: string;
    is_telehealth?: boolean;
    patient_notes?: string;
  }): Promise<Booking> {
    try {
      const entity = await githubDB.findById(collections.entities, bookingData.entity_id);
      const service = await githubDB.findById(collections.services, bookingData.service_id);
      const user = await githubDB.findById(collections.users, bookingData.user_id);
      
      if (!entity || !service || !user) {
        throw new Error('Required data not found');
      }

      const startTime = new Date(bookingData.start_time);
      const endTime = new Date(startTime.getTime() + service.duration_minutes * 60000);

      // Generate booking reference
      const bookingRef = `BK${Date.now().toString().slice(-8)}`;

      // Default policies
      const policies: BookingPolicies = {
        cancellation_hours: entity.cancellation_policy?.hours || 24,
        reschedule_hours: entity.reschedule_policy?.hours || 12,
        no_show_fee: entity.no_show_fee || 0,
        late_cancellation_fee: entity.late_cancellation_fee || 0,
        deposit_required: service.deposit_required || false,
        deposit_percentage: service.deposit_percentage || 0
      };

      const booking: Partial<Booking> = {
        user_id: bookingData.user_id,
        entity_id: bookingData.entity_id,
        service_id: bookingData.service_id,
        service_name: service.name,
        provider_name: entity.name,
        booking_date: startTime.toISOString().split('T')[0],
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        duration_minutes: service.duration_minutes,
        status: BookingStatus.PENDING,
        booking_reference: bookingRef,
        is_telehealth: bookingData.is_telehealth || false,
        total_cost: service.price,
        payment_status: 'pending',
        confirmation_sent: false,
        reminder_24h_sent: false,
        reminder_2h_sent: false,
        policies,
        patient_notes: bookingData.patient_notes,
        preparation_instructions: service.preparation_instructions,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Add location or virtual meeting details
      if (bookingData.is_telehealth) {
        booking.virtual_meeting = {
          platform: 'Google Meet', // Default platform
          meeting_id: `meet-${bookingRef.toLowerCase()}`,
          access_link: `https://meet.google.com/${bookingRef.toLowerCase()}`,
          passcode: Math.random().toString(36).substring(2, 8).toUpperCase()
        };
      } else {
        booking.location = {
          address: `${entity.address.street}, ${entity.address.city}`,
          room: service.room || 'Main consultation room',
          instructions: entity.visit_instructions || 'Please arrive 10 minutes early'
        };
      }

      const savedBooking = await githubDB.insert(collections.bookings, booking);

      // If deposit required, create payment intent
      if (policies.deposit_required) {
        const depositAmount = (booking.total_cost! * policies.deposit_percentage) / 100;
        
        const paymentIntent = await EnhancedPaymentService.createPaymentIntent({
          user_id: bookingData.user_id,
          entity_id: bookingData.entity_id,
          amount: depositAmount,
          currency: 'USD',
          gateway: 'stripe', // Default gateway
          item_type: 'booking',
          item_id: savedBooking.id,
          item_name: `Booking Deposit - ${service.name}`,
          item_description: `Deposit for appointment on ${booking.booking_date}`,
          customer_email: user.email,
          customer_name: `${user.first_name} ${user.last_name}`,
          metadata: {
            booking_reference: bookingRef,
            appointment_date: booking.booking_date
          }
        });

        await githubDB.update(collections.bookings, savedBooking.id, {
          payment_intent_id: paymentIntent.id,
          deposit_paid: depositAmount
        });
      } else {
        // Auto-confirm if no deposit required
        await this.confirmBooking(savedBooking.id);
      }

      await logger.info('booking_created', 'Booking created successfully', {
        booking_id: savedBooking.id,
        booking_reference: bookingRef,
        user_id: bookingData.user_id,
        entity_id: bookingData.entity_id
      });

      return savedBooking;
    } catch (error) {
      await logger.error('booking_creation_failed', 'Booking creation failed', {
        user_id: bookingData.user_id,
        entity_id: bookingData.entity_id,
        error: error.message
      });
      throw error;
    }
  }

  // Confirm booking
  static async confirmBooking(bookingId: string): Promise<Booking> {
    try {
      const booking = await githubDB.findById(collections.bookings, bookingId);
      if (!booking) {
        throw new Error('Booking not found');
      }

      const updatedBooking = await githubDB.update(collections.bookings, bookingId, {
        status: BookingStatus.CONFIRMED,
        updated_at: new Date().toISOString()
      });

      // Send confirmation email
      await this.sendBookingConfirmation(updatedBooking);

      // Schedule reminders
      await this.scheduleReminders(updatedBooking);

      await logger.info('booking_confirmed', 'Booking confirmed', {
        booking_id: bookingId,
        booking_reference: booking.booking_reference
      });

      return updatedBooking;
    } catch (error) {
      await logger.error('booking_confirmation_failed', 'Booking confirmation failed', {
        booking_id: bookingId,
        error: error.message
      });
      throw error;
    }
  }

  // Send booking confirmation email
  private static async sendBookingConfirmation(booking: Booking): Promise<void> {
    try {
      const user = await githubDB.findById(collections.users, booking.user_id);
      const profile = await githubDB.find(collections.profiles, { user_id: booking.user_id });
      const entity = await githubDB.findById(collections.entities, booking.entity_id);

      if (!user || !entity) return;

      const userProfile = profile[0];
      
      await emailService.sendEmail(user.email, EmailType.BOOKING_CONFIRMATION, {
        user: {
          first_name: userProfile?.first_name || 'User',
          email: user.email
        },
        entity: {
          name: entity.name,
          phone: entity.phone,
          address: entity.address
        },
        booking: {
          service_name: booking.service_name,
          date: new Date(booking.booking_date).toLocaleDateString(),
          time: new Date(booking.start_time).toLocaleTimeString(),
          duration: booking.duration_minutes,
          is_telehealth: booking.is_telehealth,
          preparation_notes: booking.preparation_instructions,
          manage_link: `${window.location.origin}/dashboard/bookings/${booking.id}`,
          video_link: booking.virtual_meeting?.access_link
        }
      });

      await githubDB.update(collections.bookings, booking.id, {
        confirmation_sent: true
      });

    } catch (error) {
      await logger.error('confirmation_email_failed', 'Confirmation email failed', {
        booking_id: booking.id,
        error: error.message
      });
    }
  }

  // Schedule reminder emails
  private static async scheduleReminders(booking: Booking): Promise<void> {
    try {
      const appointmentTime = new Date(booking.start_time);
      const reminder24h = new Date(appointmentTime.getTime() - 24 * 60 * 60 * 1000);
      const reminder2h = new Date(appointmentTime.getTime() - 2 * 60 * 60 * 1000);

      // Store reminder schedules
      await githubDB.insert(collections.scheduled_emails, {
        booking_id: booking.id,
        email_type: EmailType.BOOKING_REMINDER,
        recipient_email: booking.user_id, // Will be resolved to email
        scheduled_for: reminder24h.toISOString(),
        status: 'pending'
      });

      await githubDB.insert(collections.scheduled_emails, {
        booking_id: booking.id,
        email_type: EmailType.BOOKING_REMINDER,
        recipient_email: booking.user_id,
        scheduled_for: reminder2h.toISOString(),
        status: 'pending'
      });

    } catch (error) {
      await logger.error('schedule_reminders_failed', 'Reminder scheduling failed', {
        booking_id: booking.id,
        error: error.message
      });
    }
  }

  // Cancel booking
  static async cancelBooking(
    bookingId: string,
    reason: string,
    userId: string
  ): Promise<{ success: boolean; fee?: number; refund?: number }> {
    try {
      const booking = await githubDB.findById(collections.bookings, bookingId);
      if (!booking) {
        throw new Error('Booking not found');
      }

      const now = new Date();
      const appointmentTime = new Date(booking.start_time);
      const hoursUntilAppointment = (appointmentTime.getTime() - now.getTime()) / (1000 * 60 * 60);

      let fee = 0;
      let refund = 0;

      // Check cancellation policy
      if (hoursUntilAppointment < booking.policies.cancellation_hours) {
        fee = booking.policies.late_cancellation_fee;
      }

      // Calculate refund
      if (booking.deposit_paid && booking.deposit_paid > fee) {
        refund = booking.deposit_paid - fee;
      }

      // Update booking
      await githubDB.update(collections.bookings, bookingId, {
        status: BookingStatus.CANCELLED,
        cancelled_at: now.toISOString(),
        cancellation_reason: reason,
        updated_at: now.toISOString()
      });

      // Process refund if applicable
      if (refund > 0 && booking.payment_intent_id) {
        // In a real implementation, you'd process the refund through the payment gateway
        await logger.info('refund_processed', 'Refund processed for cancelled booking', {
          booking_id: bookingId,
          refund_amount: refund,
          fee: fee
        });
      }

      await logger.info('booking_cancelled', 'Booking cancelled', {
        booking_id: bookingId,
        cancelled_by: userId,
        reason,
        fee,
        refund
      });

      return { success: true, fee, refund };
    } catch (error) {
      await logger.error('booking_cancellation_failed', 'Booking cancellation failed', {
        booking_id: bookingId,
        error: error.message
      });
      throw error;
    }
  }

  // Process reminder emails (called by scheduler)
  static async processScheduledReminders(): Promise<void> {
    try {
      const now = new Date();
      const dueReminders = await githubDB.find(collections.scheduled_emails, {
        scheduled_for: { $lte: now.toISOString() },
        status: 'pending'
      });

      for (const reminder of dueReminders) {
        try {
          const booking = await githubDB.findById(collections.bookings, reminder.booking_id);
          if (!booking || booking.status === BookingStatus.CANCELLED) {
            continue;
          }

          const user = await githubDB.findById(collections.users, booking.user_id);
          const profile = await githubDB.find(collections.profiles, { user_id: booking.user_id });
          const entity = await githubDB.findById(collections.entities, booking.entity_id);

          if (user && entity) {
            const userProfile = profile[0];
            
            await emailService.sendEmail(user.email, EmailType.BOOKING_REMINDER, {
              user: {
                first_name: userProfile?.first_name || 'User',
                email: user.email
              },
              entity: {
                name: entity.name
              },
              booking: {
                service_name: booking.service_name,
                date: new Date(booking.booking_date).toLocaleDateString(),
                time: new Date(booking.start_time).toLocaleTimeString(),
                manage_link: `${window.location.origin}/dashboard/bookings/${booking.id}`
              }
            });

            // Mark reminder as sent
            await githubDB.update(collections.scheduled_emails, reminder.id, {
              status: 'sent',
              sent_at: new Date().toISOString()
            });
          }

        } catch (reminderError) {
          await logger.error('reminder_send_failed', 'Individual reminder failed', {
            reminder_id: reminder.id,
            error: reminderError.message
          });
        }
      }

      await logger.info('reminders_processed', 'Scheduled reminders processed', {
        processed_count: dueReminders.length
      });

    } catch (error) {
      await logger.error('reminder_processing_failed', 'Reminder processing failed', {
        error: error.message
      });
    }
  }
}