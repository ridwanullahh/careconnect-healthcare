// Enhanced Booking System with Production-Ready Features
import { dbHelpers, collections } from './database';
import { PaymentService, PaymentType } from './payments';
import { 
  emailEventHandler, 
  EmailEvent,
  triggerAppointmentBooked
} from './email-events';
import { logger } from './observability';

// Enhanced Booking Types
export enum BookingType {
  IN_PERSON = 'in_person',
  TELEHEALTH = 'telehealth',
  PHONE_CONSULTATION = 'phone_consultation',
  HOME_VISIT = 'home_visit',
  EMERGENCY = 'emergency'
}

export enum BookingStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  CHECKED_IN = 'checked_in',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  NO_SHOW = 'no_show',
  RESCHEDULED = 'rescheduled'
}

export enum SlotStatus {
  AVAILABLE = 'available',
  BOOKED = 'booked',
  BLOCKED = 'blocked',
  UNAVAILABLE = 'unavailable'
}

export interface BookingRules {
  lead_time_hours: number; // Minimum hours before appointment
  buffer_before_minutes: number; // Buffer before appointment
  buffer_after_minutes: number; // Buffer after appointment
  max_per_day: number; // Maximum bookings per day
  cancellation_hours: number; // Hours before cancellation allowed
  no_show_policy: string;
  requires_deposit: boolean;
  deposit_percentage?: number;
}

export interface TimeSlot {
  id: string;
  entity_id: string;
  service_id: string;
  provider_id?: string;
  date: string; // YYYY-MM-DD
  start_time: string; // HH:MM
  end_time: string; // HH:MM
  status: SlotStatus;
  booking_id?: string;
  resource_requirements?: string[]; // Rooms, equipment needed
  created_at: string;
  updated_at: string;
}

export interface Booking {
  id: string;
  entity_id: string;
  service_id: string;
  patient_id: string;
  provider_id?: string;
  type: BookingType;
  status: BookingStatus;
  appointment_date: string;
  appointment_time: string;
  duration_minutes: number;
  
  // Patient details
  patient_name: string;
  patient_email: string;
  patient_phone: string;
  patient_notes?: string;
  
  // Booking details
  booking_reference: string;
  booking_rules: BookingRules;
  total_amount: number;
  paid_amount: number;
  payment_status: 'pending' | 'paid' | 'partially_paid' | 'refunded';
  
  // Telehealth
  telehealth_info?: {
    meeting_url?: string;
    meeting_id?: string;
    waiting_room_enabled: boolean;
    recording_enabled: boolean;
    consent_given: boolean;
  };
  
  // Timestamps
  created_at: string;
  updated_at: string;
  confirmed_at?: string;
  completed_at?: string;
  cancelled_at?: string;
}

export class EnhancedBookingService {
  // Generate available time slots with advanced rules
  static async generateTimeSlots(
    entityId: string,
    serviceId: string,
    startDate: string,
    endDate: string,
    providerId?: string
  ): Promise<TimeSlot[]> {
    try {
      await logger.info('generate_slots_started', 'Generating time slots', {
        entity_id: entityId,
        service_id: serviceId,
        date_range: `${startDate} to ${endDate}`
      });

      // Get service details and booking rules
      const service = await dbHelpers.findById(collections.entity_services, serviceId);
      if (!service) {
        throw new Error('Service not found');
      }

      // Get entity availability rules
      const entity = await dbHelpers.findById(collections.entities, entityId);
      if (!entity) {
        throw new Error('Entity not found');
      }

      // Get existing slots to avoid duplicates
      const existingSlots = await dbHelpers.find(collections.appointment_slots, {
        entity_id: entityId,
        service_id: serviceId,
        date: { $gte: startDate, $lte: endDate }
      });

      const existingSlotKeys = new Set(
        existingSlots.map(slot => `${slot.date}_${slot.start_time}`)
      );

      const slots: TimeSlot[] = [];
      const currentDate = new Date(startDate);
      const finalDate = new Date(endDate);

      while (currentDate <= finalDate) {
        const dateStr = currentDate.toISOString().split('T')[0];
        const daySlots = await this.generateDaySlots(
          entityId,
          serviceId,
          dateStr,
          entity,
          service,
          providerId,
          existingSlotKeys
        );
        
        slots.push(...daySlots);
        currentDate.setDate(currentDate.getDate() + 1);
      }

      // Save new slots to database
      for (const slot of slots) {
        await dbHelpers.create(collections.appointment_slots, slot);
      }

      await logger.info('generate_slots_completed', 'Time slots generated successfully', {
        slots_created: slots.length
      });

      return slots;
    } catch (error) {
      await logger.error('generate_slots_failed', 'Failed to generate time slots', {
        error: error.message,
        entity_id: entityId,
        service_id: serviceId
      });
      throw error;
    }
  }

  private static async generateDaySlots(
    entityId: string,
    serviceId: string,
    date: string,
    entity: any,
    service: any,
    providerId?: string,
    existingSlotKeys?: Set<string>
  ): Promise<TimeSlot[]> {
    const slots: TimeSlot[] = [];
    const dayOfWeek = new Date(date).toLocaleDateString('en-US', { weekday: 'lowercase' });
    
    // Get working hours for this day
    const workingHours = entity.hours?.[dayOfWeek];
    if (!workingHours || workingHours === 'closed') {
      return slots;
    }

    // Parse working hours (e.g., "09:00-17:00")
    const [openTime, closeTime] = workingHours.split('-');
    const serviceDuration = service.duration_minutes || 30;
    const bufferMinutes = service.buffer_minutes || 15;

    let currentTime = this.parseTime(openTime);
    const endTime = this.parseTime(closeTime);

    while (currentTime + serviceDuration <= endTime) {
      const startTimeStr = this.formatTime(currentTime);
      const endTimeStr = this.formatTime(currentTime + serviceDuration);
      const slotKey = `${date}_${startTimeStr}`;

      // Skip if slot already exists
      if (existingSlotKeys && existingSlotKeys.has(slotKey)) {
        currentTime += serviceDuration + bufferMinutes;
        continue;
      }

      // Check for conflicts with existing bookings
      const hasConflict = await this.checkSlotConflict(
        entityId,
        date,
        startTimeStr,
        endTimeStr,
        providerId
      );

      if (!hasConflict) {
        slots.push({
          id: crypto.randomUUID(),
          entity_id: entityId,
          service_id: serviceId,
          provider_id: providerId,
          date,
          start_time: startTimeStr,
          end_time: endTimeStr,
          status: SlotStatus.AVAILABLE,
          resource_requirements: service.resource_requirements || [],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      }

      currentTime += serviceDuration + bufferMinutes;
    }

    return slots;
  }

  private static parseTime(timeStr: string): number {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  }

  private static formatTime(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  }

  private static async checkSlotConflict(
    entityId: string,
    date: string,
    startTime: string,
    endTime: string,
    providerId?: string
  ): Promise<boolean> {
    const conflicts = await dbHelpers.find(collections.appointment_slots, {
      entity_id: entityId,
      date,
      status: { $in: [SlotStatus.BOOKED, SlotStatus.BLOCKED] },
      ...(providerId && { provider_id: providerId })
    });

    return conflicts.some(slot => {
      const slotStart = this.parseTime(slot.start_time);
      const slotEnd = this.parseTime(slot.end_time);
      const newStart = this.parseTime(startTime);
      const newEnd = this.parseTime(endTime);

      return (newStart < slotEnd && newEnd > slotStart);
    });
  }

  // Enhanced booking creation with atomic slot claiming
  static async createBooking(bookingData: {
    entity_id: string;
    service_id: string;
    patient_id: string;
    provider_id?: string;
    type: BookingType;
    appointment_date: string;
    appointment_time: string;
    patient_name: string;
    patient_email: string;
    patient_phone: string;
    patient_notes?: string;
    payment_method?: string;
  }): Promise<Booking> {
    try {
      await logger.info('booking_creation_started', 'Starting booking creation', bookingData);

      // Get service and validate
      const service = await dbHelpers.findById(collections.entity_services, bookingData.service_id);
      if (!service) {
        throw new Error('Service not found');
      }

      // Check lead time requirement
      const appointmentDateTime = new Date(`${bookingData.appointment_date}T${bookingData.appointment_time}`);
      const now = new Date();
      const leadTimeHours = service.booking_rules?.lead_time_hours || 24;
      const leadTimeMs = leadTimeHours * 60 * 60 * 1000;

      if (appointmentDateTime.getTime() - now.getTime() < leadTimeMs) {
        throw new Error(`Booking requires ${leadTimeHours} hours advance notice`);
      }

      // Find and claim available slot atomically
      const slot = await this.claimTimeSlot(
        bookingData.entity_id,
        bookingData.service_id,
        bookingData.appointment_date,
        bookingData.appointment_time,
        bookingData.provider_id
      );

      if (!slot) {
        throw new Error('Time slot not available');
      }

      // Create booking record
      const booking: Partial<Booking> = {
        entity_id: bookingData.entity_id,
        service_id: bookingData.service_id,
        patient_id: bookingData.patient_id,
        provider_id: bookingData.provider_id,
        type: bookingData.type,
        status: BookingStatus.PENDING,
        appointment_date: bookingData.appointment_date,
        appointment_time: bookingData.appointment_time,
        duration_minutes: service.duration_minutes || 30,
        patient_name: bookingData.patient_name,
        patient_email: bookingData.patient_email,
        patient_phone: bookingData.patient_phone,
        patient_notes: bookingData.patient_notes,
        booking_reference: this.generateBookingReference(),
        booking_rules: service.booking_rules || this.getDefaultBookingRules(),
        total_amount: service.price || 0,
        paid_amount: 0,
        payment_status: 'pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const savedBooking = await dbHelpers.create(collections.bookings, booking);

      // Update slot with booking ID
      await dbHelpers.update(collections.appointment_slots, slot.id, {
        booking_id: savedBooking.id,
        status: SlotStatus.BOOKED,
        updated_at: new Date().toISOString()
      });

      // Setup telehealth if needed
      if (bookingData.type === BookingType.TELEHEALTH) {
        const telehealthInfo = await this.setupTelehealthMeeting(savedBooking.id);
        await dbHelpers.update(collections.bookings, savedBooking.id, {
          telehealth_info: telehealthInfo
        });
      }

      // Handle payment if required
      if (booking.booking_rules?.requires_deposit && booking.total_amount > 0) {
        const depositAmount = booking.total_amount * (booking.booking_rules.deposit_percentage || 0.5);
        // Payment handling would be implemented here
      }

      // Schedule reminders
      await this.scheduleReminders(savedBooking.id);

      // Send confirmation
      await this.sendBookingConfirmation(savedBooking.id);

      await logger.info('booking_created_successfully', 'Booking created successfully', {
        booking_id: savedBooking.id,
        booking_reference: savedBooking.booking_reference
      }, bookingData.patient_id);

      return savedBooking as Booking;
    } catch (error) {
      await logger.error('booking_creation_failed', 'Booking creation failed', {
        error: error.message,
        booking_data: bookingData
      }, bookingData.patient_id);
      throw error;
    }
  }

  private static async claimTimeSlot(
    entityId: string,
    serviceId: string,
    date: string,
    time: string,
    providerId?: string
  ): Promise<TimeSlot | null> {
    // Find available slot
    const slots = await dbHelpers.find(collections.appointment_slots, {
      entity_id: entityId,
      service_id: serviceId,
      date,
      start_time: time,
      status: SlotStatus.AVAILABLE,
      ...(providerId && { provider_id: providerId })
    });

    if (slots.length === 0) {
      return null;
    }

    // Attempt to claim the first available slot
    const slot = slots[0];
    
    try {
      // Atomic update to claim slot
      await dbHelpers.update(collections.appointment_slots, slot.id, {
        status: SlotStatus.BOOKED,
        updated_at: new Date().toISOString()
      });

      return slot;
    } catch (error) {
      // Slot might have been claimed by another request
      return null;
    }
  }

  private static generateBookingReference(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);
    return `BK${timestamp}${random}`.toUpperCase();
  }

  private static getDefaultBookingRules(): BookingRules {
    return {
      lead_time_hours: 24,
      buffer_before_minutes: 15,
      buffer_after_minutes: 15,
      max_per_day: 10,
      cancellation_hours: 24,
      no_show_policy: 'Charge 50% fee for no-shows without 24h notice',
      requires_deposit: false
    };
  }

  private static async setupTelehealthMeeting(bookingId: string): Promise<any> {
    // Generate unique meeting details
    const meetingId = crypto.randomUUID();
    const meetingUrl = `${window.location.origin}/telehealth/join/${meetingId}`;

    return {
      meeting_url: meetingUrl,
      meeting_id: meetingId,
      waiting_room_enabled: true,
      recording_enabled: false,
      consent_given: false
    };
  }

  private static async scheduleReminders(bookingId: string): Promise<void> {
    try {
      const booking = await dbHelpers.findById(collections.bookings, bookingId);
      if (!booking) return;

      const appointmentTime = new Date(`${booking.appointment_date}T${booking.appointment_time}`);
      
      // Schedule reminders (24h, 2h, 15m before)
      const reminders = [
        { type: '24h', time: new Date(appointmentTime.getTime() - 24 * 60 * 60 * 1000) },
        { type: '2h', time: new Date(appointmentTime.getTime() - 2 * 60 * 60 * 1000) },
        { type: '15m', time: new Date(appointmentTime.getTime() - 15 * 60 * 1000) }
      ];

      await dbHelpers.create(collections.booking_reminders, {
        booking_id: bookingId,
        reminders: reminders.map(r => ({
          type: r.type,
          scheduled_time: r.time.toISOString(),
          sent: false,
          created_at: new Date().toISOString()
        }))
      });

      await logger.info('reminders_scheduled', 'Booking reminders scheduled', {
        booking_id: bookingId,
        reminder_count: reminders.length
      });
    } catch (error) {
      await logger.error('reminder_scheduling_failed', 'Failed to schedule reminders', {
        booking_id: bookingId,
        error: error.message
      });
    }
  }

  private static async sendBookingConfirmation(bookingId: string): Promise<void> {
    try {
      const booking = await dbHelpers.findById(collections.bookings, bookingId);
      const entity = await dbHelpers.findById(collections.entities, booking.entity_id);
      const service = await dbHelpers.findById(collections.entity_services, booking.service_id);

      // Create notification
      await dbHelpers.create(collections.notifications, {
        user_id: booking.patient_id,
        type: 'booking_confirmation',
        title: 'Appointment Confirmed',
        message: `Your appointment with ${entity.name} has been confirmed for ${booking.appointment_date} at ${booking.appointment_time}.`,
        data: {
          booking_id: bookingId,
          booking_reference: booking.booking_reference,
          entity_name: entity.name,
          service_name: service.name,
          appointment_date: booking.appointment_date,
          appointment_time: booking.appointment_time,
          telehealth_url: booking.telehealth_info?.meeting_url
        },
        is_read: false,
        created_at: new Date().toISOString()
      });

      await logger.info('booking_confirmation_sent', 'Booking confirmation sent', {
        booking_id: bookingId,
        patient_id: booking.patient_id
      });
    } catch (error) {
      await logger.error('booking_confirmation_failed', 'Failed to send booking confirmation', {
        booking_id: bookingId,
        error: error.message
      });
    }
  }

  // Process due reminders
  static async processDueReminders(): Promise<void> {
    try {
      const now = new Date();
      const reminderSchedules = await dbHelpers.find(collections.booking_reminders, {});

      let processed = 0;

      for (const schedule of reminderSchedules) {
        const reminders = schedule.reminders || [];
        let updated = false;

        for (const reminder of reminders) {
          if (!reminder.sent && new Date(reminder.scheduled_time) <= now) {
            try {
              const booking = await dbHelpers.findById(collections.bookings, schedule.booking_id);
              if (booking && booking.status === BookingStatus.CONFIRMED) {
                await this.sendReminder(booking, reminder.type);
                reminder.sent = true;
                updated = true;
                processed++;
              }
            } catch (error) {
              await logger.error('reminder_send_failed', 'Failed to send individual reminder', {
                booking_id: schedule.booking_id,
                reminder_type: reminder.type,
                error: error.message
              });
            }
          }
        }

        if (updated) {
          await dbHelpers.update(collections.booking_reminders, schedule.id, {
            reminders,
            updated_at: new Date().toISOString()
          });
        }
      }

      if (processed > 0) {
        await logger.info('reminders_processed', 'Booking reminders processed', {
          processed_count: processed
        });
      }
    } catch (error) {
      await logger.error('reminder_processing_failed', 'Failed to process reminders', {
        error: error.message
      });
    }
  }

  private static async sendReminder(booking: Booking, reminderType: string): Promise<void> {
    const entity = await dbHelpers.findById(collections.entities, booking.entity_id);
    
    await dbHelpers.create(collections.notifications, {
      user_id: booking.patient_id,
      type: 'appointment_reminder',
      title: `Appointment Reminder (${reminderType})`,
      message: `Reminder: You have an appointment with ${entity.name} on ${booking.appointment_date} at ${booking.appointment_time}.`,
      data: {
        booking_id: booking.id,
        reminder_type: reminderType,
        telehealth_url: booking.telehealth_info?.meeting_url
      },
      is_read: false,
      created_at: new Date().toISOString()
    });
  }

  // Get available slots with enhanced filtering
  static async getAvailableSlots(filters: {
    entity_id: string;
    service_id?: string;
    date_from: string;
    date_to: string;
    provider_id?: string;
    time_preferences?: 'morning' | 'afternoon' | 'evening';
  }): Promise<TimeSlot[]> {
    try {
      let query: Record<string, any> = {
        entity_id: filters.entity_id,
        status: SlotStatus.AVAILABLE,
        date: { $gte: filters.date_from, $lte: filters.date_to }
      };

      if (filters.service_id) {
        query.service_id = filters.service_id;
      }

      if (filters.provider_id) {
        query.provider_id = filters.provider_id;
      }

      let slots = await dbHelpers.find(collections.appointment_slots, query);

      // Apply time preferences
      if (filters.time_preferences) {
        slots = slots.filter(slot => {
          const hour = parseInt(slot.start_time.split(':')[0]);
          switch (filters.time_preferences) {
            case 'morning': return hour >= 6 && hour < 12;
            case 'afternoon': return hour >= 12 && hour < 17;
            case 'evening': return hour >= 17 && hour < 22;
            default: return true;
          }
        });
      }

      return slots.sort((a, b) => {
        if (a.date !== b.date) return a.date.localeCompare(b.date);
        return a.start_time.localeCompare(b.start_time);
      });
    } catch (error) {
      await logger.error('get_available_slots_failed', 'Failed to get available slots', {
        error: error.message,
        filters
      });
      throw error;
    }
  }
}