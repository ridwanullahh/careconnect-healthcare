import { useState, useEffect } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../lib/auth';
import { githubDB, collections } from '../../lib/database';
import { EntityService, HealthcareEntity } from '../../lib/entities';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import LmsManagementPage from './LmsManagementPage';
import BlogManagementPage from './BlogManagementPage';
import CausesManagementPage from './CausesManagementPage';
import ShopManagementPage from './ShopManagementPage';

const OverviewSection = ({ entity }: { entity: HealthcareEntity | null }) => {
  // This section would also fetch real data for stats
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-dark">Entity Dashboard</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Total Bookings</h3>
          <p className="text-3xl font-bold text-primary">45</p>
          <p className="text-sm text-green-600 mt-1">+12% from last month</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Patient Reviews</h3>
          <p className="text-3xl font-bold text-primary">{entity?.rating || 0}</p>
          <p className="text-sm text-gray-600 mt-1">Based on {entity?.review_count || 0} reviews</p>
        </div>
      </div>
    </div>
  );
};

const ProfileManagementSection = ({ entity, onUpdate }: { entity: HealthcareEntity | null, onUpdate: () => void }) => {
  const [formData, setFormData] = useState<Partial<HealthcareEntity>>({});
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (entity) {
      setFormData(entity);
    }
  }, [entity]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!entity) return;
    setIsLoading(true);
    try {
      await EntityService.updateEntity(entity.id, formData);
      alert('Profile updated successfully!');
      onUpdate();
    } catch (error) {
      console.error("Failed to update profile:", error);
      alert('Failed to update profile.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!entity) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-dark">Profile Management</h2>
      
      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Entity Name</label>
            <input type="text" name="name" value={formData.name || ''} onChange={handleInputChange} className="w-full p-3 border border-gray-300 rounded-lg" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Entity Type</label>
            <input type="text" value={entity.entity_type} readOnly className="w-full p-3 border border-gray-300 rounded-lg bg-gray-50" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Contact Email</label>
            <input type="email" name="email" value={formData.email || ''} onChange={handleInputChange} className="w-full p-3 border border-gray-300 rounded-lg" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
            <input type="tel" name="phone" value={formData.phone || ''} onChange={handleInputChange} className="w-full p-3 border border-gray-300 rounded-lg" />
          </div>
        </div>
        <div className="mt-6">
          <button type="submit" disabled={isLoading} className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50">
            {isLoading ? 'Updating...' : 'Update Profile'}
          </button>
        </div>
      </form>
    </div>
  );
};

const BookingsSection = ({ entityId }: { entityId: string | null }) => {
  const [bookings, setBookings] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchBookings = async () => {
      if (!entityId) return;
      try {
        const entityBookings = await githubDB.find(collections.bookings, { entityId: entityId });
        setBookings(entityBookings);
      } catch (error) {
        console.error("Failed to fetch bookings:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchBookings();
  }, [entityId]);

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-dark">Booking Management</h2>
      <div className="bg-white rounded-lg shadow-sm p-6">
        {bookings.length === 0 ? <p>No bookings found.</p> : bookings.map(booking => <div key={booking.id}>{booking.id}</div>)}
      </div>
    </div>
  );
};

const ServicesSection = ({ entityId }: { entityId: string | null }) => {
  const [services, setServices] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentService, setCurrentService] = useState<any>(null);

  const fetchServices = async () => {
    if (!entityId) return;
    setIsLoading(true);
    try {
      const entityServices = await githubDB.find(collections.entity_services, { entityId: entityId });
      setServices(entityServices);
    } catch (error) {
      console.error("Failed to fetch services:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchServices();
  }, [entityId]);

  const handleOpenModal = (service = null) => {
    setCurrentService(service);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setCurrentService(null);
  };

  const handleSaveService = async (serviceData: any) => {
    if (!entityId) return;
    if (currentService) {
      await EntityService.updateService(currentService.id, serviceData);
    } else {
      await EntityService.createService(entityId, serviceData);
    }
    fetchServices();
    handleCloseModal();
  };

  const handleDeleteService = async (serviceId: string) => {
    if (window.confirm('Are you sure you want to delete this service?')) {
      await EntityService.deleteService(serviceId);
      fetchServices();
    }
  };

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-dark">Services Management</h2>
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-dark">Your Services</h3>
          <button onClick={() => handleOpenModal()} className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors">
            Add New Service
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {services.map((service) => (
            <div key={service.id} className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-semibold text-dark mb-2">{service.name}</h4>
              <p className="text-gray-600 text-sm mb-2">${service.price} • {service.duration} minutes</p>
              <div className="flex gap-2 mt-3">
                <button onClick={() => handleOpenModal(service)} className="bg-primary text-white px-3 py-1 rounded text-sm hover:bg-primary/90 transition-colors">
                  Edit
                </button>
                <button onClick={() => handleDeleteService(service.id)} className="border border-red-300 text-red-700 px-3 py-1 rounded text-sm hover:bg-red-50 transition-colors">
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
        {isModalOpen && (
          <ServiceModal
            service={currentService}
            onClose={handleCloseModal}
            onSave={handleSaveService}
          />
        )}
      </div>
    </div>
  );
};

const ServiceModal = ({ service, onClose, onSave }: { service: any, onClose: () => void, onSave: (data: any) => void }) => {
  const [formData, setFormData] = useState({
    name: service?.name || '',
    price: service?.price || 0,
    duration: service?.duration || 30,
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h3 className="text-lg font-semibold mb-4">{service ? 'Edit Service' : 'Add New Service'}</h3>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Service Name</label>
              <input type="text" name="name" value={formData.name} onChange={handleInputChange} className="w-full p-2 border border-gray-300 rounded-lg" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Price</label>
              <input type="number" name="price" value={formData.price} onChange={handleInputChange} className="w-full p-2 border border-gray-300 rounded-lg" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Duration (minutes)</label>
              <input type="number" name="duration" value={formData.duration} onChange={handleInputChange} className="w-full p-2 border border-gray-300 rounded-lg" required />
            </div>
          </div>
          <div className="mt-6 flex justify-end gap-4">
            <button type="button" onClick={onClose} className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50">Cancel</button>
            <button type="submit" className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90">Save</button>
          </div>
        </form>
      </div>
    </div>
  );
};

// New Section Components
const LocationsSection = ({ entityId }: { entityId: string | null }) => {
  const [locations, setLocations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<any>(null);

  const fetchLocations = async () => {
    if (!entityId) return;
    try {
      const entityLocations = await githubDB.find(collections.entity_locations, { entityId });
      setLocations(entityLocations);
    } catch (error) {
      console.error("Failed to fetch locations:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLocations();
  }, [entityId]);

  const handleSaveLocation = async (locationData: any) => {
    if (!entityId) return;
    try {
      if (currentLocation) {
        await githubDB.update(collections.entity_locations, currentLocation.id, locationData);
      } else {
        await githubDB.insert(collections.entity_locations, { ...locationData, entityId });
      }
      fetchLocations();
      setIsModalOpen(false);
      setCurrentLocation(null);
    } catch (error) {
      console.error("Failed to save location:", error);
    }
  };

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-dark">Location Management</h2>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90"
        >
          Add Location
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {locations.map((location) => (
          <div key={location.id} className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="font-semibold text-lg mb-2">{location.name}</h3>
            <p className="text-gray-600 mb-4">{location.address}</p>
            <div className="flex gap-2">
              <button 
                onClick={() => { setCurrentLocation(location); setIsModalOpen(true); }}
                className="bg-primary text-white px-3 py-1 rounded text-sm"
              >
                Edit
              </button>
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <LocationModal
          location={currentLocation}
          onClose={() => { setIsModalOpen(false); setCurrentLocation(null); }}
          onSave={handleSaveLocation}
        />
      )}
    </div>
  );
};

const LocationModal = ({ location, onClose, onSave }: any) => {
  const [formData, setFormData] = useState({
    name: location?.name || '',
    address: location?.address || '',
    phone: location?.phone || '',
    email: location?.email || '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h3 className="text-lg font-semibold mb-4">{location ? 'Edit Location' : 'Add Location'}</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            placeholder="Location Name"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            className="w-full p-2 border border-gray-300 rounded"
            required
          />
          <input
            type="text"
            placeholder="Address"
            value={formData.address}
            onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
            className="w-full p-2 border border-gray-300 rounded"
            required
          />
          <input
            type="tel"
            placeholder="Phone"
            value={formData.phone}
            onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
            className="w-full p-2 border border-gray-300 rounded"
          />
          <input
            type="email"
            placeholder="Email"
            value={formData.email}
            onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
            className="w-full p-2 border border-gray-300 rounded"
          />
          <div className="flex gap-4 pt-4">
            <button type="button" onClick={onClose} className="flex-1 border border-gray-300 text-gray-700 py-2 rounded">
              Cancel
            </button>
            <button type="submit" className="flex-1 bg-primary text-white py-2 rounded">
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const TeamSection = ({ entityId }: { entityId: string | null }) => {
  const [staff, setStaff] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStaff = async () => {
      if (!entityId) return;
      try {
        const entityStaff = await githubDB.find(collections.entity_staff, { entityId });
        setStaff(entityStaff);
      } catch (error) {
        console.error("Failed to fetch staff:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchStaff();
  }, [entityId]);

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-dark">Team & Staff Management</h2>
        <button className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90">
          Add Staff Member
        </button>
      </div>
      
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {staff.map((member) => (
            <div key={member.id} className="border border-gray-200 rounded-lg p-4">
              <h3 className="font-semibold">{member.name}</h3>
              <p className="text-gray-600">{member.role}</p>
              <p className="text-sm text-gray-500">{member.email}</p>
            </div>
          ))}
          {staff.length === 0 && (
            <div className="col-span-full text-center py-8 text-gray-500">
              No staff members added yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const CoachingSection = ({ entityId }: { entityId: string | null }) => {
  const [programs, setPrograms] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchPrograms = async () => {
      if (!entityId) return;
      try {
        const entityPrograms = await githubDB.find(collections.coaching_programs, { entityId });
        setPrograms(entityPrograms);
      } catch (error) {
        console.error("Failed to fetch coaching programs:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchPrograms();
  }, [entityId]);

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-dark">Coaching Programs</h2>
        <button className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90">
          Create Program
        </button>
      </div>
      
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {programs.map((program) => (
            <div key={program.id} className="border border-gray-200 rounded-lg p-4">
              <h3 className="font-semibold text-lg">{program.title}</h3>
              <p className="text-gray-600 mb-2">{program.description}</p>
              <p className="text-primary font-semibold">${program.price}</p>
            </div>
          ))}
          {programs.length === 0 && (
            <div className="col-span-full text-center py-8 text-gray-500">
              No coaching programs created yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const ReviewsSection = ({ entityId }: { entityId: string | null }) => {
  const [reviews, setReviews] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchReviews = async () => {
      if (!entityId) return;
      try {
        const entityReviews = await githubDB.find(collections.reviews, { entity_id: entityId });
        setReviews(entityReviews);
      } catch (error) {
        console.error("Failed to fetch reviews:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchReviews();
  }, [entityId]);

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-dark">Reviews & Ratings</h2>
      
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="space-y-4">
          {reviews.map((review) => (
            <div key={review.id} className="border-b border-gray-200 pb-4 last:border-b-0">
              <div className="flex justify-between items-start mb-2">
                <h4 className="font-semibold">{review.reviewer_name}</h4>
                <div className="flex items-center">
                  <span className="text-yellow-400">{'★'.repeat(review.rating)}</span>
                  <span className="text-gray-300">{'★'.repeat(5 - review.rating)}</span>
                </div>
              </div>
              <p className="text-gray-600">{review.comment}</p>
              <p className="text-sm text-gray-400 mt-2">{new Date(review.created_at).toLocaleDateString()}</p>
            </div>
          ))}
          {reviews.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No reviews yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const MessagesSection = ({ entityId }: { entityId: string | null }) => {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-dark">Messages</h2>
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="text-center py-8 text-gray-500">
          Message system will be implemented here.
        </div>
      </div>
    </div>
  );
};

const AnalyticsSection = ({ entityId }: { entityId: string | null }) => {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-dark">Analytics Dashboard</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Total Bookings</h3>
          <p className="text-3xl font-bold text-primary">156</p>
          <p className="text-sm text-green-600 mt-1">+23% from last month</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Revenue</h3>
          <p className="text-3xl font-bold text-primary">$12,450</p>
          <p className="text-sm text-green-600 mt-1">+18% from last month</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-2">New Patients</h3>
          <p className="text-3xl font-bold text-primary">43</p>
          <p className="text-sm text-blue-600 mt-1">+12% from last month</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Satisfaction Rate</h3>
          <p className="text-3xl font-bold text-primary">98%</p>
          <p className="text-sm text-green-600 mt-1">+2% from last month</p>
        </div>
      </div>
    </div>
  );
};

const IntegrationsSection = ({ entityId }: { entityId: string | null }) => {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-dark">Integrations</h2>
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="text-center py-8 text-gray-500">
          Integration management will be implemented here.
        </div>
      </div>
    </div>
  );
};

const BillingSection = ({ entityId }: { entityId: string | null }) => {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-dark">Billing & Plans</h2>
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="text-center py-8 text-gray-500">
          Billing management will be implemented here.
        </div>
      </div>
    </div>
  );
};

const EntityDashboard = () => {
  const { user } = useAuth();
  const [entity, setEntity] = useState<HealthcareEntity | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const fetchEntity = async () => {
    if (user?.entity_id) {
      try {
        setIsLoading(true);
        const entityData = await EntityService.getEntity(user.entity_id);
        setEntity(entityData);
      } catch (error) {
        console.error("Failed to fetch entity data:", error);
      } finally {
        setIsLoading(false);
      }
    } else {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchEntity();
    }
  }, [user]);

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center"><LoadingSpinner size="lg" /></div>;
  }

  if (!user?.entity_id) {
    return (
      <div className="text-center py-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">No Entity Associated</h2>
        <p className="text-gray-600">User is not associated with an entity.</p>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="overview" element={<OverviewSection entity={entity} />} />
      <Route path="details" element={<ProfileManagementSection entity={entity} onUpdate={fetchEntity} />} />
      <Route path="locations" element={<LocationsSection entityId={user.entity_id} />} />
      <Route path="team" element={<TeamSection entityId={user.entity_id} />} />
      <Route path="services" element={<ServicesSection entityId={user.entity_id} />} />
      <Route path="coaching" element={<CoachingSection entityId={user.entity_id} />} />
      <Route path="lms" element={<LmsManagementPage />} />
      <Route path="blog" element={<BlogManagementPage />} />
      <Route path="causes" element={<CausesManagementPage />} />
      <Route path="ecommerce" element={<ShopManagementPage />} />
      <Route path="reviews" element={<ReviewsSection entityId={user.entity_id} />} />
      <Route path="messages" element={<MessagesSection entityId={user.entity_id} />} />
      <Route path="analytics" element={<AnalyticsSection entityId={user.entity_id} />} />
      <Route path="integrations" element={<IntegrationsSection entityId={user.entity_id} />} />
      <Route path="billing" element={<BillingSection entityId={user.entity_id} />} />
      <Route path="" element={<OverviewSection entity={entity} />} />
    </Routes>
  );
};

export default EntityDashboard;