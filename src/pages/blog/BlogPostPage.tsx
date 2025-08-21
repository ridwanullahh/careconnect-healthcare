// Single Blog Post Detail Page
import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Calendar,
  User,
  Clock,
  Heart,
  MessageSquare,
  Share2,
  ArrowLeft,
  Eye,
  BookmarkPlus,
  ChevronRight
} from 'lucide-react';
import { BlogService, BlogPost, Comment as CommentType } from '../../lib/blog';
import LoadingSpinner from '../../components/ui/LoadingSpinner';


interface RelatedPost {
  id: string;
  title: string;
  excerpt: string;
  featuredImage?: string;
  publishedAt: string;
  readTime: number;
}

const BlogPostPage: React.FC = () => {
  const { postId } = useParams<{ postId: string }>();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [comments, setComments] = useState<CommentType[]>([]);
  const [relatedPosts, setRelatedPosts] = useState<RelatedPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLiked, setIsLiked] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [newComment, setNewComment] = useState('');

  useEffect(() => {
    loadPost();
  }, [postId]);

  const loadPost = async () => {
    setIsLoading(true);
    try {
      if (!postId) {
        setIsLoading(false);
        return;
      }
      const fetchedPost = await BlogService.getPost(postId);
      setPost(fetchedPost);

      // MOCK DATA FOR COMMENTS AND RELATED POSTS - REPLACE WITH REAL DATA
      const mockComments: CommentType[] = [];
      const mockRelatedPosts: RelatedPost[] = [];
      setComments(mockComments);
      setRelatedPosts(mockRelatedPosts);
    } catch (error) {
      console.error('Failed to load blog post:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLike = () => {
    setIsLiked(!isLiked);
    // Update like count in database
  };

  const handleBookmark = () => {
    setIsBookmarked(!isBookmarked);
    // Save/remove bookmark in database
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: post?.title,
        text: post?.title,
        url: window.location.href
      });
    } else {
      // Fallback - copy to clipboard
      navigator.clipboard.writeText(window.location.href);
    }
  };

  const handleCommentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    // Add comment logic here
    console.log('New comment:', newComment);
    setNewComment('');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-light flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-light flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Article Not Found</h2>
          <p className="text-gray-600 mb-6">The requested article could not be found.</p>
          <Link
            to="/blog"
            className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-primary/90 transition-colors"
          >
            Back to Blog
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-light">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Button */}
        <Link
          to="/blog"
          className="inline-flex items-center text-primary hover:text-primary/80 mb-8"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Blog
        </Link>

        {/* Article Header */}
        <article className="bg-white rounded-lg shadow-lg overflow-hidden mb-8">
          {/* Featured Image */}
          {post.featuredImage && (
            <img
              src={post.featuredImage || '/images/placeholder-blog.jpg'}
              alt={post.title}
              className="w-full h-64 md:h-80 object-cover"
            />
          )}

          {/* Article Meta */}
          <div className="p-6 md:p-8">
            <div className="flex flex-wrap items-center gap-4 mb-6">
              <span className="bg-primary/10 text-primary px-3 py-1 rounded-full text-sm font-medium capitalize">
                {post.category.replace('-', ' ')}
              </span>
              <div className="flex items-center text-sm text-gray-600">
                <Calendar className="w-4 h-4 mr-1" />
                {formatDate(post.publishedAt)}
              </div>
              <div className="flex items-center text-sm text-gray-600">
                <Clock className="w-4 h-4 mr-1" />
                {post.readTime} min read
              </div>
              <div className="flex items-center text-sm text-gray-600">
                <Eye className="w-4 h-4 mr-1" />
                {post.views} views
              </div>
            </div>

            {/* Title */}
            <h1 className="text-3xl md:text-4xl font-bold text-dark mb-6">
              {post.title}
            </h1>

            {/* Author Info */}
            <div className="flex items-center justify-between mb-8 pb-6 border-b border-gray-200">
              <div className="flex items-center">
                {post.author.avatar && (
                  <img
                    src={post.author.avatar}
