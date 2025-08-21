import { useState, useEffect } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../lib/auth';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

// Dashboard sections
const OverviewSection = () => {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-dark">Dashboard Overview</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Stats Cards */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Total Appointments</h3>
          <p className="text-3xl font-bold text-primary">12</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Courses Enrolled</h3>
          <p className="text-3xl font-bold text-accent">3</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Health Tools Used</h3>
          <p className="text-3xl font-bold text-primary">8</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Total Donations</h3>
          <p className="text-3xl font-bold text-accent">$150</p>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold text-dark mb-4">Recent Activity</h3>
        <div className="space-y-4">
          <div className="flex items-center gap-4 p-3 bg-light rounded-lg">
            <div className="w-2 h-2 bg-primary rounded-full"></div>
            <span className="text-gray-700">Completed BMI Calculator</span>
            <span className="text-sm text-gray-500 ml-auto">2 hours ago</span>
          </div>
          <div className="flex items-center gap-4 p-3 bg-light rounded-lg">
            <div className="w-2 h-2 bg-accent rounded-full"></div>
            <span className="text-gray-700">Booked appointment with Dr. Smith</span>
            <span className="text-sm text-gray-500 ml-auto">1 day ago</span>
          </div>
          <div className="flex items-center gap-4 p-3 bg-light rounded-lg">
            <div className="w-2 h-2 bg-primary rounded-full"></div>
            <span className="text-gray-700">Enrolled in Nutrition Course</span>
            <span className="text-sm text-gray-500 ml-auto">3 days ago</span>
          </div>
        </div>
      </div>
    </div>
  );
};

const ProfileSection = () => {
  const { user } = useAuth();
  
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-dark">My Profile</h2>
      
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email
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
              Full Name
            </label>
            <input
              type="text"
              placeholder="Enter your full name"
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Phone
            </label>
            <input
              type="tel"
              placeholder="Enter your phone number"
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Date of Birth
            </label>
            <input
              type="date"
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

const AppointmentsSection = () => {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-dark">My Appointments</h2>
      
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="space-y-4">
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-semibold text-dark">Dr. Smith - General Consultation</h3>
                <p className="text-gray-600">Downtown Medical Center</p>
                <p className="text-sm text-gray-500">March 15, 2025 at 2:00 PM</p>
              </div>
              <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-sm">
                Confirmed
              </span>
            </div>
            <div className="mt-4 flex gap-2">
              <button className="bg-primary text-white px-4 py-2 rounded hover:bg-primary/90 transition-colors text-sm">
                Join Video Call
              </button>
              <button className="border border-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-50 transition-colors text-sm">
                Reschedule
              </button>
            </div>
          </div>
          
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-semibold text-dark">Dr. Johnson - Follow-up</h3>
                <p className="text-gray-600">City Health Clinic</p>
                <p className="text-sm text-gray-500">March 20, 2025 at 10:30 AM</p>
              </div>
              <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-sm">
                Pending
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const HealthToolsSection = () => {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-dark">My Health Tools</h2>
      
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold text-dark mb-4">Recent Tool Results</h3>
        <div className="space-y-4">
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex justify-between items-start">
              <div>
                <h4 className="font-medium text-dark">BMI Calculator</h4>
                <p className="text-sm text-gray-600">Result: 22.5 (Normal weight)</p>
                <p className="text-xs text-gray-500">Completed 2 hours ago</p>
              </div>
              <button className="text-primary hover:underline text-sm">
                View Details
              </button>
            </div>
          </div>
          
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex justify-between items-start">
              <div>
                <h4 className="font-medium text-dark">Blood Pressure Tracker</h4>
                <p className="text-sm text-gray-600">Last reading: 120/80 mmHg</p>
                <p className="text-xs text-gray-500">Recorded yesterday</p>
              </div>
              <button className="text-primary hover:underline text-sm">
                View History
              </button>
            </div>
          </div>
        </div>
        
        <div className="mt-6">
          <Link
            to="/health-tools"
            className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-primary/90 transition-colors inline-block"
          >
            Explore More Tools
          </Link>
        </div>
      </div>
    </div>
  );
};

const PublicDashboard = () => {
  const location = useLocation();
  const currentPath = location.pathname.split('/').pop() || 'overview';
  
  const navigation = [
    { name: 'Overview', path: 'overview' },
    { name: 'My Profile', path: 'profile' },
    { name: 'Appointments', path: 'appointments' },
    { name: 'Health Tools', path: 'health-tools' },
    { name: 'Courses', path: 'courses' },
    { name: 'Orders', path: 'orders' },
    { name: 'Donations', path: 'donations' }
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sidebar Navigation */}
        <div className="lg:w-64">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-dark mb-4">Dashboard</h3>
            <nav className="space-y-2">
              {navigation.map((item) => (
                <Link
                  key={item.path}
                  to={`/dashboard/${item.path}`}
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
            <Route path="profile" element={<ProfileSection />} />
            <Route path="appointments" element={<AppointmentsSection />} />
            <Route path="health-tools" element={<HealthToolsSection />} />
            <Route path="courses" element={<div>Courses section coming soon...</div>} />
            <Route path="orders" element={<div>Orders section coming soon...</div>} />
            <Route path="donations" element={<div>Donations section coming soon...</div>} />
            <Route path="" element={<OverviewSection />} />
          </Routes>
        </div>
      </div>
    </div>
  );
};

export default PublicDashboard;