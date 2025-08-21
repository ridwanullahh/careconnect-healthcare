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

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-dark">Blog Management</h2>
        <Link to="/blog/create" className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors">
          Create New Post
        </Link>
      </div>
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="space-y-4">
          {posts.length === 0 ? (
            <p>No posts found. Create your first post!</p>
          ) : (
            posts.map(post => (
              <div key={post.id} className="border border-gray-200 rounded-lg p-4 flex justify-between items-center">
                <div>
                  <h3 className="font-semibold text-dark">{post.title}</h3>
                  <p className="text-sm text-gray-600">
                    Published on {new Date(post.published_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Link to={`/blog/edit/${post.id}`} className="bg-primary text-white px-3 py-1 rounded text-sm hover:bg-primary/90 transition-colors">
                    Edit
                  </Link>
                  <button onClick={() => handleDeletePost(post.id)} className="border border-red-300 text-red-700 px-3 py-1 rounded text-sm hover:bg-red-50 transition-colors">
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

export default BlogManagementPage;