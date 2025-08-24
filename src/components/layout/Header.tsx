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
  Newspaper,
  Sparkles,
  Shield,
  Star,
  Zap,
  Briefcase
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
  const [showThemeMenu, setShowThemeMenu] = useState(false);
  const [showGetStartedMenu, setShowGetStartedMenu] = useState(false);

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
      name: 'Directory',
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
      name: 'Tools',
      href: '/health-tools',
      icon: Zap,
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
      name: 'Resources',
      href: '/courses',
      icon: GraduationCap,
      megaMenu: 'resources',
      items: [
        { name: 'Health Courses', href: '/courses' },
        ...(user && ['health_center', 'pharmacy', 'practitioner'].includes(user.user_type)
          ? [{ name: 'Create Course', href: '/courses/create' }]
          : []),
        { name: 'Blog Articles', href: '/blog' },
        { name: 'HealthTalk Podcast', href: '/health-talk-podcast' },
        { name: 'Health News', href: '/health-news-feed' },
        { name: 'Weekly Tips', href: '/weekly-tips' },
        { name: 'Timeless Facts', href: '/timeless-facts' },
        { name: 'Q&A Community', href: '/community' },
      ]
    },
    {
      name: 'Community',
      href: '/community',
      icon: Heart,
      megaMenu: 'community',
      items: [
        { name: 'Q&A Forum', href: '/community' },
        { name: 'Ask a Question', href: '/community/new' },
        { name: 'Healthcare Causes', href: '/causes' },
        { name: 'Volunteer Opportunities', href: '/causes?type=volunteer' },
        { name: 'Featured Questions', href: '/community?tab=featured' },
        { name: 'Trending Topics', href: '/community?tab=trending' },
        { name: 'Unanswered Questions', href: '/community?tab=unanswered' },
      ]
    },
    {
      name: 'Jobs',
      href: '/jobs',
      icon: Briefcase,
      megaMenu: 'jobs',
      items: [
        { name: 'Browse All Jobs', href: '/jobs' },
        { name: 'Nursing Jobs', href: '/jobs?category=nursing' },
        { name: 'Doctor Positions', href: '/jobs?category=medical-doctors' },
        { name: 'Allied Health', href: '/jobs?category=allied-health' },
        { name: 'Administration', href: '/jobs?category=administration' },
        { name: 'Remote Jobs', href: '/jobs?location=remote' },
        { name: 'Full-time', href: '/jobs?type=full_time' },
        { name: 'Part-time', href: '/jobs?type=part_time' },
        ...(user && user.user_type === 'health_center'
          ? [{ name: 'Post a Job', href: '/dashboard/jobs/create' }]
          : []),
      ]
    },
    {
      name: 'Shop',
      href: '/shop',
      icon: ShoppingCart,
      megaMenu: 'shop',
      items: [
        { name: 'All Products', href: '/shop' },
        { name: 'Health Supplements', href: '/shop?category=supplements' },
        { name: 'Medical Equipment', href: '/shop?category=equipment' },
        { name: 'Wellness Products', href: '/shop?category=wellness' },
        { name: 'Pharmacy', href: '/shop?category=pharmacy' },
        { name: 'Health Monitoring', href: '/shop?category=monitoring' },
        { name: 'Special Offers', href: '/shop?type=special-offers' },
        { name: 'New Arrivals', href: '/shop?sort=newest' },
      ]
    },
  ];

  return (
    <>
      <header className="bg-gradient-to-r from-white via-white to-gray-50/50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800/50 shadow-lg border-b border-gray-200/60 dark:border-gray-700/60 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-2">
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

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center space-x-1">
              {navigation.map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.name} className="relative">
                    <button
                      className={`group flex items-center space-x-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 transform hover:scale-105 ${showMegaMenu === item.megaMenu ? 'text-primary bg-gradient-to-r from-primary/10 to-primary/5 shadow-md dark:bg-gray-800' : 'text-gray-700 dark:text-gray-300 hover:text-primary hover:bg-gradient-to-r hover:from-primary/5 hover:to-primary/10 hover:shadow-sm'}`}
                      onClick={() => handleMegaMenuToggle(item.megaMenu)}
                      aria-expanded={showMegaMenu === item.megaMenu}
                    >
                      <Icon className={`w-4 h-4 transition-transform duration-200 group-hover:scale-110 ${showMegaMenu === item.megaMenu ? 'text-primary' : 'text-gray-500 group-hover:text-primary'}`} />
                      <span className="relative">
                        {item.name}
                        {showMegaMenu === item.megaMenu && (
                          <div className="absolute -bottom-1 left-0 right-0 h-0.5 bg-gradient-to-r from-primary to-primary/80 rounded-full"></div>
                        )}
                      </span>
                    </button>
                    
                    {/* Mega Menu */}
                    {showMegaMenu === item.megaMenu && item.items && (
                      <div
                        className="absolute left-0 mt-3 w-72 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200/80 dark:border-gray-700/80 backdrop-blur-sm z-50 transform transition-all duration-300 ease-out"
                        onMouseLeave={() => handleMegaMenuToggle(null)}
                        style={{
                          animation: 'fadeInScale 0.2s ease-out forwards'
                        }}
                      >
                        <div className="p-6">
                          <div className="flex items-center space-x-2 mb-4 pb-3 border-b border-gray-100 dark:border-gray-700">
                            <Icon className="w-5 h-5 text-primary" />
                            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{item.name}</h3>
                          </div>
                          <div className="grid grid-cols-1 gap-2">
                            {item.items.map((subItem, index) => (
                              <Link
                                key={subItem.name}
                                to={subItem.href}
                                className="group flex items-center space-x-3 px-4 py-3 hover:bg-gradient-to-r hover:from-primary/5 hover:to-primary/10 rounded-xl text-gray-700 dark:text-gray-300 hover:text-primary transition-all duration-200 transform hover:translate-x-1 hover:shadow-sm"
                                onClick={() => setShowMegaMenu(null)}
                                style={{
                                  animationDelay: `${index * 50}ms`,
                                  animation: 'fadeInUp 0.3s ease-out forwards'
                                }}
                              >
                                <div className="w-2 h-2 rounded-full bg-primary/20 group-hover:bg-primary/40 transition-colors duration-200"></div>
                                <span className="text-sm font-medium">{subItem.name}</span>
                                <div className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                  <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                  </svg>
                                </div>
                              </Link>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </nav>

            {/* User Actions */}
            <div className="flex items-center space-x-2">
              {/* Desktop Search */}
              <button
                onClick={() => setIsSearchModalOpen(true)}
                className="p-2 rounded-md text-gray-700 dark:text-gray-300 hover:text-primary hover:bg-gray-100 dark:hover:bg-gray-800 hidden lg:block"
                aria-label="Search"
              >
                <Search className="w-5 h-5" />
              </button>

{/* Consolidated Theme Toggle with Mega Dropdown */}
              <div className="relative hidden lg:block">
                <button
                  onClick={() => setShowThemeMenu(!showThemeMenu)}
                  className="p-2 rounded-md text-gray-700 dark:text-gray-300 hover:text-primary hover:bg-gray-100 dark:hover:bg-gray-800"
                  aria-label="Theme Settings"
                >
                  {theme === 'dark' ? (
                    <Moon className="w-5 h-5" />
                  ) : (
                    <Sun className="w-5 h-5" />
                  )}
                </button>

                {/* Theme Mega Menu */}
                {showThemeMenu && (
                  <div
                    className="absolute right-0 mt-3 w-72 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200/80 dark:border-gray-700/80 backdrop-blur-sm z-50 transform transition-all duration-300 ease-out"
                    style={{
                      animation: 'fadeInScale 0.2s ease-out forwards'
                    }}
                  >
                    <div className="p-6">
                      <div className="flex items-center space-x-2 mb-4 pb-3 border-b border-gray-100 dark:border-gray-700">
                        <Settings className="w-5 h-5 text-primary" />
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Display Settings</h3>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          onClick={() => {
                            // For now, just toggle theme - in a real implementation this would set light theme
                            toggleTheme();
                            setShowThemeMenu(false);
                          }}
                          className={`group flex flex-col items-center space-y-2 px-4 py-4 rounded-xl text-gray-700 dark:text-gray-300 transition-all duration-200 transform hover:scale-105 hover:shadow-sm ${theme === 'light' ? 'bg-yellow-100 text-yellow-700 shadow-md' : 'hover:bg-gradient-to-r hover:from-yellow-50 hover:to-yellow-100 dark:hover:bg-gray-700/50 hover:text-yellow-600'}`}
                        >
                          <Sun className={`w-6 h-6 transition-transform duration-200 group-hover:scale-110 ${theme === 'light' ? 'text-yellow-600' : 'text-yellow-500'}`} />
                          <span className="text-xs font-medium">Light</span>
                        </button>
                        <button
                          onClick={() => {
                            // For now, just toggle theme - in a real implementation this would set dark theme
                            toggleTheme();
                            setShowThemeMenu(false);
                          }}
                          className={`group flex flex-col items-center space-y-2 px-4 py-4 rounded-xl text-gray-700 dark:text-gray-300 transition-all duration-200 transform hover:scale-105 hover:shadow-sm ${theme === 'dark' ? 'bg-gray-800 text-white shadow-md' : 'hover:bg-gradient-to-r hover:from-gray-50 hover:to-gray-100 dark:hover:bg-gray-700/50 hover:text-gray-600'}`}
                        >
                          <Moon className={`w-6 h-6 transition-transform duration-200 group-hover:scale-110 ${theme === 'dark' ? 'text-white' : 'text-gray-600'}`} />
                          <span className="text-xs font-medium">Dark</span>
                        </button>
                        <button
                          onClick={() => {
                            // For now, just toggle theme - in a real implementation this would set system theme
                            toggleTheme();
                            setShowThemeMenu(false);
                          }}
                          className={`group flex flex-col items-center space-y-2 px-4 py-4 rounded-xl text-gray-700 dark:text-gray-300 transition-all duration-200 transform hover:scale-105 hover:shadow-sm ${theme === 'system' ? 'bg-blue-100 text-blue-700 shadow-md' : 'hover:bg-gradient-to-r hover:from-blue-50 hover:to-blue-100 dark:hover:bg-gray-700/50 hover:text-blue-600'}`}
                        >
                          <Settings className={`w-6 h-6 transition-transform duration-200 group-hover:scale-110 ${theme === 'system' ? 'text-blue-600' : 'text-blue-500'}`} />
                          <span className="text-xs font-medium">Auto</span>
                        </button>
                        <button
                          onClick={() => {
                            // High contrast theme functionality would go here
                            setShowThemeMenu(false);
                          }}
                          className="group flex flex-col items-center space-y-2 px-4 py-4 hover:bg-gradient-to-r hover:from-purple-50 hover:to-purple-100 dark:hover:bg-gray-700/50 rounded-xl text-gray-700 dark:text-gray-300 hover:text-purple-600 transition-all duration-200 transform hover:scale-105 hover:shadow-sm"
                        >
                          <Shield className="w-6 h-6 transition-transform duration-200 group-hover:scale-110 text-purple-500" />
                          <span className="text-xs font-medium">High Contrast</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

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
                <div className="relative hidden lg:block">
                  <button
                    onClick={() => setShowGetStartedMenu(!showGetStartedMenu)}
                    className="group relative bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 font-medium transition-all duration-300 transform hover:scale-105 hover:shadow-lg"
                    aria-expanded={showGetStartedMenu}
                    aria-haspopup="true"
                  >
                    <span className="flex items-center space-x-2">
                      <span>Get Started</span>
                      <Sparkles className="w-4 h-4 transition-transform duration-300 group-hover:rotate-12" />
                    </span>
                  </button>

                  {/* Get Started Mega Menu */}
                  {showGetStartedMenu && (
                    <div
                      className="absolute right-0 mt-3 w-72 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200/80 dark:border-gray-700/80 backdrop-blur-sm z-50 transform transition-all duration-300 ease-out"
                      style={{
                        animation: 'fadeInScale 0.2s ease-out forwards'
                      }}
                    >
                      <div className="p-6">
                        <div className="flex items-center space-x-2 mb-4 pb-3 border-b border-gray-100 dark:border-gray-700">
                          <User className="w-5 h-5 text-primary" />
                          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Account Access</h3>
                        </div>
                        <div className="grid grid-cols-1 gap-3">
                          <Link
                            to="/login"
                            className="group flex items-center space-x-3 px-4 py-3 hover:bg-gradient-to-r hover:from-primary/5 hover:to-primary/10 rounded-xl text-gray-700 dark:text-gray-300 hover:text-primary transition-all duration-200 transform hover:translate-x-1 hover:shadow-sm"
                            onClick={() => setShowGetStartedMenu(false)}
                          >
                            <div className="w-2 h-2 rounded-full bg-primary/20 group-hover:bg-primary/40 transition-colors duration-200"></div>
                            <span className="text-sm font-medium">Sign In</span>
                            <div className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                              <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                            </div>
                          </Link>
                          <Link
                            to="/register"
                            className="group flex items-center space-x-3 px-4 py-3 hover:bg-gradient-to-r hover:from-primary/5 hover:to-primary/10 rounded-xl text-gray-700 dark:text-gray-300 hover:text-primary transition-all duration-200 transform hover:translate-x-1 hover:shadow-sm"
                            onClick={() => setShowGetStartedMenu(false)}
                          >
                            <div className="w-2 h-2 rounded-full bg-primary/20 group-hover:bg-primary/40 transition-colors duration-200"></div>
                            <span className="text-sm font-medium">Sign Up</span>
                            <div className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                              <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                            </div>
                          </Link>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Mobile Icons */}
              <div className="flex items-center space-x-2 lg:hidden">
                {/* Mobile Search */}
                <button
                  onClick={() => setIsSearchModalOpen(true)}
                  className="p-2 rounded-md text-gray-700 dark:text-gray-300 hover:text-primary hover:bg-gray-100 dark:hover:bg-gray-800"
                  aria-label="Search"
                >
                  <Search className="w-5 h-5" />
                </button>


                {/* Mobile Theme Toggle */}
                <button
                  onClick={toggleTheme}
                  className="p-2 rounded-md text-gray-700 dark:text-gray-300 hover:text-primary hover:bg-gray-100 dark:hover:bg-gray-800"
                  aria-label="Toggle theme"
                >
                  {theme === 'dark' ? (
                    <Moon className="w-5 h-5" />
                  ) : (
                    <Sun className="w-5 h-5" />
                  )}
                </button>


                {/* Mobile Menu Button */}
                <button
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                  className="p-2 rounded-md text-gray-700 dark:text-gray-300 hover:text-primary hover:bg-gray-100 dark:hover:bg-gray-800"
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
        </div>
      </header>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" id="mobile-menu" role="dialog" aria-modal="true">
          <div className="fixed inset-0 bg-black bg-opacity-25" aria-hidden="true" onClick={() => setIsMobileMenuOpen(false)}></div>
          <div className="fixed inset-y-0 right-0 max-w-xs w-full bg-white dark:bg-gray-900 shadow-xl flex flex-col overflow-y-auto">
              <div className="px-4 pt-5 pb-2 flex justify-between items-center">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                      <Stethoscope className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-lg font-bold text-gray-900 dark:text-white">CareConnect</span>
                  </div>
                  <button type="button" className="-m-2 p-2 rounded-md inline-flex items-center justify-center text-gray-400 hover:text-gray-500" onClick={() => setIsMobileMenuOpen(false)}>
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
                  <span>Podcast</span>
                </Link>
                <Link
                  to="/health-news-feed"
                  className="flex items-center space-x-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:text-primary hover:bg-light dark:hover:bg-gray-800 rounded-md"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <Newspaper className="w-4 h-4" />
                  <span>News</span>
                </Link>
                <Link
                  to="/weekly-tips"
                  className="flex items-center space-x-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:text-primary hover:bg-light dark:hover:bg-gray-800 rounded-md"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <Calendar className="w-4 h-4" />
                  <span>Weekly Tips</span>
                </Link>
                <Link
                  to="/timeless-facts"
                  className="flex items-center space-x-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:text-primary hover:bg-light dark:hover:bg-gray-800 rounded-md"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <Star className="w-4 h-4" />
                  <span>Facts</span>
                </Link>
              </div>
            </div>
            
            {/* Mobile Theme and Account Access */}
            <div className="pt-2 pb-1 border-t border-gray-200 dark:border-gray-700">
              <p className="px-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Settings & Account
              </p>
              <div className="grid grid-cols-2 gap-1 mt-2">
                <button
                  onClick={() => {
                    // Open theme settings
                    setIsMobileMenuOpen(false);
                  }}
                  className="flex items-center space-x-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:text-primary hover:bg-light dark:hover:bg-gray-800 rounded-md"
                >
                  <Sun className="w-4 h-4" />
                  <span>Theme</span>
                </button>
                {!user && (
                  <Link
                    to="/login"
                    className="flex items-center space-x-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:text-primary hover:bg-light dark:hover:bg-gray-800 rounded-md"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <User className="w-4 h-4" />
                    <span>Sign In</span>
                  </Link>
                )}
              </div>
              {!user && (
                <>
                  <Link
                    to="/login"
                    className="flex items-center space-x-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:text-primary hover:bg-light dark:hover:bg-gray-800 rounded-md"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <User className="w-4 h-4" />
                    <span>Sign In</span>
                  </Link>
                  <div className="mt-2">
                    <Link
                      to="/register"
                      className="block px-3 py-2 text-base font-medium bg-primary text-white rounded-md hover:bg-primary/90 mx-3 text-center"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      Get Started
                    </Link>
                  </div>
                </>
              )}
            </div>
            
            {/* User Profile Section for Mobile */}
            {user && (
              <div className="pt-2 pb-1 border-t border-gray-200 dark:border-gray-700">
                <p className="px-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Account
                </p>
                <div className="mt-2 space-y-1">
                  <Link
                    to={getDashboardPath(user.user_type)}
                    className="flex items-center space-x-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:text-primary hover:bg-light dark:hover:bg-gray-800 rounded-md"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <Settings className="w-4 h-4" />
                    <span>Dashboard</span>
                  </Link>
                  <Link
                    to="/profile"
                    className="flex items-center space-x-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:text-primary hover:bg-light dark:hover:bg-gray-800 rounded-md"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <User className="w-4 h-4" />
                    <span>Profile</span>
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:text-primary hover:bg-light dark:hover:bg-gray-800 rounded-md text-left"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      )}

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
