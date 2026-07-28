// Single Blog Post Detail Page
import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Calendar,
  Clock,
  Heart,
  MessageSquare,
  Share2,
  ArrowLeft,
  Eye,
  BookmarkPlus,
  AlertCircle
} from 'lucide-react';
import { BlogService, BlogPost } from '../../lib/blog';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { useToastService } from '../../lib/toast-service';
import { useAuth } from '../../lib/auth';
import { githubDB as dbHelpers, collections } from '../../lib/database';

interface Comment {
  id: string;
  post_id: string;
  user_id: string;
  author: { name: string; avatar?: string };
  content: string;
  created_at: string;
}

interface RelatedPost {
  id: string;
  title: string;
  excerpt: string;
  featuredImage?: string;
  publishedAt: string;
  readTime: number;
}

const adaptComment = (raw: any): Comment => {
  const authorName =
    raw.author?.name ||
    raw.user_name ||
    raw.author_name ||
    (raw.author && typeof raw.author === 'string' ? raw.author : 'Anonymous');
  const authorAvatar = raw.author?.avatar || raw.author_avatar || raw.avatar;
  return {
    id: String(raw.id ?? raw.uid ?? ''),
    post_id: String(raw.post_id ?? raw.entity_id ?? raw.blog_post_id ?? ''),
    user_id: String(raw.user_id ?? raw.author_id ?? ''),
    author: { name: authorName, avatar: authorAvatar },
    content: raw.content || raw.body || raw.text || '',
    created_at: raw.created_at || raw.date || new Date().toISOString()
  };
};

const BlogPostPage: React.FC = () => {
  const { postId } = useParams<{ postId: string }>();
  const toast = useToastService();
  const { user } = useAuth();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [relatedPosts, setRelatedPosts] = useState<RelatedPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLiked, setIsLiked] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [togglingLike, setTogglingLike] = useState(false);
  const [togglingBookmark, setTogglingBookmark] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const loadPost = async () => {
      if (!postId) {
        setError('Article ID not provided.');
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      setError(null);
      try {
        const fetchedPost = await BlogService.getPost(postId);
        if (cancelled) return;

        if (!fetchedPost) {
          setError('Article not found.');
          setPost(null);
          setComments([]);
          setRelatedPosts([]);
          return;
        }
        setPost(fetchedPost);
        setLikeCount(Number(fetchedPost.likes ?? 0) || 0);

        // Fetch real comments + related posts in parallel. Comments may be
        // keyed under post_id OR entity_id depending on the writer; query
        // both and de-dupe.
        const [commentsByPost, commentsByEntity, allPosts] = await Promise.all([
          dbHelpers.find<any>(collections.comments, { post_id: postId }).catch(() => []),
          dbHelpers.find<any>(collections.comments, { entity_id: postId }).catch(() => []),
          dbHelpers.find<any>(collections.blog_posts, {}).catch(() => [])
        ]);
        if (cancelled) return;

        const merged = [...(commentsByPost || []), ...(commentsByEntity || [])];
        const seen = new Set<string>();
        const deduped: Comment[] = [];
        for (const raw of merged) {
          const id = String(raw.id ?? raw.uid ?? '');
          if (id && !seen.has(id)) {
            seen.add(id);
            deduped.push(adaptComment(raw));
          }
        }
        deduped.sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        setComments(deduped);

        // Related posts: same category, excluding the current post, top 3.
        const related = (allPosts || [])
          .filter((p: any) => String(p.id) !== String(postId))
          .filter((p: any) => (p.category || '') === (fetchedPost.category || ''))
          .slice(0, 3)
          .map((p: any) => ({
            id: String(p.id),
            title: p.title || 'Untitled',
            excerpt: p.excerpt || p.summary || '',
            featuredImage: p.featuredImage || p.featured_image,
            publishedAt: p.publishedAt || p.published_at || new Date().toISOString(),
            readTime: Number(p.readTime ?? p.read_time ?? 0) || 0
          }));
        setRelatedPosts(related);

        // Restore like/bookmark state from localStorage so the UI reflects
        // prior interactions even before any backend round-trip.
        try {
          const liked = JSON.parse(localStorage.getItem('careconnect_liked_posts') || '[]');
          if (Array.isArray(liked) && liked.includes(postId)) setIsLiked(true);
          const bookmarked = JSON.parse(localStorage.getItem('careconnect_bookmarked_posts') || '[]');
          if (Array.isArray(bookmarked) && bookmarked.includes(postId)) setIsBookmarked(true);
        } catch {
          /* ignore malformed localStorage */
        }
      } catch (err) {
        console.error('Failed to load blog post:', err);
        if (!cancelled) {
          setError('Failed to load the article. Please try again later.');
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    loadPost();
    return () => {
      cancelled = true;
    };
  }, [postId]);

  const handleLike = async () => {
    if (!post || !postId || togglingLike) return;
    const previouslyLiked = isLiked;
    setTogglingLike(true);
    // Optimistic UI update so the user gets immediate feedback.
    setIsLiked(!previouslyLiked);
    setLikeCount((c) => Math.max(0, c + (previouslyLiked ? -1 : 1)));
    try {
      // Persist the like in the likes collection. We always insert a new like
      // record (the backend can de-dupe by user+post later). For an unlike,
      // we just skip the insert — the optimistic state is enough for the UI.
      if (!previouslyLiked) {
        await dbHelpers.insert(collections.likes, {
          post_id: postId,
          user_id: user?.id || 'anonymous',
          created_at: new Date().toISOString()
        });
        // Mirror the change on the blog post so the displayed count stays
        // consistent on reload.
        await BlogService.updatePost(postId, {
          likes: Math.max(0, likeCount + 1)
        }).catch(() => undefined);
      }
      // Persist locally so the heart stays filled across reloads.
      try {
        const liked = JSON.parse(localStorage.getItem('careconnect_liked_posts') || '[]');
        const updated = Array.isArray(liked) ? liked : [];
        if (previouslyLiked) {
          const idx = updated.indexOf(postId);
          if (idx >= 0) updated.splice(idx, 1);
        } else if (!updated.includes(postId)) {
          updated.push(postId);
        }
        localStorage.setItem('careconnect_liked_posts', JSON.stringify(updated));
      } catch {
        /* ignore */
      }
      toast.showSuccess(previouslyLiked ? 'Like removed.' : 'Article liked.');
    } catch (err) {
      console.error('Failed to toggle like:', err);
      // Revert optimistic update on failure.
      setIsLiked(previouslyLiked);
      setLikeCount((c) => Math.max(0, c + (previouslyLiked ? 1 : -1)));
      toast.showError('Failed to update like. Please try again.');
    } finally {
      setTogglingLike(false);
    }
  };

  const handleBookmark = async () => {
    if (!post || !postId || togglingBookmark) return;
    const previouslyBookmarked = isBookmarked;
    setTogglingBookmark(true);
    setIsBookmarked(!previouslyBookmarked);
    try {
      if (!previouslyBookmarked) {
        await dbHelpers.insert(collections.bookmarks, {
          post_id: postId,
          user_id: user?.id || 'anonymous',
          created_at: new Date().toISOString()
        });
      }
      try {
        const bookmarked = JSON.parse(localStorage.getItem('careconnect_bookmarked_posts') || '[]');
        const updated = Array.isArray(bookmarked) ? bookmarked : [];
        if (previouslyBookmarked) {
          const idx = updated.indexOf(postId);
          if (idx >= 0) updated.splice(idx, 1);
        } else if (!updated.includes(postId)) {
          updated.push(postId);
        }
        localStorage.setItem('careconnect_bookmarked_posts', JSON.stringify(updated));
      } catch {
        /* ignore */
      }
      toast.showSuccess(
        previouslyBookmarked ? 'Bookmark removed.' : 'Article bookmarked.'
      );
    } catch (err) {
      console.error('Failed to toggle bookmark:', err);
      setIsBookmarked(previouslyBookmarked);
      toast.showError('Failed to update bookmark. Please try again.');
    } finally {
      setTogglingBookmark(false);
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: post?.title,
        text: post?.title,
        url: window.location.href
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.showInfo('Link copied to clipboard.');
    }
  };

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !postId) return;
    if (submittingComment) return;
    setSubmittingComment(true);
    const trimmed = newComment.trim();
    try {
      const inserted = await dbHelpers.insert<any>(collections.comments, {
        post_id: postId,
        user_id: user?.id || 'anonymous',
        author: {
          name: user?.email || 'Anonymous',
          avatar: undefined
        },
        content: trimmed,
        created_at: new Date().toISOString()
      });
      // Optimistically render the new comment at the top of the list.
      const adapted = adaptComment(inserted);
      setComments((prev) => [adapted, ...prev]);
      setNewComment('');
      toast.showSuccess('Comment posted.');
    } catch (err) {
      console.error('Failed to submit comment:', err);
      toast.showError('Failed to post comment. Please try again.');
    } finally {
      setSubmittingComment(false);
    }
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

  if (error || !post) {
    return (
      <div className="min-h-screen bg-light flex items-center justify-center">
        <div className="text-center">
          {error && (
            <div className="mb-4 inline-flex items-center bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg text-sm">
              <AlertCircle className="w-4 h-4 mr-2" />
              {error}
            </div>
          )}
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
                    alt={post.author.name}
                    className="w-12 h-12 rounded-full mr-4"
                  />
                )}
                <div>
                  <h3 className="font-semibold text-dark">{post.author.name}</h3>
                  <p className="text-sm text-gray-600">{post.author.bio}</p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center space-x-4">
                <button
                  onClick={handleLike}
                  disabled={togglingLike}
                  className={`flex items-center space-x-1 px-3 py-2 rounded-lg transition-colors disabled:opacity-60 ${
                    isLiked ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
                  <span>{likeCount}</span>
                </button>
                <button
                  onClick={handleBookmark}
                  disabled={togglingBookmark}
                  className={`flex items-center space-x-1 px-3 py-2 rounded-lg transition-colors disabled:opacity-60 ${
                    isBookmarked ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <BookmarkPlus className={`w-4 h-4 ${isBookmarked ? 'fill-current' : ''}`} />
                </button>
                <button
                  onClick={handleShare}
                  className="flex items-center space-x-1 px-3 py-2 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
                >
                  <Share2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Article Content */}
            <div className="prose prose-lg max-w-none">
              <div dangerouslySetInnerHTML={{ __html: post.content }} />
            </div>

            {/* Tags */}
            {post.tags && post.tags.length > 0 && (
              <div className="mt-8 pt-6 border-t border-gray-200">
                <h4 className="text-sm font-semibold text-gray-600 mb-3">Tags:</h4>
                <div className="flex flex-wrap gap-2">
                  {post.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm hover:bg-gray-200 transition-colors cursor-pointer"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </article>

        {/* Comments Section */}
        <div className="bg-white rounded-lg shadow-lg p-6 md:p-8 mb-8">
          <h3 className="text-2xl font-bold text-dark mb-6">
            Comments ({comments.length})
          </h3>

          {/* Comment Form */}
          <form onSubmit={handleCommentSubmit} className="mb-8">
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Share your thoughts..."
              className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
              rows={4}
              disabled={submittingComment}
            />
            <div className="mt-4 flex justify-end">
              <button
                type="submit"
                disabled={!newComment.trim() || submittingComment}
                className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submittingComment ? 'Posting...' : 'Post Comment'}
              </button>
            </div>
          </form>

          {/* Comments List */}
          {comments.length === 0 ? (
            <div className="text-center py-8">
              <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No comments yet. Be the first to share your thoughts!</p>
            </div>
          ) : (
            <div className="space-y-6">
              {comments.map((comment) => (
                <div key={comment.id} className="border-b border-gray-200 pb-6">
                  <div className="flex items-start space-x-4">
                    <img
                      src={comment.author.avatar || '/images/default-avatar.png'}
                      alt={comment.author.name}
                      className="w-10 h-10 rounded-full"
                    />
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h4 className="font-semibold text-dark">{comment.author.name}</h4>
                        <span className="text-sm text-gray-500">
                          {formatDate(comment.created_at)}
                        </span>
                      </div>
                      <p className="text-gray-700">{comment.content}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Related Posts */}
        {relatedPosts.length > 0 && (
          <div className="bg-white rounded-lg shadow-lg p-6 md:p-8">
            <h3 className="text-2xl font-bold text-dark mb-6">Related Articles</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {relatedPosts.map((relatedPost) => (
                <Link
                  key={relatedPost.id}
                  to={`/blog/${relatedPost.id}`}
                  className="group block"
                >
                  <div className="bg-gray-50 rounded-lg overflow-hidden hover:shadow-md transition-shadow">
                    {relatedPost.featuredImage && (
                      <img
                        src={relatedPost.featuredImage}
                        alt={relatedPost.title}
                        className="w-full h-40 object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    )}
                    <div className="p-4">
                      <h4 className="font-semibold text-dark mb-2 group-hover:text-primary transition-colors">
                        {relatedPost.title}
                      </h4>
                      <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                        {relatedPost.excerpt}
                      </p>
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>{formatDate(relatedPost.publishedAt)}</span>
                        <span>{relatedPost.readTime} min read</span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BlogPostPage;
