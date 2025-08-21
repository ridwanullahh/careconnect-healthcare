import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuth } from './lib/auth';
import { initializeDatabase } from './lib/database';
import { initializeAllHealthTools } from './lib/health-tools';
import { initializeTheme } from './lib/theme';

// Layout Components
import Header from './components/layout/Header';
import Footer from './components/layout/Footer';
import Sidebar from './components/layout/Sidebar';

// Page Components
import HomePage from './pages/HomePage';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import DirectoryPage from './pages/directory/DirectoryPage';
import EntityDetailPage from './pages/directory/EntityDetailPage';
import HealthToolsPage from './pages/tools/HealthToolsPage';
import ToolDetailPage from './pages/tools/ToolDetailPage';
import CoursesPage from './pages/lms/CoursesPage';
import CourseDetailPage from './pages/lms/CourseDetailPage';
import CourseCreationPage from './pages/lms/CourseCreationPage';
import CourseLearningPage from './pages/lms/CourseLearningPage';
import CourseCompletionPage from './pages/lms/CourseCompletionPage';
import CausesPage from './pages/crowdfunding/CausesPage';
import CauseDetailPage from './pages/crowdfunding/CauseDetailPage';
import BookingPage from './pages/booking/BookingPage';
import CheckoutPage from './pages/ecommerce/CheckoutPage';

// New Enhanced Pages
import ShopPage from './pages/shop/ShopPage';
import ProductDetailPage from './pages/shop/ProductPage';
import CartPage from './pages/ecommerce/CartPage';
import OrderSuccessPage from './pages/ecommerce/OrderSuccessPage';
import BlogPage from './pages/blog/BlogPage';
import BlogPostPage from './pages/blog/BlogPostPage';
import CommunityPage from './pages/community/CommunityPage';
import ForumPostPage from './pages/community/ForumPostPage';
import CreateForumPostPage from './pages/community/CreateForumPostPage';
import HealthNewsFeedPage from './pages/HealthNewsFeedPage';
import HealthTalkPodcastPage from './pages/HealthTalkPodcastPage';
import HealthNewsArticlePage from './pages/HealthNewsArticlePage';
import HelpCenterPage from './pages/support/HelpCenterPage';
import ContactPage from './pages/support/ContactPage';
import PrivacyPolicyPage from './pages/legal/PrivacyPolicyPage';
import TermsOfServicePage from './pages/legal/TermsOfServicePage';

// Dashboard Components
import PublicDashboard from './pages/dashboard/PublicDashboard';
import EntityDashboard from './pages/dashboard/EntityDashboard';
import SuperAdminDashboard from './pages/dashboard/SuperAdminDashboard';

// Floating Tools
import AISupportAgent from './components/ui/AISupportAgent';
import AccessibilityTools from './components/ui/AccessibilityTools';

// Loading Component
import LoadingSpinner from './components/ui/LoadingSpinner';

function App() {
  const { user, isLoading, refreshUser } = useAuth();

  useEffect(() => {
    // Initialize application
    const initialize = async () => {
      try {
        // Initialize theme system
        initializeTheme();
        
        // Initialize database and load user
        await initializeDatabase();
        await initializeAllHealthTools();
        await LMSService.initializeStarterCourses();
        await refreshUser();
        
        console.log('CareConnect application initialized successfully');
      } catch (error) {
        console.error('App initialization failed:', error);
      }
    };

    initialize();
  }, [refreshUser]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-light to-white dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading CareConnect...</p>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <div className="min-h-screen bg-gradient-to-br from-light to-white dark:from-gray-900 dark:to-gray-800 flex flex-col transition-colors duration-300">
        <Header />
        
        <div className="flex flex-1">
          {user && <Sidebar />}
          
          <main className={`flex-1 ${user ? 'ml-0 lg:ml-64' : ''} transition-all duration-300`}>
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<HomePage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/directory" element={<DirectoryPage />} />
              <Route path="/directory/:entityId" element={<EntityDetailPage />} />
              <Route path="/health-tools" element={<HealthToolsPage />} />
              <Route path="/health-tools/:toolId" element={<ToolDetailPage />} />
              <Route path="/courses" element={<CoursesPage />} />
              <Route path="/courses/create" element={<CourseCreationPage />} />
              <Route path="/courses/:courseId" element={<CourseDetailPage />} />
              <Route path="/courses/:courseId/learn/:moduleId/:lessonId" element={<CourseLearningPage />} />
              <Route path="/courses/:courseId/complete" element={<CourseCompletionPage />} />
              <Route path="/causes" element={<CausesPage />} />
              <Route path="/causes/:causeId" element={<CauseDetailPage />} />
              <Route path="/book/:entityId" element={<BookingPage />} />
              <Route path="/shop" element={<ShopPage />} />
              <Route path="/shop/:productId" element={<ProductDetailPage />} />
              <Route path="/cart" element={<CartPage />} />
              <Route path="/checkout" element={<CheckoutPage />} />
              <Route path="/order-success/:orderId" element={<OrderSuccessPage />} />
              <Route path="/health-news-feed" element={<HealthNewsFeedPage />} />
              <Route path="/health-news/:articleId" element={<HealthNewsArticlePage />} />
              <Route path="/health-talk-podcast" element={<HealthTalkPodcastPage />} />
              <Route path="/help" element={<HelpCenterPage />} />
              <Route path="/contact" element={<ContactPage />} />
              <Route path="/privacy" element={<PrivacyPolicyPage />} />
              <Route path="/terms" element={<TermsOfServicePage />} />
              <Route path="/community" element={<CommunityPage />} />
              <Route path="/community/new" element={<CreateForumPostPage />} />
              <Route path="/community/:postId" element={<ForumPostPage />} />
              
              {/* Protected Routes */}
              {user ? (
                <>
                  {user.user_type === 'public_user' && (
                    <Route path="/dashboard/*" element={<PublicDashboard />} />
                  )}
                  
                  {(['health_center', 'pharmacy', 'practitioner'].includes(user.user_type)) && (
                    <Route path="/admin/*" element={<EntityDashboard />} />
                  )}
                  
                  {user.user_type === 'super_admin' && (
                    <Route path="/super-admin/*" element={<SuperAdminDashboard />} />
                  )}
                  
                  <Route path="*" element={<Navigate to={getDashboardPath(user.user_type)} replace />} />
                </>
              ) : (
                <Route path="/dashboard/*" element={<Navigate to="/login" replace />} />
              )}
            </Routes>
          </main>
        </div>
        
        <Footer />
        
        {/* Floating Tools */}
        <AISupportAgent />
        <AccessibilityTools />
      </div>
    </Router>
  );
}

function getDashboardPath(userType: string): string {
  switch (userType) {
    case 'super_admin':
      return '/super-admin';
    case 'health_center':
    case 'pharmacy':
    case 'practitioner':
      return '/admin';
    default:
      return '/dashboard';
  }
}

export default App;
