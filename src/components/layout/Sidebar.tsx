// Responsive Collapsible Sidebar Component for CareConnect Dashboard
import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth, UserType } from '../../lib/auth';
import {
  LayoutDashboard,
  Users,
  Calendar,
  MessageSquare,
  Settings,
  Heart,
  GraduationCap,
  ShoppingCart,
  BarChart3,
  FileText,
  Bell,
  HelpCircle,
  CreditCard,
  UserCheck,
  Building,
  Stethoscope,
  Shield,
  Database,
  Menu,
  X,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

const Sidebar: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  if (!user) return null;

  // Handle responsive behavior
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setIsCollapsed(true);
        setIsMobileOpen(false);
      } else {
        setIsCollapsed(false);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const getNavigationItems = () => {
    switch (user.user_type) {
      case UserType.PUBLIC_USER:
        return [
          { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
          { name: 'My Health Tools', href: '/dashboard/tools', icon: Heart },
          { name: 'My Bookings', href: '/dashboard/bookings', icon: Calendar },
          { name: 'My Courses', href: '/dashboard/courses', icon: GraduationCap },
          { name: 'My Orders', href: '/dashboard/orders', icon: ShoppingCart },
          { name: 'My Causes', href: '/dashboard/causes', icon: Heart },
          { name: 'Messages', href: '/dashboard/messages', icon: MessageSquare },
          { name: 'Profile Settings', href: '/dashboard/profile', icon: Settings },
        ];
        
      case UserType.HEALTH_CENTER:
      case UserType.PHARMACY:
      case UserType.PRACTITIONER:
        const entityItems = [
          { name: 'Dashboard', href: '/dashboard/entity/overview', icon: LayoutDashboard },
          { name: 'Entity Details', href: '/dashboard/entity/details', icon: Building },
          { name: 'Locations', href: '/dashboard/entity/locations', icon: Building },
          { name: 'Team & Staff', href: '/dashboard/entity/team', icon: Users },
          { name: 'Services & Booking', href: '/dashboard/entity/services', icon: Calendar },
          { name: 'Coaching Programs', href: '/dashboard/entity/coaching', icon: UserCheck },
          { name: 'Courses & LMS', href: '/dashboard/entity/lms', icon: GraduationCap },
          { name: 'Blog', href: '/dashboard/entity/blog', icon: FileText },
          { name: 'Causes', href: '/dashboard/entity/causes', icon: Heart },
          { name: 'E-commerce', href: '/dashboard/entity/ecommerce', icon: ShoppingCart },
          { name: 'Reviews & Ratings', href: '/dashboard/entity/reviews', icon: Heart },
          { name: 'Messages', href: '/dashboard/entity/messages', icon: MessageSquare },
          { name: 'Analytics', href: '/dashboard/entity/analytics', icon: BarChart3 },
          { name: 'Integrations', href: '/dashboard/entity/integrations', icon: Settings },
          { name: 'Billing & Plans', href: '/dashboard/entity/billing', icon: CreditCard },
        ];

        // Add HMS items for healthcare entities
        const isHealthcareEntity = ['health_center', 'hospital', 'clinic'].includes(user.user_type);
        if (isHealthcareEntity) {
          const hmsItems = [
            { name: '── HMS ──', href: '', icon: Stethoscope, isHeader: true },
            { name: 'Patient Registry', href: '/dashboard/hms/patients', icon: Users },
            { name: 'Encounters', href: '/dashboard/hms/encounters', icon: Calendar },
            { name: 'Lab Orders', href: '/dashboard/hms/labs', icon: FileText },
            { name: 'Imaging Orders', href: '/dashboard/hms/imaging', icon: FileText },
            { name: 'Pharmacy', href: '/dashboard/hms/pharmacy', icon: Heart },
            { name: 'Billing (HMS)', href: '/dashboard/hms/billing', icon: CreditCard },
            { name: 'Bed Management', href: '/dashboard/hms/beds', icon: Building },
            { name: 'Referrals', href: '/dashboard/hms/referrals', icon: Users },
            { name: 'Reports (HMS)', href: '/dashboard/hms/reports', icon: BarChart3 },
          ];
          entityItems.splice(1, 0, ...hmsItems);
        }

        return entityItems;
        
      case UserType.SUPER_ADMIN:
        return [
          { name: 'Overview', href: '/super-admin', icon: LayoutDashboard },
          { name: 'User Management', href: '/super-admin/users', icon: Users },
          { name: 'Entity Directory', href: '/super-admin/entities', icon: Building },
          { name: 'Verification Queue', href: '/super-admin/verification', icon: UserCheck },
          { name: 'Content Moderation', href: '/super-admin/moderation', icon: Shield },
          { name: 'Financial Management', href: '/super-admin/finance', icon: CreditCard },
          { name: 'System Analytics', href: '/super-admin/analytics', icon: BarChart3 },
          { name: 'Platform Settings', href: '/super-admin/settings', icon: Settings },
          { name: 'Database Admin', href: '/super-admin/database', icon: Database },
          { name: 'Support Center', href: '/super-admin/support', icon: HelpCircle },
        ];
        
      default:
        return [];
    }
  };

  const navigationItems = getNavigationItems();

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-lg shadow-lg border"
      >
        {isMobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed left-0 top-16 bottom-0 bg-white border-r border-gray-200 overflow-y-auto z-40 transition-all duration-300
        ${isCollapsed ? 'w-16' : 'w-64'}
        ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Collapse Toggle Button (Desktop) */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="hidden lg:block absolute -right-3 top-6 bg-white border border-gray-200 rounded-full p-1 shadow-sm hover:shadow-md transition-shadow"
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>

        <div className="p-4">
        {/* User Info */}
        <div className={`mb-6 p-3 bg-light rounded-lg ${isCollapsed ? 'text-center' : ''}`}>
          <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'space-x-3'}`}>
            <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
              <Stethoscope className="w-5 h-5 text-white" />
            </div>
            {!isCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-dark truncate">
                  {user.profile ? `${user.profile.first_name} ${user.profile.last_name}` : user.email.split('@')[0]}
                </p>
                <p className="text-xs text-gray-500 capitalize">
                  {user.user_type.replace('_', ' ')}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="space-y-1">
          {navigationItems.map((item: any) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.href || 
                           (item.href !== '/' && item.href !== '' && location.pathname.startsWith(item.href));
            
            // Render headers differently
            if (item.isHeader) {
              return (
                <div key={item.name} className={`px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wide ${isCollapsed ? 'text-center' : ''}`}>
                  {!isCollapsed && item.name}
                  {isCollapsed && <Icon className="w-4 h-4 mx-auto" />}
                </div>
              );
            }
            
            return (
              <Link
                key={item.name}
                to={item.href}
                onClick={() => setIsMobileOpen(false)} // Close mobile menu on navigation
                className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors group relative ${
                  isCollapsed ? 'justify-center' : 'space-x-3'
                } ${
                  isActive
                    ? 'bg-primary text-white'
                    : 'text-gray-700 hover:bg-light hover:text-primary'
                }`}
                title={isCollapsed ? item.name : ''}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                {!isCollapsed && <span>{item.name}</span>}
                
                {/* Tooltip for collapsed state */}
                {isCollapsed && (
                  <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50">
                    {item.name}
                  </div>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Quick Actions */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          {!isCollapsed && (
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Quick Actions
            </h4>
          )}
          <div className="space-y-1">
            {user.user_type === UserType.PUBLIC_USER ? (
              <>
                <Link
                  to="/directory"
                  className={`flex items-center px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-light hover:text-primary group relative ${
                    isCollapsed ? 'justify-center' : 'space-x-3'
                  }`}
                  title={isCollapsed ? 'Book Appointment' : ''}
                >
                  <Calendar className="w-4 h-4 flex-shrink-0" />
                  {!isCollapsed && <span>Book Appointment</span>}
                  {isCollapsed && (
                    <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50">
                      Book Appointment
                    </div>
                  )}
                </Link>
                <Link
                  to="/health-tools"
                  className={`flex items-center px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-light hover:text-primary group relative ${
                    isCollapsed ? 'justify-center' : 'space-x-3'
                  }`}
                  title={isCollapsed ? 'Health Check' : ''}
                >
                  <Heart className="w-4 h-4 flex-shrink-0" />
                  {!isCollapsed && <span>Health Check</span>}
                  {isCollapsed && (
                    <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50">
                      Health Check
                    </div>
                  )}
                </Link>
              </>
            ) : (
              <>
                <Link
                  to="/admin/services/new"
                  className="flex items-center space-x-3 px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-light hover:text-primary"
                >
                  <Calendar className="w-4 h-4" />
                  <span>Add Service</span>
                </Link>
                <Link
                  to="/admin/analytics"
                  className="flex items-center space-x-3 px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-light hover:text-primary"
                >
                  <BarChart3 className="w-4 h-4" />
                  <span>View Analytics</span>
                </Link>
              </>
            )}
          </div>
        </div>

        {/* Help & Support */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <Link
            to="/help"
            className={`flex items-center px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-light hover:text-primary group relative ${
              isCollapsed ? 'justify-center' : 'space-x-3'
            }`}
            title={isCollapsed ? 'Help & Support' : ''}
          >
            <HelpCircle className="w-4 h-4 flex-shrink-0" />
            {!isCollapsed && <span>Help & Support</span>}
            {isCollapsed && (
              <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50">
                Help & Support
              </div>
            )}
          </Link>
          
          {/* Notification Center */}
          <button className={`w-full flex items-center px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-light hover:text-primary mt-1 group relative ${
            isCollapsed ? 'justify-center' : 'space-x-3'
          }`}
          title={isCollapsed ? 'Notifications' : ''}
          >
            <Bell className="w-4 h-4 flex-shrink-0" />
            {!isCollapsed && (
              <>
                <span>Notifications</span>
                <span className="ml-auto bg-red-500 text-white text-xs rounded-full px-2 py-1">3</span>
              </>
            )}
            {isCollapsed && (
              <>
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">3</span>
                <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50">
                  Notifications
                </div>
              </>
            )}
          </button>
        </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
