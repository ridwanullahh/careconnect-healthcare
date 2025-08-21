import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../lib/auth';
import { CrowdfundingService } from '../../lib/crowdfunding';
import { Cause } from '../../lib/crowdfunding';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

const CausesManagementPage: React.FC = () => {
  const { user } = useAuth();
  const [causes, setCauses] = useState<Cause[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchCauses = async () => {
    if (!user?.entity_id) return;
    setIsLoading(true);
    try {
      const entityCauses = await CrowdfundingService.searchCauses({ entity_id: user.entity_id });
      setCauses(entityCauses);
    } catch (error) {
      console.error("Failed to fetch causes:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCauses();
  }, [user]);

  const handleDeleteCause = async (causeId: string) => {
    if (window.confirm('Are you sure you want to delete this cause?')) {
      await CrowdfundingService.deleteCause(causeId);
      fetchCauses();
    }
  };

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-dark">Causes Management</h2>
        <Link to="/causes/create" className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors">
          Create New Cause
        </Link>
      </div>
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="space-y-4">
          {causes.length === 0 ? (
            <p>No causes found. Create your first cause!</p>
          ) : (
            causes.map(cause => (
              <div key={cause.id} className="border border-gray-200 rounded-lg p-4 flex justify-between items-center">
                <div>
                  <h3 className="font-semibold text-dark">{cause.title}</h3>
                  <p className="text-sm text-gray-600">
                    Goal: ${cause.goal_amount}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Link to={`/causes/edit/${cause.id}`} className="bg-primary text-white px-3 py-1 rounded text-sm hover:bg-primary/90 transition-colors">
                    Edit
                  </Link>
                  <button onClick={() => handleDeleteCause(cause.id)} className="border border-red-300 text-red-700 px-3 py-1 rounded text-sm hover:bg-red-50 transition-colors">
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default CausesManagementPage;