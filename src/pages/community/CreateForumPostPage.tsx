import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CommunityService } from '../../lib/community';
import { useAuth } from '../../lib/auth';
import { ArrowLeft } from 'lucide-react';

const CreateForumPostPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('');
  const [tags, setTags] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      alert('You must be logged in to create a post.');
      return;
    }
    setIsSubmitting(true);

    try {
      const newPost = await CommunityService.createPost({
        title,
        content,
        category,
        tags: tags.split(',').map(tag => tag.trim()),
        author: {
          name: user.displayName || user.email,
          avatar: user.photoURL,
          role: 'Community Member',
          verified: false, // Or based on user profile
        },
      });
      navigate(`/community/${newPost.id}`);
    } catch (error) {
      console.error('Failed to create post:', error);
      alert('Failed to create post. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-light py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <button onClick={() => navigate(-1)} className="inline-flex items-center text-primary mb-6 hover:underline">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Community
        </button>
        <div className="bg-white rounded-lg shadow-sm p-8">
          <h1 className="text-3xl font-bold text-dark mb-6">Start a New Discussion</h1>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700">Title</label>
              <input
                type="text"
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-primary focus:border-primary"
              />
            </div>
            <div>
              <label htmlFor="content" className="block text-sm font-medium text-gray-700">Content</label>
              <textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                required
                rows={10}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-primary focus:border-primary"
              />
            </div>
            <div>
              <label htmlFor="category" className="block text-sm font-medium text-gray-700">Category</label>
              <select
                id="category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                required
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-primary focus:border-primary"
              >
                <option value="">Select a category</option>
                <option value="general">General Health</option>
                <option value="mental-health">Mental Health</option>
                <option value="nutrition">Nutrition & Diet</option>
                <option value="chronic-conditions">Chronic Conditions</option>
                <option value="wellness">Wellness & Fitness</option>
                <option value="caregiving">Caregiving</option>
                <option value="support">Support Groups</option>
              </select>
            </div>
            <div>
              <label htmlFor="tags" className="block text-sm font-medium text-gray-700">Tags (comma-separated)</label>
              <input
                type="text"
                id="tags"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-primary focus:border-primary"
              />
            </div>
            <div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-primary text-white py-3 px-6 rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {isSubmitting ? 'Submitting...' : 'Create Post'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateForumPostPage;