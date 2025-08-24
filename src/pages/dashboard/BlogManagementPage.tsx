import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../lib/auth';
import { BlogService } from '../../lib/blog';
import { BlogPost } from '../../lib/blog';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

const BlogManagementPage: React.FC = () => {
  const { user } = useAuth();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [currentPost, setCurrentPost] = useState<BlogPost | null>(null);

  const fetchPosts = async () => {
    if (!user?.entity_id) return;
    setIsLoading(true);
    try {
      const entityPosts = await BlogService.getPosts({ entityId: user.entity_id });
      setPosts(entityPosts);
    } catch (error) {
      console.error("Failed to fetch posts:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, [user]);

  const handleDeletePost = async (postId: string) => {
    if (window.confirm('Are you sure you want to delete this post?')) {
      await BlogService.deletePost(postId);
      fetchPosts();
    }
  };

  const handleCreatePost = async (postData: any) => {
    try {
      await BlogService.createPost({
        ...postData,
        entity_id: user?.entity_id,
        author_id: user?.id
      });
      fetchPosts();
      setIsCreateModalOpen(false);
    } catch (error) {
      console.error("Failed to create post:", error);
    }
  };

  const handleEditPost = async (postData: any) => {
    if (!currentPost) return;
    try {
      await BlogService.updatePost(currentPost.id, postData);
      fetchPosts();
      setIsEditModalOpen(false);
      setCurrentPost(null);
    } catch (error) {
      console.error("Failed to update post:", error);
    }
  };

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-dark">Blog Management</h2>
        <button 
          onClick={() => setIsCreateModalOpen(true)}
          className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors"
        >
          Create New Post
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {posts.length === 0 ? (
          <div className="col-span-full text-center py-8 text-gray-500">
            No posts found. Create your first post!
          </div>
        ) : (
          posts.map(post => (
            <div key={post.id} className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="font-semibold text-lg mb-2">{post.title}</h3>
              <p className="text-gray-600 mb-4 line-clamp-3">{post.excerpt || post.content?.substring(0, 150) + '...'}</p>
              <div className="flex justify-between items-center mb-4">
                <span className="text-sm text-gray-500">
                  {post.published_at ? new Date(post.published_at).toLocaleDateString() : 'Draft'}
                </span>
                <span className={`px-2 py-1 rounded-full text-xs ${
                  post.status === 'published' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {post.status}
                </span>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => { setCurrentPost(post); setIsEditModalOpen(true); }}
                  className="flex-1 bg-primary text-white px-3 py-2 rounded text-sm hover:bg-primary/90 transition-colors"
                >
                  Edit
                </button>
                <button 
                  onClick={() => handleDeletePost(post.id)} 
                  className="flex-1 border border-red-300 text-red-700 px-3 py-2 rounded text-sm hover:bg-red-50 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create Post Modal */}
      {isCreateModalOpen && (
        <BlogModal
          onClose={() => setIsCreateModalOpen(false)}
          onSave={handleCreatePost}
          title="Create New Post"
        />
      )}

      {/* Edit Post Modal */}
      {isEditModalOpen && currentPost && (
        <BlogModal
          post={currentPost}
          onClose={() => { setIsEditModalOpen(false); setCurrentPost(null); }}
          onSave={handleEditPost}
          title="Edit Post"
        />
      )}
    </div>
  );
};

// Blog Modal Component
const BlogModal = ({ post, onClose, onSave, title }: {
  post?: BlogPost | null;
  onClose: () => void;
  onSave: (data: any) => void;
  title: string;
}) => {
  const [formData, setFormData] = useState({
    title: post?.title || '',
    content: post?.content || '',
    excerpt: post?.excerpt || '',
    category: post?.category || '',
    tags: post?.tags?.join(', ') || '',
    status: post?.status || 'draft',
    featured_image: post?.featured_image || ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const dataToSave = {
      ...formData,
      tags: formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0)
    };
    onSave(dataToSave);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-semibold mb-4">{title}</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Post Title</label>
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Content</label>
            <textarea
              name="content"
              value={formData.content}
              onChange={handleInputChange}
              rows={8}
              className="w-full p-2 border border-gray-300 rounded-lg"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Excerpt</label>
            <textarea
              name="excerpt"
              value={formData.excerpt}
              onChange={handleInputChange}
              rows={3}
              className="w-full p-2 border border-gray-300 rounded-lg"
              placeholder="Brief summary of the post..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <input
                type="text"
                name="category"
                value={formData.category}
                onChange={handleInputChange}
                className="w-full p-2 border border-gray-300 rounded-lg"
                placeholder="Health, Wellness, etc."
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tags (comma separated)</label>
              <input
                type="text"
                name="tags"
                value={formData.tags}
                onChange={handleInputChange}
                className="w-full p-2 border border-gray-300 rounded-lg"
                placeholder="health, tips, wellness"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Featured Image URL</label>
              <input
                type="url"
                name="featured_image"
                value={formData.featured_image}
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
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="archived">Archived</option>
              </select>
            </div>
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
              {post ? 'Update Post' : 'Create Post'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BlogManagementPage;