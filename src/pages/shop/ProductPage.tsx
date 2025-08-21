import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ECommerceService, Product } from '../../lib/ecommerce';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { Star, Heart, ShoppingCart, ArrowLeft, CheckCircle, Shield } from 'lucide-react';

const ProductPage: React.FC = () => {
  const { productId } = useParams<{ productId: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [isFavorite, setIsFavorite] = useState(false);
  const [activeImage, setActiveImage] = useState(0);

  useEffect(() => {
    if (productId) {
      loadProduct(productId);
    }
  }, [productId]);

  const loadProduct = async (id: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const fetchedProduct = await ECommerceService.getProduct(id);
      if (fetchedProduct) {
        setProduct(fetchedProduct);
      } else {
        setError('Product not found.');
      }
    } catch (err) {
      setError('Failed to load product details.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuantityChange = (amount: number) => {
    setQuantity(prev => {
      const newQuantity = prev + amount;
      if (newQuantity < 1) return 1;
      if (product && newQuantity > product.stock_quantity) return product.stock_quantity;
      return newQuantity;
    });
  };

  const handleAddToCart = async () => {
    if (!product) return;
    // In a real app, you would get the userId from auth context
    const userId = 'user-123'; 
    try {
      await ECommerceService.addToCart(userId, product.id, quantity);
      // Add toast notification for success
      alert(`${quantity} x ${product.name} added to cart!`);
    } catch (err) {
      console.error('Failed to add to cart:', err);
      // Add toast notification for error
      alert('Failed to add item to cart.');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-light">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-light text-center px-4">
        <h2 className="text-2xl font-bold text-red-600 mb-4">{error}</h2>
        <Link to="/shop" className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-primary/90 transition-colors">
          Back to Shop
        </Link>
      </div>
    );
  }

  if (!product) {
    return null; 
  }

  return (
    <div className="bg-light py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Link to="/shop" className="inline-flex items-center text-primary mb-6 hover:underline">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to all products
        </Link>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Product Images */}
          <div>
            <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
              <img
                src={product.images[activeImage] || '/images/placeholder-product.jpg'}
                alt={product.name}
                className="w-full h-96 object-contain rounded-lg"
              />
            </div>
            <div className="flex space-x-2">
              {product.images.map((img, index) => (
                <button
                  key={index}
                  onClick={() => setActiveImage(index)}
                  className={`w-20 h-20 rounded-lg overflow-hidden border-2 ${
                    activeImage === index ? 'border-primary' : 'border-transparent'
                  }`}
                >
                  <img src={img} alt={`${product.name} thumbnail ${index + 1}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>

          {/* Product Details */}
          <div className="bg-white rounded-lg shadow-sm p-8">
            <div className="flex justify-between items-start">
                <div>
                    <span className="text-sm text-gray-500 uppercase">{product.category}</span>
                    <h1 className="text-3xl font-bold text-dark mt-1">{product.name}</h1>
                </div>
                <button
                    onClick={() => setIsFavorite(!isFavorite)}
                    className={`p-2 rounded-full transition-colors ${
                        isFavorite 
                        ? 'bg-red-100 text-red-500' 
                        : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                    }`}
                >
                    <Heart className={`w-6 h-6 ${isFavorite ? 'fill-current' : ''}`} />
                </button>
            </div>
            
            <div className="flex items-center my-4">
              <div className="flex items-center">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`w-5 h-5 ${
                      i < Math.round(product.rating) ? 'text-yellow-400 fill-current' : 'text-gray-300'
                    }`}
                  />
                ))}
              </div>
              <span className="ml-2 text-gray-600">{product.rating.toFixed(1)} ({product.review_count} reviews)</span>
            </div>

            <p className="text-gray-700 leading-relaxed mb-6">{product.description}</p>

            <div className="mb-6">
                <span className="text-4xl font-bold text-primary">${product.price.toFixed(2)}</span>
                {product.discounted_price && (
                    <span className="ml-2 text-xl text-gray-400 line-through">${product.discounted_price.toFixed(2)}</span>
                )}
            </div>

            {product.is_prescription_required && (
                <div className="bg-blue-50 border-l-4 border-blue-400 text-blue-700 p-4 rounded-r-lg mb-6">
                    <p className="font-bold">Prescription Required</p>
                    <p>A valid prescription is needed to purchase this item.</p>
                </div>
            )}
            
            <div className="flex items-center space-x-4 mb-6">
              <div className="flex items-center border border-gray-300 rounded-lg">
                <button onClick={() => handleQuantityChange(-1)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-l-lg">-</button>
                <span className="px-4 py-2 font-semibold">{quantity}</span>
                <button onClick={() => handleQuantityChange(1)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-r-lg">+</button>
              </div>
              <button
                onClick={handleAddToCart}
                disabled={!product.stock_quantity || product.stock_quantity < 1}
                className="flex-1 bg-primary text-white py-3 px-6 rounded-lg hover:bg-primary/90 transition-colors flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ShoppingCart className="w-5 h-5" />
                <span>{product.stock_quantity > 0 ? 'Add to Cart' : 'Out of Stock'}</span>
              </button>
            </div>

            <div className="border-t border-gray-200 pt-6 space-y-4">
                <div className="flex items-center text-gray-600">
                    <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                    <span>
                        {product.stock_quantity > 0 
                            ? `${product.stock_quantity} units in stock` 
                            : 'Currently out of stock'}
                    </span>
                </div>
                <div className="flex items-center text-gray-600">
                    <Shield className="w-5 h-5 text-blue-500 mr-3" />
                    <span>Sold by <Link to={`/entity/${product.entity_id}`} className="text-primary hover:underline">{product.brand}</Link></span>
                </div>
            </div>
            
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductPage;