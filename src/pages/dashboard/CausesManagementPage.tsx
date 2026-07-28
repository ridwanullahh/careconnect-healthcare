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
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [currentCause, setCurrentCause] = useState<Cause | null>(null);

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

  const handleCreateCause = async (causeData: any) => {
    try {
      await CrowdfundingService.createCause({
        ...causeData,
        entity_id: user?.entity_id,
        organizer_id: user?.id
      });
      fetchCauses();
      setIsCreateModalOpen(false);
    } catch (error) {
      console.error("Failed to create cause:", error);
    }
  };

  const handleEditCause = async (causeData: any) => {
    if (!currentCause) return;
    try {
      await CrowdfundingService.updateCause(currentCause.id, causeData);
      fetchCauses();
      setIsEditModalOpen(false);
      setCurrentCause(null);
    } catch (error) {
      console.error("Failed to update cause:", error);
    }
  };

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-dark">Causes Management</h2>
        <button 
          onClick={() => setIsCreateModalOpen(true)}
          className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors"
        >
          Create New Cause
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {causes.length === 0 ? (
          <div className="col-span-full text-center py-8 text-gray-500">
            No causes found. Create your first cause!
          </div>
        ) : (
          causes.map(cause => (
            <div key={cause.id} className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="font-semibold text-lg mb-2">{cause.title}</h3>
              <p className="text-gray-600 mb-4 line-clamp-3">{cause.description}</p>
              <div className="mb-4">
                <div className="flex justify-between text-sm text-gray-600 mb-1">
                  <span>Raised: ${cause.current_amount || 0}</span>
                  <span>Goal: ${cause.goal_amount}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-primary h-2 rounded-full" 
                    style={{ width: `${Math.min(((cause.current_amount || 0) / cause.goal_amount) * 100, 100)}%` }}
                  ></div>
                </div>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => { setCurrentCause(cause); setIsEditModalOpen(true); }}
                  className="flex-1 bg-primary text-white px-3 py-2 rounded text-sm hover:bg-primary/90 transition-colors"
                >
                  Edit
                </button>
                <button 
                  onClick={() => handleDeleteCause(cause.id)} 
                  className="flex-1 border border-red-300 text-red-700 px-3 py-2 rounded text-sm hover:bg-red-50 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create Cause Modal */}
      {isCreateModalOpen && (
        <CauseModal
          onClose={() => setIsCreateModalOpen(false)}
          onSave={handleCreateCause}
          title="Create New Cause"
        />
      )}

      {/* Edit Cause Modal */}
      {isEditModalOpen && currentCause && (
        <CauseModal
          cause={currentCause}
          onClose={() => { setIsEditModalOpen(false); setCurrentCause(null); }}
          onSave={handleEditCause}
          title="Edit Cause"
        />
      )}
    </div>
  );
};

// Cause Modal Component
const CauseModal = ({ cause, onClose, onSave, title }: {
  cause?: Cause | null;
  onClose: () => void;
  onSave: (data: any) => void;
  title: string;
}) => {
  const [formData, setFormData] = useState({
    title: cause?.title || '',
    description: cause?.description || '',
    goal_amount: cause?.goal_amount || 1000,
    category: cause?.category || '',
    image_url: cause?.image_url || '',
    status: cause?.status || 'active'
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'goal_amount' ? Number(value) : value
    }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-semibold mb-4">{title}</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cause Title</label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              className="w-full p-2 border border-gray-300 rounded-lg"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              rows={4}
              className="w-full p-2 border border-gray-300 rounded-lg"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Goal Amount ($)</label>
              <input
                type="number"
                name="goal_amount"
                value={formData.goal_amount}
                onChange={handleInputChange}
                min="1"
                className="w-full p-2 border border-gray-300 rounded-lg"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <input
                type="text"
                name="category"
                value={formData.category}
                onChange={handleInputChange}
                className="w-full p-2 border border-gray-300 rounded-lg"
                placeholder="Medical, Education, etc."
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Image URL</label>
            <input
              type="url"
              name="image_url"
              value={formData.image_url}
              onChange={handleInputChange}
              className="w-full p-2 border border-gray-300 rounded-lg"
              placeholder="https://example.com/image.jpg"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              name="status"
              value={formData.status}
              onChange={handleInputChange}
              className="w-full p-2 border border-gray-300 rounded-lg"
            >
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="completed">Completed</option>
            </select>
          </div>

          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 bg-primary text-white py-2 rounded-lg hover:bg-primary/90"
            >
              {cause ? 'Update Cause' : 'Create Cause'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CausesManagementPage;