// Home Page for CareConnect Healthcare Platform
import React, { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Search,
  Heart,
  Users,
  Award,
  Clock,
  Shield,
  Stethoscope,
  GraduationCap,
  Calendar,
  PhoneCall,
  MapPin,
  Star,
  ArrowRight,
  CheckCircle,
  Loader2
} from 'lucide-react';
import { useAjaxSearch } from '../hooks/use-ajax-search';
import { cn } from '../lib/utils';

const HomePage: React.FC = () => {
  const { 
    query, 
    setQuery, 
    results, 
    isLoading, 
    error,
    totalCount
  } = useAjaxSearch('');
  
  const [showResults, setShowResults] = useState(false);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const searchRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Load search history from localStorage on mount
  React.useEffect(() => {
    const storedHistory = localStorage.getItem('searchHistory');
    if (storedHistory) {
      try {
        const parsedHistory = JSON.parse(storedHistory);
        if (Array.isArray(parsedHistory)) {
          setSearchHistory(parsedHistory.slice(0, 5));
        }
      } catch (e) {
        console.error('Failed to parse search history', e);
      }
    }
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      // Add to search history
      const newHistory = [query, ...searchHistory.filter(item => item !== query)];
      setSearchHistory(newHistory.slice(0, 5));
      localStorage.setItem('searchHistory', JSON.stringify(newHistory.slice(0, 5)));
      
      navigate(`/directory?search=${encodeURIComponent(query)}`);
    }
  };
  
  const handleResultSelect = (result: any) => {
    // Add to search history if it's a search term
    if (query.trim()) {
      const newHistory = [query, ...searchHistory.filter(item => item !== query)];
      setSearchHistory(newHistory.slice(0, 5));
      localStorage.setItem('searchHistory', JSON.stringify(newHistory.slice(0, 5)));
    }
    
    // Navigate to result URL
    navigate(result.url);
    setShowResults(false);
  };

  // Close search results when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  const features = [
    {
      icon: Search,
      title: 'Find Healthcare Providers',
      description: 'Search and connect with verified healthcare professionals in your area',
      link: '/directory'
    },
    {
      icon: Heart,
      title: '100+ Health Tools',
      description: 'AI-powered health assessments and calculators for better wellness',
      link: '/health-tools'
    },
    {
      icon: GraduationCap,
      title: 'Medical Education',
      description: 'Courses and certifications from leading healthcare institutions',
      link: '/courses'
    },
    {
      icon: Users,
      title: 'Community Support',
      description: 'Join causes and support healthcare initiatives in your community',
      link: '/causes'
    },
    {
      icon: Calendar,
      title: 'Easy Booking',
      description: 'Schedule appointments and consultations with just a few clicks',
      link: '/directory?book=true'
    },
    {
      icon: PhoneCall,
      title: 'Telehealth Ready',
      description: 'Connect with providers through secure video consultations',
      link: '/directory?type=telehealth'
    }
  ];

  const stats = [
    { label: 'Healthcare Providers', value: '10,000+' },
    { label: 'Patients Served', value: '100,000+' },
    { label: 'Health Tools', value: '100+' },
    { label: 'Courses Available', value: '500+' }
  ];

  const benefits = [
    {
      icon: Shield,
      title: 'HIPAA Compliant',
      description: 'Your health data is protected with enterprise-grade security'
    },
    {
      icon: Award,
      title: 'Verified Providers',
      description: 'All healthcare providers are licensed and background-checked'
    },
    {
      icon: Clock,
      title: '24/7 Access',
      description: 'Access health tools and resources anytime, anywhere'
    },
    {
      icon: Star,
      title: 'Top Rated',
      description: 'Rated #1 healthcare platform by patients and providers'
    }
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary/10 via-white to-accent/10 pt-20 pb-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-5xl md:text-6xl font-bold text-dark mb-6">
              Your Complete
              <span className="text-primary block">Healthcare Platform</span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              Connect with verified healthcare providers, access AI-powered health tools, 
              learn from medical experts, and join a community dedicated to better health outcomes.
            </p>
            
            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <Link
                to="/directory"
                className="bg-primary text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-primary/90 transition-colors flex items-center justify-center"
              >
                <Search className="w-5 h-5 mr-2" />
                Find Healthcare Providers
              </Link>
              <Link
                to="/health-tools"
                className="bg-white text-primary border-2 border-primary px-8 py-4 rounded-lg text-lg font-semibold hover:bg-primary/5 transition-colors flex items-center justify-center"
              >
                <Heart className="w-5 h-5 mr-2" />
                Explore Health Tools
              </Link>
            </div>
            
            {/* Quick Search */}
            <div className="max-w-2xl mx-auto" ref={searchRef}>
              <div className="bg-white rounded-lg shadow-lg p-6 relative">
                <h3 className="text-lg font-semibold text-dark mb-4">Quick Search</h3>
                <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-3">
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      value={query}
                      onChange={(e) => {
                        setQuery(e.target.value);
                        if (e.target.value.length >= 2) {
                          setShowResults(true);
                        } else {
                          setShowResults(false);
                        }
                      }}
                      onFocus={() => {
                        if (query.length >= 2) {
                          setShowResults(true);
                        }
                      }}
                      placeholder="Search by condition, specialty, or location..."
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                    {isLoading && (
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        <Loader2 className="w-5 h-5 text-primary animate-spin" />
                      </div>
                    )}
                  </div>
                  <button 
                    type="submit"
                    className="bg-primary text-white px-6 py-3 rounded-lg hover:bg-primary/90 transition-colors flex items-center justify-center"
                  >
                    <Search className="w-5 h-5 mr-2" />
                    Search
                  </button>
                </form>
                
                {/* Search Results Dropdown */}
                {showResults && results.length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-2 bg-white border border-gray-200 rounded-lg shadow-xl z-10 max-h-80 overflow-y-auto">
                    <div className="p-2">
                      {results.slice(0, 5).map((result) => (
                        <button
                          key={`${result.type}-${result.id}`}
                          onClick={() => handleResultSelect(result)}
                          className="w-full text-left block p-3 hover:bg-gray-50 rounded-lg transition-colors"
                        >
                          <div className="flex items-start space-x-3">
                            <div className="flex-shrink-0 mt-1">
                              {result.type === 'entity' ? (
                                <Stethoscope className="w-4 h-4 text-primary" />
                              ) : result.type === 'tool' ? (
                                <Heart className="w-4 h-4 text-accent" />
                              ) : result.type === 'course' ? (
                                <GraduationCap className="w-4 h-4 text-purple-600" />
                              ) : (
                                <Heart className="w-4 h-4 text-red-600" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center space-x-2">
                                <h4 className="text-sm font-medium text-gray-900 truncate">
                                  {result.title}
                                </h4>
                                <span className={cn(
                                  "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
                                  result.type === 'entity' 
                                    ? 'bg-green-100 text-green-800' 
                                    : result.type === 'tool'
                                    ? 'bg-blue-100 text-blue-800'
                                    : result.type === 'course'
                                    ? 'bg-purple-100 text-purple-800'
                                    : 'bg-red-100 text-red-800'
                                )}>
                                  {result.type === 'entity' ? 'Provider' 
                                    : result.type === 'tool' ? 'Tool' 
                                    : result.type === 'course' ? 'Course'
                                    : 'Cause'}
                                </span>
                              </div>
                              <p className="text-sm text-gray-600 line-clamp-2 mt-1">
                                {result.description}
                              </p>
                              {result.location && (
                                <div className="flex items-center mt-1 text-xs text-gray-500">
                                  <MapPin className="w-3 h-3 mr-1" />
                                  <span>{result.location}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                    <div className="border-t border-gray-100 p-3 bg-gray-50">
                      <button
                        onClick={() => {
                          navigate(`/directory?search=${encodeURIComponent(query)}`);
                          setShowResults(false);
                        }}
                        className="text-primary hover:text-primary/80 text-sm font-medium flex items-center justify-center w-full"
                      >
                        View all {totalCount} results for "{query}"
                        <ArrowRight className="w-4 h-4 ml-1" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-dark text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-accent mb-2">
                  {stat.value}
                </div>
                <div className="text-gray-300">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-light">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-dark mb-4">
              Everything You Need for Better Health
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              From finding the right healthcare provider to managing your wellness journey, 
              CareConnect provides comprehensive tools and resources.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <Link
                  key={index}
                  to={feature.link}
                  className="bg-white p-8 rounded-xl shadow-sm hover:shadow-lg transition-shadow group"
                >
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-6">
                    <Icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold text-dark mb-3 group-hover:text-primary transition-colors">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600 mb-4">{feature.description}</p>
                  <div className="flex items-center text-primary font-medium group-hover:translate-x-1 transition-transform">
                    Learn More
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-dark mb-4">
              Why Choose CareConnect?
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              We're committed to providing the highest quality healthcare platform 
              with security, reliability, and user experience at the forefront.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {benefits.map((benefit, index) => {
              const Icon = benefit.icon;
              return (
                <div key={index} className="text-center">
                  <div className="w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Icon className="w-8 h-8 text-accent" />
                  </div>
                  <h3 className="text-lg font-semibold text-dark mb-3">
                    {benefit.title}
                  </h3>
                  <p className="text-gray-600">{benefit.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-primary to-primary/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Ready to Take Control of Your Health?
          </h2>
          <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
            Join thousands of patients and healthcare providers who trust CareConnect 
            for their healthcare needs.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/register?type=patient"
              className="bg-white text-primary px-8 py-4 rounded-lg text-lg font-semibold hover:bg-gray-50 transition-colors"
            >
              Get Started as Patient
            </Link>
            <Link
              to="/register?type=provider"
              className="bg-accent text-dark px-8 py-4 rounded-lg text-lg font-semibold hover:bg-accent/90 transition-colors"
            >
              Join as Healthcare Provider
            </Link>
          </div>
          
          <div className="mt-8 flex items-center justify-center space-x-6 text-white/80">
            <div className="flex items-center">
              <CheckCircle className="w-5 h-5 mr-2" />
              <span>Free to Join</span>
            </div>
            <div className="flex items-center">
              <CheckCircle className="w-5 h-5 mr-2" />
              <span>Secure & Private</span>
            </div>
            <div className="flex items-center">
              <CheckCircle className="w-5 h-5 mr-2" />
              <span>24/7 Support</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
