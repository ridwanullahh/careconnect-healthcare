import { useState, useEffect } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../lib/auth';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

const OverviewSection = () => {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-dark">Super Admin Dashboard</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Platform Stats */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Total Users</h3>
          <p className="text-3xl font-bold text-primary">12,547</p>
          <p className="text-sm text-green-600 mt-1">+5.2% from last month</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Total Entities</h3>
          <p className="text-3xl font-bold text-accent">1,234</p>
          <p className="text-sm text-green-600 mt-1">+8.1% from last month</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Platform Revenue</h3>
          <p className="text-3xl font-bold text-primary">$125K</p>
          <p className="text-sm text-green-600 mt-1">+12% from last month</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Active Bookings</h3>
          <p className="text-3xl font-bold text-accent">2,847</p>
          <p className="text-sm text-blue-600 mt-1">Real-time count</p>
        </div>
      </div>

      {/* Verification Queue */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold text-dark mb-4">Pending Verifications</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div>
              <p className="font-medium text-dark">Downtown Medical Center</p>
              <p className="text-sm text-gray-600">Health Center • Submitted 2 days ago</p>
            </div>
            <div className="flex gap-2">
              <button className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 transition-colors">
                Approve
              </button>
              <button className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700 transition-colors">
                Reject
              </button>
              <button className="border border-gray-300 text-gray-700 px-3 py-1 rounded text-sm hover:bg-gray-50 transition-colors">
                Review
              </button>
            </div>
          </div>
          
          <div className="flex items-center justify-between p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div>
              <p className="font-medium text-dark">City Pharmacy</p>
              <p className="text-sm text-gray-600">Pharmacy • Submitted 1 day ago</p>
            </div>
            <div className="flex gap-2">
              <button className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 transition-colors">
                Approve
              </button>
              <button className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700 transition-colors">
                Reject
              </button>
              <button className="border border-gray-300 text-gray-700 px-3 py-1 rounded text-sm hover:bg-gray-50 transition-colors">
                Review
              </button>
            </div>
          </div>
        </div>
        
        <div className="mt-4">
          <Link
            to="/super-admin/verifications"
            className="text-primary hover:underline text-sm"
          >
            View all pending verifications →
          </Link>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold text-dark mb-4">Recent Platform Activity</h3>
        <div className="space-y-4">
          <div className="flex items-center gap-4 p-3 bg-light rounded-lg">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-gray-700">New entity registration: Dr. Smith Medical Practice</span>
            <span className="text-sm text-gray-500 ml-auto">5 minutes ago</span>
          </div>
          <div className="flex items-center gap-4 p-3 bg-light rounded-lg">
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            <span className="text-gray-700">User reported content on Health Tips Forum</span>
            <span className="text-sm text-gray-500 ml-auto">15 minutes ago</span>
          </div>
          <div className="flex items-center gap-4 p-3 bg-light rounded-lg">
            <div className="w-2 h-2 bg-accent rounded-full"></div>
            <span className="text-gray-700">Payment gateway maintenance completed</span>
            <span className="text-sm text-gray-500 ml-auto">1 hour ago</span>
          </div>
        </div>
      </div>
    </div>
  );
};

const UsersSection = () => {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-dark">User Management</h2>
      
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-dark">All Users</h3>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Search users..."
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            />
            <button className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors">
              Search
            </button>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-2 font-medium text-gray-700">User</th>
                <th className="text-left py-3 px-2 font-medium text-gray-700">Type</th>
                <th className="text-left py-3 px-2 font-medium text-gray-700">Status</th>
                <th className="text-left py-3 px-2 font-medium text-gray-700">Joined</th>
                <th className="text-left py-3 px-2 font-medium text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {[
                { name: 'john.doe@email.com', type: 'Public User', status: 'Active', joined: '2025-01-15' },
                { name: 'smith.clinic@email.com', type: 'Health Center', status: 'Verified', joined: '2025-01-10' },
                { name: 'city.pharmacy@email.com', type: 'Pharmacy', status: 'Pending', joined: '2025-01-12' },
                { name: 'dr.johnson@email.com', type: 'Practitioner', status: 'Active', joined: '2025-01-08' }
              ].map((user, index) => (
                <tr key={index} className="border-b border-gray-100">
                  <td className="py-3 px-2">
                    <div>
                      <p className="font-medium text-dark">{user.name}</p>
                    </div>
                  </td>
                  <td className="py-3 px-2 text-gray-600">{user.type}</td>
                  <td className="py-3 px-2">
                    <span className={`px-2 py-1 rounded text-sm ${
                      user.status === 'Active' ? 'bg-green-100 text-green-800' :
                      user.status === 'Verified' ? 'bg-blue-100 text-blue-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {user.status}
                    </span>
                  </td>
                  <td className="py-3 px-2 text-gray-600">{user.joined}</td>
                  <td className="py-3 px-2">
                    <div className="flex gap-1">
                      <button className="text-primary hover:underline text-sm">
                        Edit
                      </button>
                      <button className="text-red-600 hover:underline text-sm">
                        Suspend
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const EntitiesSection = () => {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-dark">Entity Management</h2>
      
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-dark">Healthcare Entities</h3>
          <div className="flex gap-2">
            <select className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent">
              <option value="">All Types</option>
              <option value="health_center">Health Centers</option>
              <option value="pharmacy">Pharmacies</option>
              <option value="practitioner">Practitioners</option>
            </select>
            <input
              type="text"
              placeholder="Search entities..."
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { name: 'Downtown Medical Center', type: 'Health Center', status: 'Verified', rating: 4.8 },
            { name: 'City Pharmacy', type: 'Pharmacy', status: 'Pending', rating: 4.5 },
            { name: 'Dr. Smith Practice', type: 'Practitioner', status: 'Verified', rating: 4.9 },
            { name: 'HealthCare Plus', type: 'Health Center', status: 'Active', rating: 4.6 }
          ].map((entity, index) => (
            <div key={index} className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-semibold text-dark mb-2">{entity.name}</h4>
              <p className="text-sm text-gray-600 mb-2">{entity.type}</p>
              <div className="flex justify-between items-center mb-3">
                <span className={`px-2 py-1 rounded text-xs ${
                  entity.status === 'Verified' ? 'bg-green-100 text-green-800' :
                  entity.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-blue-100 text-blue-800'
                }`}>
                  {entity.status}
                </span>
                <span className="text-sm text-gray-600">⭐ {entity.rating}</span>
              </div>
              <div className="flex gap-2">
                <button className="bg-primary text-white px-3 py-1 rounded text-sm hover:bg-primary/90 transition-colors">
                  View
                </button>
                <button className="border border-gray-300 text-gray-700 px-3 py-1 rounded text-sm hover:bg-gray-50 transition-colors">
                  Edit
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const SuperAdminDashboard = () => {
  const location = useLocation();
  const currentPath = location.pathname.split('/').pop() || 'overview';
  
  const navigation = [
    { name: 'Overview', path: 'overview' },
    { name: 'Users', path: 'users' },
    { name: 'Entities', path: 'entities' },
    { name: 'Verifications', path: 'verifications' },
    { name: 'Content', path: 'content' },
    { name: 'News', path: 'news' },
    { name: 'Reports', path: 'reports' },
    { name: 'Settings', path: 'settings' }
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sidebar Navigation */}
        <div className="lg:w-64">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-dark mb-4">Super Admin</h3>
            <nav className="space-y-2">
              {navigation.map((item) => (
                <Link
                  key={item.path}
                  to={`/super-admin/${item.path}`}
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
            <Route path="users" element={<UsersSection />} />
            <Route path="entities" element={<EntitiesSection />} />
            <Route path="verifications" element={<div>Verifications section coming soon...</div>} />
            <Route path="content" element={<div>Content moderation section coming soon...</div>} />
            <Route path="reports" element={<div>Reports section coming soon...</div>} />
            <Route path="settings" element={<div>Platform settings section coming soon...</div>} />
            <Route path="" element={<OverviewSection />} />
          </Routes>
        </div>
      </div>
    </div>
  );
};

export default SuperAdminDashboard;