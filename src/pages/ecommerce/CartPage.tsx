import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ECommerceService, OrderItem } from '../../lib/ecommerce';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { Trash2, Plus, Minus, ShoppingCart, ArrowRight } from 'lucide-react';

interface CartViewItem extends OrderItem {
  product: any; // Replace with a proper Product type
}

const CartPage: React.FC = () => {
  const navigate = useNavigate();
  const [cartItems, setCartItems] = useState<CartViewItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadCart();
  }, []);

  const loadCart = async () => {
    setIsLoading(true);
    // In a real app, you would get the userId from auth context
    const userId = 'user-123'; 
    try {
      const items = await ECommerceService.getCart(userId);
      setCartItems(items);
    } catch (error) {
      console.error('Failed to load cart:', error);
      // Handle error display
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateQuantity = async (productId: string, newQuantity: number) => {
    const userId = 'user-123';
    try {
      await ECommerceService.updateCartItem(userId, productId, newQuantity);
      loadCart(); // Refresh cart
    } catch (error) {
      console.error('Failed to update cart quantity:', error);
    }
  };

  const handleRemoveItem = async (productId: string) => {
    const userId = 'user-123';
    try {
      await ECommerceService.removeFromCart(userId, productId);
      loadCart(); // Refresh cart
    } catch (error) {
      console.error('Failed to remove item from cart:', error);
    }
  };

  const calculateSubtotal = () => {
    return cartItems.reduce((total, item) => total + (item.product.price * item.quantity), 0);
  };
  
  const calculateTax = () => {
    return calculateSubtotal() * 0.08; // 8% tax
  };
  
  const calculateTotal = () => {
    return calculateSubtotal() + calculateTax();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-light">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="bg-light min-h-screen py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-bold text-dark mb-8">Your Shopping Cart</h1>
        
        {cartItems.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <ShoppingCart className="w-16 h-16 text-gray-400 mx-auto mb-6" />
            <h2 className="text-2xl font-semibold text-dark mb-4">Your cart is empty</h2>
            <p className="text-gray-600 mb-6">Looks like you haven't added anything to your cart yet.</p>
            <Link
              to="/shop"
              className="bg-primary text-white px-8 py-3 rounded-lg font-semibold hover:bg-primary/90 transition-colors"
            >
              Start Shopping
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Cart Items */}
            <div className="lg:col-span-2 bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-2xl font-semibold text-dark mb-6">
                {cartItems.length} {cartItems.length === 1 ? 'item' : 'items'} in your cart
              </h2>
              <div className="divide-y divide-gray-200">
                {cartItems.map(item => (
                  <div key={item.product_id} className="flex items-center py-6">
                    <img 
                      src={item.product.images[0] || '/images/placeholder-product.jpg'} 
                      alt={item.product.name}
                      className="w-24 h-24 object-cover rounded-lg"
                    />
                    <div className="ml-6 flex-1">
                      <Link to={`/shop/${item.product_id}`} className="text-lg font-semibold text-dark hover:text-primary">
                        {item.product.name}
                      </Link>
                      <p className="text-sm text-gray-500">{item.product.brand}</p>
                      <p className="text-sm text-gray-500">
                        {item.product.is_prescription_required ? 'Prescription required' : 'OTC'}
                      </p>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center border border-gray-300 rounded-md">
                        <button
                          onClick={() => handleUpdateQuantity(item.product_id, item.quantity - 1)}
                          className="p-2 text-gray-500 hover:bg-gray-100 rounded-l-md"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <span className="px-4 text-dark font-medium">{item.quantity}</span>
                        <button
                          onClick={() => handleUpdateQuantity(item.product_id, item.quantity + 1)}
                          className="p-2 text-gray-500 hover:bg-gray-100 rounded-r-md"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                      <p className="text-lg font-semibold text-dark w-24 text-right">
                        ${(item.product.price * item.quantity).toFixed(2)}
                      </p>
                      <button
                        onClick={() => handleRemoveItem(item.product_id)}
                        className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-full"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow-sm p-6 sticky top-8">
                <h2 className="text-2xl font-semibold text-dark mb-6">Order Summary</h2>
                <div className="space-y-4">
                  <div className="flex justify-between text-gray-600">
                    <span>Subtotal</span>
                    <span>${calculateSubtotal().toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Estimated Tax</span>
                    <span>${calculateTax().toFixed(2)}</span>
                  </div>
                  <div className="border-t border-gray-200 my-4"></div>
                  <div className="flex justify-between text-xl font-bold text-dark">
                    <span>Total</span>
                    <span>${calculateTotal().toFixed(2)}</span>
                  </div>
                </div>
                <button
                  onClick={() => navigate('/checkout')}
                  className="w-full mt-6 bg-primary text-white py-3 px-6 rounded-lg font-semibold hover:bg-primary/90 transition-colors flex items-center justify-center space-x-2"
                >
                  <span>Proceed to Checkout</span>
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CartPage;