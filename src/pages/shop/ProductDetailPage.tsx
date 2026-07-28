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
import { githubDB as dbHelpers, collections } from '../../lib/database';

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

// Coerce a raw product record from the products collection into the shape this
// component expects. Real records vary (some fields may be missing), so every
// access is defensive.
const adaptProduct = (raw: any): Product | null => {
  if (!raw || typeof raw !== 'object') return null;
  const price = Number(raw.price ?? 0);
  const originalPrice =
    raw.discounted_price != null
      ? Number(raw.discounted_price)
      : raw.original_price != null
        ? Number(raw.original_price)
        : undefined;
  const stockCount = Number(raw.stock_quantity ?? raw.stock_count ?? 0);
  const images =
    Array.isArray(raw.images) && raw.images.length > 0
      ? raw.images.filter(Boolean)
      : raw.image_url
        ? [raw.image_url]
        : ['/images/placeholder-product.jpg'];
  const tags = Array.isArray(raw.tags)
    ? raw.tags
    : Array.isArray(raw.specialties)
      ? raw.specialties
      : [];
  const features = Array.isArray(raw.features)
    ? raw.features
    : Array.isArray(raw.highlights)
      ? raw.highlights
      : [];
  const warnings = Array.isArray(raw.warnings)
    ? raw.warnings
    : Array.isArray(raw.precautions)
      ? raw.precautions
      : undefined;
  const ingredients = Array.isArray(raw.ingredients) ? raw.ingredients : undefined;
  return {
    id: String(raw.id),
    name: raw.name || raw.title || 'Product',
    description: raw.description || raw.short_description || '',
    longDescription:
      raw.long_description ||
      raw.description ||
      raw.longDescription ||
      raw.short_description ||
      '',
    price: isNaN(price) ? 0 : price,
    originalPrice:
      originalPrice != null && !isNaN(originalPrice) ? originalPrice : undefined,
    images,
    category: raw.category || raw.product_type || 'general',
    tags,
    rating: Number(raw.rating ?? 0) || 0,
    reviewCount: Number(raw.review_count ?? 0) || 0,
    inStock: raw.is_in_stock != null ? !!raw.is_in_stock : stockCount > 0,
    stockCount,
    isPrescriptionRequired: !!raw.is_prescription_required,
    entityId: raw.entity_id || '',
    entityName: raw.brand || raw.entity_name || raw.seller || 'CareConnect Marketplace',
    entityType: raw.entity_type === 'pharmacy' ? 'pharmacy' : 'health_center',
    features,
    ingredients,
    warnings,
    dosage: raw.dosage || raw.usage_instructions || undefined,
    shipping: {
      freeShipping: raw.free_shipping != null ? !!raw.free_shipping : true,
      estimatedDays: Number(raw.estimated_days ?? 2) || 2,
      cost: raw.shipping_cost != null ? Number(raw.shipping_cost) : undefined
    }
  };
};

const adaptReview = (raw: any): Review => ({
  id: String(raw.id ?? raw.uid ?? ''),
  userId: String(raw.user_id ?? raw.reviewer_id ?? ''),
  userName: raw.user_name || raw.author_name || raw.reviewer_name || 'Anonymous',
  rating: Number(raw.rating ?? 0) || 0,
  title: raw.title || raw.subject || '',
  content: raw.content || raw.comment || raw.body || '',
  date: raw.date || raw.created_at || raw.review_date || new Date().toISOString(),
  verified: !!raw.verified_purchase
});

const ProductDetailPage: React.FC = () => {
  const { productId } = useParams<{ productId: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [activeTab, setActiveTab] = useState('description');

  useEffect(() => {
    let cancelled = false;
    const loadProduct = async () => {
      if (!productId) {
        setError('Product ID not provided.');
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      setError(null);
      try {
        // Reviews may be keyed under product_id OR entity_id depending on the
        // seed/migration source, so we query both and de-dupe by id.
        const [rawProduct, reviewsByProduct, reviewsByEntity] = await Promise.all([
          dbHelpers.findById<any>(collections.products, productId).catch(() => null),
          dbHelpers.find<any>(collections.reviews, { product_id: productId }).catch(() => []),
          dbHelpers.find<any>(collections.reviews, { entity_id: productId }).catch(() => [])
        ]);
        if (cancelled) return;

        if (!rawProduct) {
          setProduct(null);
          setReviews([]);
          setError('Product not found.');
          return;
        }
        const adapted = adaptProduct(rawProduct);
        if (adapted) setProduct(adapted);

        const merged = [...(reviewsByProduct || []), ...(reviewsByEntity || [])];
        const seen = new Set<string>();
        const deduped: Review[] = [];
        for (const raw of merged) {
          const id = String(raw.id ?? raw.uid ?? '');
          if (id && !seen.has(id)) {
            seen.add(id);
            deduped.push(adaptReview(raw));
          }
        }
        deduped.sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        );
        setReviews(deduped);
      } catch (err) {
        if (!cancelled) {
          console.error('Failed to load product:', err);
          setError('Failed to load product details.');
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    loadProduct();
    return () => {
      cancelled = true;
    };
  }, [productId]);

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

  if (error || !product) {
    return (
      <div className="min-h-screen bg-light flex items-center justify-center">
        <div className="text-center">
          {error && (
            <div className="mb-4 inline-flex items-center bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg text-sm">
              <AlertCircle className="w-4 h-4 mr-2" />
              {error}
            </div>
          )}
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
                {product.features.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {product.features.map((feature, index) => (
                      <div key={index} className="flex items-center space-x-3">
                        <div className="w-2 h-2 bg-primary rounded-full"></div>
                        <span className="text-gray-700">{feature}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm">No additional features listed for this product.</p>
                )}
              </div>
            )}
            
            {activeTab === 'reviews' && (
              <div className="space-y-6">
                {reviews.length === 0 ? (
                  <div className="text-center py-8">
                    <Star className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">No reviews yet. Be the first to share your experience.</p>
                  </div>
                ) : (
                  reviews.map((review) => (
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
                        <span className="text-sm text-gray-500">
                          {new Date(review.date).toLocaleDateString()}
                        </span>
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
                      {review.title && <h4 className="font-medium mb-2">{review.title}</h4>}
                      <p className="text-gray-700">{review.content}</p>
                    </div>
                  ))
                )}
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
