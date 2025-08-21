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

const EntityDashboard = () => {
  const { user } = useAuth();
  const [entity, setEntity] = useState<HealthcareEntity | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const location = useLocation();
  const currentPath = location.pathname.split('/').pop() || 'overview';
  
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

  const navigation = [
    { name: 'Overview', path: 'overview' },
    { name: 'Profile', path: 'profile' },
    { name: 'Bookings', path: 'bookings' },
    { name: 'Services', path: 'services' },
    { name: 'Reviews', path: 'reviews' },
    { name: 'LMS', path: 'lms' },
    { name: 'Blog', path: 'blog' },
    { name: 'Causes', path: 'causes' },
    { name: 'Shop', path: 'shop' },
    { name: 'Analytics', path: 'analytics' },
    { name: 'Settings', path: 'settings' }
  ];

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center"><LoadingSpinner size="lg" /></div>;
  }

  if (!user?.entity_id) {
    return <div>User is not associated with an entity.</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col lg:flex-row gap-8">
        <div className="lg:w-64">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-dark mb-4">Entity Admin</h3>
            <nav className="space-y-2">
              {navigation.map((item) => (
                <Link
                  key={item.path}
                  to={`/dashboard/entity/${item.path}`}
                  className={`block px-3 py-2 rounded-lg text-sm transition-colors ${
                    currentPath === item.path
                      ? 'bg-primary text-white'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {item.name}
                </Link>
              ))}
            </nav>
          </div>
        </div>
        <div className="flex-1">
          <Routes>
            <Route path="overview" element={<OverviewSection entity={entity} />} />
            <Route path="profile" element={<ProfileManagementSection entity={entity} onUpdate={fetchEntity} />} />
            <Route path="bookings" element={<BookingsSection entityId={user.entity_id} />} />
            <Route path="services" element={<ServicesSection entityId={user.entity_id} />} />
            <Route path="reviews" element={<div>Reviews section coming soon...</div>} />
            <Route path="lms" element={<LmsManagementPage />} />
            <Route path="blog" element={<BlogManagementPage />} />
            <Route path="causes" element={<CausesManagementPage />} />
            <Route path="shop" element={<ShopManagementPage />} />
            <Route path="analytics" element={<div>Analytics section coming soon...</div>} />
            <Route path="settings" element={<div>Settings section coming soon...</div>} />
            <Route path="" element={<OverviewSection entity={entity} />} />
          </Routes>
        </div>
      </div>
    </div>
  );
};

export default EntityDashboard;