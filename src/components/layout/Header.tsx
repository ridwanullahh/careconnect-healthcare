// Enhanced Header with Search Modal and Keyboard Shortcuts
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../lib/auth';
import { useTheme } from '../../lib/theme';
import { UserType } from '../../lib/auth';
import {
  Search,
  Bell,
  User,
  Menu,
  X,
  Heart,
  Stethoscope,
  GraduationCap,
  Calendar,
  ShoppingCart,
  LogOut,
  Sun,
  Moon,
  Settings,
  Headphones,
  Newspaper
} from 'lucide-react';
import SearchModal from '../ui/SearchModal';
import ThemeToggle from '../ui/ThemeToggle';

const Header: React.FC = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [showMegaMenu, setShowMegaMenu] = useState<string | null>(null);

  // Setup keyboard shortcut for search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if cmd/ctrl + k is pressed
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchModalOpen(true);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    
    // Custom event for components to trigger search
    const handleOpenSearch = () => setIsSearchModalOpen(true);
    window.addEventListener('openSearch', handleOpenSearch);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('openSearch', handleOpenSearch);
    };
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/');
    setIsProfileMenuOpen(false);
  };

  const handleMegaMenuToggle = (menuName: string | null) => {
    setShowMegaMenu(prevMenu => prevMenu === menuName ? null : menuName);
  };

  const navigation = [
    { 
      name: 'Healthcare Directory', 
      href: '/directory', 
      icon: Stethoscope,
      megaMenu: 'directory',
      items: [
        { name: 'Find Healthcare Providers', href: '/directory' },
        { name: 'Hospitals & Clinics', href: '/directory?type=health_center' },
        { name: 'Pharmacies', href: '/directory?type=pharmacy' },
        { name: 'Specialists', href: '/directory?type=practitioner' },
        { name: 'Telehealth Services', href: '/directory?feature=telehealth' },
        { name: 'Emergency Care', href: '/directory?feature=emergency' },
        { name: 'Maps View', href: '/directory?view=map' },
        { name: 'List View', href: '/directory?view=list' },
      ]
    },
    { 
      name: 'Health Tools', 
      href: '/health-tools', 
      icon: Heart,
      megaMenu: 'tools',
      items: [
        { name: 'All Health Tools', href: '/health-tools' },
        { name: 'AI Symptom Checker', href: '/health-tools/ai-symptom-checker' },
        { name: 'Health Calculators', href: '/health-tools?category=calculators' },
        { name: 'Mental Health', href: '/health-tools?category=mental_wellness' },
        { name: 'Nutrition', href: '/health-tools?category=nutrition' },
        { name: 'Fitness', href: '/health-tools?category=fitness' },
        { name: 'Medication Safety', href: '/health-tools?category=medication_safety' },
        { name: 'Pregnancy & Family', href: '/health-tools?category=maternal_health' },
      ]
    },
    { 
      name: 'Courses & Learning', 
      href: '/courses', 
      icon: GraduationCap,
      megaMenu: 'courses',
      items: [
        { name: 'Browse All Courses', href: '/courses' },
        ...(user && ['health_center', 'pharmacy', 'practitioner'].includes(user.user_type) 
          ? [{ name: 'Create Course', href: '/courses/create' }] 
          : []),
        { name: 'Health Education', href: '/courses?category=Medical%20Fundamentals' },
        { name: 'Patient Care', href: '/courses?category=Patient%20Care' },
        { name: 'Mental Health', href: '/courses?category=Mental%20Health' },
        { name: 'Healthcare Technology', href: '/courses?category=Healthcare%20Technology' },
        { name: 'First Aid & Emergency', href: '/courses?category=Emergency%20Medicine' },
        { name: 'Certifications', href: '/courses?type=certification' },
        { name: 'Free Courses', href: '/courses?price=free' },
      ]
    },
    { 
      name: 'Community', 
      href: '/community', 
      icon: Heart,
      megaMenu: 'community',
      items: [
        { name: 'Healthcare Causes', href: '/causes' },
        { name: 'Forums & Groups', href: '/community' },
        { name: 'Events Calendar', href: '/community/events' },
        { name: 'Volunteer Opportunities', href: '/causes?type=volunteer' },
        { name: 'Support Groups', href: '/community/support-groups' },
        { name: 'HealthTalk Podcast', href: '/health-talk-podcast' },
        { name: 'Health News Feed', href: '/health-news-feed' },
        { name: 'Success Stories', href: '/community/stories' },
      ]
    },
  ];

  return (
    <>
      <header className="bg-white dark:bg-gray-900 shadow-sm border-b border-gray-200 dark:border-gray-700 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center">
              <Link to="/" className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                  <Stethoscope className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold text-dark dark:text-white">CareConnect</span>
              </Link>
            </div>

            {/* Search Button */}
            {/* Search Icon */}
            <div className="flex-1 flex justify-center px-2 lg:ml-6 lg:justify-end">
                <div className="max-w-lg w-full lg:max-w-xs">
                    <label htmlFor="search" className="sr-only">Search</label>
                    <div className="relative">
                        <button
                            onClick={() => setIsSearchModalOpen(true)}
                            className="p-2 rounded-full text-gray-400 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                        >
                            <Search className="h-6 w-6" aria-hidden="true" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center space-x-1">
              {navigation.map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.name} className="relative">
                    <button
                      className={`flex items-center space-x-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${showMegaMenu === item.megaMenu ? 'text-primary bg-light dark:bg-gray-800' : 'text-gray-700 dark:text-gray-300 hover:text-primary hover:bg-light dark:hover:bg-gray-800'}`}
                      onClick={() => handleMegaMenuToggle(item.megaMenu)}
                      aria-expanded={showMegaMenu === item.megaMenu}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{item.name}</span>
                    </button>
                    
                    {/* Mega Menu */}
                    {showMegaMenu === item.megaMenu && item.items && (
                      <div 
                        className="absolute left-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50"
                        onMouseLeave={() => handleMegaMenuToggle(null)}
                      >
                        <div className="p-4 grid grid-cols-1 gap-1">
                          {item.items.map((subItem) => (
                            <Link
                              key={subItem.name}
                              to={subItem.href}
                              className="px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md text-gray-700 dark:text-gray-300 hover:text-primary transition-colors"
                              onClick={() => setShowMegaMenu(null)}
                            >
                              {subItem.name}
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </nav>

            {/* User Actions */}
            <div className="flex items-center space-x-4">
              {/* Theme Toggle */}
              <ThemeToggle className="hidden sm:block" />
              
              {user ? (
                <>
                  {/* Notifications */}
                  <button 
                    className="relative p-2 text-gray-400 hover:text-gray-500 dark:text-gray-300 dark:hover:text-gray-200 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
                    aria-label="Notifications"
                  >
                    <Bell className="w-5 h-5" />
                    <span className="absolute top-1 right-1 block h-2 w-2 rounded-full bg-red-400 ring-2 ring-white dark:ring-gray-900" />
                  </button>

                  {/* Cart (for public users) */}
                  {user.user_type === UserType.PUBLIC_USER && (
                    <Link
                      to="/cart"
                      className="relative p-2 text-gray-400 hover:text-gray-500 dark:text-gray-300 dark:hover:text-gray-200 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
                      aria-label="Shopping cart"
                    >
                      <ShoppingCart className="w-5 h-5" />
                      <span className="absolute -top-1 -right-1 bg-primary text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                        0
                      </span>
                    </Link>
                  )}

                  {/* Profile Menu */}
                  <div className="relative">
                    <button
                      onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                      className="flex items-center space-x-2 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
                      aria-expanded={isProfileMenuOpen}
                      aria-haspopup="true"
                    >
                      <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                        <User className="w-5 h-5 text-white" />
                      </div>
                      <span className="hidden md:block text-sm font-medium text-gray-700 dark:text-gray-300">
                        {getUserDisplayName(user)}
                      </span>
                    </button>

                    {/* Profile Dropdown */}
                    {isProfileMenuOpen && (
                      <div 
                        className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-md shadow-lg py-1 ring-1 ring-black ring-opacity-5 dark:ring-gray-700"
                        role="menu"
                      >
                        <Link
                          to={getDashboardPath(user.user_type)}
                          className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                          onClick={() => setIsProfileMenuOpen(false)}
                          role="menuitem"
                        >
                          <Settings className="w-4 h-4 mr-3" />
                          Dashboard
                        </Link>
                        <Link
                          to="/profile"
                          className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                          onClick={() => setIsProfileMenuOpen(false)}
                          role="menuitem"
                        >
                          <User className="w-4 h-4 mr-3" />
                          Profile Settings
                        </Link>
                        <div className="border-t border-gray-100 dark:border-gray-700">
                          <button
                            onClick={handleLogout}
                            className="w-full text-left flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                            role="menuitem"
                          >
                            <LogOut className="w-4 h-4 mr-3" />
                            Sign Out
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="flex items-center space-x-3">
                  <Link
                    to="/login"
                    className="text-gray-700 dark:text-gray-300 hover:text-primary font-medium"
                  >
                    Sign In
                  </Link>
                  <Link
                    to="/register"
                    className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 font-medium transition-colors"
                  >
                    Get Started
                  </Link>
                </div>
              )}

              {/* Mobile Menu Button */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 dark:text-gray-300 dark:hover:text-gray-200 dark:hover:bg-gray-800"
                aria-expanded={isMobileMenuOpen}
                aria-controls="mobile-menu"
              >
                <span className="sr-only">{isMobileMenuOpen ? 'Close menu' : 'Open menu'}</span>
                {isMobileMenuOpen ? (
                  <X className="w-6 h-6" aria-hidden="true" />
                ) : (
                  <Menu className="w-6 h-6" aria-hidden="true" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-40 flex lg:hidden" id="mobile-menu" role="dialog" aria-modal="true">
            <div className="fixed inset-0 bg-black bg-opacity-25" aria-hidden="true" onClick={() => setIsMobileMenuOpen(false)}></div>
            <div className="relative max-w-xs w-full bg-white dark:bg-gray-900 shadow-xl pb-12 flex flex-col overflow-y-auto">
                <div className="px-4 pt-5 pb-2 flex">
                    <button type="button" className="-m-2 p-2 rounded-md inline-flex items-center justify-center text-gray-400" onClick={() => setIsMobileMenuOpen(false)}>
                        <span className="sr-only">Close menu</span>
                        <X className="h-6 w-6" aria-hidden="true" />
                    </button>
                </div>
            <div className="px-2 pt-2 pb-3 space-y-1">
              {navigation.map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.name} className="space-y-1">
                    <button
                      className="w-full flex items-center justify-between space-x-3 px-3 py-2 rounded-md text-base font-medium text-gray-700 dark:text-gray-300 hover:text-primary hover:bg-light dark:hover:bg-gray-800"
                      onClick={() => handleMegaMenuToggle(item.megaMenu)}
                      aria-expanded={showMegaMenu === item.megaMenu}
                    >
                      <div className="flex items-center space-x-3">
                        <Icon className="w-5 h-5" />
                        <span>{item.name}</span>
                      </div>
                      <span className="text-gray-400">
                        {showMegaMenu === item.megaMenu ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </span>
                    </button>
                    
                    {/* Mobile Submenu */}
                    {showMegaMenu === item.megaMenu && item.items && (
                      <div className="ml-4 space-y-1 pl-4">
                        {item.items.map((subItem) => (
                          <Link
                            key={subItem.name}
                            to={subItem.href}
                            className="block px-3 py-2 rounded-md text-sm text-gray-600 dark:text-gray-400 hover:text-primary hover:bg-light dark:hover:bg-gray-800"
                            onClick={() => {
                              setShowMegaMenu(null);
                              setIsMobileMenuOpen(false);
                            }}
                          >
                            {subItem.name}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
              
              {/* Quick Access */}
              <div className="pt-2 pb-1 border-t border-gray-200 dark:border-gray-700">
                <p className="px-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Quick Access
                </p>
                <div className="grid grid-cols-2 gap-1 mt-2">
                  <Link
                    to="/health-talk-podcast"
                    className="flex items-center space-x-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:text-primary hover:bg-light dark:hover:bg-gray-800 rounded-md"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <Headphones className="w-4 h-4" />
                    <span>HealthTalk Podcast</span>
                  </Link>
                  <Link
                    to="/health-news-feed"
                    className="flex items-center space-x-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:text-primary hover:bg-light dark:hover:bg-gray-800 rounded-md"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <Newspaper className="w-4 h-4" />
                    <span>Health News</span>
                  </Link>
                </div>
              </div>
              
              {/* Mobile Theme Toggle */}
              <div className="px-3 py-2">
                <ThemeToggle showLabel={true} showTitle={true} />
              </div>
              
              {!user && (
                <div className="pt-4 pb-2 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex flex-col space-y-2">
                    <Link
                      to="/login"
                      className="block px-3 py-2 text-base font-medium text-gray-700 dark:text-gray-300 hover:text-primary"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      Sign In
                    </Link>
                    <Link
                      to="/register"
                      className="block px-3 py-2 text-base font-medium bg-primary text-white rounded-md hover:bg-primary/90 mx-3"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      Get Started
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>
</div>
        )}
      </header>

      {/* Search Modal */}
      <SearchModal 
        isOpen={isSearchModalOpen}
        onClose={() => setIsSearchModalOpen(false)}
      />
    </>
  );
};

function getUserDisplayName(user: any): string {
  if (user.profile) {
    return `${user.profile.first_name} ${user.profile.last_name}`;
  }
  return user.email.split('@')[0];
}

function getDashboardPath(userType: string): string {
  switch (userType) {
    case UserType.SUPER_ADMIN:
      return '/super-admin';
    case UserType.HEALTH_CENTER:
    case UserType.PHARMACY:
    case UserType.PRACTITIONER:
      return '/admin';
    default:
      return '/dashboard';
  }
}

const ChevronDown = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <polyline points="6 9 12 15 18 9"></polyline>
  </svg>
);

const ChevronUp = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <polyline points="18 15 12 9 6 15"></polyline>
  </svg>
);

export default Header;