import React, { useEffect } from 'react';
import SystemInitializer from './lib/initialization';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastProvider } from './components/ui/Toast';
import { useAuth } from './lib/auth';
import { initializeDatabase } from './lib/database';
import { initializeContentSeeds } from './lib/content-initializer';
import { initializeMasterHealthTools } from './lib/health-tools-master';
import { initializeTheme } from './lib/theme';
import { LMSService } from './lib/lms';
import { startScheduler as startConsolidatedScheduler } from './lib/consolidated-scheduler';
import ConsentAcceptanceModal from './components/auth/ConsentAcceptanceModal';

// Layout Components
import Header from './components/layout/Header';
import Footer from './components/layout/Footer';
import Sidebar from './components/layout/Sidebar';
import DashboardLayout from './components/layout/DashboardLayout';

// Page Components
import HomePage from './pages/HomePage';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import ResetPasswordPage from './pages/auth/ResetPasswordPage';
import PaymentCallbackPage from './pages/PaymentCallbackPage';
import DirectoryPage from './pages/directory/DirectoryPage';
import EntityDetailPage from './pages/directory/EntityDetailPage';
import HealthToolsPage from './pages/tools/HealthToolsPage';
import ToolDetailPage from './pages/tools/ToolDetailPage';
import CoursesPage from './pages/lms/CoursesPage';
import CourseDetailPage from './pages/lms/CourseDetailPage';
import CourseCreationPage from './pages/lms/CourseCreationPage';
import CourseLearningPage from './pages/lms/CourseLearningPage';
import CourseCompletionPage from './pages/lms/CourseCompletionPage';
import CertificatePage from './pages/lms/CertificatePage';
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
import WeeklyTipsPage from './pages/WeeklyTipsPage';
import TimelessFactsPage from './pages/TimelessFactsPage';
import JobsPage from './pages/JobsPage';
import JobDetailPage from './pages/JobDetailPage';
import HelpCenterPage from './pages/support/HelpCenterPage';
import ContactPage from './pages/support/ContactPage';
import PrivacyPolicyPage from './pages/legal/PrivacyPolicyPage';
import TermsOfServicePage from './pages/legal/TermsOfServicePage';

// AILab Pages
import AILabPage from './pages/ailab/AILabPage';
import CarePathPage from './pages/ailab/CarePathPage';
import LabExplainerPage from './pages/ailab/LabExplainerPage';
import ProcedureNavigatorPage from './pages/ailab/ProcedureNavigatorPage';
import EmergencyBridgePage from './pages/ailab/EmergencyBridgePage';
import MedicalTimelinePage from './pages/ailab/MedicalTimelinePage';
import CulturalAdvisorPage from './pages/ailab/CulturalAdvisorPage';
import AILabToolsPage from './pages/ailab/AILabToolsPage';

// Dashboard Components
import PublicDashboard from './pages/dashboard/PublicDashboard';
import EntityDashboard from './pages/dashboard/EntityDashboard';
import SuperAdminDashboard from './pages/dashboard/SuperAdminDashboard';
import NewsManagementPage from './pages/dashboard/NewsManagementPage';
import WeeklyTipsManagementPage from './pages/dashboard/WeeklyTipsManagementPage';
import TimelessFactsManagementPage from './pages/dashboard/TimelessFactsManagementPage';
import ForumManagementPage from './pages/dashboard/ForumManagementPage';
import JobManagementPage from './pages/dashboard/JobManagementPage';

// HMS Dashboard Components
import HospitalDashboard from './pages/dashboard/HospitalDashboard';
import HMSDashboard from './pages/dashboard/HMSDashboard';
import PatientRegistry from './pages/dashboard/PatientRegistry';
import EncounterBoard from './pages/dashboard/EncounterBoard';
import LabOrdersPage from './pages/dashboard/LabOrdersPage';
import ImagingOrdersPage from './pages/dashboard/ImagingOrdersPage';
import PharmacyDispensePage from './pages/dashboard/PharmacyDispensePage';
import CarePlansPage from './pages/dashboard/CarePlansPage';
import ReferralsPage from './pages/dashboard/ReferralsPage';
import BedManagementPage from './pages/dashboard/BedManagementPage';
import BillingPage from './pages/dashboard/BillingPage';
import ReportsHMS from './pages/dashboard/ReportsHMS';

// HMS Patient Portal Components
import PatientPortal from './pages/patient/PatientPortal';
import Records from './pages/patient/Records';
import Medications from './pages/patient/Medications';
import Consents from './pages/patient/Consents';
import Providers from './pages/patient/Providers';
import Billing from './pages/patient/Billing';

// Floating Tools
import EnhancedAISupportAgent from './components/ui/EnhancedAISupportAgent';
import AccessibilityTools from './components/ui/AccessibilityTools';
import ConsentBanner from './components/ui/ConsentBanner';

// Loading Component
import LoadingSpinner from './components/ui/LoadingSpinner';

function App() {
  const { user, isLoading, refreshUser, fetchCurrentConsentVersion } = useAuth();

  useEffect(() => {
    // Initialize application
    const initialize = async () => {
      console.log('App: Starting initialization...');

      // Initialize theme system
      initializeTheme();
      console.log('App: Theme initialized');

      // Restore the user session FIRST so that authenticated data operations
      // (health tools init, etc.) have a valid token. This must not throw.
      try {
        console.log('App: Checking for existing session...');
        await refreshUser();
      } catch (e) {
        console.warn('App: Session restore failed:', e);
      }

      // Fetch the current platform consent version (system_settings).
      // Public collection — safe to call before login. Falls back to env var.
      try {
        await fetchCurrentConsentVersion();
        console.log('App: Consent version fetched');
      } catch (e) {
        console.warn('App: Consent version fetch failed:', e);
      }

      // Each subsequent init step is independent; a failure in one must not
      // block the others or leave the app in a permanent loading state.
      try {
        await initializeDatabase();
        console.log('App: Database initialized');
      } catch (e) {
        console.warn('App: Database init failed:', e);
      }

      try {
        await initializeContentSeeds();
        console.log('App: Content seeds done');
      } catch (e) {
        console.warn('App: Content seeds failed:', e);
      }

      try {
        await initializeMasterHealthTools();
        console.log('App: Health tools initialized');
      } catch (e) {
        console.warn('App: Health tools init failed:', e);
      }

      // LMS starter courses — only if the method exists (it was removed during
      // the monorepo migration; the backend seed now provides courses).
      try {
        if (typeof (LMSService as any).initializeStarterCourses === 'function') {
          await (LMSService as any).initializeStarterCourses();
          console.log('App: LMS initialized');
        }
      } catch (e) {
        console.warn('App: LMS init failed:', e);
      }

      // Start the consolidated scheduler (replaces the 3 legacy schedulers).
      // It polls /api/cron every 5 minutes, but only when an admin user is
      // signed in and VITE_SEED_KEY is configured. Cron can also be triggered
      // externally — see the `cron:run` script in package.json.
      try {
        startConsolidatedScheduler();
        console.log('App: Consolidated scheduler started');
      } catch (e) {
        console.warn('App: Consolidated scheduler failed:', e);
      }

      console.log('CareConnect application initialized successfully');
      // Ensure loading is false regardless of init outcome.
      useAuth.setState({ isLoading: false });
    };

    initialize();

    // Fallback timeout to prevent infinite loading
    const timeout = setTimeout(() => {
      if (useAuth.getState().isLoading) {
        console.warn('App initialization timeout, forcing loading to false');
        useAuth.setState({ isLoading: false });
      }
    }, 5000); // 5 second timeout (reduced from 10)

    return () => clearTimeout(timeout);
  }, []);

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
    <ToastProvider>
      {/* Consent versioning gate: shown over the main app when an
          authenticated user hasn't accepted the current platform consent
          version. Blocks interaction until the user accepts or logs out. */}
      <ConsentAcceptanceModal />
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
              <Route path="/reset-password" element={<ResetPasswordPage />} />
              <Route path="/payment/callback" element={<PaymentCallbackPage />} />
              <Route path="/payment/cancelled" element={<PaymentCallbackPage />} />
              <Route path="/directory" element={<DirectoryPage />} />
              <Route path="/directory/:entityId" element={<EntityDetailPage />} />
              <Route path="/health-tools" element={<HealthToolsPage />} />
              <Route path="/health-tools/:toolId" element={<ToolDetailPage />} />
              <Route path="/courses" element={<CoursesPage />} />
              <Route path="/courses/create" element={<CourseCreationPage />} />
              <Route path="/courses/:courseId" element={<CourseDetailPage />} />
              <Route path="/courses/:courseId/learn/:moduleId/:lessonId" element={<CourseLearningPage />} />
              <Route path="/courses/:courseId/complete" element={<CourseCompletionPage />} />
              <Route path="/certificate/:certNumber" element={<CertificatePage />} />
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
              <Route path="/weekly-tips" element={<WeeklyTipsPage />} />
              <Route path="/timeless-facts" element={<TimelessFactsPage />} />
              <Route path="/jobs" element={<JobsPage />} />
              <Route path="/jobs/:jobId" element={<JobDetailPage />} />
              <Route path="/blog" element={<BlogPage />} />
              <Route path="/blog/:postId" element={<BlogPostPage />} />
              <Route path="/help" element={<HelpCenterPage />} />
              <Route path="/contact" element={<ContactPage />} />
              <Route path="/privacy" element={<PrivacyPolicyPage />} />
              <Route path="/terms" element={<TermsOfServicePage />} />
              <Route path="/community" element={<CommunityPage />} />
              <Route path="/community/new" element={<CreateForumPostPage />} />
              <Route path="/community/:postId" element={<ForumPostPage />} />
              
              {/* AILab Routes */}
              <Route path="/ailab" element={<AILabPage />} />
              <Route path="/ailab/care-path" element={<CarePathPage />} />
              <Route path="/ailab/lab-explainer" element={<LabExplainerPage />} />
              <Route path="/ailab/procedure-navigator" element={<ProcedureNavigatorPage />} />
              <Route path="/ailab/emergency-bridge" element={<EmergencyBridgePage />} />
              <Route path="/ailab/medical-timeline" element={<MedicalTimelinePage />} />
              <Route path="/ailab/cultural-advisor" element={<CulturalAdvisorPage />} />
              <Route path="/ailab/tools" element={<AILabToolsPage />} />
              
              {/* Protected Routes */}
              {user ? (
                <>
                  {user.user_type === 'public_user' && (
                    <Route path="/dashboard/*" element={<PublicDashboard />} />
                  )}
                  
                  {(['health_center', 'pharmacy', 'practitioner', 'hospital_admin', 'physician', 'nurse', 'pharmacist', 'lab_tech', 'imaging_tech', 'billing_clerk'].includes(user.user_type)) && (
                    <>
                      {/* Entity Dashboard Routes */}
                      <Route path="/dashboard/entity/*" element={<DashboardLayout><EntityDashboard /></DashboardLayout>} />
                      
                      {/* Hospital Management System Routes */}
                      <Route path="/dashboard/hms/*" element={<DashboardLayout><HMSDashboard /></DashboardLayout>} />
                      
                      {/* Legacy admin routes for backward compatibility */}
                      <Route path="/admin/*" element={<Navigate to="/dashboard/entity" replace />} />
                      <Route path="/hms/*" element={<Navigate to="/dashboard/hms" replace />} />
                    </>
                  )}
                  
                  {/* Patient Portal Routes */}
                  {user.user_type === 'patient' && (
                    <>
                      <Route path="/patient" element={<PatientPortal />} />
                      <Route path="/patient/records" element={<Records />} />
                      <Route path="/patient/medications" element={<Medications />} />
                      <Route path="/patient/consents" element={<Consents />} />
                      <Route path="/patient/providers" element={<Providers />} />
                      <Route path="/patient/billing" element={<Billing />} />
                    </>
                  )}
                  
                  {user.user_type === 'super_admin' && (
                    <>
                      <Route path="/super-admin/*" element={<SuperAdminDashboard />} />
                      <Route path="/super-admin/news" element={<NewsManagementPage />} />
                      <Route path="/super-admin/weekly-tips" element={<WeeklyTipsManagementPage />} />
                      <Route path="/super-admin/timeless-facts" element={<TimelessFactsManagementPage />} />
                      <Route path="/super-admin/forum" element={<ForumManagementPage />} />
                      <Route path="/super-admin/jobs" element={<JobManagementPage />} />
                    </>
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
        <EnhancedAISupportAgent />
        <AccessibilityTools />
        
        {/* Consent & Cookie Banner */}
        <ConsentBanner />
        </div>
      </Router>
    </ToastProvider>
  );
}

function getDashboardPath(userType: string): string {
  switch (userType) {
    case 'super_admin':
      return '/super-admin';
    case 'health_center':
    case 'pharmacy':
    case 'practitioner':
    case 'hospital_admin':
    case 'physician':
    case 'nurse':
    case 'pharmacist':
    case 'lab_tech':
    case 'imaging_tech':
    case 'billing_clerk':
      return '/dashboard/entity/overview';
    default:
      return '/dashboard';
  }
}

export default App;
