// Single Product Detail Page
import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ShoppingCart,
  Heart,
  Star,
  Truck,
  Shield,
  Award,
  ArrowLeft,
  Plus,
  Minus,
  Share2,
  AlertCircle
} from 'lucide-react';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

interface Product {
  id: string;
  name: string;
  description: string;
  longDescription: string;
  price: number;
  originalPrice?: number;
  images: string[];
  category: string;
  tags: string[];
  rating: number;
  reviewCount: number;
  inStock: boolean;
  stockCount: number;
  isPrescriptionRequired: boolean;
  entityId: string;
  entityName: string;
  entityType: 'pharmacy' | 'health_center';
  features: string[];
  ingredients?: string[];
  warnings?: string[];
  dosage?: string;
  shipping: {
    freeShipping: boolean;
    estimatedDays: number;
    cost?: number;
  };
}

interface Review {
  id: string;
  userId: string;
  userName: string;
  rating: number;
  title: string;
  content: string;
  date: string;
  verified: boolean;
}

const ProductDetailPage: React.FC = () => {
  const { productId } = useParams<{ productId: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isFavorite, setIsFavorite] = useState(false);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [activeTab, setActiveTab] = useState('description');

  useEffect(() => {
    loadProduct();
  }, [productId]);

  const loadProduct = async () => {
    setIsLoading(true);
    try {
      // Mock product data (in real app, fetch from database)
      const mockProduct: Product = {
        id: productId!,
        name: 'Digital Thermometer - Instant Read',
        description: 'Fast and accurate digital thermometer with large display and fever alarm.',
        longDescription: `The CareFirst Digital Thermometer provides fast, accurate temperature readings in just 10 seconds. 
        
Featuring a large, easy-to-read LCD display and audible fever alarm, this thermometer is perfect for families. The flexible tip ensures comfortable use for all ages, while the memory function stores the last reading for easy tracking.
        
This FDA-approved thermometer meets the highest standards for accuracy and safety. The waterproof design makes cleaning easy and hygienic.`,
        price: 24.99,
        originalPrice: 34.99,
        images: [
          '/images/products/thermometer-1.jpg',
          '/images/products/thermometer-2.jpg',
          '/images/products/thermometer-3.jpg'
        ],
        category: 'medical-devices',
        tags: ['thermometer', 'digital', 'fever', 'medical'],
        rating: 4.8,
        reviewCount: 234,
        inStock: true,
        stockCount: 45,
        isPrescriptionRequired: false,
        entityId: '1',
        entityName: 'CareFirst Medical Center',
        entityType: 'health_center',
        features: [
          'Fast 10-second reading',
          'Large LCD display',
          'Audible fever alarm',
          'Memory function',
          'Flexible tip',
          'Waterproof design',
          'FDA approved',
          'Auto shut-off'
        ],
        warnings: [
          'Clean before and after each use',
          'Store in protective case when not in use',
          'Do not expose to extreme temperatures',
          'Replace battery when low battery indicator appears'
        ],
        dosage: 'For oral, rectal, or underarm use. Follow included instructions for proper measurement technique.',
        shipping: {
          freeShipping: true,
          estimatedDays: 2
        }
      };

      const mockReviews: Review[] = [
        {
          id: '1',
          userId: '1',
          userName: 'Sarah M.',
          rating: 5,
          title: 'Excellent thermometer!',
          content: 'Very accurate and fast. The fever alarm is really helpful with kids.',
          date: '2024-01-15',
          verified: true
        },
        {
          id: '2',
          userId: '2',
          userName: 'Dr. Johnson',
          rating: 5,
          title: 'Professional quality',
          content: 'I recommend this to all my patients. Reliable and easy to use.',
          date: '2024-01-10',
          verified: true
        }
      ];

      setProduct(mockProduct);
      setReviews(mockReviews);
    } catch (error) {
      console.error('Failed to load product:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddToCart = () => {
    // Add to cart logic
    console.log(`Added ${quantity} of ${product?.name} to cart`);
    // Show success message or redirect to cart
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: product?.name,
        text: product?.description,
        url: window.location.href
      });
    } else {
      // Fallback - copy to clipboard
      navigator.clipboard.writeText(window.location.href);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-light flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-light flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Product Not Found</h2>
          <p className="text-gray-600 mb-6">The requested product could not be found.</p>
          <Link
            to="/shop"
            className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-primary/90 transition-colors"
          >
            Back to Shop
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-light">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <nav className="flex items-center space-x-2 text-sm text-gray-600 mb-8">
          <Link to="/" className="hover:text-primary">Home</Link>
          <span>/</span>
          <Link to="/shop" className="hover:text-primary">Shop</Link>
          <span>/</span>
          <span className="text-gray-900">{product.name}</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-12">
          {/* Product Images */}
          <div>
            <div className="mb-4">
              <img
                src={product.images[selectedImage] || '/images/placeholder-product.jpg'}
                alt={product.name}
                className="w-full h-96 object-cover rounded-lg shadow-lg"
              />
            </div>
            <div className="flex space-x-2 overflow-x-auto">
              {product.images.map((image, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedImage(index)}
                  className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 ${
                    selectedImage === index ? 'border-primary' : 'border-gray-200'
                  }`}
                >
                  <img
                    src={image || '/images/placeholder-product.jpg'}
                    alt={`${product.name} view ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Product Info */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-primary font-medium">{product.entityName}</span>
              <button onClick={handleShare} className="p-2 text-gray-400 hover:text-gray-600">
                <Share2 className="w-5 h-5" />
              </button>
            </div>
            
            <h1 className="text-3xl font-bold text-dark mb-4">{product.name}</h1>
            
            <div className="flex items-center space-x-4 mb-4">
              <div className="flex items-center">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`w-5 h-5 ${
                      i < Math.floor(product.rating) 
                        ? 'text-yellow-400 fill-current' 
                        : 'text-gray-300'
                    }`}
                  />
                ))}
                <span className="ml-2 text-lg font-medium">{product.rating}</span>
                <span className="ml-1 text-gray-600">({product.reviewCount} reviews)</span>
              </div>
            </div>
            
            <p className="text-gray-700 mb-6">{product.description}</p>
            
            <div className="flex items-center space-x-4 mb-6">
              <span className="text-3xl font-bold text-primary">${product.price}</span>
              {product.originalPrice && (
                <>
                  <span className="text-xl text-gray-400 line-through">${product.originalPrice}</span>
                  <span className="bg-red-100 text-red-800 px-2 py-1 rounded text-sm font-medium">
                    Save ${(product.originalPrice - product.price).toFixed(2)}
                  </span>
                </>
              )}
            </div>
            
            {/* Stock Status */}
            <div className="mb-6">
              {product.inStock ? (
                <div className="flex items-center text-green-600">
                  <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                  <span>In Stock ({product.stockCount} available)</span>
                </div>
              ) : (
                <div className="flex items-center text-red-600">
                  <AlertCircle className="w-4 h-4 mr-2" />
                  <span>Out of Stock</span>
                </div>
              )}
            </div>
            
            {/* Prescription Required */}
            {product.isPrescriptionRequired && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                <div className="flex items-center">
                  <AlertCircle className="w-5 h-5 text-yellow-600 mr-2" />
                  <span className="text-yellow-800 font-medium">Prescription Required</span>
                </div>
                <p className="text-yellow-700 text-sm mt-1">
                  This product requires a valid prescription. Please contact the provider to arrange purchase.
                </p>
              </div>
            )}
            
            {/* Quantity and Add to Cart */}
            {product.inStock && !product.isPrescriptionRequired && (
              <div className="flex items-center space-x-4 mb-6">
                <div className="flex items-center border border-gray-300 rounded-lg">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="p-2 hover:bg-gray-100"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="px-4 py-2 min-w-[3rem] text-center">{quantity}</span>
                  <button
                    onClick={() => setQuantity(Math.min(product.stockCount, quantity + 1))}
                    className="p-2 hover:bg-gray-100"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                
                <button
                  onClick={handleAddToCart}
                  className="flex-1 bg-primary text-white py-3 px-6 rounded-lg hover:bg-primary/90 transition-colors flex items-center justify-center space-x-2"
                >
                  <ShoppingCart className="w-5 h-5" />
                  <span>Add to Cart</span>
                </button>
                
                <button
                  onClick={() => setIsFavorite(!isFavorite)}
                  className={`p-3 rounded-lg border transition-colors ${
                    isFavorite 
                      ? 'bg-red-50 border-red-200 text-red-600' 
                      : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <Heart className={`w-5 h-5 ${isFavorite ? 'fill-current' : ''}`} />
                </button>
              </div>
            )}
            
            {/* Shipping Info */}
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <div className="flex items-center">
                <Truck className="w-5 h-5 text-green-600 mr-2" />
                <span className="text-sm">
                  {product.shipping.freeShipping ? 'Free shipping' : `Shipping: $${product.shipping.cost}`}
                </span>
              </div>
              <div className="flex items-center">
                <Shield className="w-5 h-5 text-blue-600 mr-2" />
                <span className="text-sm">30-day return policy</span>
              </div>
              <div className="flex items-center">
                <Award className="w-5 h-5 text-purple-600 mr-2" />
                <span className="text-sm">Quality guaranteed</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Product Details Tabs */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              {[
                { id: 'description', label: 'Description' },
                { id: 'features', label: 'Features' },
                { id: 'reviews', label: `Reviews (${reviews.length})` },
                { id: 'shipping', label: 'Shipping & Returns' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-primary text-primary'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
          
          <div className="p-6">
            {activeTab === 'description' && (
              <div className="prose max-w-none">
                <div className="whitespace-pre-wrap text-gray-700">{product.longDescription}</div>
                {product.warnings && product.warnings.length > 0 && (
                  <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <h4 className="font-semibold text-yellow-800 mb-2">Important Information</h4>
                    <ul className="list-disc list-inside space-y-1 text-yellow-700">
                      {product.warnings.map((warning, index) => (
                        <li key={index} className="text-sm">{warning}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
            
            {activeTab === 'features' && (
              <div>
                <h3 className="text-lg font-semibold mb-4">Key Features</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {product.features.map((feature, index) => (
                    <div key={index} className="flex items-center space-x-3">
                      <div className="w-2 h-2 bg-primary rounded-full"></div>
                      <span className="text-gray-700">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {activeTab === 'reviews' && (
              <div className="space-y-6">
                {reviews.map((review) => (
                  <div key={review.id} className="border-b border-gray-200 pb-6">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">{review.userName}</span>
                        {review.verified && (
                          <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                            Verified Purchase
                          </span>
                        )}
                      </div>
                      <span className="text-sm text-gray-500">{review.date}</span>
                    </div>
                    <div className="flex items-center mb-2">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`w-4 h-4 ${
                            i < review.rating 
                              ? 'text-yellow-400 fill-current' 
                              : 'text-gray-300'
                          }`}
                        />
                      ))}
                    </div>
                    <h4 className="font-medium mb-2">{review.title}</h4>
                    <p className="text-gray-700">{review.content}</p>
                  </div>
                ))}
              </div>
            )}
            
            {activeTab === 'shipping' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-2">Shipping Information</h3>
                  <p className="text-gray-700 mb-4">
                    {product.shipping.freeShipping 
                      ? 'Free shipping on this item.' 
                      : `Shipping cost: $${product.shipping.cost}`
                    }
                  </p>
                  <p className="text-gray-700">
                    Estimated delivery: {product.shipping.estimatedDays} business days
                  </p>
                </div>
                
                <div>
                  <h3 className="text-lg font-semibold mb-2">Returns</h3>
                  <p className="text-gray-700">
                    Items can be returned within 30 days of purchase in original condition. 
                    Medical devices must be unopened for hygienic reasons.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetailPage;