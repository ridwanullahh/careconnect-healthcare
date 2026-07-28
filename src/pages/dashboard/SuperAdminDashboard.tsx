import { useState, useEffect } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { apiClient } from '../../lib/api-client';
import { githubDB as dbHelpers, collections } from '../../lib/database';
import KeyManagementModule from '../../components/admin/KeyManagementModule';
import SystemMonitoringModule from '../../components/admin/SystemMonitoringModule';

interface OverviewStats {
  users: number;
  entities: number;
  patients: number;
  bookings: number;
  orders: number;
  causes: number;
  courses: number;
  revenue: number;
  pendingVerifications: number;
}

interface AuditLog {
  id: string;
  action: string;
  entity_type?: string;
  entity_id?: string;
  user_email?: string;
  details?: string;
  created_at: string;
}

interface EntityRecord {
  id: string;
  name: string;
  entity_type: string;
  verification_status?: string;
  is_active?: boolean;
  created_at?: string;
}

const StatCard = ({
  label,
  value,
  subtitle,
  subtitleColor = 'text-gray-500',
  valueColor = 'text-primary',
  isLoading,
  error,
}: {
  label: string;
  value: string | number;
  subtitle?: string;
  subtitleColor?: string;
  valueColor?: string;
  isLoading: boolean;
  error: boolean;
}) => {
  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h3 className="text-sm font-medium text-gray-500 mb-2">{label}</h3>
      {isLoading ? (
        <div className="h-9 w-20 bg-gray-200 rounded animate-pulse" />
      ) : error ? (
        <p className="text-3xl font-bold text-red-500">N/A</p>
      ) : (
        <p className={`text-3xl font-bold ${valueColor}`}>{value}</p>
      )}
      {subtitle && <p className={`text-sm ${subtitleColor} mt-1`}>{subtitle}</p>}
    </div>
  );
};

const OverviewSection = () => {
  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [pendingEntities, setPendingEntities] = useState<EntityRecord[]>([]);
  const [recentLogs, setRecentLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // Fetch primary counts via the admin stats endpoint (users, entities,
        // patients, bookings, orders, causes, courses). Fall back to direct
        // collection reads if the admin endpoint is unavailable.
        let primaryCounts: Record<string, number> = {};
        try {
          primaryCounts = await apiClient.getStats();
        } catch (err) {
          console.warn('getStats failed, falling back to dbHelpers', err);
          const [users, entities, patients, bookings, orders, causes, courses] =
            await Promise.all([
              dbHelpers.get(collections.users),
              dbHelpers.get(collections.entities),
              dbHelpers.get(collections.patients),
              dbHelpers.get(collections.bookings),
              dbHelpers.get(collections.orders),
              dbHelpers.get(collections.causes),
              dbHelpers.get(collections.courses),
            ]);
          primaryCounts = {
            users: users.length,
            entities: entities.length,
            patients: patients.length,
            bookings: bookings.length,
            orders: orders.length,
            causes: causes.length,
            courses: courses.length,
          };
        }

        // Compute platform revenue from completed encounters (final_cost) and
        // paid orders (total_amount) — whichever exist. Falls back to 0.
        let revenue = 0;
        try {
          const encounters = await dbHelpers.get(collections.encounters);
          const orderDocs = await dbHelpers.get(collections.orders);
          revenue =
            encounters.reduce(
              (sum: number, e: any) => sum + (typeof e.final_cost === 'number' ? e.final_cost : 0),
              0,
            ) +
            orderDocs.reduce(
              (sum: number, o: any) =>
                sum +
                (typeof o.total_amount === 'number' && o.status === 'paid'
                  ? o.total_amount
                  : 0),
              0,
            );
        } catch (err) {
          console.warn('Revenue computation failed', err);
        }

        // Pending entity verifications: entities with verification_status = 'pending'.
        let pending: EntityRecord[] = [];
        try {
          pending = await dbHelpers.find<EntityRecord>(collections.entities, {
            verification_status: 'pending',
          });
        } catch (err) {
          console.warn('Pending verifications fetch failed', err);
        }

        // Recent platform activity from audit logs (newest first).
        let logs: AuditLog[] = [];
        try {
          logs = await apiClient.getAuditLogs();
          logs = (logs || [])
            .slice()
            .sort(
              (a, b) =>
                new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
            )
            .slice(0, 5);
        } catch (err) {
          console.warn('Audit logs fetch failed', err);
        }

        if (cancelled) return;
        setStats({
          users: primaryCounts.users || 0,
          entities: primaryCounts.entities || 0,
          patients: primaryCounts.patients || 0,
          bookings: primaryCounts.bookings || 0,
          orders: primaryCounts.orders || 0,
          causes: primaryCounts.causes || 0,
          courses: primaryCounts.courses || 0,
          revenue,
          pendingVerifications: pending.length,
        });
        setPendingEntities(pending.slice(0, 5));
        setRecentLogs(logs);
      } catch (err) {
        console.error('Failed to load super admin overview', err);
        if (!cancelled) setError('Unable to load dashboard data.');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const formatNumber = (n: number) => n.toLocaleString();
  const formatCurrency = (n: number) =>
    n >= 1000
      ? `$${(n / 1000).toFixed(1)}K`
      : `$${n.toLocaleString()}`;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-dark">Super Admin Dashboard</h2>
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          label="Total Users"
          value={stats ? formatNumber(stats.users) : ''}
          subtitle="Real-time count"
          subtitleColor="text-blue-600"
          valueColor="text-primary"
          isLoading={isLoading}
          error={!!error && !stats}
        />
        <StatCard
          label="Total Entities"
          value={stats ? formatNumber(stats.entities) : ''}
          subtitle={stats ? `${stats.pendingVerifications} pending verification` : ''}
          subtitleColor="text-orange-600"
          valueColor="text-accent"
          isLoading={isLoading}
          error={!!error && !stats}
        />
        <StatCard
          label="Platform Revenue"
          value={stats ? formatCurrency(stats.revenue) : ''}
          subtitle="From completed encounters & paid orders"
          subtitleColor="text-gray-500"
          valueColor="text-primary"
          isLoading={isLoading}
          error={!!error && !stats}
        />
        <StatCard
          label="Total Bookings"
          value={stats ? formatNumber(stats.bookings) : ''}
          subtitle="Real-time count"
          subtitleColor="text-blue-600"
          valueColor="text-accent"
          isLoading={isLoading}
          error={!!error && !stats}
        />
      </div>

      {/* Verification Queue */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold text-dark mb-4">
          Pending Verifications
        </h3>
        {isLoading ? (
          <LoadingSpinner size="md" text="Loading verifications..." />
        ) : pendingEntities.length === 0 ? (
          <p className="text-gray-500 text-sm py-4">
            No entities are currently awaiting verification.
          </p>
        ) : (
          <div className="space-y-4">
            {pendingEntities.map((entity) => (
              <div
                key={entity.id}
                className="flex items-center justify-between p-3 bg-yellow-50 border border-yellow-200 rounded-lg"
              >
                <div>
                  <p className="font-medium text-dark">{entity.name}</p>
                  <p className="text-sm text-gray-600">
                    {entity.entity_type}
                    {entity.created_at
                      ? ` • Submitted ${new Date(entity.created_at).toLocaleDateString()}`
                      : ''}
                  </p>
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
            ))}
          </div>
        )}

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
        <h3 className="text-lg font-semibold text-dark mb-4">
          Recent Platform Activity
        </h3>
        {isLoading ? (
          <LoadingSpinner size="md" text="Loading activity..." />
        ) : recentLogs.length === 0 ? (
          <p className="text-gray-500 text-sm py-4">
            No recent activity recorded.
          </p>
        ) : (
          <div className="space-y-4">
            {recentLogs.map((log, idx) => {
              const dotColors = [
                'bg-green-500',
                'bg-blue-500',
                'bg-accent',
                'bg-yellow-500',
                'bg-purple-500',
              ];
              const dotColor = dotColors[idx % dotColors.length];
              const time = new Date(log.created_at).toLocaleString();
              return (
                <div
                  key={log.id}
                  className="flex items-center gap-4 p-3 bg-light rounded-lg"
                >
                  <div className={`w-2 h-2 ${dotColor} rounded-full`}></div>
                  <span className="text-gray-700">
                    {log.details || log.action}
                    {log.user_email ? ` (${log.user_email})` : ''}
                  </span>
                  <span className="text-sm text-gray-500 ml-auto">{time}</span>
                </div>
              );
            })}
          </div>
        )}
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
    { name: 'Key Management', path: 'keys' },
    { name: 'System Monitoring', path: 'monitoring' },
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
            <Route path="keys" element={<KeyManagementModule />} />
            <Route path="monitoring" element={<SystemMonitoringModule />} />
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