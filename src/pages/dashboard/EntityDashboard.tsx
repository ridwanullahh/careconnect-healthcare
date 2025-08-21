import { useState, useEffect } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../lib/auth';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import LmsManagementPage from './LmsManagementPage';
import BlogManagementPage from './BlogManagementPage';
import CausesManagementPage from './CausesManagementPage';
import ShopManagementPage from './ShopManagementPage';

const OverviewSection = () => {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-dark">Entity Dashboard</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Stats Cards */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Total Bookings</h3>
          <p className="text-3xl font-bold text-primary">45</p>
          <p className="text-sm text-green-600 mt-1">+12% from last month</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Revenue</h3>
          <p className="text-3xl font-bold text-accent">$8,250</p>
          <p className="text-sm text-green-600 mt-1">+8% from last month</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Patient Reviews</h3>
          <p className="text-3xl font-bold text-primary">4.8</p>
          <p className="text-sm text-gray-600 mt-1">Based on 127 reviews</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Profile Views</h3>
          <p className="text-3xl font-bold text-accent">1,247</p>
          <p className="text-sm text-green-600 mt-1">+15% from last week</p>
        </div>
      </div>

      {/* Recent Bookings */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold text-dark mb-4">Recent Bookings</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-light rounded-lg">
            <div>
              <p className="font-medium text-dark">John Smith</p>
              <p className="text-sm text-gray-600">General Consultation - March 15, 2:00 PM</p>
            </div>
            <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-sm">
              Confirmed
            </span>
          </div>
          <div className="flex items-center justify-between p-3 bg-light rounded-lg">
            <div>
              <p className="font-medium text-dark">Sarah Johnson</p>
              <p className="text-sm text-gray-600">Follow-up - March 16, 10:30 AM</p>
            </div>
            <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-sm">
              Pending
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

const ProfileManagementSection = () => {
  const { user } = useAuth();
  
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-dark">Profile Management</h2>
      
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold text-dark mb-4">Basic Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Entity Name
            </label>
            <input
              type="text"
              placeholder="Your entity name"
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Entity Type
            </label>
            <select className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent">
              <option value="health_center">Health Center</option>
              <option value="pharmacy">Pharmacy</option>
              <option value="practitioner">Individual Practitioner</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Contact Email
            </label>
            <input
              type="email"
              value={user?.email || ''}
              readOnly
              className="w-full p-3 border border-gray-300 rounded-lg bg-gray-50"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Phone Number
            </label>
            <input
              type="tel"
              placeholder="Contact phone number"
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Address
            </label>
            <textarea
              rows={3}
              placeholder="Full address"
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              rows={4}
              placeholder="Describe your services and specialties"
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
        </div>
        
        <div className="mt-6">
          <button className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-primary/90 transition-colors">
            Update Profile
          </button>
        </div>
      </div>
    </div>
  );
};

const BookingsSection = () => {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-dark">Booking Management</h2>
      
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-dark">All Bookings</h3>
          <button className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors">
            Add Manual Booking
          </button>
        </div>
        
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((booking) => (
            <div key={booking} className="border border-gray-200 rounded-lg p-4">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-semibold text-dark">Patient #{booking}</h4>
                  <p className="text-gray-600">General Consultation</p>
                  <p className="text-sm text-gray-500">March {14 + booking}, 2025 at {9 + booking}:00 AM</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 rounded text-sm ${
                    booking % 3 === 0 ? 'bg-green-100 text-green-800' :
                    booking % 2 === 0 ? 'bg-yellow-100 text-yellow-800' :
                    'bg-blue-100 text-blue-800'
                  }`}>
                    {booking % 3 === 0 ? 'Confirmed' : booking % 2 === 0 ? 'Pending' : 'Completed'}
                  </span>
                </div>
              </div>
              <div className="mt-3 flex gap-2">
                <button className="bg-primary text-white px-3 py-1 rounded text-sm hover:bg-primary/90 transition-colors">
                  View Details
                </button>
                <button className="border border-gray-300 text-gray-700 px-3 py-1 rounded text-sm hover:bg-gray-50 transition-colors">
                  Reschedule
                </button>
                <button className="border border-red-300 text-red-700 px-3 py-1 rounded text-sm hover:bg-red-50 transition-colors">
                  Cancel
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const ServicesSection = () => {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-dark">Services Management</h2>
      
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-dark">Your Services</h3>
          <button className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors">
            Add New Service
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { name: 'General Consultation', price: 75, duration: 30 },
            { name: 'Follow-up Visit', price: 50, duration: 20 },
            { name: 'Specialist Consultation', price: 120, duration: 45 },
            { name: 'Health Screening', price: 100, duration: 60 }
          ].map((service, index) => (
            <div key={index} className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-semibold text-dark mb-2">{service.name}</h4>
              <p className="text-gray-600 text-sm mb-2">${service.price} • {service.duration} minutes</p>
              <div className="flex gap-2 mt-3">
                <button className="bg-primary text-white px-3 py-1 rounded text-sm hover:bg-primary/90 transition-colors">
                  Edit
                </button>
                <button className="border border-gray-300 text-gray-700 px-3 py-1 rounded text-sm hover:bg-gray-50 transition-colors">
                  Disable
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const EntityDashboard = () => {
  const location = useLocation();
  const currentPath = location.pathname.split('/').pop() || 'overview';
  
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

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sidebar Navigation */}
        <div className="lg:w-64">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-dark mb-4">Entity Admin</h3>
            <nav className="space-y-2">
              {navigation.map((item) => (
                <Link
                  key={item.path}
                  to={`/admin/${item.path}`}
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

        {/* Main Content */}
        <div className="flex-1">
          <Routes>
            <Route path="overview" element={<OverviewSection />} />
            <Route path="profile" element={<ProfileManagementSection />} />
            <Route path="bookings" element={<BookingsSection />} />
            <Route path="services" element={<ServicesSection />} />
            <Route path="reviews" element={<div>Reviews section coming soon...</div>} />
            <Route path="lms" element={<LmsManagementPage />} />
            <Route path="blog" element={<BlogManagementPage />} />
            <Route path="causes" element={<CausesManagementPage />} />
            <Route path="shop" element={<ShopManagementPage />} />
            <Route path="analytics" element={<div>Analytics section coming soon...</div>} />
            <Route path="settings" element={<div>Settings section coming soon...</div>} />
            <Route path="" element={<OverviewSection />} />
          </Routes>
        </div>
      </div>
    </div>
  );
};

export default EntityDashboard;