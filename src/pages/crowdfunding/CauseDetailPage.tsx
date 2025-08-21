import { useParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Cause } from '../../lib/crowdfunding';
import { getCause } from '../../lib/database';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

const CauseDetailPage = () => {
  const { causeId } = useParams<{ causeId: string }>();
  const [cause, setCause] = useState<Cause | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [donationAmount, setDonationAmount] = useState<number>(25);
  const [showDonationForm, setShowDonationForm] = useState(false);

  useEffect(() => {
    const loadCause = async () => {
      if (!causeId) {
        setError('Cause ID not provided');
        setLoading(false);
        return;
      }

      try {
        const causeData = await getCause(causeId);
        setCause(causeData);
      } catch (err) {
        setError('Failed to load cause details');
        console.error('Error loading cause:', err);
      } finally {
        setLoading(false);
      }
    };

    loadCause();
  }, [causeId]);

  const handleDonate = () => {
    setShowDonationForm(true);
  };

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

  if (!cause) {
    return (
      <div className="min-h-screen bg-light flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Cause Not Found</h2>
          <p className="text-gray-600">The requested cause could not be found.</p>
        </div>
      </div>
    );
  }

  const progressPercentage = cause.goal_amount > 0 
    ? Math.min((cause.raised_amount / cause.goal_amount) * 100, 100)
    : 0;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        {/* Header */}
        <div className="bg-primary text-white p-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold mb-2">{cause.title}</h1>
              <p className="text-lg opacity-90">{cause.category}</p>
              <div className="mt-4">
                <span className={`px-3 py-1 rounded-full text-sm ${
                  cause.status === 'active' ? 'bg-green-500 text-white' :
                  cause.status === 'completed' ? 'bg-blue-500 text-white' :
                  'bg-gray-500 text-white'
                }`}>
                  {cause.status}
                </span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold">
                ${cause.raised_amount.toLocaleString()}
              </div>
              <div className="text-sm opacity-90">
                of ${cause.goal_amount.toLocaleString()}
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2">
              <h2 className="text-xl font-semibold mb-4 text-dark">About This Cause</h2>
              <p className="text-gray-600 leading-relaxed mb-6">{cause.description}</p>
              
              {/* Updates */}
              <h2 className="text-xl font-semibold mb-4 text-dark">Updates</h2>
              <div className="space-y-4">
                {cause.updates?.map((update, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <h3 className="font-semibold text-dark mb-2">{update.title}</h3>
                    <p className="text-gray-600 text-sm mb-2">{update.content}</p>
                    <span className="text-xs text-gray-500">
                      {new Date(update.created_at).toLocaleDateString()}
                    </span>
                  </div>
                )) || (
                  <p className="text-gray-500 italic">No updates available.</p>
                )}
              </div>
            </div>

            {/* Sidebar */}
            <div>
              <div className="bg-light rounded-lg p-6 sticky top-6">
                {/* Progress */}
                <div className="mb-6">
                  <div className="flex justify-between text-sm text-gray-600 mb-2">
                    <span>Progress</span>
                    <span>{progressPercentage.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div 
                      className="bg-primary h-3 rounded-full transition-all duration-300"
                      style={{ width: `${progressPercentage}%` }}
                    ></div>
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="text-center">
                    <div className="text-lg font-bold text-dark">
                      {cause.supporters_count || 0}
                    </div>
                    <div className="text-sm text-gray-600">Supporters</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-dark">
                      {cause.days_left || 0}
                    </div>
                    <div className="text-sm text-gray-600">Days Left</div>
                  </div>
                </div>

                {/* Donation Form */}
                {!showDonationForm ? (
                  <div>
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Donation Amount
                      </label>
                      <div className="grid grid-cols-3 gap-2 mb-3">
                        {[25, 50, 100].map(amount => (
                          <button
                            key={amount}
                            onClick={() => setDonationAmount(amount)}
                            className={`py-2 px-3 rounded border text-sm ${
                              donationAmount === amount
                                ? 'border-primary bg-primary text-white'
                                : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                            }`}
                          >
                            ${amount}
                          </button>
                        ))}
                      </div>
                      <input
                        type="number"
                        value={donationAmount}
                        onChange={(e) => setDonationAmount(Number(e.target.value))}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                        placeholder="Custom amount"
                        min="1"
                      />
                    </div>
                    
                    <button
                      onClick={handleDonate}
                      className="w-full bg-primary text-white py-3 px-4 rounded-lg hover:bg-primary/90 transition-colors"
                    >
                      Donate ${donationAmount}
                    </button>
                  </div>
                ) : (
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Complete Your Donation</h3>
                    <p className="text-gray-600 mb-4">
                      You're about to donate ${donationAmount} to this cause.
                    </p>
                    <button className="w-full bg-primary text-white py-3 px-4 rounded-lg hover:bg-primary/90 transition-colors mb-2">
                      Proceed to Payment
                    </button>
                    <button 
                      onClick={() => setShowDonationForm(false)}
                      className="w-full border border-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Back
                    </button>
                  </div>
                )}

                {/* Share */}
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <h3 className="text-sm font-medium text-gray-700 mb-3">Share This Cause</h3>
                  <div className="flex gap-2">
                    <button className="flex-1 bg-blue-600 text-white py-2 px-3 rounded text-sm hover:bg-blue-700 transition-colors">
                      Facebook
                    </button>
                    <button className="flex-1 bg-blue-400 text-white py-2 px-3 rounded text-sm hover:bg-blue-500 transition-colors">
                      Twitter
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CauseDetailPage;