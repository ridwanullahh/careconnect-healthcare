import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { CommunityService, ForumPost } from '../../lib/community';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { ArrowLeft, MessageSquare, ThumbsUp } from 'lucide-react';

const ForumPostPage: React.FC = () => {
  const { postId } = useParams<{ postId: string }>();
  const [post, setPost] = useState<ForumPost | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (postId) {
      loadPost(postId);
    }
  }, [postId]);

  const loadPost = async (id: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const fetchedPost = await CommunityService.getPost(id);
      if (fetchedPost) {
        setPost(fetchedPost);
      } else {
        setError('Post not found.');
      }
    } catch (err) {
      setError('Failed to load post details.');
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
        <Link to="/community" className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-primary/90 transition-colors">
          Back to Community
        </Link>
      </div>
    );
  }

  if (!post) {
    return null;
  }

  return (
    <div className="bg-light py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <Link to="/community" className="inline-flex items-center text-primary mb-6 hover:underline">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Community
        </Link>
        <div className="bg-white rounded-lg shadow-sm p-8">
          <h1 className="text-3xl font-bold text-dark mb-4">{post.title}</h1>
          <div className="flex items-center space-x-4 text-sm text-gray-500 mb-6">
            <div className="flex items-center">
              <img src={post.author.avatar} alt={post.author.name} className="w-8 h-8 rounded-full mr-2" />
              <span>{post.author.name}</span>
            </div>
            <span>{new Date(post.createdAt).toLocaleDateString()}</span>
            <div className="flex items-center">
              <ThumbsUp className="w-4 h-4 mr-1" />
              {post.likes}
            </div>
            <div className="flex items-center">
              <MessageSquare className="w-4 h-4 mr-1" />
              {post.replies}
            </div>
          </div>
          <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: post.content }} />
        </div>
      </div>
    </div>
  );
};

export default ForumPostPage;