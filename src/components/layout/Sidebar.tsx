// Sidebar Component for CareConnect Dashboard
import React from 'react';
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
  Database
} from 'lucide-react';

const Sidebar: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) return null;

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
        return [
          { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
          { name: 'Entity Details', href: '/admin/details', icon: Building },
          { name: 'Locations', href: '/admin/locations', icon: Building },
          { name: 'Team & Staff', href: '/admin/team', icon: Users },
          { name: 'Services & Booking', href: '/admin/services', icon: Calendar },
          { name: 'Coaching Programs', href: '/admin/coaching', icon: UserCheck },
          { name: 'Courses & LMS', href: '/admin/lms', icon: GraduationCap },
          { name: 'Blog & News', href: '/admin/blog', icon: FileText },
          { name: 'Causes', href: '/admin/causes', icon: Heart },
          { name: 'E-commerce', href: '/admin/ecommerce', icon: ShoppingCart },
          { name: 'Reviews & Ratings', href: '/admin/reviews', icon: Heart },
          { name: 'Messages', href: '/admin/messages', icon: MessageSquare },
          { name: 'Analytics', href: '/admin/analytics', icon: BarChart3 },
          { name: 'Integrations', href: '/admin/integrations', icon: Settings },
          { name: 'Billing & Plans', href: '/admin/billing', icon: CreditCard },
        ];
        
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
    <div className="fixed left-0 top-16 bottom-0 w-64 bg-white border-r border-gray-200 overflow-y-auto z-40">
      <div className="p-4">
        {/* User Info */}
        <div className="mb-6 p-3 bg-light rounded-lg">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
              <Stethoscope className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-dark truncate">
                {user.profile ? `${user.profile.first_name} ${user.profile.last_name}` : user.email.split('@')[0]}
              </p>
              <p className="text-xs text-gray-500 capitalize">
                {user.user_type.replace('_', ' ')}
              </p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="space-y-1">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.href || 
                           (item.href !== '/' && location.pathname.startsWith(item.href));
            
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-primary text-white'
                    : 'text-gray-700 hover:bg-light hover:text-primary'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Quick Actions */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Quick Actions
          </h4>
          <div className="space-y-1">
            {user.user_type === UserType.PUBLIC_USER ? (
              <>
                <Link
                  to="/directory"
                  className="flex items-center space-x-3 px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-light hover:text-primary"
                >
                  <Calendar className="w-4 h-4" />
                  <span>Book Appointment</span>
                </Link>
                <Link
                  to="/health-tools"
                  className="flex items-center space-x-3 px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-light hover:text-primary"
                >
                  <Heart className="w-4 h-4" />
                  <span>Health Check</span>
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
            className="flex items-center space-x-3 px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-light hover:text-primary"
          >
            <HelpCircle className="w-4 h-4" />
            <span>Help & Support</span>
          </Link>
          
          {/* Notification Center */}
          <button className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-light hover:text-primary mt-1">
            <Bell className="w-4 h-4" />
            <span>Notifications</span>
            <span className="ml-auto bg-red-500 text-white text-xs rounded-full px-2 py-1">3</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
