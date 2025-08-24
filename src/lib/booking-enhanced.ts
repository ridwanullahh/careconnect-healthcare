// Enhanced Booking System with Slot Locks and Calendar Generation
import { githubDB, collections } from './database';

export interface Service {
  id: string;
  entityId: string;
  name: string;
  description: string;
  duration: number; // in minutes
  price: number;
  currency: string;
  availability: {
    dayOfWeek: number; // 0-6 (Sunday-Saturday)
    startTime: string; // HH:MM format
    endTime: string; // HH:MM format
  }[];
  bufferTime: number; // minutes between appointments
  advanceBookingDays: number;
  cancellationPolicy: {
    allowedHours: number;
    refundPercentage: number;
  };
  reschedulePolicy: {
    allowedHours: number;
    feeAmount: number;
  };
  maxBookingsPerDay: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SlotLock {
  id: string;
  serviceId: string;
  entityId: string;
  slotDateTime: string;
  lockedBy: string;
  lockedAt: string;
  expiresAt: string;
  bookingId?: string;
  status: 'active' | 'expired' | 'converted' | 'released';
}

export interface BookingReminder {
  id: string;
  bookingId: string;
  reminderType: '24h' | '2h' | '30m';
  scheduledFor: string;
  status: 'pending' | 'sent' | 'failed';
  attempts: number;
  lastAttemptAt?: string;
  createdAt: string;
}

export interface EnhancedBooking {
  id: string;
  serviceId: string;
  entityId: string;
  patientId: string;
  appointmentDateTime: string;
  duration: number;
  status: 'confirmed' | 'cancelled' | 'completed' | 'no_show' | 'rescheduled';
  bookingReference: string;
  paymentStatus: 'pending' | 'paid' | 'refunded' | 'failed';
  paymentId?: string;
  totalAmount: number;
  currency: string;
  cancellationReason?: string;
  cancelledAt?: string;
  rescheduleHistory: {
    originalDateTime: string;
    newDateTime: string;
    rescheduledAt: string;
    reason: string;
  }[];
  remindersSent: string[];
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export class EnhancedBookingService {
  // Create service
  static async createService(serviceData: Omit<Service, 'id' | 'createdAt' | 'updatedAt'>): Promise<Service> {
    const service: Service = {
      id: `srv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...serviceData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await githubDB.create(collections.services, service);
    return service;
  }

  // Get available slots for a service
  static async getAvailableSlots(
    serviceId: string,
    startDate: string,
    endDate: string
  ): Promise<{ dateTime: string; available: boolean }[]> {
    const service = await githubDB.findById(collections.services, serviceId);
    if (!service) throw new Error('Service not found');

    const slots: { dateTime: string; available: boolean }[] = [];
    const start = new Date(startDate);
    const end = new Date(endDate);

    // Get existing bookings and locks
    const [bookings, locks] = await Promise.all([
      githubDB.findMany(collections.bookings, {
        serviceId,
        appointmentDateTime: { $gte: startDate, $lte: endDate },
        status: { $ne: 'cancelled' }
      }),
      githubDB.findMany(collections.slot_locks, {
        serviceId,
        slotDateTime: { $gte: startDate, $lte: endDate },
        status: 'active',
        expiresAt: { $gt: new Date().toISOString() }
      })
    ]);

    const bookedSlots = new Set(bookings.map(b => b.appointmentDateTime));
    const lockedSlots = new Set(locks.map(l => l.slotDateTime));

    // Generate slots based on service availability
    for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
      const dayOfWeek = date.getDay();
      const availability = service.availability.find(a => a.dayOfWeek === dayOfWeek);
      
      if (availability) {
        const startTime = new Date(date);
        const [startHour, startMinute] = availability.startTime.split(':').map(Number);
        startTime.setHours(startHour, startMinute, 0, 0);

        const endTime = new Date(date);
        const [endHour, endMinute] = availability.endTime.split(':').map(Number);
        endTime.setHours(endHour, endMinute, 0, 0);

        for (let slotTime = new Date(startTime); slotTime < endTime; 
             slotTime.setMinutes(slotTime.getMinutes() + service.duration + service.bufferTime)) {
          
          const slotDateTime = slotTime.toISOString();
          const isBooked = bookedSlots.has(slotDateTime);
          const isLocked = lockedSlots.has(slotDateTime);
          
          slots.push({
            dateTime: slotDateTime,
            available: !isBooked && !isLocked
          });
        }
      }
    }

    return slots;
  }

  // Lock a slot for booking
  static async lockSlot(
    serviceId: string,
    slotDateTime: string,
    lockedBy: string,
    lockDurationMinutes: number = 15
  ): Promise<SlotLock> {
    // Check if slot is already locked or booked
    const [existingLock, existingBooking] = await Promise.all([
      githubDB.findOne(collections.slot_locks, {
        serviceId,
        slotDateTime,
        status: 'active',
        expiresAt: { $gt: new Date().toISOString() }
      }),
      githubDB.findOne(collections.bookings, {
        serviceId,
        appointmentDateTime: slotDateTime,
        status: { $ne: 'cancelled' }
      })
    ]);

    if (existingLock) throw new Error('Slot is already locked');
    if (existingBooking) throw new Error('Slot is already booked');

    const slotLock: SlotLock = {
      id: `lock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      serviceId,
      entityId: (await githubDB.findById(collections.services, serviceId))?.entityId || '',
      slotDateTime,
      lockedBy,
      lockedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + lockDurationMinutes * 60 * 1000).toISOString(),
      status: 'active'
    };

    await githubDB.create(collections.slot_locks, slotLock);
    return slotLock;
  }

  // Release slot lock
  static async releaseSlotLock(lockId: string): Promise<void> {
    await githubDB.update(collections.slot_locks, lockId, {
      status: 'released',
      updatedAt: new Date().toISOString()
    });
  }

  // Create booking with slot lock conversion
  static async createBooking(
    bookingData: Omit<EnhancedBooking, 'id' | 'bookingReference' | 'createdAt' | 'updatedAt' | 'remindersSent' | 'rescheduleHistory'>,
    lockId?: string
  ): Promise<EnhancedBooking> {
    const bookingReference = `BK${Date.now().toString().slice(-8)}`;
    
    const booking: EnhancedBooking = {
      id: `booking_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...bookingData,
      bookingReference,
      remindersSent: [],
      rescheduleHistory: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await githubDB.create(collections.bookings, booking);

    // Convert slot lock to booking
    if (lockId) {
      await githubDB.update(collections.slot_locks, lockId, {
        status: 'converted',
        bookingId: booking.id,
        updatedAt: new Date().toISOString()
      });
    }

    // Schedule reminders
    await this.scheduleReminders(booking.id, booking.appointmentDateTime);

    return booking;
  }

  // Schedule booking reminders
  static async scheduleReminders(bookingId: string, appointmentDateTime: string): Promise<void> {
    const appointmentDate = new Date(appointmentDateTime);
    
    const reminders: Omit<BookingReminder, 'id'>[] = [
      {
        bookingId,
        reminderType: '24h',
        scheduledFor: new Date(appointmentDate.getTime() - 24 * 60 * 60 * 1000).toISOString(),
        status: 'pending',
        attempts: 0,
        createdAt: new Date().toISOString()
      },
      {
        bookingId,
        reminderType: '2h',
        scheduledFor: new Date(appointmentDate.getTime() - 2 * 60 * 60 * 1000).toISOString(),
        status: 'pending',
        attempts: 0,
        createdAt: new Date().toISOString()
      },
      {
        bookingId,
        reminderType: '30m',
        scheduledFor: new Date(appointmentDate.getTime() - 30 * 60 * 1000).toISOString(),
        status: 'pending',
        attempts: 0,
        createdAt: new Date().toISOString()
      }
    ];

    for (const reminder of reminders) {
      await githubDB.create(collections.booking_reminders, {
        id: `rem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        ...reminder
      });
    }
  }

  // Generate ICS calendar file
  static generateICSFile(booking: EnhancedBooking, service: Service, entity: any): string {
    const startDate = new Date(booking.appointmentDateTime);
    const endDate = new Date(startDate.getTime() + booking.duration * 60 * 1000);
    
    const formatDate = (date: Date): string => {
      return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };

    const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//CareConnect//Booking System//EN
CALSCALE:GREGORIAN
METHOD:REQUEST
BEGIN:VEVENT
UID:${booking.id}@careconnect.com
DTSTART:${formatDate(startDate)}
DTEND:${formatDate(endDate)}
DTSTAMP:${formatDate(new Date())}
SUMMARY:${service.name} - ${entity.name}
DESCRIPTION:Appointment for ${service.name}\\nBooking Reference: ${booking.bookingReference}\\nProvider: ${entity.name}\\nAmount: ${booking.currency} ${booking.totalAmount}
LOCATION:${entity.address || 'Online'}
STATUS:CONFIRMED
SEQUENCE:0
TRANSP:OPAQUE
END:VEVENT
END:VCALENDAR`;

    return icsContent;
  }

  // Download ICS file
  static downloadICSFile(booking: EnhancedBooking, service: Service, entity: any): void {
    const icsContent = this.generateICSFile(booking, service, entity);
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `appointment-${booking.bookingReference}.ics`;
    link.click();
  }

  // Cancel booking with policy enforcement
  static async cancelBooking(
    bookingId: string,
    reason: string,
    cancelledBy: string
  ): Promise<{ success: boolean; refundAmount?: number; message: string }> {
    const booking = await githubDB.findById(collections.bookings, bookingId);
    if (!booking) throw new Error('Booking not found');

    const service = await githubDB.findById(collections.services, booking.serviceId);
    if (!service) throw new Error('Service not found');

    const appointmentDate = new Date(booking.appointmentDateTime);
    const now = new Date();
    const hoursUntilAppointment = (appointmentDate.getTime() - now.getTime()) / (1000 * 60 * 60);

    // Check cancellation policy
    if (hoursUntilAppointment < service.cancellationPolicy.allowedHours) {
      return {
        success: false,
        message: `Cancellation not allowed. Must cancel at least ${service.cancellationPolicy.allowedHours} hours before appointment.`
      };
    }

    // Calculate refund
    const refundAmount = (booking.totalAmount * service.cancellationPolicy.refundPercentage) / 100;

    // Update booking
    await githubDB.update(collections.bookings, bookingId, {
      status: 'cancelled',
      cancellationReason: reason,
      cancelledAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    // Cancel reminders
    const reminders = await githubDB.findMany(collections.booking_reminders, { 
      bookingId, 
      status: 'pending' 
    });
    
    for (const reminder of reminders) {
      await githubDB.update(collections.booking_reminders, reminder.id, {
        status: 'cancelled',
        updatedAt: new Date().toISOString()
      });
    }

    return {
      success: true,
      refundAmount,
      message: `Booking cancelled successfully. Refund amount: ${booking.currency} ${refundAmount.toFixed(2)}`
    };
  }

  // Reschedule booking with policy enforcement
  static async rescheduleBooking(
    bookingId: string,
    newDateTime: string,
    reason: string,
    rescheduledBy: string
  ): Promise<{ success: boolean; feeAmount?: number; message: string }> {
    const booking = await githubDB.findById(collections.bookings, bookingId);
    if (!booking) throw new Error('Booking not found');

    const service = await githubDB.findById(collections.services, booking.serviceId);
    if (!service) throw new Error('Service not found');

    const appointmentDate = new Date(booking.appointmentDateTime);
    const now = new Date();
    const hoursUntilAppointment = (appointmentDate.getTime() - now.getTime()) / (1000 * 60 * 60);

    // Check reschedule policy
    if (hoursUntilAppointment < service.reschedulePolicy.allowedHours) {
      return {
        success: false,
        message: `Rescheduling not allowed. Must reschedule at least ${service.reschedulePolicy.allowedHours} hours before appointment.`
      };
    }

    // Check if new slot is available
    const availableSlots = await this.getAvailableSlots(
      service.id,
      newDateTime,
      newDateTime
    );
    
    const newSlot = availableSlots.find(slot => slot.dateTime === newDateTime);
    if (!newSlot || !newSlot.available) {
      return {
        success: false,
        message: 'Selected slot is not available.'
      };
    }

    // Lock new slot
    const lock = await this.lockSlot(service.id, newDateTime, rescheduledBy);

    // Update booking
    const originalDateTime = booking.appointmentDateTime;
    await githubDB.update(collections.bookings, bookingId, {
      appointmentDateTime: newDateTime,
      status: 'rescheduled',
      rescheduleHistory: [
        ...booking.rescheduleHistory,
        {
          originalDateTime,
          newDateTime,
          rescheduledAt: new Date().toISOString(),
          reason
        }
      ],
      updatedAt: new Date().toISOString()
    });

    // Convert lock
    await githubDB.update(collections.slot_locks, lock.id, {
      status: 'converted',
      bookingId: booking.id
    });

    // Cancel old reminders and schedule new ones
    const oldReminders = await githubDB.findMany(collections.booking_reminders, {
      bookingId,
      status: 'pending'
    });

    for (const reminder of oldReminders) {
      await githubDB.update(collections.booking_reminders, reminder.id, {
        status: 'cancelled'
      });
    }

    await this.scheduleReminders(bookingId, newDateTime);

    return {
      success: true,
      feeAmount: service.reschedulePolicy.feeAmount,
      message: `Booking rescheduled successfully. Reschedule fee: ${booking.currency} ${service.reschedulePolicy.feeAmount}`
    };
  }

  // Process due reminders
  static async processDueReminders(): Promise<void> {
    const now = new Date().toISOString();
    const dueReminders = await githubDB.findMany(collections.booking_reminders, {
      status: 'pending',
      scheduledFor: { $lte: now }
    });

    for (const reminder of dueReminders) {
      try {
        const booking = await githubDB.findById(collections.bookings, reminder.bookingId);
        if (!booking || booking.status === 'cancelled') {
          await githubDB.update(collections.booking_reminders, reminder.id, {
            status: 'cancelled'
          });
          continue;
        }

        // Send notification
        await githubDB.create(collections.notifications, {
          id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          userId: booking.patientId,
          type: 'booking_reminder',
          title: 'Appointment Reminder',
          message: `You have an upcoming appointment in ${reminder.reminderType.replace('h', ' hours').replace('m', ' minutes')}`,
          data: { bookingId: booking.id, reminderType: reminder.reminderType },
          createdAt: new Date().toISOString(),
          read: false,
          priority: 'normal'
        });

        await githubDB.update(collections.booking_reminders, reminder.id, {
          status: 'sent',
          lastAttemptAt: new Date().toISOString(),
          attempts: reminder.attempts + 1
        });

      } catch (error) {
        console.error('Failed to send reminder:', error);
        await githubDB.update(collections.booking_reminders, reminder.id, {
          status: 'failed',
          lastAttemptAt: new Date().toISOString(),
          attempts: reminder.attempts + 1
        });
      }
    }
  }

  // Clean up expired locks
  static async cleanupExpiredLocks(): Promise<void> {
    const now = new Date().toISOString();
    const expiredLocks = await githubDB.findMany(collections.slot_locks, {
      status: 'active',
      expiresAt: { $lt: now }
    });

    for (const lock of expiredLocks) {
      await githubDB.update(collections.slot_locks, lock.id, {
        status: 'expired',
        updatedAt: new Date().toISOString()
      });
    }
  }
}

export default EnhancedBookingService;