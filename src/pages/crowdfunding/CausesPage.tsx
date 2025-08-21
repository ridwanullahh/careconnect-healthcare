import { useState, useEffect } from 'react';
import { Cause } from '../../lib/crowdfunding';
import { getCauses } from '../../lib/database';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { Link } from 'react-router-dom';

const CausesPage = () => {
  const [causes, setCauses] = useState<Cause[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');

  useEffect(() => {
    const loadCauses = async () => {
      try {
        const causesData = await getCauses();
        setCauses(causesData || []);
      } catch (err) {
        setError('Failed to load causes');
        console.error('Error loading causes:', err);
      } finally {
        setLoading(false);
      }
    };

    loadCauses();
  }, []);

  const filteredCauses = causes.filter(cause => {
    const matchesSearch = cause.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         cause.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !selectedCategory || cause.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = [...new Set(causes.map(cause => cause.category))];

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
        <h1 className="text-4xl font-bold text-dark mb-4">Healthcare Causes</h1>
        <p className="text-gray-600 text-lg">
          Support meaningful healthcare initiatives and make a difference in your community
        </p>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search Causes
            </label>
            <input
              type="text"
              placeholder="Search by title or description..."
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
              {categories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-8">
          <p className="text-red-600">{error}</p>
        </div>
      )}

      {/* Causes Grid */}
      {filteredCauses.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-8 text-center">
          <h3 className="text-xl font-semibold text-gray-800 mb-2">No Causes Found</h3>
          <p className="text-gray-600">
            {searchTerm || selectedCategory 
              ? 'Try adjusting your search criteria'
              : 'No causes are currently available'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCauses.map(cause => {
            const progressPercentage = cause.goal_amount > 0 
              ? Math.min((cause.raised_amount / cause.goal_amount) * 100, 100)
              : 0;
            
            return (
              <div key={cause.id} className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow overflow-hidden">
                {/* Cause Image */}
                <div className="h-48 bg-gradient-to-r from-primary to-accent"></div>
                
                {/* Cause Content */}
                <div className="p-6">
                  <div className="flex justify-between items-start mb-3">
                    <span className="bg-primary text-white text-xs px-2 py-1 rounded">
                      {cause.category}
                    </span>
                    <span className={`text-xs px-2 py-1 rounded ${
                      cause.status === 'active' ? 'bg-green-100 text-green-800' :
                      cause.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {cause.status}
                    </span>
                  </div>
                  
                  <h3 className="text-xl font-semibold text-dark mb-2">{cause.title}</h3>
                  <p className="text-gray-600 text-sm mb-4 line-clamp-3">{cause.description}</p>
                  
                  {/* Progress Bar */}
                  <div className="mb-4">
                    <div className="flex justify-between text-sm text-gray-600 mb-1">
                      <span>Raised: ${cause.raised_amount.toLocaleString()}</span>
                      <span>Goal: ${cause.goal_amount.toLocaleString()}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-primary h-2 rounded-full transition-all duration-300"
                        style={{ width: `${progressPercentage}%` }}
                      ></div>
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      {progressPercentage.toFixed(1)}% funded
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-sm text-gray-500">
                      {cause.supporters_count || 0} supporters
                    </span>
                    <span className="text-sm text-gray-500">
                      {cause.days_left || 0} days left
                    </span>
                  </div>
                  
                  <Link
                    to={`/causes/${cause.id}`}
                    className="w-full bg-primary text-white py-2 px-4 rounded-lg hover:bg-primary/90 transition-colors text-center block"
                  >
                    View Details
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default CausesPage;