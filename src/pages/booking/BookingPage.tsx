import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { HealthcareEntity } from '../../lib/entities';
import { githubDB, collections } from '../../lib/database';
import { useAuth } from '../../lib/auth';
import { CompleteBookingService } from '../../lib/booking-complete';
import { bookingToCalendarEvent, downloadICS } from '../../lib/ics-generator';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

const BookingPage = () => {
  const { entityId } = useParams<{ entityId: string }>();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const [entity, setEntity] = useState<HealthcareEntity | null>(null);
  const [services, setServices] = useState<any[]>([]);
  const [slots, setSlots] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<any>(null);
  const [selectedService, setSelectedService] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [bookingData, setBookingData] = useState({
    name: '',
    email: '',
    phone: '',
    reason: '',
    notes: ''
  });

  useEffect(() => {
    const loadEntity = async () => {
      if (!entityId) {
        setError('Entity ID not provided');
        setLoading(false);
        return;
      }

      try {
        const entityData = await githubDB.findById(collections.entities, entityId);
        if (!entityData) {
          setError('Entity not found');
        } else {
          setEntity(entityData);
          // Fetch real services for this entity.
          const svc = await githubDB.find(collections.services, { entity_id: entityId }).catch(() => []);
          setServices(svc);
          // Fetch real available appointment slots.
          const allSlots = await githubDB.find(collections.appointment_slots, { entity_id: entityId }).catch(() => []);
          const today = new Date().toISOString().split('T')[0];
          setSlots(allSlots.filter((s: any) => s.is_available && s.date >= today));
          // Prefill user info if authenticated.
          if (user) {
            const profile = (await githubDB.find(collections.profiles, { user_id: user.id }).catch(() => []))[0];
            if (profile) {
              setBookingData(prev => ({
                ...prev,
                name: `${profile.first_name || ''} ${profile.last_name || ''}`.trim(),
                email: user.email || '',
                phone: user.phone || prev.phone,
              }));
            }
          }
        }
      } catch (err) {
        setError('Failed to load entity details');
        console.error('Error loading entity:', err);
      } finally {
        setLoading(false);
      }
    };

    loadEntity();
  }, [entityId, user]);

  const handleInputChange = (field: string, value: string) => {
    setBookingData(prev => ({ ...prev, [field]: value }));
  };

  // Available dates derived from real appointment slots (unique, sorted).
  const availableDates = [...new Set(slots.map((s: any) => s.date))].sort();

  // Available times for the selected date (from real slots).
  const availableTimeSlots = slots
    .filter((s: any) => s.date === selectedDate)
    .map((s: any) => s.time)
    .sort();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated || !user) {
      navigate('/login?redirect=' + encodeURIComponent(`/book/${entityId}`));
      return;
    }
    if (!selectedService || !selectedDate || !selectedTime) {
      setError('Please select a service, date, and time.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      // Construct the ISO start time from date + time.
      const startTime = new Date(`${selectedDate}T${selectedTime}:00`).toISOString();
      const booking = await CompleteBookingService.createBooking({
        user_id: user.id,
        entity_id: entityId!,
        service_id: selectedService,
        start_time: startTime,
        is_telehealth: false,
        patient_notes: bookingData.notes || bookingData.reason,
      });
      // Generate and offer the ICS calendar file for the confirmed booking.
      try {
        const calEvent = bookingToCalendarEvent(booking);
        downloadICS(calEvent, `appointment-${booking.booking_reference || booking.id}.ics`);
      } catch (icsErr) {
        console.warn('ICS generation failed:', icsErr);
      }
      setSuccess(booking);
    } catch (err: any) {
      console.error('Booking failed:', err);
      setError(err.message || 'Failed to create booking. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-light flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-light flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Error</h2>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  if (!entity) {
    return (
      <div className="min-h-screen bg-light flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Entity Not Found</h2>
          <p className="text-gray-600">The requested entity could not be found.</p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-sm p-8 text-center">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
          </div>
          <h1 className="text-2xl font-bold text-dark mb-2">Booking Confirmed</h1>
          <p className="text-gray-600 mb-4">Your appointment has been scheduled successfully.</p>
          <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
            <p className="text-sm text-gray-700"><strong>Reference:</strong> {success.booking_reference || success.id}</p>
            <p className="text-sm text-gray-700"><strong>Provider:</strong> {entity?.name}</p>
            <p className="text-sm text-gray-700"><strong>Date:</strong> {selectedDate}</p>
            <p className="text-sm text-gray-700"><strong>Time:</strong> {selectedTime}</p>
          </div>
          <p className="text-sm text-gray-500 mb-6">A calendar (.ics) file has been downloaded. Add it to your calendar app for a reminder.</p>
          <button
            onClick={() => navigate('/directory')}
            className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
          >
            Back to Directory
          </button>
        </div>
      </div>
    );
  }

  const availableDatesList = availableDates;
  const availableTimeSlotsList = availableTimeSlots;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <h1 className="text-3xl font-bold text-dark mb-4">Book Appointment</h1>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xl">
                {entity.name.charAt(0)}
              </span>
            </div>
            <div>
              <h2 className="text-xl font-semibold text-dark">{entity.name}</h2>
              <p className="text-gray-600">{entity.entity_type.replace('_', ' ').toUpperCase()}</p>
              <p className="text-gray-500 text-sm">
                {entity.address 
                  ? `${entity.address.street}, ${entity.address.city}, ${entity.address.state} ${entity.address.postal_code}` 
                  : 'Address not provided'
                }
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Service Selection */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-dark mb-4">Select a Service</h3>
            {services.length === 0 ? (
              <p className="text-gray-500 text-sm">No services listed for this provider. You may still book a general appointment below.</p>
            ) : (
              <select
                required
                value={selectedService}
                onChange={(e) => setSelectedService(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="">Select a service</option>
                {services.map((s: any) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.duration || 30} min) — {s.price ? `${s.currency || 'NGN'} ${s.price}` : 'Free'}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Date and Time Selection */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-dark mb-4">Select Date & Time</h3>
            {availableDatesList.length === 0 ? (
              <p className="text-gray-500 text-sm">No available appointment slots for this provider. Please check back later or contact the provider directly.</p>
            ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Date Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Preferred Date *
                </label>
                <select
                  required
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="">Select a date</option>
                  {availableDatesList.map(date => {
                    const dateObj = new Date(date);
                    const formatted = dateObj.toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    });
                    return (
                      <option key={date} value={date}>{formatted}</option>
                    );
                  })}
                </select>
              </div>

              {/* Time Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Preferred Time *
                </label>
                <select
                  required
                  value={selectedTime}
                  onChange={(e) => setSelectedTime(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  disabled={!selectedDate}
                >
                  <option value="">Select a time</option>
                  {availableTimeSlotsList.map(time => (
                    <option key={time} value={time}>{time}</option>
                  ))}
                </select>
              </div>
            </div>
            )}
          </div>

          {/* Personal Information */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-dark mb-4">Personal Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={bookingData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="Enter your full name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={bookingData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="Enter your email"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number *
                </label>
                <input
                  type="tel"
                  required
                  value={bookingData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="Enter your phone number"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reason for Visit *
                </label>
                <select
                  required
                  value={bookingData.reason}
                  onChange={(e) => handleInputChange('reason', e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="">Select reason</option>
                  <option value="general_consultation">General Consultation</option>
                  <option value="follow_up">Follow-up Visit</option>
                  <option value="specialist_consultation">Specialist Consultation</option>
                  <option value="emergency">Emergency</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Additional Notes
              </label>
              <textarea
                value={bookingData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                rows={4}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="Any additional information or special requests..."
              />
            </div>
          </div>

          {/* Terms and Submit */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="mb-6">
              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  required
                  className="mt-1 w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                />
                <span className="text-sm text-gray-600">
                  I agree to the{' '}
                  <a href="#" className="text-primary hover:underline">terms and conditions</a>
                  {' '}and{' '}
                  <a href="#" className="text-primary hover:underline">privacy policy</a>.
                  I understand that this booking is subject to availability confirmation.
                </span>
              </label>
            </div>

            {error && (
              <div className="mb-6 bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 text-sm">
                {error}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-4">
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 bg-primary text-white py-3 px-6 rounded-lg hover:bg-primary/90 transition-colors font-medium disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <LoadingSpinner size="sm" />
                    <span>Booking...</span>
                  </>
                ) : (
                  'Book Appointment'
                )}
              </button>
              <button
                type="button"
                className="flex-1 border border-gray-300 text-gray-700 py-3 px-6 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                onClick={() => window.history.back()}
              >
                Cancel
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BookingPage;