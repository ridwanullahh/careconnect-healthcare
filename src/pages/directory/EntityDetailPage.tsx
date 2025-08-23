import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { HealthcareEntity, getEntity } from '../../lib/entities';
import { Course, LMSService } from '../../lib/lms';
import { BlogPost, BlogService } from '../../lib/blog';
import { Product, ECommerceService } from '../../lib/ecommerce';
import { Cause, CrowdfundingService } from '../../lib/crowdfunding';
import { JobService, JobPosting } from '../../lib/jobs';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import {
  MapPin, Phone, Mail, Globe, Clock, Star, Shield, Users, Calendar,
  BookOpen, Newspaper, ShoppingBag, Heart, Stethoscope, Award,
  MessageSquare, Share2, Bookmark, ExternalLink, ChevronRight,
  CheckCircle, AlertCircle, Camera, Video, FileText, Download,
  Zap, Target, TrendingUp, Activity, Building, User, Briefcase,
  DollarSign, Eye
} from 'lucide-react';

const EntityDetailPage = () => {
  const { entityId } = useParams<{ entityId: string }>();
  const [entity, setEntity] = useState<HealthcareEntity | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [causes, setCauses] = useState<Cause[]>([]);
  const [jobs, setJobs] = useState<JobPosting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  
  // Search, filter, and sort states
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [filterCategory, setFilterCategory] = useState('');
  const [priceRange, setPriceRange] = useState({ min: '', max: '' });
  
  const [reviews] = useState([
    {
      id: '1',
      author: 'Sarah Johnson',
      rating: 5,
      comment: 'Excellent service and very professional staff.',
      date: '2024-01-15',
      verified: true
    },
    {
      id: '2', 
      author: 'Michael Chen',
      rating: 4,
      comment: 'Great experience, highly recommend.',
      date: '2024-01-10',
      verified: true
    }
  ]);

  useEffect(() => {
    const loadEntity = async () => {
      if (!entityId) {
        setError('Entity ID not provided');
        setLoading(false);
        return;
      }

      try {
        const entityData = await getEntity(entityId);
        setEntity(entityData);

        if (entityData) {
          const [entityCourses, entityBlogPosts, entityProducts, entityCauses] = await Promise.all([
            LMSService.searchCourses({ entity_id: entityId }),
            BlogService.getPosts({ query: '', category: '', tag: '', sortBy: 'newest' }),
            ECommerceService.searchProducts({ entity_id: entityId }),
            CrowdfundingService.searchCauses({ entity_id: entityId })
          ]);
          setCourses(entityCourses.filter(c => c.entity_id === entityId));
          setBlogPosts(entityBlogPosts.filter(p => p.entityId === entityId));
          setProducts(entityProducts);
          setCauses(entityCauses.filter(c => c.entity_id === entityId));
          
          // Load jobs if entity is a health center
          if (entityData.entity_type === 'health_center') {
            try {
              const entityJobs = await JobService.getJobsByHealthCenter(entityId);
              setJobs(entityJobs.filter(job => job.status === 'published' && job.admin_approved));
            } catch (error) {
              console.error('Failed to load jobs:', error);
              setJobs([]);
            }
          }
          
          // Load bookmark status
          const bookmarks = JSON.parse(localStorage.getItem('bookmarkedEntities') || '[]');
          setIsBookmarked(bookmarks.includes(entityId));
        }
      } catch (err) {
        setError('Failed to load entity details');
        console.error('Error loading entity:', err);
      } finally {
        setLoading(false);
      }
    };

    loadEntity();
  }, [entityId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-light flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-light flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Error</h2>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  if (!entity) {
    return (
      <div className="min-h-screen bg-light flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Entity Not Found</h2>
          <p className="text-gray-600">The requested entity could not be found.</p>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Building, count: null },
    { id: 'services', label: 'Services', icon: Stethoscope, count: entity?.services?.length || 0 },
    { id: 'courses', label: 'Courses', icon: BookOpen, count: courses.length },
    { id: 'blog', label: 'Blog', icon: Newspaper, count: blogPosts.length },
    { id: 'shop', label: 'Shop', icon: ShoppingBag, count: products.length },
    { id: 'causes', label: 'Causes', icon: Heart, count: causes.length },
    ...(entity?.entity_type === 'health_center' ? [{ id: 'jobs', label: 'Jobs', icon: Briefcase, count: jobs.length }] : []),
    { id: 'reviews', label: 'Reviews', icon: Star, count: reviews.length },
    { id: 'contact', label: 'Contact', icon: MessageSquare, count: null }
  ];

  const getEntityTypeIcon = (type: string) => {
    switch (type) {
      case 'health_center': return Building;
      case 'pharmacy': return ShoppingBag;
      case 'practitioner': return User;
      default: return Stethoscope;
    }
  };

  const EntityIcon = getEntityTypeIcon(entity?.entity_type || '');

  // Filter and search functions
  const filterAndSortItems = (items: any[], type: 'courses' | 'blog' | 'shop' | 'causes' | 'jobs') => {
    let filtered = items.filter(item => {
      const matchesSearch = searchTerm === '' || 
        item.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.short_description?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesCategory = filterCategory === '' || 
        item.category === filterCategory ||
        item.level === filterCategory;
      
      const matchesPrice = type === 'shop' || type === 'courses' ? 
        (priceRange.min === '' || item.price >= parseFloat(priceRange.min)) &&
        (priceRange.max === '' || item.price <= parseFloat(priceRange.max)) : true;
      
      return matchesSearch && matchesCategory && matchesPrice;
    });

    // Sort items
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.created_at || b.publishedAt || b.updated_at || 0).getTime() - 
                 new Date(a.created_at || a.publishedAt || a.updated_at || 0).getTime();
        case 'oldest':
          return new Date(a.created_at || a.publishedAt || a.updated_at || 0).getTime() - 
                 new Date(b.created_at || b.publishedAt || b.updated_at || 0).getTime();
        case 'price_low':
          return (a.price || 0) - (b.price || 0);
        case 'price_high':
          return (b.price || 0) - (a.price || 0);
        case 'name':
          return (a.title || a.name || '').localeCompare(b.title || b.name || '');
        case 'popular':
          return (b.views || b.enrollments || 0) - (a.views || a.enrollments || 0);
        default:
          return 0;
      }
    });

    return filtered;
  };

  const FilterControls = ({ type }: { type: 'courses' | 'blog' | 'shop' | 'causes' }) => (
    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Search */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Search</label>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={`Search ${type}...`}
            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
          />
        </div>

        {/* Sort */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Sort By</label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="name">Name A-Z</option>
            <option value="popular">Most Popular</option>
            {(type === 'courses' || type === 'shop') && (
              <>
                <option value="price_low">Price: Low to High</option>
                <option value="price_high">Price: High to Low</option>
              </>
            )}
          </select>
        </div>

        {/* Category Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Category</label>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
          >
            <option value="">All Categories</option>
            {type === 'courses' && (
              <>
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
                <option value="medical">Medical</option>
                <option value="wellness">Wellness</option>
              </>
            )}
            {type === 'blog' && (
              <>
                <option value="health">Health</option>
                <option value="wellness">Wellness</option>
                <option value="nutrition">Nutrition</option>
                <option value="fitness">Fitness</option>
                <option value="mental-health">Mental Health</option>
              </>
            )}
            {type === 'shop' && (
              <>
                <option value="medication">Medication</option>
                <option value="supplements">Supplements</option>
                <option value="equipment">Equipment</option>
                <option value="wellness">Wellness</option>
              </>
            )}
            {type === 'causes' && (
              <>
                <option value="medical">Medical</option>
                <option value="research">Research</option>
                <option value="community">Community</option>
                <option value="emergency">Emergency</option>
              </>
            )}
          </select>
        </div>

        {/* Price Range (for courses and shop) */}
        {(type === 'courses' || type === 'shop') && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Price Range</label>
            <div className="flex gap-2">
              <input
                type="number"
                value={priceRange.min}
                onChange={(e) => setPriceRange({ ...priceRange, min: e.target.value })}
                placeholder="Min"
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
              />
              <input
                type="number"
                value={priceRange.max}
                onChange={(e) => setPriceRange({ ...priceRange, max: e.target.value })}
                placeholder="Max"
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
              />
            </div>
          </div>
        )}
      </div>
      
      {/* Clear Filters */}
      <div className="mt-4 flex justify-end">
        <button
          onClick={() => {
            setSearchTerm('');
            setSortBy('newest');
            setFilterCategory('');
            setPriceRange({ min: '', max: '' });
          }}
          className="text-sm text-primary hover:text-primary/80 transition-colors"
        >
          Clear All Filters
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Hero Section */}
      <div className="relative bg-gradient-to-r from-primary via-accent to-secondary text-white overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-black/30 via-black/10 to-black/30"></div>
        <div className="absolute inset-0 opacity-30" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
        }}></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
          <div className="flex flex-col lg:flex-row items-start lg:items-center gap-6 lg:gap-8">
            {/* Entity Avatar */}
            <div className="flex-shrink-0 mx-auto lg:mx-0">
              <div className="w-24 h-24 sm:w-28 sm:h-28 lg:w-32 lg:h-32 bg-white/10 backdrop-blur-sm rounded-2xl flex items-center justify-center border border-white/20">
                <EntityIcon className="w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 text-white" />
              </div>
            </div>

            {/* Entity Info */}
            <div className="flex-1 text-center lg:text-left">
              <div className="flex flex-col sm:flex-row items-center lg:items-start gap-2 sm:gap-3 mb-4">
                <h1 className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-bold break-words">{entity.name}</h1>
                {entity.verification_status === 'verified' && (
                  <div className="flex items-center gap-1 bg-green-500/20 backdrop-blur-sm px-2 sm:px-3 py-1 rounded-full border border-green-400/30">
                    <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-300" />
                    <span className="text-xs sm:text-sm font-medium text-green-300">Verified</span>
                  </div>
                )}
              </div>
              
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2 sm:gap-4 mb-4 sm:mb-6">
                <span className="bg-white/10 backdrop-blur-sm px-3 sm:px-4 py-1 sm:py-2 rounded-full text-xs sm:text-sm font-medium border border-white/20">
                  {entity.entity_type.replace('_', ' ').toUpperCase()}
                </span>
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-400 fill-current" />
                  <span className="font-semibold text-sm sm:text-base">4.8</span>
                  <span className="text-white/80 text-xs sm:text-sm">({reviews.length} reviews)</span>
                </div>
                <div className="flex items-center gap-1 text-white/80">
                  <MapPin className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="text-xs sm:text-sm">
                    {entity.address?.city}, {entity.address?.state}
                  </span>
                </div>
              </div>

              <p className="text-sm sm:text-base lg:text-lg text-white/90 max-w-2xl leading-relaxed mx-auto lg:mx-0">
                {entity.description || 'Professional healthcare services with a commitment to excellence and patient care.'}
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row lg:flex-col gap-3 w-full lg:w-auto lg:flex-shrink-0">
              <Link
                to={`/book/${entity.id}`}
                className="bg-white text-primary px-4 sm:px-6 py-2 sm:py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors flex items-center justify-center gap-2 text-sm sm:text-base"
              >
                <Calendar className="w-4 h-4 sm:w-5 sm:h-5" />
                Book Appointment
              </Link>
              <button
                onClick={() => setShowContactModal(true)}
                className="bg-white/10 backdrop-blur-sm text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg font-semibold hover:bg-white/20 transition-colors border border-white/20 flex items-center justify-center gap-2 text-sm sm:text-base"
              >
                <Phone className="w-4 h-4 sm:w-5 sm:h-5" />
                Contact
              </button>
              <div className="flex gap-2 justify-center lg:justify-start">
                <button
                  onClick={() => {
                    setIsBookmarked(!isBookmarked);
                    // Add to localStorage for persistence
                    const bookmarks = JSON.parse(localStorage.getItem('bookmarkedEntities') || '[]');
                    if (isBookmarked) {
                      const updated = bookmarks.filter((id: string) => id !== entity.id);
                      localStorage.setItem('bookmarkedEntities', JSON.stringify(updated));
                    } else {
                      bookmarks.push(entity.id);
                      localStorage.setItem('bookmarkedEntities', JSON.stringify(bookmarks));
                    }
                  }}
                  className={`p-2 sm:p-3 rounded-lg transition-colors ${
                    isBookmarked 
                      ? 'bg-yellow-500 text-white' 
                      : 'bg-white/10 backdrop-blur-sm text-white hover:bg-white/20 border border-white/20'
                  }`}
                  title={isBookmarked ? 'Remove Bookmark' : 'Add Bookmark'}
                >
                  <Bookmark className={`w-4 h-4 sm:w-5 sm:h-5 ${isBookmarked ? 'fill-current' : ''}`} />
                </button>
                <button 
                  onClick={() => {
                    if (navigator.share) {
                      navigator.share({
                        title: entity.name,
                        text: entity.description || 'Check out this healthcare provider',
                        url: window.location.href
                      });
                    } else {
                      navigator.clipboard.writeText(window.location.href);
                      alert('Link copied to clipboard!');
                    }
                  }}
                  className="p-2 sm:p-3 bg-white/10 backdrop-blur-sm text-white rounded-lg hover:bg-white/20 transition-colors border border-white/20"
                  title="Share"
                >
                  <Share2 className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-2 sm:space-x-4 lg:space-x-8 overflow-x-auto scrollbar-hide">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1 sm:gap-2 py-3 sm:py-4 px-2 sm:px-1 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap transition-colors min-w-0 flex-shrink-0 ${
                    isActive
                      ? 'border-primary text-primary'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                  <span className="hidden sm:inline">{tab.label}</span>
                  <span className="sm:hidden">{tab.label.split(' ')[0]}</span>
                  {tab.count !== null && tab.count > 0 && (
                    <span className={`ml-1 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-xs flex-shrink-0 ${
                      isActive 
                        ? 'bg-primary text-white' 
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 text-center">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">500+</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Patients Served</div>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 text-center">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <Award className="w-6 h-6 text-green-600" />
                </div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">15+</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Years Experience</div>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 text-center">
                <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <Star className="w-6 h-6 text-yellow-600" />
                </div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">4.8</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Average Rating</div>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 text-center">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <Clock className="w-6 h-6 text-purple-600" />
                </div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">24/7</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Availability</div>
              </div>
            </div>

            {/* About Section */}
            <div className="bg-white dark:bg-gray-800 rounded-lg p-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">About {entity.name}</h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div>
                  <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-6">
                    {entity.description || 'Professional healthcare services with a commitment to excellence and patient care. Our experienced team provides comprehensive medical solutions tailored to your individual needs.'}
                  </p>
                  
                  {/* Key Features */}
                  <div className="space-y-3">
                    <h3 className="font-semibold text-gray-900 dark:text-white">Key Features:</h3>
                    <div className="grid grid-cols-1 gap-2">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-5 h-5 text-green-500" />
                        <span className="text-gray-600 dark:text-gray-400">Board Certified Professionals</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-5 h-5 text-green-500" />
                        <span className="text-gray-600 dark:text-gray-400">State-of-the-art Equipment</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-5 h-5 text-green-500" />
                        <span className="text-gray-600 dark:text-gray-400">Comprehensive Care</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-5 h-5 text-green-500" />
                        <span className="text-gray-600 dark:text-gray-400">Insurance Accepted</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  {/* Contact Information */}
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6">
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Contact Information</h3>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <Phone className="w-5 h-5 text-gray-400" />
                        <span className="text-gray-600 dark:text-gray-400">{entity.phone || 'Not provided'}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Mail className="w-5 h-5 text-gray-400" />
                        <span className="text-gray-600 dark:text-gray-400">{entity.email}</span>
                      </div>
                      <div className="flex items-start gap-3">
                        <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
                        <span className="text-gray-600 dark:text-gray-400">
                          {entity.address 
                            ? `${entity.address?.street || ''}, ${entity.address?.city || ''}, ${entity.address?.state || ''} ${entity.address?.postal_code || ''}`.replace(/,\s*,/g, ',').replace(/^,\s*|,\s*$/g, '') || 'Not provided'
                            : 'Not provided'
                          }
                        </span>
                      </div>
                      {entity.website && (
                        <div className="flex items-center gap-3">
                          <Globe className="w-5 h-5 text-gray-400" />
                          <a href={entity.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                            Visit Website
                          </a>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Operating Hours */}
                  <div className="mt-6 bg-gray-50 dark:bg-gray-700 rounded-lg p-6">
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Operating Hours</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Monday - Friday</span>
                        <span className="text-gray-900 dark:text-white">8:00 AM - 6:00 PM</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Saturday</span>
                        <span className="text-gray-900 dark:text-white">9:00 AM - 4:00 PM</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Sunday</span>
                        <span className="text-gray-900 dark:text-white">Closed</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Services Tab */}
        {activeTab === 'services' && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Our Services</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Mock services - replace with real data */}
                {[
                  { name: 'General Consultation', description: 'Comprehensive health checkups and consultations', icon: Stethoscope },
                  { name: 'Preventive Care', description: 'Vaccinations, screenings, and wellness programs', icon: Shield },
                  { name: 'Emergency Care', description: '24/7 emergency medical services', icon: Zap },
                  { name: 'Specialist Referrals', description: 'Access to specialized medical professionals', icon: Users },
                  { name: 'Telehealth', description: 'Remote consultations and follow-ups', icon: Video },
                  { name: 'Health Education', description: 'Educational resources and wellness programs', icon: BookOpen }
                ].map((service, index) => {
                  const Icon = service.icon;
                  return (
                    <div key={index} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6 hover:shadow-md transition-shadow">
                      <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                        <Icon className="w-6 h-6 text-primary" />
                      </div>
                      <h3 className="font-semibold text-gray-900 dark:text-white mb-2">{service.name}</h3>
                      <p className="text-gray-600 dark:text-gray-400 text-sm">{service.description}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Courses Tab */}
        {activeTab === 'courses' && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 sm:p-8">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Health Courses</h2>
                <span className="text-sm text-gray-500">{filterAndSortItems(courses, 'courses').length} of {courses.length} courses</span>
              </div>
              
              <FilterControls type="courses" />
              
              {filterAndSortItems(courses, 'courses').length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                  {filterAndSortItems(courses, 'courses').map(course => (
                    <Link key={course.id} to={`/courses/${course.id}`} className="group">
                      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6 hover:shadow-md transition-all group-hover:scale-105">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                            <BookOpen className="w-5 h-5 text-primary" />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold text-gray-900 dark:text-white group-hover:text-primary transition-colors">{course.title}</h3>
                            <p className="text-sm text-gray-500">{course.level} • {course.duration}</p>
                          </div>
                        </div>
                        <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">{course.short_description}</p>
                        <div className="flex justify-between items-center">
                          <span className="text-lg font-bold text-primary">${course.price}</span>
                          <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-primary transition-colors" />
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No Courses Available</h3>
                  <p className="text-gray-600 dark:text-gray-400">This provider hasn't published any courses yet.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Blog Tab */}
        {activeTab === 'blog' && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 sm:p-8">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Blog Articles</h2>
                <span className="text-sm text-gray-500">{filterAndSortItems(blogPosts, 'blog').length} of {blogPosts.length} articles</span>
              </div>
              
              <FilterControls type="blog" />
              
              {filterAndSortItems(blogPosts, 'blog').length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                  {filterAndSortItems(blogPosts, 'blog').map(post => (
                    <Link key={post.id} to={`/blog/${post.id}`} className="group">
                      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg overflow-hidden hover:shadow-md transition-all group-hover:scale-105">
                        {post.featuredImage && (
                          <img src={post.featuredImage} alt={post.title} className="w-full h-48 object-cover" />
                        )}
                        <div className="p-6">
                          <div className="flex items-center gap-2 mb-3">
                            <span className="bg-primary/10 text-primary px-2 py-1 rounded-full text-xs font-medium">
                              {post.category}
                            </span>
                            <span className="text-xs text-gray-500">{new Date(post.publishedAt).toLocaleDateString()}</span>
                          </div>
                          <h3 className="font-semibold text-gray-900 dark:text-white group-hover:text-primary transition-colors mb-2">
                            {post.title}
                          </h3>
                          <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 line-clamp-3">{post.excerpt}</p>
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-500">{post.readTime} min read</span>
                            <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-primary transition-colors" />
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Newspaper className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No Blog Posts</h3>
                  <p className="text-gray-600 dark:text-gray-400">This provider hasn't published any blog articles yet.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Shop Tab */}
        {activeTab === 'shop' && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 sm:p-8">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Shop Products</h2>
                <span className="text-sm text-gray-500">{filterAndSortItems(products, 'shop').length} of {products.length} products</span>
              </div>
              
              <FilterControls type="shop" />
              
              {filterAndSortItems(products, 'shop').length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                  {filterAndSortItems(products, 'shop').map(product => (
                    <Link key={product.id} to={`/shop/${product.id}`} className="group">
                      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg overflow-hidden hover:shadow-md transition-all group-hover:scale-105">
                        {product.image_url && (
                          <img src={product.image_url} alt={product.name} className="w-full h-48 object-cover" />
                        )}
                        <div className="p-6">
                          <h3 className="font-semibold text-gray-900 dark:text-white group-hover:text-primary transition-colors mb-2">
                            {product.name}
                          </h3>
                          <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 line-clamp-2">{product.description}</p>
                          <div className="flex justify-between items-center">
                            <span className="text-lg font-bold text-primary">${product.price}</span>
                            <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-primary transition-colors" />
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <ShoppingBag className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No Products Available</h3>
                  <p className="text-gray-600 dark:text-gray-400">This provider doesn't have any products in their shop yet.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Causes Tab */}
        {activeTab === 'causes' && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 sm:p-8">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Healthcare Causes</h2>
                <span className="text-sm text-gray-500">{filterAndSortItems(causes, 'causes').length} of {causes.length} causes</span>
              </div>
              
              <FilterControls type="causes" />
              
              {filterAndSortItems(causes, 'causes').length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                  {filterAndSortItems(causes, 'causes').map(cause => (
                    <Link key={cause.id} to={`/causes/${cause.id}`} className="group">
                      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6 hover:shadow-md transition-all group-hover:scale-105">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                            <Heart className="w-5 h-5 text-red-600" />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold text-gray-900 dark:text-white group-hover:text-primary transition-colors">{cause.title}</h3>
                            <p className="text-sm text-gray-500">Goal: ${cause.goal_amount.toLocaleString()}</p>
                          </div>
                        </div>
                        <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 line-clamp-3">{cause.description}</p>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600 dark:text-gray-400">Progress</span>
                            <span className="font-medium">${cause.current_amount?.toLocaleString() || 0} raised</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-primary h-2 rounded-full" 
                              style={{ width: `${Math.min(((cause.current_amount || 0) / cause.goal_amount) * 100, 100)}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Heart className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No Active Causes</h3>
                  <p className="text-gray-600 dark:text-gray-400">This provider doesn't have any active healthcare causes at the moment.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Jobs Tab */}
        {activeTab === 'jobs' && entity?.entity_type === 'health_center' && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 sm:p-8">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Current Job Openings</h2>
                <span className="text-sm text-gray-500">{filterAndSortItems(jobs, 'jobs').length} of {jobs.length} jobs</span>
              </div>
              
              <FilterControls type="jobs" />
              
              {filterAndSortItems(jobs, 'jobs').length > 0 ? (
                <div className="space-y-4">
                  {filterAndSortItems(jobs, 'jobs').map(job => (
                    <Link key={job.id} to={`/jobs/${job.id}`} className="group block">
                      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6 hover:shadow-md transition-all group-hover:scale-[1.02]">
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-semibold text-gray-900 dark:text-white group-hover:text-primary transition-colors">
                                {job.title}
                              </h3>
                              {job.featured && (
                                <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs font-medium">
                                  Featured
                                </span>
                              )}
                              {job.urgent && (
                                <span className="bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1">
                                  <Zap className="w-3 h-3" />
                                  Urgent
                                </span>
                              )}
                            </div>
                            <p className="text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">{job.description}</p>
                            
                            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 mb-3">
                              <span className="flex items-center gap-1">
                                <MapPin className="w-4 h-4" />
                                {job.location.type === 'remote' ? 'Remote' : `${job.location.city}, ${job.location.state}`}
                              </span>
                              <span className="flex items-center gap-1">
                                <Briefcase className="w-4 h-4" />
                                {job.job_type.replace('_', ' ')}
                              </span>
                              <span className="flex items-center gap-1">
                                <DollarSign className="w-4 h-4" />
                                {job.salary_range.min === 0 && job.salary_range.max === 0 
                                  ? 'Salary not specified'
                                  : `$${job.salary_range.min.toLocaleString()} - $${job.salary_range.max.toLocaleString()}`
                                }
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="w-4 h-4" />
                                {(() => {
                                  const date = new Date(job.created_at);
                                  const now = new Date();
                                  const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
                                  
                                  if (diffInHours < 1) return 'Just posted';
                                  if (diffInHours < 24) return `${diffInHours}h ago`;
                                  const diffInDays = Math.floor(diffInHours / 24);
                                  if (diffInDays < 7) return `${diffInDays}d ago`;
                                  return date.toLocaleDateString();
                                })()}
                              </span>
                            </div>

                            <div className="flex flex-wrap gap-2">
                              <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium">
                                {job.category}
                              </span>
                              <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">
                                {job.experience_level.replace('_', ' ')}
                              </span>
                              {job.specialties.slice(0, 2).map((specialty, index) => (
                                <span key={index} className="bg-gray-100 text-gray-800 px-2 py-1 rounded-full text-xs">
                                  {specialty}
                                </span>
                              ))}
                            </div>
                          </div>
                          
                          <div className="flex flex-col items-end gap-2 ml-4">
                            <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-primary transition-colors" />
                            <div className="flex items-center gap-4 text-xs text-gray-500">
                              <span className="flex items-center gap-1">
                                <Eye className="w-3 h-3" />
                                {job.views}
                              </span>
                              <span className="flex items-center gap-1">
                                <Users className="w-3 h-3" />
                                {job.applications_count}
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        {job.application_deadline && (
                          <div className="pt-3 border-t border-gray-200 dark:border-gray-600">
                            <span className="text-xs text-orange-600 flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" />
                              Application deadline: {new Date(job.application_deadline).toLocaleDateString()}
                            </span>
                          </div>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Briefcase className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No Job Openings</h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    This healthcare provider doesn't have any job openings at the moment.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Reviews Tab */}
        {activeTab === 'reviews' && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-8">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Patient Reviews</h2>
                <div className="text-right">
                  <div className="flex items-center gap-1 mb-1">
                    <Star className="w-5 h-5 text-yellow-400 fill-current" />
                    <span className="font-bold text-lg">4.8</span>
                  </div>
                  <p className="text-sm text-gray-500">{reviews.length} reviews</p>
                </div>
              </div>
              
              <div className="space-y-6">
                {reviews.map(review => (
                  <div key={review.id} className="border-b border-gray-200 dark:border-gray-700 pb-6 last:border-b-0">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                        <User className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-semibold text-gray-900 dark:text-white">{review.author}</h4>
                          {review.verified && (
                            <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">
                              Verified Patient
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1 mb-3">
                          {[...Array(5)].map((_, i) => (
                            <Star 
                              key={i} 
                              className={`w-4 h-4 ${i < review.rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} 
                            />
                          ))}
                          <span className="text-sm text-gray-500 ml-2">{new Date(review.date).toLocaleDateString()}</span>
                        </div>
                        <p className="text-gray-600 dark:text-gray-400">{review.comment}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Contact Tab */}
        {activeTab === 'contact' && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Contact Information</h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                      <Phone className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">Phone</h3>
                      <p className="text-gray-600 dark:text-gray-400">{entity.phone || 'Not provided'}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                      <Mail className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">Email</h3>
                      <p className="text-gray-600 dark:text-gray-400">{entity.email}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                      <MapPin className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">Address</h3>
                      <p className="text-gray-600 dark:text-gray-400">
                        {entity.address 
                          ? `${entity.address?.street || ''}, ${entity.address?.city || ''}, ${entity.address?.state || ''} ${entity.address?.postal_code || ''}`.replace(/,\s*,/g, ',').replace(/^,\s*|,\s*$/g, '') || 'Not provided'
                          : 'Not provided'
                        }
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Send a Message</h3>
                  <form className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Name</label>
                      <input type="text" className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Email</label>
                      <input type="email" className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Message</label>
                      <textarea rows={4} className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"></textarea>
                    </div>
                    <button type="submit" className="w-full bg-primary text-white py-3 rounded-lg hover:bg-primary/90 transition-colors">
                      Send Message
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EntityDetailPage;