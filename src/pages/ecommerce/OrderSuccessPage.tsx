import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ECommerceService, Order } from '../../lib/ecommerce';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { CheckCircle, Package } from 'lucide-react';

const OrderSuccessPage: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (orderId) {
      loadOrder(orderId);
    }
  }, [orderId]);

  const loadOrder = async (id: string) => {
    setIsLoading(true);
    setError(null);
    try {
      // In a real app, this would be a dedicated service method
      const fetchedOrder = await ECommerceService.getOrder(id); 
      if (fetchedOrder) {
        setOrder(fetchedOrder);
      } else {
        setError('Order not found.');
      }
    } catch (err) {
      setError('Failed to load order details.');
      console.error(err);
    } finally {
      setIsLoading(false);
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
        <Link to="/" className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-primary/90 transition-colors">
          Back to Home
        </Link>
      </div>
    );
  }

  if (!order) {
    return null;
  }

  return (
    <div className="min-h-screen bg-light flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-xl shadow-lg text-center">
        <div>
          <CheckCircle className="mx-auto h-16 w-16 text-green-500" />
          <h2 className="mt-6 text-3xl font-extrabold text-dark">
            Thank you for your order!
          </h2>
          <p className="mt-2 text-gray-600">
            Your order has been placed successfully.
          </p>
        </div>
        
        <div className="border-t border-gray-200 pt-6">
          <h3 className="text-lg font-medium text-dark mb-4">Order Summary</h3>
          <div className="text-left space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-500">Order Number:</span>
              <span className="font-semibold text-dark">{order.order_number}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Total Amount:</span>
              <span className="font-semibold text-dark">${order.total_amount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Estimated Delivery:</span>
              <span className="font-semibold text-dark">{new Date(order.estimated_delivery).toLocaleDateString()}</span>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-200 pt-6">
            <h3 className="text-lg font-medium text-dark mb-4">What's next?</h3>
            <p className="text-gray-600">
                You will receive an email confirmation shortly with your order details. You can track your order status from your dashboard.
            </p>
        </div>

        <div className="mt-8 flex justify-center space-x-4">
          <Link
            to="/shop"
            className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-primary bg-primary/10 hover:bg-primary/20 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
          >
            Continue Shopping
          </Link>
          <Link
            to="/dashboard/orders"
            className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
          >
            <Package className="w-4 h-4 mr-2" />
            View Order
          </Link>
        </div>
      </div>
    </div>
  );
};

export default OrderSuccessPage;