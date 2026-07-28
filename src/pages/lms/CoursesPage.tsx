import { useState, useEffect } from 'react';
import { Course, COURSE_CATEGORIES, PRODUCTION_COURSES, LMSService } from '../../lib/lms';
import { githubDB, collections } from '../../lib/database';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { Link } from 'react-router-dom';

const CoursesPage = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedLevel, setSelectedLevel] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('');
  const [sortBy, setSortBy] = useState('popularity');
  const [showFreeOnly, setShowFreeOnly] = useState(false);

  useEffect(() => {
    const loadCourses = async () => {
      try {
        const fetchedCourses = await LMSService.searchCourses({
          // We can add filters here later
        });
        if (fetchedCourses.length === 0) {
          console.log('Initializing starter courses...');
          for (const course of PRODUCTION_COURSES) {
            await githubDB.insert(collections.courses, course);
          }
          const allCourses = await LMSService.searchCourses({});
          setCourses(allCourses);
        } else {
          setCourses(fetchedCourses);
        }
      } catch (err) {
        // Fallback to starter courses if database fails
        console.warn('Database error, using starter courses:', err);
        setCourses(PRODUCTION_COURSES);
      } finally {
        setLoading(false);
      }
    };

    loadCourses();
  }, []);

  const filteredCourses = courses
    .filter(course => {
      const matchesSearch = searchTerm === '' || 
        course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        course.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        course.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
        
      const matchesCategory = selectedCategory === '' || course.category === selectedCategory;
      const matchesLevel = selectedLevel === '' || course.level === selectedLevel;
      const matchesType = selectedType === '' || course.type === selectedType;
      const matchesFree = !showFreeOnly || course.is_free;
      const matchesLanguage = selectedLanguage === '' || course.language === selectedLanguage;
      
      return matchesSearch && matchesCategory && matchesLevel && matchesType && matchesFree && matchesLanguage;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'popularity':
          return b.enrolled_count - a.enrolled_count;
        case 'rating':
          return b.rating - a.rating;
        case 'newest':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'price_low':
          return a.price - b.price;
        case 'price_high':
          return b.price - a.price;
        default:
          return 0;
      }
    });

  const stats = {
    total: courses.length,
    free: courses.filter(c => c.is_free).length,
    certified: courses.filter(c => c.provides_certificate).length,
    totalStudents: courses.reduce((sum, c) => sum + c.enrolled_count, 0)
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-light flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-dark mb-4">Health Education Courses</h1>
        <p className="text-gray-600 text-lg mb-6">
          Expand your health knowledge with our comprehensive online courses designed by healthcare professionals
        </p>
        
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-white rounded-lg shadow-sm p-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">{stats.total}</div>
            <div className="text-sm text-gray-600">Total Courses</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{stats.free}</div>
            <div className="text-sm text-gray-600">Free Courses</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{stats.certified}</div>
            <div className="text-sm text-gray-600">With Certificates</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">{stats.totalStudents.toLocaleString()}</div>
            <div className="text-sm text-gray-600">Students Enrolled</div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search Courses
            </label>
            <input
              type="text"
              placeholder="Search by title, description, or tags..."
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Category
            </label>
            <select
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              <option value="">All Categories</option>
              {COURSE_CATEGORIES.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Level
            </label>
            <select
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              value={selectedLevel}
              onChange={(e) => setSelectedLevel(e.target.value)}
            >
              <option value="">All Levels</option>
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
              <option value="expert">Expert</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Course Type
            </label>
            <select
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
            >
              <option value="">All Types</option>
              <option value="self_paced">Self-Paced</option>
              <option value="instructor_led">Instructor-Led</option>
              <option value="hybrid">Hybrid</option>
              <option value="certification">Certification</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Language
            </label>
            <select
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
            >
              <option value="">All Languages</option>
              <option value="English">English</option>
              <option value="Spanish">Spanish</option>
              <option value="French">French</option>
              <option value="German">German</option>
              <option value="Mandarin">Mandarin</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Sort By
            </label>
            <select
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="popularity">Most Popular</option>
              <option value="rating">Highest Rated</option>
              <option value="newest">Newest</option>
              <option value="price_low">Price: Low to High</option>
              <option value="price_high">Price: High to Low</option>
            </select>
          </div>

          <div className="flex items-end">
            <label className="flex items-center space-x-3 cursor-pointer">
              <input
                type="checkbox"
                checked={showFreeOnly}
                onChange={(e) => setShowFreeOnly(e.target.checked)}
                className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
              />
              <span className="text-sm font-medium text-gray-700">
                Free courses only
              </span>
            </label>
          </div>
        </div>
      </div>

      {/* Results Counter */}
      <div className="mb-6 text-gray-600">
        Showing {filteredCourses.length} of {courses.length} courses
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-8">
          <p className="text-red-600">{error}</p>
        </div>
      )}

      {/* Courses Grid */}
      {filteredCourses.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-8 text-center">
          <div className="max-w-md mx-auto">
            <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.34 0-4.47-.881-6.08-2.33" />
            </svg>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">No Courses Found</h3>
            <p className="text-gray-600">
              {searchTerm || selectedCategory || selectedLevel || selectedType || showFreeOnly 
                ? 'Try adjusting your search criteria or filters'
                : 'No courses are currently available'}
            </p>
            {(searchTerm || selectedCategory || selectedLevel || selectedType || showFreeOnly) && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setSelectedCategory('');
                  setSelectedLevel('');
                  setSelectedType('');
                  setShowFreeOnly(false);
                }}
                className="mt-4 text-primary hover:text-primary/80 font-medium"
              >
                Clear all filters
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCourses.map(course => (
            <div key={course.id} className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow overflow-hidden group">
              {/* Course Image */}
              <div className="h-48 bg-gradient-to-r from-primary to-accent relative overflow-hidden">
                {course.thumbnail_url ? (
                  <img 
                    src={course.thumbnail_url} 
                    alt={course.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white text-2xl font-bold">
                    {course.title.charAt(0)}
                  </div>
                )}
                
                {/* Badges */}
                <div className="absolute top-3 left-3 flex flex-wrap gap-2">
                  <span className="bg-primary text-white text-xs px-2 py-1 rounded">
                    {course.category}
                  </span>
                  {course.provides_certificate && (
                    <span className="bg-yellow-500 text-white text-xs px-2 py-1 rounded">
                      Certificate
                    </span>
                  )}
                  {course.is_free && (
                    <span className="bg-green-500 text-white text-xs px-2 py-1 rounded">
                      Free
                    </span>
                  )}
                </div>
              </div>
              
              {/* Course Content */}
              <div className="p-6">
                <div className="flex justify-between items-start mb-3">
                  <span className="bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded">
                    {course.level}
                  </span>
                  <div className="flex items-center gap-1 text-sm text-gray-500">
                    <svg className="w-4 h-4 fill-yellow-400" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                    <span>{course.rating}</span>
                    <span>({course.review_count})</span>
                  </div>
                </div>
                
                <h3 className="text-xl font-semibold text-dark mb-2 group-hover:text-primary transition-colors">
                  {course.title}
                </h3>
                <p className="text-gray-600 text-sm mb-4 line-clamp-3">{course.short_description}</p>
                
                <div className="flex justify-between items-center mb-4">
                  <div className="text-lg font-bold text-primary">
                    {course.is_free ? 'Free' : 
                      course.discounted_price ? (
                        <div className="flex items-center gap-2">
                          <span>${course.discounted_price}</span>
                          <span className="line-through text-gray-400 text-sm">${course.price}</span>
                        </div>
                      ) : `$${course.price}`
                    }
                  </div>
                  <div className="text-sm text-gray-500">
                    {course.estimated_duration}h • {course.enrolled_count} students
                  </div>
                </div>

                {/* Course Stats */}
                <div className="flex justify-between text-xs text-gray-500 mb-4">
                  <span>{course.modules_count} modules</span>
                  <span>{course.lessons_count} lessons</span>
                  <span>{course.language}</span>
                </div>

                {/* Skills Tags */}
                {course.skills_gained && course.skills_gained.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-4">
                    {course.skills_gained.slice(0, 3).map(skill => (
                      <span key={skill} className="bg-blue-50 text-blue-700 text-xs px-2 py-1 rounded">
                        {skill}
                      </span>
                    ))}
                    {course.skills_gained.length > 3 && (
                      <span className="text-xs text-gray-500">+{course.skills_gained.length - 3} more</span>
                    )}
                  </div>
                )}
                
                <Link
                  to={`/courses/${course.id}`}
                  className="w-full bg-primary text-white py-2 px-4 rounded-lg hover:bg-primary/90 transition-colors text-center block font-medium"
                >
                  View Details
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Load More Button (for pagination in real implementation) */}
      {filteredCourses.length > 0 && filteredCourses.length === courses.length && (
        <div className="text-center mt-8">
          <button className="bg-gray-200 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-300 transition-colors">
            Load More Courses
          </button>
        </div>
      )}
    </div>
  );
};

export default CoursesPage;