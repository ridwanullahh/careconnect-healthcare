import { useState, useEffect } from 'react';
import { useToastService } from '../../lib/toast-service';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../lib/auth';
import { githubDB, collections } from '../../lib/database';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

// Dashboard sections
const OverviewSection = () => {
  const toast = useToastService();
  const { user } = useAuth();
  const [stats, setStats] = useState({
    appointments: 0,
    courses: 0,
    tools: 0,
    donations: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      if (!user) return;
      try {
        const [appointments, courses, tools, donations] = await Promise.all([
          githubDB.find(collections.bookings, { patient_id: user.id }),
          githubDB.find(collections.course_enrollments, { user_id: user.id }),
          githubDB.find(collections.tool_results, { user_id: user.id }),
          githubDB.find(collections.donations, { user_id: user.id }),
        ]);
        setStats({
          appointments: appointments.length,
          courses: courses.length,
          tools: tools.length,
          donations: donations.reduce((acc, d) => acc + d.amount, 0),
        });
      } catch (error) {
        console.error("Failed to fetch dashboard stats:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchStats();
  }, [user]);

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-dark">Dashboard Overview</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Stats Cards */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Total Appointments</h3>
          <p className="text-3xl font-bold text-primary">{stats.appointments}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Courses Enrolled</h3>
          <p className="text-3xl font-bold text-accent">{stats.courses}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Health Tools Used</h3>
          <p className="text-3xl font-bold text-primary">{stats.tools}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Total Donations</h3>
          <p className="text-3xl font-bold text-accent">${stats.donations}</p>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold text-dark mb-4">Recent Activity</h3>
        <div className="space-y-4">
          <p className="text-gray-500">Recent activity feed coming soon...</p>
        </div>
      </div>
    </div>
  );
};

const ProfileSection = () => {
  const { user, profile, updateProfile } = useAuth();
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (profile) {
      setFormData({
        first_name: profile.first_name || '',
        last_name: profile.last_name || '',
      });
    }
  }, [profile]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const success = await updateProfile({
      first_name: formData.first_name,
      last_name: formData.last_name,
    });

    if (success) {
      toast.showSuccess('Profile updated successfully!');
    } else {
      toast.showSuccess('Failed to update profile.');
    }
    setIsLoading(false);
  };
  
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-dark">My Profile</h2>
      
      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm p-6">
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
              Phone
            </label>
            <input
              type="tel"
              value={user?.phone || ''}
              disabled
              className="w-full p-3 border border-gray-300 rounded-lg bg-gray-50"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              First Name
            </label>
            <input
              type="text"
              name="first_name"
              value={formData.first_name}
              onChange={handleInputChange}
              placeholder="Enter your first name"
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Last Name
            </label>
            <input
              type="text"
              name="last_name"
              value={formData.last_name}
              onChange={handleInputChange}
              placeholder="Enter your last name"
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Date of Birth
            </label>
            <input
              type="date"
              disabled
              className="w-full p-3 border border-gray-300 rounded-lg bg-gray-50"
            />
          </div>
        </div>
        
        <div className="mt-6">
          <button
            type="submit"
            disabled={isLoading}
            className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {isLoading ? 'Updating...' : 'Update Profile'}
          </button>
        </div>
      </form>
    </div>
  );
};

const AppointmentsSection = () => {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchAppointments = async () => {
      if (!user) return;
      try {
        const userAppointments = await githubDB.find(collections.bookings, { patient_id: user.id });
        setAppointments(userAppointments);
      } catch (error) {
        console.error("Failed to fetch appointments:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchAppointments();
  }, [user]);

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-dark">My Appointments</h2>
      
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="space-y-4">
          {appointments.length === 0 ? (
            <p>You have no upcoming appointments.</p>
          ) : (
            appointments.map(appointment => (
              <div key={appointment.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-dark">{appointment.serviceName}</h3>
                    <p className="text-gray-600">{appointment.entityName}</p>
                    <p className="text-sm text-gray-500">{new Date(appointment.date).toLocaleDateString()} at {appointment.time}</p>
                  </div>
                  <span className={`px-2 py-1 rounded text-sm ${
                    appointment.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                    appointment.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {appointment.status}
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
            ))
          )}
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
          <p className="text-gray-500">Recent tool results coming soon...</p>
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

const CoursesSection = () => {
  const { user } = useAuth();
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchCourses = async () => {
      if (!user) return;
      try {
        const userEnrollments = await githubDB.find(collections.course_enrollments, { user_id: user.id });
        setEnrollments(userEnrollments);

        if (userEnrollments.length > 0) {
          const courseIds = userEnrollments.map(e => e.courseId);
          const allCourses = await githubDB.find(collections.courses, {});
          const userCourses = allCourses.filter(c => courseIds.includes(c.id));
          setCourses(userCourses);
        }
      } catch (error) {
        console.error("Failed to fetch enrolled courses:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchCourses();
  }, [user]);

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-dark">My Courses</h2>
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="space-y-4">
          {enrollments.length === 0 ? (
            <p>You are not enrolled in any courses.</p>
          ) : (
            enrollments.map(enrollment => {
              const course = courses.find(c => c.id === enrollment.courseId);
              if (!course) return null;
              return (
                <div key={enrollment.id} className="border border-gray-200 rounded-lg p-4">
                  <h3 className="font-semibold text-dark">{course.title}</h3>
                  <p className="text-sm text-gray-600">Progress: {enrollment.progress_percentage}%</p>
                  <Link to={`/courses/${course.id}/learn`} className="text-primary hover:underline text-sm">
                    Continue Learning
                  </Link>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

const OrdersSection = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchOrders = async () => {
      if (!user) return;
      try {
        const userOrders = await githubDB.find(collections.orders, { user_id: user.id });
        setOrders(userOrders);
      } catch (error) {
        console.error("Failed to fetch orders:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchOrders();
  }, [user]);

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-dark">My Orders</h2>
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="space-y-4">
          {orders.length === 0 ? (
            <p>You have no orders.</p>
          ) : (
            orders.map(order => (
              <div key={order.id} className="border border-gray-200 rounded-lg p-4">
                <h3 className="font-semibold text-dark">Order #{order.id}</h3>
                <p className="text-sm text-gray-600">Total: ${order.total_amount}</p>
                <p className="text-sm text-gray-600">Status: {order.status}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

const DonationsSection = () => {
  const { user } = useAuth();
  const [donations, setDonations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDonations = async () => {
      if (!user) return;
      try {
        const userDonations = await githubDB.find(collections.donations, { user_id: user.id });
        setDonations(userDonations);
      } catch (error) {
        console.error("Failed to fetch donations:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchDonations();
  }, [user]);

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-dark">My Donations</h2>
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="space-y-4">
          {donations.length === 0 ? (
            <p>You have not made any donations.</p>
          ) : (
            donations.map(donation => (
              <div key={donation.id} className="border border-gray-200 rounded-lg p-4">
                <h3 className="font-semibold text-dark">Donation to {donation.causeName}</h3>
                <p className="text-sm text-gray-600">Amount: ${donation.amount}</p>
                <p className="text-sm text-gray-600">Date: {new Date(donation.date).toLocaleDateString()}</p>
              </div>
            ))
          )}
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
            <Route path="courses" element={<CoursesSection />} />
            <Route path="orders" element={<OrdersSection />} />
            <Route path="donations" element={<DonationsSection />} />
            <Route path="" element={<OverviewSection />} />
          </Routes>
        </div>
      </div>
    </div>
  );
};

export default PublicDashboard;