// Booking & Scheduling System for CareConnect Healthcare Platform
import { dbHelpers, collections } from './database';
import { PaymentService, PaymentType } from './payments';
import { 
  emailEventHandler, 
  EmailEvent,
  triggerAppointmentBooked
} from './email-events';

// Booking Type
export enum BookingType {
  IN_PERSON = 'in_person',
  TELEHEALTH = 'telehealth',
  PHONE_CONSULTATION = 'phone_consultation',
  HOME_VISIT = 'home_visit',
  EMERGENCY = 'emergency'
}

// Booking Status
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

// Appointment Slot Status
export enum SlotStatus {
  AVAILABLE = 'available',
  BOOKED = 'booked',
  BLOCKED = 'blocked',
  UNAVAILABLE = 'unavailable'
}

// Booking Interface
export interface Booking {
  id: string;
  entity_id: string;
  practitioner_id?: string;
  patient_id: string;
  
  // Booking Details
  booking_number: string;
  type: BookingType;
  status: BookingStatus;
  
  // Appointment Time
  appointment_date: string;
  appointment_time: string;
  duration: number; // in minutes
  timezone: string;
  
  // Service Information
  service_id: string;
  service_name: string;
  service_category: string;
  
  // Patient Information
  patient_info: {
    name: string;
    email: string;
    phone: string;
    date_of_birth: string;
    gender: string;
    emergency_contact: {
      name: string;
      phone: string;
      relationship: string;
    };
  };
  
  // Medical Information
  chief_complaint: string;
  symptoms?: string[];
  current_medications?: string[];
  allergies?: string[];
  medical_history?: string[];
  
  // Booking Preferences
  language_preference?: string;
  special_requests?: string;
  accessibility_needs?: string[];
  
  // Payment
  consultation_fee: number;
  payment_status: 'pending' | 'completed' | 'failed' | 'refunded';
  payment_id?: string;
  
  // Telehealth Details
  telehealth_info?: {
    meeting_url: string;
    meeting_id: string;
    passcode?: string;
    platform: 'zoom' | 'teams' | 'meet' | 'custom';
    test_call_url?: string;
  };
  
  // Forms and Documents
  intake_forms: {
    form_id: string;
    completed: boolean;
    submitted_at?: string;
  }[];
  
  pre_visit_documents?: string[];
  
  // Follow-up
  follow_up_required: boolean;
  follow_up_notes?: string;
  next_appointment_suggested?: string;
  
  // Timestamps
  booked_at: string;
  confirmed_at?: string;
  checked_in_at?: string;
  started_at?: string;
  completed_at?: string;
  cancelled_at?: string;
  
  // Cancellation
  cancellation_reason?: string;
  cancelled_by?: 'patient' | 'practitioner' | 'system';
  refund_issued?: boolean;
  
  // Reminders
  reminders_sent: {
    type: '24h' | '2h' | '15m';
    sent_at: string;
    channel: 'email' | 'sms' | 'push';
  }[];
  
  created_at: string;
  updated_at: string;
}

// Appointment Slot Interface
export interface AppointmentSlot {
  id: string;
  entity_id: string;
  practitioner_id?: string;
  
  // Time Slot
  date: string;
  start_time: string;
  end_time: string;
  duration: number;
  
  // Availability
  status: SlotStatus;
  booking_id?: string;
  
  // Service Configuration
  allowed_services: string[];
  booking_types: BookingType[];
  
  // Settings
  buffer_time_before: number; // in minutes
  buffer_time_after: number;
  is_emergency_slot: boolean;
  max_bookings: number; // for group appointments
  
  // Pricing
  base_price?: number;
  premium_pricing?: boolean;
  
  created_at: string;
  updated_at: string;
}

// Service Interface
export interface Service {
  id: string;
  entity_id: string;
  
  name: string;
  description: string;
  category: string;
  specialty?: string;
  
  // Duration and Pricing
  duration: number; // in minutes
  price: number;
  currency: string;
  
  // Availability
  booking_types: BookingType[];
  requires_practitioner: boolean;
  
  // Requirements
  age_restrictions?: {
    min_age?: number;
    max_age?: number;
  };
  
  gender_restrictions?: 'male' | 'female' | 'any';
  
  // Preparation
  preparation_instructions?: string[];
  required_documents?: string[];
  intake_forms: string[];
  
  // Settings
  advance_booking_days: number;
  cancellation_policy: {
    free_cancellation_hours: number;
    partial_refund_hours?: number;
    no_refund_after: number;
  };
  
  is_active: boolean;
  
  created_at: string;
  updated_at: string;
}

// Booking Service
export class BookingService {
  // Slot Management
  static async generateSlots(
    entityId: string,
    practitionerId: string | undefined,
    startDate: string,
    endDate: string,
    workingHours: {
      [day: string]: {
        start: string;
        end: string;
        breaks?: { start: string; end: string }[];
      };
    },
    slotDuration: number = 30
  ): Promise<AppointmentSlot[]> {
    const slots: AppointmentSlot[] = [];
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
      const dayName = date.toLocaleDateString('en-US', { weekday: 'lowercase' });
      const dayConfig = workingHours[dayName];
      
      if (!dayConfig) continue;
      
      const daySlots = this.generateDaySlots(
        date.toISOString().split('T')[0],
        dayConfig,
        slotDuration,
        entityId,
        practitionerId
      );
      
      slots.push(...daySlots);
    }
    
    // Save slots to database
    for (const slot of slots) {
      await dbHelpers.create(collections.appointment_slots, slot);
    }
    
    return slots;
  }
  
  private static generateDaySlots(
    date: string,
    dayConfig: any,
    duration: number,
    entityId: string,
    practitionerId?: string
  ): AppointmentSlot[] {
    const slots: AppointmentSlot[] = [];
    const startTime = this.parseTime(dayConfig.start);
    const endTime = this.parseTime(dayConfig.end);
    
    let currentTime = startTime;
    
    while (currentTime + duration <= endTime) {
      const startTimeStr = this.formatTime(currentTime);
      const endTimeStr = this.formatTime(currentTime + duration);
      
      // Check if slot overlaps with breaks
      const isBreakTime = dayConfig.breaks?.some((breakTime: any) => {
        const breakStart = this.parseTime(breakTime.start);
        const breakEnd = this.parseTime(breakTime.end);
        return currentTime < breakEnd && currentTime + duration > breakStart;
      });
      
      if (!isBreakTime) {
        slots.push({
          id: crypto.randomUUID(),
          entity_id: entityId,
          practitioner_id: practitionerId,
          date,
          start_time: startTimeStr,
          end_time: endTimeStr,
          duration,
          status: SlotStatus.AVAILABLE,
          allowed_services: [], // Configure based on entity
          booking_types: [BookingType.IN_PERSON, BookingType.TELEHEALTH],
          buffer_time_before: 5,
          buffer_time_after: 5,
          is_emergency_slot: false,
          max_bookings: 1,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      }
      
      currentTime += duration;
    }
    
    return slots;
  }
  
  // Booking Creation
  static async createBooking(bookingData: {
    entity_id: string;
    practitioner_id?: string;
    patient_id: string;
    service_id: string;
    appointment_date: string;
    appointment_time: string;
    type: BookingType;
    patient_info: any;
    chief_complaint: string;
    symptoms?: string[];
    language_preference?: string;
    special_requests?: string;
  }): Promise<{ booking: Booking; payment_data?: any }> {
    // Get service details
    const service = await dbHelpers.findById(collections.entity_services, bookingData.service_id);
    if (!service) {
      throw new Error('Service not found');
    }
    
    // Check slot availability
    const slot = await this.findAvailableSlot(
      bookingData.entity_id,
      bookingData.practitioner_id,
      bookingData.appointment_date,
      bookingData.appointment_time,
      service.duration
    );
    
    if (!slot) {
      throw new Error('Time slot not available');
    }
    
    // Generate booking number
    const bookingNumber = `BK-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    
    // Create booking
    const booking = await dbHelpers.create(collections.bookings, {
      ...bookingData,
      booking_number: bookingNumber,
      status: BookingStatus.PENDING,
      duration: service.duration,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      service_name: service.name,
      service_category: service.category,
      consultation_fee: service.price,
      payment_status: 'pending',
      intake_forms: service.intake_forms.map((formId: string) => ({
        form_id: formId,
        completed: false
      })),
      follow_up_required: false,
      reminders_sent: [],
      booked_at: new Date().toISOString()
    });
    
    // Mark slot as booked
    await dbHelpers.update(collections.appointment_slots, slot.id, {
      status: SlotStatus.BOOKED,
      booking_id: booking.id
    });
    
    // Setup telehealth if needed
    if (bookingData.type === BookingType.TELEHEALTH) {
      const telehealthInfo = await this.setupTelehealthMeeting(booking.id);
      await dbHelpers.update(collections.bookings, booking.id, {
        telehealth_info: telehealthInfo
      });
    }
    
    // Initialize payment if fee > 0
    let paymentData;
    if (service.price > 0) {
      paymentData = await PaymentService.initializePayment({
        amount: service.price,
        currency: service.currency,
        payer_email: bookingData.patient_info.email,
        payee_id: bookingData.entity_id,
        type: PaymentType.ONE_TIME,
        description: `${service.name} consultation - ${bookingNumber}`,
        booking_id: booking.id
      });
      
      await dbHelpers.update(collections.bookings, booking.id, {
        payment_id: paymentData.payment_id
      });
    } else {
      // Free consultation - confirm immediately
      await this.confirmBooking(booking.id);
    }
    
    return { booking, payment_data: paymentData };
  }
  
  // Booking Management
  static async confirmBooking(bookingId: string): Promise<Booking> {
    const booking = await dbHelpers.update(collections.bookings, bookingId, {
      status: BookingStatus.CONFIRMED,
      payment_status: 'completed',
      confirmed_at: new Date().toISOString()
    });
    
    // Send confirmation notifications
    await this.sendBookingConfirmation(bookingId);
    
    // Schedule reminders
    await this.scheduleReminders(bookingId);
    
    return booking;
  }
  
  static async cancelBooking(
    bookingId: string, 
    reason: string, 
    cancelledBy: 'patient' | 'practitioner' | 'system'
  ): Promise<{ booking: Booking; refund_amount: number }> {
    const booking = await dbHelpers.findById(collections.bookings, bookingId);
    
    // Calculate refund based on cancellation policy
    const service = await dbHelpers.findById(collections.entity_services, booking.service_id);
    const refundAmount = this.calculateRefund(booking, service.cancellation_policy);
    
    // Update booking
    const updatedBooking = await dbHelpers.update(collections.bookings, bookingId, {
      status: BookingStatus.CANCELLED,
      cancellation_reason: reason,
      cancelled_by: cancelledBy,
      cancelled_at: new Date().toISOString(),
      refund_issued: refundAmount > 0
    });
    
    // Free up the slot
    const slots = await dbHelpers.find(collections.appointment_slots, { booking_id: bookingId });
    if (slots.length > 0) {
      await dbHelpers.update(collections.appointment_slots, slots[0].id, {
        status: SlotStatus.AVAILABLE,
        booking_id: undefined
      });
    }
    
    // Process refund if applicable
    if (refundAmount > 0 && booking.payment_id) {
      await PaymentService.processRefund(booking.payment_id, refundAmount, reason);
    }
    
    // Send cancellation notifications
    await this.sendCancellationNotification(bookingId);
    
    return { booking: updatedBooking, refund_amount: refundAmount };
  }
  
  static async rescheduleBooking(
    bookingId: string,
    newDate: string,
    newTime: string
  ): Promise<Booking> {
    const booking = await dbHelpers.findById(collections.bookings, bookingId);
    const service = await dbHelpers.findById(collections.entity_services, booking.service_id);
    
    // Check new slot availability
    const newSlot = await this.findAvailableSlot(
      booking.entity_id,
      booking.practitioner_id,
      newDate,
      newTime,
      service.duration
    );
    
    if (!newSlot) {
      throw new Error('New time slot not available');
    }
    
    // Free old slot
    const oldSlots = await dbHelpers.find(collections.appointment_slots, { booking_id: bookingId });
    if (oldSlots.length > 0) {
      await dbHelpers.update(collections.appointment_slots, oldSlots[0].id, {
        status: SlotStatus.AVAILABLE,
        booking_id: undefined
      });
    }
    
    // Book new slot
    await dbHelpers.update(collections.appointment_slots, newSlot.id, {
      status: SlotStatus.BOOKED,
      booking_id: bookingId
    });
    
    // Update booking
    const updatedBooking = await dbHelpers.update(collections.bookings, bookingId, {
      appointment_date: newDate,
      appointment_time: newTime,
      status: BookingStatus.RESCHEDULED
    });
    
    // Update telehealth meeting if applicable
    if (booking.type === BookingType.TELEHEALTH) {
      const telehealthInfo = await this.setupTelehealthMeeting(bookingId);
      await dbHelpers.update(collections.bookings, bookingId, {
        telehealth_info: telehealthInfo
      });
    }
    
    // Send reschedule notifications
    await this.sendRescheduleNotification(bookingId);
    
    // Reschedule reminders
    await this.scheduleReminders(bookingId);
    
    return updatedBooking;
  }
  
  static async checkInPatient(bookingId: string): Promise<Booking> {
    return await dbHelpers.update(collections.bookings, bookingId, {
      status: BookingStatus.CHECKED_IN,
      checked_in_at: new Date().toISOString()
    });
  }
  
  static async startConsultation(bookingId: string): Promise<Booking> {
    return await dbHelpers.update(collections.bookings, bookingId, {
      status: BookingStatus.IN_PROGRESS,
      started_at: new Date().toISOString()
    });
  }
  
  static async completeConsultation(
    bookingId: string,
    notes?: string,
    followUpRequired?: boolean,
    nextAppointmentSuggested?: string
  ): Promise<Booking> {
    return await dbHelpers.update(collections.bookings, bookingId, {
      status: BookingStatus.COMPLETED,
      completed_at: new Date().toISOString(),
      follow_up_required: followUpRequired || false,
      follow_up_notes: notes,
      next_appointment_suggested: nextAppointmentSuggested
    });
  }
  
  // Search and Filtering
  static async searchAvailableSlots(filters: {
    entity_id?: string;
    practitioner_id?: string;
    service_id?: string;
    date_from: string;
    date_to: string;
    booking_type?: BookingType;
    duration?: number;
  }) {
    let slots = await dbHelpers.find(collections.appointment_slots, {
      status: SlotStatus.AVAILABLE
    });
    
    // Apply filters
    if (filters.entity_id) {
      slots = slots.filter(slot => slot.entity_id === filters.entity_id);
    }
    
    if (filters.practitioner_id) {
      slots = slots.filter(slot => slot.practitioner_id === filters.practitioner_id);
    }
    
    if (filters.booking_type) {
      slots = slots.filter(slot => slot.booking_types.includes(filters.booking_type!));
    }
    
    // Filter by date range
    slots = slots.filter(slot => {
      const slotDate = slot.date;
      return slotDate >= filters.date_from && slotDate <= filters.date_to;
    });
    
    // Filter by duration if service specified
    if (filters.service_id) {
      const service = await dbHelpers.findById(collections.entity_services, filters.service_id);
      if (service) {
        slots = slots.filter(slot => slot.duration >= service.duration);
      }
    }
    
    return slots;
  }
  
  static async getBookingsByEntity(entityId: string, filters?: {
    status?: BookingStatus;
    date_from?: string;
    date_to?: string;
    practitioner_id?: string;
  }) {
    let bookings = await dbHelpers.find(collections.bookings, { entity_id: entityId });
    
    if (filters?.status) {
      bookings = bookings.filter(booking => booking.status === filters.status);
    }
    
    if (filters?.practitioner_id) {
      bookings = bookings.filter(booking => booking.practitioner_id === filters.practitioner_id);
    }
    
    if (filters?.date_from) {
      bookings = bookings.filter(booking => booking.appointment_date >= filters.date_from!);
    }
    
    if (filters?.date_to) {
      bookings = bookings.filter(booking => booking.appointment_date <= filters.date_to!);
    }
    
    return bookings;
  }
  
  static async getPatientBookings(patientId: string) {
    return await dbHelpers.find(collections.bookings, { patient_id: patientId });
  }
  
  // Helper Functions
  private static async findAvailableSlot(
    entityId: string,
    practitionerId: string | undefined,
    date: string,
    time: string,
    duration: number
  ): Promise<AppointmentSlot | null> {
    const slots = await dbHelpers.find(collections.appointment_slots, {
      entity_id: entityId,
      practitioner_id: practitionerId,
      date,
      start_time: time,
      status: SlotStatus.AVAILABLE
    });
    
    return slots.find(slot => slot.duration >= duration) || null;
  }
  
  private static async setupTelehealthMeeting(bookingId: string) {
    // Generate unique meeting details
    const meetingId = `cc-${bookingId.slice(-8)}-${Date.now()}`;
    const passcode = Math.random().toString().slice(2, 8);
    
    return {
      meeting_url: `https://meet.careconnect.com/room/${meetingId}`,
      meeting_id: meetingId,
      passcode,
      platform: 'custom' as const,
      test_call_url: 'https://meet.careconnect.com/test'
    };
  }
  
  private static calculateRefund(booking: Booking, cancellationPolicy: any): number {
    const appointmentTime = new Date(`${booking.appointment_date}T${booking.appointment_time}`);
    const now = new Date();
    const hoursUntilAppointment = (appointmentTime.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    if (hoursUntilAppointment >= cancellationPolicy.free_cancellation_hours) {
      return booking.consultation_fee; // Full refund
    } else if (cancellationPolicy.partial_refund_hours && 
               hoursUntilAppointment >= cancellationPolicy.partial_refund_hours) {
      return booking.consultation_fee * 0.5; // 50% refund
    } else if (hoursUntilAppointment >= cancellationPolicy.no_refund_after) {
      return 0; // No refund
    }
    
    return 0;
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
  
  // Notification Functions
  private static async sendBookingConfirmation(bookingId: string) {
    const booking = await dbHelpers.findById(collections.bookings, bookingId);
    const entity = await dbHelpers.findById(collections.entities, booking.entity_id);
    
    // Send email notification
    try {
      await triggerAppointmentBooked(
        booking.patient_info.email,
        booking.patient_info.name,
        {
          appointmentId: booking.id,
          appointmentNumber: booking.booking_number,
          providerName: entity?.name || 'Healthcare Provider',
          appointmentDate: booking.appointment_date,
          appointmentTime: booking.appointment_time,
          serviceName: booking.service_name,
          duration: booking.duration,
          location: booking.type === BookingType.TELEHEALTH ? 'Virtual Appointment' : (entity?.address?.street || 'TBD'),
          isTelemedicine: booking.type === BookingType.TELEHEALTH,
          videoLink: booking.telehealth_info?.meeting_url,
          preparationInstructions: 'Please arrive 10 minutes early. Bring a valid ID and insurance card.'
        }
      );
    } catch (emailError) {
      console.warn('Failed to send booking confirmation email:', emailError);
    }
    
    // Also create in-app notification
    await dbHelpers.create(collections.notifications, {
      user_id: booking.patient_id,
      type: 'booking_confirmed',
      title: 'Appointment Confirmed',
      message: `Your appointment on ${booking.appointment_date} at ${booking.appointment_time} has been confirmed.`,
      data: { booking_id: bookingId },
      is_read: false
    });
  }
  
  private static async sendCancellationNotification(bookingId: string) {
    const booking = await dbHelpers.findById(collections.bookings, bookingId);
    const entity = await dbHelpers.findById(collections.entities, booking.entity_id);
    
    // Send email notification
    try {
      await emailEventHandler.trigger(EmailEvent.APPOINTMENT_CANCELLED, {
        userEmail: booking.patient_info.email,
        userName: booking.patient_info.name,
        eventData: {
          providerName: entity?.name || 'Healthcare Provider',
          appointmentDate: booking.appointment_date,
          appointmentTime: booking.appointment_time,
          serviceName: booking.service_name,
          cancellationReason: booking.cancellation_reason,
          refundAmount: booking.refund_issued ? booking.consultation_fee : 0,
          rescheduleUrl: `${window.location.origin}/booking/reschedule/${booking.id}`,
          contactUrl: `${window.location.origin}/contact`
        }
      });
    } catch (emailError) {
      console.warn('Failed to send cancellation email:', emailError);
    }
    
    // Also create in-app notification
    await dbHelpers.create(collections.notifications, {
      user_id: booking.patient_id,
      type: 'booking_cancelled',
      title: 'Appointment Cancelled',
      message: `Your appointment on ${booking.appointment_date} has been cancelled. ${booking.refund_issued ? 'A refund has been processed.' : ''}`,
      data: { booking_id: bookingId },
      is_read: false
    });
  }
  
  private static async sendRescheduleNotification(bookingId: string) {
    const booking = await dbHelpers.findById(collections.bookings, bookingId);
    
    await dbHelpers.create(collections.notifications, {
      user_id: booking.patient_id,
      type: 'booking_rescheduled',
      title: 'Appointment Rescheduled',
      message: `Your appointment has been rescheduled to ${booking.appointment_date} at ${booking.appointment_time}.`,
      data: { booking_id: bookingId },
      is_read: false
    });
  }
  
  private static async scheduleReminders(bookingId: string) {
    // In a real application, this would integrate with a scheduling system
    // For now, we'll just store the reminder schedule
    const booking = await dbHelpers.findById(collections.bookings, bookingId);
    
    const appointmentTime = new Date(`${booking.appointment_date}T${booking.appointment_time}`);
    
    // Schedule 24h, 2h, and 15m reminders
    const reminders = [
      { type: '24h', time: new Date(appointmentTime.getTime() - 24 * 60 * 60 * 1000) },
      { type: '2h', time: new Date(appointmentTime.getTime() - 2 * 60 * 60 * 1000) },
      { type: '15m', time: new Date(appointmentTime.getTime() - 15 * 60 * 1000) }
    ];
    
    // Store reminder schedule (in production, integrate with cron jobs)
    await dbHelpers.create('booking_reminders', {
      booking_id: bookingId,
      reminders: reminders.map(r => ({
        type: r.type,
        scheduled_time: r.time.toISOString(),
        sent: false
      }))
    });
  }
}
