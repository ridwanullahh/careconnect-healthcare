// HMS Dashboard - Hospital Management System Main Dashboard
import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { useAuth } from '../../lib/auth';
import PatientRegistry from './PatientRegistry';
import EncounterBoard from './EncounterBoard';
import LabOrdersPage from './LabOrdersPage';
import ImagingOrdersPage from './ImagingOrdersPage';
import PharmacyDispensePage from './PharmacyDispensePage';
import BillingPage from './BillingPage';
import BedManagementPage from './BedManagementPage';
import ReferralsPage from './ReferralsPage';
import ReportsHMS from './ReportsHMS';
import CarePlansPage from './CarePlansPage';

const HMSDashboard = () => {
  const { user } = useAuth();

  // Ensure user has access to HMS
  const hasHMSAccess = user && ['health_center', 'hospital', 'clinic'].includes(user.user_type);

  if (!hasHMSAccess) {
    return (
      <div className="text-center py-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h2>
        <p className="text-gray-600">You don't have access to the Hospital Management System.</p>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="patients" element={<PatientRegistry />} />
      <Route path="encounters" element={<EncounterBoard />} />
      <Route path="labs" element={<LabOrdersPage />} />
      <Route path="imaging" element={<ImagingOrdersPage />} />
      <Route path="pharmacy" element={<PharmacyDispensePage />} />
      <Route path="billing" element={<BillingPage />} />
      <Route path="beds" element={<BedManagementPage />} />
      <Route path="referrals" element={<ReferralsPage />} />
      <Route path="reports" element={<ReportsHMS />} />
      <Route path="care-plans" element={<CarePlansPage />} />
      <Route path="" element={<HMSOverview />} />
    </Routes>
  );
};

const HMSOverview = () => {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Hospital Management System</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Active Patients</h3>
          <p className="text-3xl font-bold text-primary">1,247</p>
          <p className="text-sm text-green-600 mt-1">+12% this week</p>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Today's Encounters</h3>
          <p className="text-3xl font-bold text-primary">89</p>
          <p className="text-sm text-blue-600 mt-1">15 pending</p>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Bed Occupancy</h3>
          <p className="text-3xl font-bold text-primary">85%</p>
          <p className="text-sm text-orange-600 mt-1">12 beds available</p>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Pending Lab Results</h3>
          <p className="text-3xl font-bold text-primary">23</p>
          <p className="text-sm text-red-600 mt-1">5 urgent</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold mb-4">Recent Admissions</h3>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0">
                <div>
                  <p className="font-medium">Patient #{1000 + i}</p>
                  <p className="text-sm text-gray-500">Admitted 2 hours ago</p>
                </div>
                <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">
                  Active
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold mb-4">Urgent Items</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <div>
                <p className="font-medium">Critical Lab Results</p>
                <p className="text-sm text-gray-500">Patient #1025</p>
              </div>
              <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs">
                Urgent
              </span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <div>
                <p className="font-medium">Discharge Pending</p>
                <p className="text-sm text-gray-500">Patient #1018</p>
              </div>
              <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs">
                Pending
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HMSDashboard;