// Login Page for CareConnect Healthcare Platform
import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth, UserType } from '../../lib/auth';
import { useToast } from '../../components/ui/Toast';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  Loader2,
  Stethoscope
} from 'lucide-react';

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login, user, isAuthenticated } = useAuth();
  const { success, error: showError, info } = useToast();
  
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const redirectTo = searchParams.get('redirect') || '/';
  const message = searchParams.get('message');

  // Redirect if already authenticated
  React.useEffect(() => {
    if (isAuthenticated && user) {
      const dashboardRoute = getDashboardRoute(user.user_type);
      navigate(dashboardRoute);
    }
  }, [isAuthenticated, user, navigate]);

  // Show registration success message
  React.useEffect(() => {
    if (message === 'registration_success') {
      info('Registration Successful!', 'Your account has been created. Please login with your credentials.');
    }
  }, [message, info]);

  const getDashboardRoute = (userType: UserType) => {
    switch (userType) {
      case UserType.SUPER_ADMIN:
        return '/dashboard/super-admin';
      case UserType.HOSPITAL_ADMIN:
      case UserType.HEALTH_CENTER:
        return '/dashboard/hospital';
      case UserType.PRACTITIONER:
      case UserType.PHYSICIAN:
      case UserType.NURSE:
        return '/dashboard/provider';
      case UserType.PHARMACY:
      case UserType.PHARMACIST:
        return '/dashboard/pharmacy';
      case UserType.PATIENT:
      case UserType.PUBLIC_USER:
        return '/dashboard/patient';
      default:
        return '/dashboard';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const loginSuccess = await login(formData.email, formData.password);
      if (loginSuccess) {
        success('Welcome back!', 'You have been successfully signed in.');
        // Get updated user from auth store
        const currentUser = useAuth.getState().user;
        const dashboardRoute = currentUser ? getDashboardRoute(currentUser.user_type) : '/dashboard';
        const finalRedirect = redirectTo === '/' ? dashboardRoute : redirectTo;
        navigate(finalRedirect);
      } else {
        showError('Login Failed', 'Invalid email or password. Please check your credentials and try again.');
        setError('Invalid email or password. Please try again.');
      }
    } catch (err: any) {
      showError('Login Error', err.message || 'An unexpected error occurred during login.');
      setError(err.message || 'Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError(''); // Clear error when user types
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-white to-accent/5 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="flex justify-center">
            <div className="w-16 h-16 bg-primary rounded-xl flex items-center justify-center">
              <Stethoscope className="w-8 h-8 text-white" />
            </div>
          </div>
          <h2 className="mt-6 text-3xl font-bold text-dark">
            Welcome back to CareConnect
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Sign in to access your healthcare dashboard
          </p>
        </div>

        {/* Login Form */}
        <div className="bg-white py-8 px-6 shadow-lg rounded-xl">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center space-x-2">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                <span className="text-sm text-red-700">{error}</span>
              </div>
            )}

            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={formData.email}
                  onChange={handleInputChange}
                  className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="Enter your email"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={formData.password}
                  onChange={handleInputChange}
                  className="block w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                  )}
                </button>
              </div>
            </div>

            {/* Forgot Password Link */}
            <div className="text-right">
              <Link
                to="/forgot-password"
                className="text-sm text-primary hover:text-primary/80 font-medium"
              >
                Forgot password?
              </Link>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

        </div>

        {/* Sign Up Link */}
        <div className="text-center">
          <p className="text-sm text-gray-600">
            Don't have an account?{' '}
            <Link
              to="/register"
              className="font-medium text-primary hover:text-primary/80"
            >
              Sign up for free
            </Link>
          </p>
        </div>

        {/* Quick Access */}
        <div className="text-center pt-6 border-t border-gray-200">
          <p className="text-xs text-gray-500 mb-3">Quick Access</p>
          <div className="flex justify-center space-x-4">
            <Link
              to="/directory"
              className="text-xs text-primary hover:text-primary/80"
            >
              Find Providers
            </Link>
            <Link
              to="/health-tools"
              className="text-xs text-primary hover:text-primary/80"
            >
              Health Tools
            </Link>
            <Link
              to="/help"
              className="text-xs text-primary hover:text-primary/80"
            >
              Get Help
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
