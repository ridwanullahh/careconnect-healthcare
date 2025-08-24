// Shop Archive - Healthcare Products & Services
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  ShoppingBag, 
  Search, 
  Filter, 
  Grid, 
  List, 
  Star, 
  Heart,
  ShoppingCart,
  Package,
  Pill,
  Activity,
  Stethoscope,
  ArrowRight
} from 'lucide-react';
import { ECommerceService, Product as ProductType, ProductCategory } from '../../lib/ecommerce';
import LoadingSpinner from '../../components/ui/LoadingSpinner';


const ShopPage: React.FC = () => {
  const [products, setProducts] = useState<ProductType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState('popular');
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  const categories = [
    { id: 'medications', name: 'OTC Medications', icon: Pill, color: 'bg-blue-100 text-blue-600' },
    { id: 'supplements', name: 'Supplements & Vitamins', icon: Activity, color: 'bg-green-100 text-green-600' },
    { id: 'medical_devices', name: 'Medical Devices', icon: Stethoscope, color: 'bg-purple-100 text-purple-600' },
    { id: 'personal_care', name: 'Personal Care', icon: Heart, color: 'bg-pink-100 text-pink-600' },
    { id: 'first_aid', name: 'First Aid & Safety', icon: Package, color: 'bg-red-100 text-red-600' }
  ];

  useEffect(() => {
    loadProducts();
  }, [selectedCategory, sortBy]);

  const loadProducts = async () => {
    setIsLoading(true);
    try {
      const fetchedProducts = await ECommerceService.searchProducts({
        category: selectedCategory as ProductCategory,
      });

      let filteredProducts = fetchedProducts;
      
      // Apply sorting
      switch (sortBy) {
        case 'price-low':
          filteredProducts.sort((a, b) => a.price - b.price);
          break;
        case 'price-high':
          filteredProducts.sort((a, b) => b.price - a.price);
          break;
        case 'rating':
          filteredProducts.sort((a, b) => b.rating - a.rating);
          break;
        case 'newest':
          filteredProducts.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
          break;
        default:
          // Popular (by review count)
          filteredProducts.sort((a, b) => b.review_count - a.review_count);
      }
      
      setProducts(filteredProducts);
    } catch (error) {
      console.error('Failed to load products:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredProducts = products.filter(product => 
    !searchQuery || 
    product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleFavorite = (productId: string) => {
    const newFavorites = new Set(favorites);
    if (favorites.has(productId)) {
      newFavorites.delete(productId);
    } else {
      newFavorites.add(productId);
    }
    setFavorites(newFavorites);
  };

  return (
    <div className="min-h-screen bg-light">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-primary/10 via-white to-accent/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-dark mb-6">
              Healthcare Shop
              <span className="block text-primary">Quality Products & Services</span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              Browse verified healthcare products from trusted providers. 
              From medical devices to supplements, find everything you need for better health.
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search products..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
            
            {/* Filters and View Controls */}
            <div className="flex items-center space-x-4">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="popular">Most Popular</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
                <option value="rating">Highest Rated</option>
                <option value="newest">Newest</option>
              </select>
              
              <div className="flex border border-gray-300 rounded-lg overflow-hidden">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 ${viewMode === 'grid' ? 'bg-primary text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                >
                  <Grid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 ${viewMode === 'list' ? 'bg-primary text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Categories Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm p-6 sticky top-8">
              <h3 className="text-lg font-semibold text-dark mb-4">Categories</h3>
              <div className="space-y-2">
                <button
                  onClick={() => setSelectedCategory('')}
                  className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                    selectedCategory === '' 
                      ? 'bg-primary text-white' 
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  All Products
                </button>
                {categories.map(category => {
                  const Icon = category.icon;
                  return (
                    <button
                      key={category.id}
                      onClick={() => setSelectedCategory(category.id)}
                      className={`w-full text-left px-3 py-2 rounded-lg transition-colors flex items-center space-x-2 ${
                        selectedCategory === category.id 
                          ? 'bg-primary text-white' 
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="text-sm">{category.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Products Grid/List */}
          <div className="lg:col-span-3">
            {isLoading ? (
              <div className="bg-white rounded-lg shadow-sm p-12 text-center">
                <LoadingSpinner size="lg" />
                <p className="text-gray-600 mt-4">Loading products...</p>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="bg-white rounded-lg shadow-sm p-12 text-center">
                <ShoppingBag className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No products found</h3>
                <p className="text-gray-600 mb-6">Try adjusting your search or filters</p>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedCategory('');
                  }}
                  className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-primary/90 transition-colors"
                >
                  Clear Filters
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-6">
                  <p className="text-gray-600">
                    Showing {filteredProducts.length} products
                  </p>
                </div>
                
                <div className={`grid gap-6 ${
                  viewMode === 'grid' 
                    ? 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3' 
                    : 'grid-cols-1'
                }`}>
                  {filteredProducts.map(product => (
                    <div key={product.id} className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow overflow-hidden">
                      {viewMode === 'grid' ? (
                        // Grid view
                        <>
                          <div className="relative">
                            <img
                              src={product.images[0] || '/images/placeholder-product.jpg'}
                              alt={product.name}
                              className="w-full h-48 object-cover"
                            />
                            <button
                              onClick={() => toggleFavorite(product.id)}
                              className={`absolute top-3 right-3 p-2 rounded-full transition-colors ${
                                favorites.has(product.id) 
                                  ? 'bg-red-500 text-white' 
                                  : 'bg-white/80 text-gray-600 hover:bg-white'
                              }`}
                            >
                              <Heart className={`w-4 h-4 ${favorites.has(product.id) ? 'fill-current' : ''}`} />
                            </button>
                            {product.discounted_price && (
                              <div className="absolute top-3 left-3 bg-red-500 text-white px-2 py-1 rounded text-sm font-medium">
                                Save ${(product.price - product.discounted_price).toFixed(2)}
                              </div>
                            )}
                          </div>
                          <div className="p-4">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm text-primary font-medium">{product.brand}</span>
                              <div className="flex items-center">
                                <Star className="w-4 h-4 text-yellow-400 fill-current" />
                                <span className="text-sm text-gray-600 ml-1">{product.rating}</span>
                                <span className="text-sm text-gray-400 ml-1">({product.review_count})</span>
                              </div>
                            </div>
                            <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">{product.name}</h3>
                            <p className="text-gray-600 text-sm mb-3 line-clamp-2">{product.description}</p>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                <span className="text-2xl font-bold text-primary">${product.discounted_price || product.price}</span>
                                {product.discounted_price && (
                                  <span className="text-lg text-gray-400 line-through">${product.price}</span>
                                )}
                              </div>
                              <Link
                                to={`/shop/${product.id}`}
                                className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors flex items-center space-x-1"
                              >
                                <span className="text-sm">View</span>
                                <ArrowRight className="w-3 h-3" />
                              </Link>
                            </div>
                            {!product.stock_quantity || product.stock_quantity < 1 && (
                              <div className="mt-2 text-red-600 text-sm font-medium">Out of Stock</div>
                            )}
                          </div>
                        </>
                      ) : (
                        // List view
                        <div className="flex p-4 space-x-4">
                          <img
                            src={product.images[0] || '/images/placeholder-product.jpg'}
                            alt={product.name}
                            className="w-32 h-32 object-cover rounded-lg"
                          />
                          <div className="flex-1">
                            <div className="flex items-start justify-between">
                              <div>
                                <span className="text-sm text-primary font-medium">{product.brand}</span>
                                <h3 className="text-lg font-semibold text-gray-900 mt-1">{product.name}</h3>
                                <p className="text-gray-600 mt-2">{product.description}</p>
                                <div className="flex items-center mt-2">
                                  <Star className="w-4 h-4 text-yellow-400 fill-current" />
                                  <span className="text-sm text-gray-600 ml-1">{product.rating} ({product.review_count} reviews)</span>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="flex items-center space-x-2">
                                  <span className="text-2xl font-bold text-primary">${product.discounted_price || product.price}</span>
                                  {product.discounted_price && (
                                    <span className="text-lg text-gray-400 line-through">${product.price}</span>
                                  )}
                                </div>
                                <Link
                                  to={`/shop/${product.id}`}
                                  className="mt-2 inline-flex items-center bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors"
                                >
                                  View Product
                                  <ArrowRight className="w-4 h-4 ml-2" />
                                </Link>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShopPage;