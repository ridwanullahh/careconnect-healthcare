// HMS Dashboard - Hospital Management System Main Dashboard
import React, { useState, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { useAuth } from '../../lib/auth';
import { githubDB as dbHelpers, collections } from '../../lib/database';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
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

interface HmsStats {
  activePatients: number;
  todaysEncounters: number;
  pendingEncounters: number;
  bedOccupancy: number;
  bedsAvailable: number;
  totalBeds: number;
  pendingLabResults: number;
  urgentLabResults: number;
}

interface AdmissionRecord {
  id: string;
  encounter_code?: string;
  patient_id: string;
  chief_complaint?: string;
  type?: string;
  status?: string;
  actual_start?: string;
  scheduled_start?: string;
}

interface UrgentItem {
  id: string;
  label: string;
  detail: string;
  badge: 'Urgent' | 'Pending' | 'Critical';
}

const isToday = (iso?: string) => {
  if (!iso) return false;
  const d = new Date(iso);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
};

const HMSOverview = () => {
  const { user } = useAuth();
  const entityId = user?.entity_id || null;
  const [stats, setStats] = useState<HmsStats | null>(null);
  const [admissions, setAdmissions] = useState<AdmissionRecord[]>([]);
  const [urgentItems, setUrgentItems] = useState<UrgentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!entityId) {
        setIsLoading(false);
        setError('No entity associated with your account.');
        return;
      }
      setIsLoading(true);
      setError(null);
      try {
        // Patients under care at this entity: patient_entity_links for the entity.
        const [links, encounters, beds, labOrders, imagingOrders] = await Promise.all([
          dbHelpers
            .find<any>(collections.patient_entity_links, { entity_id: entityId })
            .catch(() => [] as any[]),
          dbHelpers
            .find<any>(collections.encounters, { entity_id: entityId })
            .catch(() => [] as any[]),
          dbHelpers
            .find<any>(collections.bed_management, { entity_id: entityId })
            .catch(() => [] as any[]),
          dbHelpers
            .find<any>(collections.lab_orders, { entity_id: entityId })
            .catch(() => [] as any[]),
          dbHelpers
            .find<any>(collections.imaging_orders, { entity_id: entityId })
            .catch(() => [] as any[]),
        ]);

        const activePatients = links.filter((l: any) => l.status === 'active' || !l.status).length;

        const todaysEncounters = encounters.filter((e: any) =>
          isToday(e.actual_start) || isToday(e.scheduled_start),
        ).length;
        const pendingEncounters = encounters.filter(
          (e: any) =>
            e.status === 'scheduled' ||
            e.status === 'in_progress' ||
            e.status === 'pending',
        ).length;

        const totalBeds = beds.length;
        const occupiedBeds = beds.filter((b: any) => b.status === 'occupied').length;
        const bedsAvailable = totalBeds - occupiedBeds;
        const bedOccupancy = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0;

        const pendingLabSet = labOrders.filter(
          (l: any) => l.status !== 'completed' && l.status !== 'cancelled',
        );
        const pendingLabResults = pendingLabSet.length;
        const urgentLabResults = pendingLabSet.filter(
          (l: any) => l.priority === 'urgent' || l.priority === 'emergency',
        ).length;

        if (cancelled) return;
        setStats({
          activePatients,
          todaysEncounters,
          pendingEncounters,
          bedOccupancy,
          bedsAvailable,
          totalBeds,
          pendingLabResults,
          urgentLabResults,
        });

        // Recent admissions: encounters ordered by start time, newest first,
        // restricted to in-progress / scheduled / emergency types.
        const sortedEncounters = encounters
          .slice()
          .sort(
            (a: any, b: any) =>
              new Date(b.actual_start || b.scheduled_start || 0).getTime() -
              new Date(a.actual_start || a.scheduled_start || 0).getTime(),
          )
          .slice(0, 5);
        setAdmissions(sortedEncounters);

        // Urgent items: pending lab orders with urgent priority, urgent imaging
        // orders, and any in-progress encounters (potential discharge pending).
        const items: UrgentItem[] = [];
        for (const l of pendingLabSet) {
          if (l.priority === 'urgent' || l.priority === 'emergency') {
            items.push({
              id: l.id,
              label: 'Critical Lab Order',
              detail: `Order ${l.order_number || l.id}`,
              badge: 'Urgent',
            });
          }
        }
        for (const img of imagingOrders) {
          if (
            img.status !== 'completed' &&
            img.status !== 'cancelled' &&
            (img.priority === 'urgent' || img.priority === 'emergency')
          ) {
            items.push({
              id: img.id,
              label: 'Urgent Imaging Order',
              detail: `Order ${img.order_number || img.id}`,
              badge: 'Urgent',
            });
          }
        }
        for (const e of encounters) {
          if (e.status === 'in_progress') {
            items.push({
              id: e.id,
              label: 'Discharge Pending',
              detail: `Encounter ${e.encounter_code || e.id}`,
              badge: 'Pending',
            });
          }
        }
        setUrgentItems(items.slice(0, 5));
      } catch (err) {
        console.error('Failed to load HMS overview', err);
        if (!cancelled) setError('Unable to load HMS overview data.');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [entityId]);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Hospital Management System</h1>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 text-sm">
          {error}
        </div>
      )}

      {isLoading ? (
        <LoadingSpinner size="lg" text="Loading HMS overview..." />
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-sm font-medium text-gray-500 mb-2">Active Patients</h3>
              <p className="text-3xl font-bold text-primary">
                {stats ? stats.activePatients.toLocaleString() : 'N/A'}
              </p>
              <p className="text-sm text-gray-500 mt-1">Linked to this entity</p>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-sm font-medium text-gray-500 mb-2">Today's Encounters</h3>
              <p className="text-3xl font-bold text-primary">
                {stats ? stats.todaysEncounters.toLocaleString() : 'N/A'}
              </p>
              <p className="text-sm text-blue-600 mt-1">
                {stats ? `${stats.pendingEncounters} pending` : ''}
              </p>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-sm font-medium text-gray-500 mb-2">Bed Occupancy</h3>
              <p className="text-3xl font-bold text-primary">
                {stats ? `${stats.bedOccupancy}%` : 'N/A'}
              </p>
              <p className="text-sm text-orange-600 mt-1">
                {stats ? `${stats.bedsAvailable} of ${stats.totalBeds} beds available` : ''}
              </p>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-sm font-medium text-gray-500 mb-2">Pending Lab Results</h3>
              <p className="text-3xl font-bold text-primary">
                {stats ? stats.pendingLabResults.toLocaleString() : 'N/A'}
              </p>
              <p className="text-sm text-red-600 mt-1">
                {stats ? `${stats.urgentLabResults} urgent` : ''}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold mb-4">Recent Encounters</h3>
              {admissions.length === 0 ? (
                <p className="text-gray-500 text-sm py-4">No recent encounters found.</p>
              ) : (
                <div className="space-y-3">
                  {admissions.map((enc) => {
                    const start = enc.actual_start || enc.scheduled_start;
                    return (
                      <div
                        key={enc.id}
                        className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0"
                      >
                        <div>
                          <p className="font-medium">
                            {enc.encounter_code || `Encounter ${enc.id.slice(-6)}`}
                          </p>
                          <p className="text-sm text-gray-500">
                            {enc.chief_complaint || enc.type || 'Encounter'}
                            {start ? ` • ${new Date(start).toLocaleString()}` : ''}
                          </p>
                        </div>
                        <span
                          className={`px-2 py-1 rounded-full text-xs ${
                            enc.status === 'in_progress'
                              ? 'bg-yellow-100 text-yellow-800'
                              : enc.status === 'completed'
                                ? 'bg-gray-100 text-gray-700'
                                : 'bg-green-100 text-green-800'
                          }`}
                        >
                          {enc.status || 'Unknown'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold mb-4">Urgent Items</h3>
              {urgentItems.length === 0 ? (
                <p className="text-gray-500 text-sm py-4">No urgent items right now.</p>
              ) : (
                <div className="space-y-3">
                  {urgentItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0"
                    >
                      <div>
                        <p className="font-medium">{item.label}</p>
                        <p className="text-sm text-gray-500">{item.detail}</p>
                      </div>
                      <span
                        className={`px-2 py-1 rounded-full text-xs ${
                          item.badge === 'Urgent'
                            ? 'bg-red-100 text-red-800'
                            : item.badge === 'Critical'
                              ? 'bg-red-200 text-red-900'
                              : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {item.badge}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default HMSDashboard;