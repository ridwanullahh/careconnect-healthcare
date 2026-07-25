import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { PaymentGatewayService } from '../lib/payment-gateway';

export default function PaymentCallbackPage() {
  const [searchParams] = useSearchParams();
  const reference = searchParams.get('reference') || searchParams.get('ref') || '';
  const [status, setStatus] = useState<'processing' | 'success' | 'error' | 'cancelled'>('processing');
  const [message, setMessage] = useState('');
  const [payment, setPayment] = useState<any>(null);

  useEffect(() => {
    const isCancelled = window.location.pathname.includes('cancelled');
    if (isCancelled) {
      setStatus('cancelled');
      setMessage('Payment was cancelled. No charges were made.');
      return;
    }

    if (!reference) {
      setStatus('error');
      setMessage('No payment reference found.');
      return;
    }

    PaymentGatewayService.handleCallback(reference)
      .then(result => {
        setPayment(result);
        setStatus('success');
        setMessage(`Payment of ${result.currency} ${result.amount?.toLocaleString()} received. Status: ${result.status}. Our team will review and confirm shortly.`);
      })
      .catch(err => {
        setStatus('error');
        setMessage(err.message || 'Failed to process payment callback.');
      });
  }, [reference]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 to-white dark:from-gray-900 dark:to-gray-800 flex items-center justify-center px-4">
      <div className="max-w-lg w-full bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 text-center">
        {status === 'processing' && (
          <>
            <div className="text-5xl mb-4 animate-spin">&#9881;</div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Processing Payment</h1>
            <p className="text-gray-600 dark:text-gray-400">Please wait while we verify your payment...</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="text-5xl mb-4 text-green-500">&#10003;</div>
            <h1 className="text-2xl font-bold text-green-700 dark:text-green-400 mb-2">Payment Received!</h1>
            <p className="text-gray-600 dark:text-gray-400 mb-4">{message}</p>
            {payment && (
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-6 text-left text-sm">
                <p className="text-gray-700 dark:text-gray-300"><strong>Reference:</strong> {payment.reference}</p>
                <p className="text-gray-700 dark:text-gray-300"><strong>Amount:</strong> {payment.currency} {payment.amount?.toLocaleString()}</p>
                <p className="text-gray-700 dark:text-gray-300"><strong>Status:</strong> {payment.status}</p>
              </div>
            )}
            <div className="space-y-3">
              <Link to="/" className="block py-3 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-lg transition">
                Go to Dashboard
              </Link>
              <Link to="/shop" className="block py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                Continue Shopping
              </Link>
            </div>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="text-5xl mb-4 text-red-500">&#10007;</div>
            <h1 className="text-2xl font-bold text-red-700 dark:text-red-400 mb-2">Payment Error</h1>
            <p className="text-gray-600 dark:text-gray-400 mb-6">{message}</p>
            <div className="space-y-3">
              <Link to="/shop" className="block py-3 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-lg transition">
                Try Again
              </Link>
              <Link to="/help" className="block py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                Get Help
              </Link>
            </div>
          </>
        )}

        {status === 'cancelled' && (
          <>
            <div className="text-5xl mb-4 text-yellow-500">&#9888;</div>
            <h1 className="text-2xl font-bold text-yellow-700 dark:text-yellow-400 mb-2">Payment Cancelled</h1>
            <p className="text-gray-600 dark:text-gray-400 mb-6">{message}</p>
            <div className="space-y-3">
              <Link to="/cart" className="block py-3 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-lg transition">
                Return to Cart
              </Link>
              <Link to="/" className="block py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                Go Home
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
