// Enhanced Community Q&A Forum System
import { githubDB, collections } from './database';

export interface ForumPost {
  id: string;
  userId: string;
  authorName: string;
  authorAvatar?: string;
  authorRole: 'patient' | 'provider' | 'expert' | 'admin';
  title: string;
  content: string;
  category: string;
  tags: string[];
  type: 'question' | 'discussion' | 'announcement';
  status: 'open' | 'answered' | 'closed' | 'pinned';
  isExpertAnswered: boolean;
  isPinned: boolean;
  isLocked: boolean;
  views: number;
  votes: number;
  replyCount: number;
  lastActivityAt: string;
  createdAt: string;
  updatedAt: string;
  attachments: ForumAttachment[];
  moderationStatus: 'pending' | 'approved' | 'flagged' | 'removed';
  moderatedBy?: string;
  moderatedAt?: string;
  moderationReason?: string;
}

export interface ForumReply {
  id: string;
  postId: string;
  parentReplyId?: string; // For nested replies
  userId: string;
  authorName: string;
  authorAvatar?: string;
  authorRole: 'patient' | 'provider' | 'expert' | 'admin';
  content: string;
  isExpertReply: boolean;
  isAcceptedAnswer: boolean;
  votes: number;
  createdAt: string;
  updatedAt: string;
  attachments: ForumAttachment[];
  moderationStatus: 'pending' | 'approved' | 'flagged' | 'removed';
  moderatedBy?: string;
  moderatedAt?: string;
  moderationReason?: string;
}

export interface ForumAttachment {
  id: string;
  name: string;
  url: string;
  type: 'image' | 'document' | 'link';
  size?: number;
  mimeType?: string;
}

export interface ForumVote {
  id: string;
  userId: string;
  entityType: 'post' | 'reply';
  entityId: string;
  voteType: 'up' | 'down';
  createdAt: string;
}

export interface ForumReport {
  id: string;
  reporterId: string;
  entityType: 'post' | 'reply';
  entityId: string;
  reason: 'spam' | 'inappropriate' | 'misinformation' | 'harassment' | 'other';
  description: string;
  status: 'pending' | 'reviewed' | 'resolved' | 'dismissed';
  reviewedBy?: string;
  reviewedAt?: string;
  resolution?: string;
  createdAt: string;
}

export interface ForumModeration {
  id: string;
  moderatorId: string;
  entityType: 'post' | 'reply';
  entityId: string;
  action: 'approve' | 'flag' | 'remove' | 'pin' | 'lock' | 'unlock';
  reason: string;
  notes?: string;
  performedAt: string;
}

export class ForumService {
  // Create forum post
  static async createPost(
    userId: string,
    authorName: string,
    authorRole: ForumPost['authorRole'],
    title: string,
    content: string,
    category: string,
    tags: string[],
    type: ForumPost['type'] = 'question',
    attachments: Omit<ForumAttachment, 'id'>[] = []
  ): Promise<ForumPost> {
    const post: ForumPost = {
      id: `post_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      authorName,
      authorRole,
      title: title.trim(),
      content: content.trim(),
      category,
      tags,
      type,
      status: 'open',
      isExpertAnswered: false,
      isPinned: false,
      isLocked: false,
      views: 0,
      votes: 0,
      replyCount: 0,
      lastActivityAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      attachments: attachments.map((att, index) => ({
        ...att,
        id: `att_${Date.now()}_${index}`
      })),
      moderationStatus: 'approved' // Auto-approve for now, can be changed to 'pending'
    };

    await githubDB.create(collections.forum_posts, post);

    // Update category stats
    await this.updateCategoryStats(category);

    return post;
  }

  // Create forum reply
  static async createReply(
    postId: string,
    userId: string,
    authorName: string,
    authorRole: ForumReply['authorRole'],
    content: string,
    parentReplyId?: string,
    attachments: Omit<ForumAttachment, 'id'>[] = []
  ): Promise<ForumReply> {
    const post = await githubDB.findById(collections.forum_posts, postId);
    if (!post) throw new Error('Post not found');
    if (post.isLocked) throw new Error('Post is locked');

    const reply: ForumReply = {
      id: `reply_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      postId,
      parentReplyId,
      userId,
      authorName,
      authorRole,
      content: content.trim(),
      isExpertReply: authorRole === 'expert' || authorRole === 'provider',
      isAcceptedAnswer: false,
      votes: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      attachments: attachments.map((att, index) => ({
        ...att,
        id: `att_${Date.now()}_${index}`
      })),
      moderationStatus: 'approved'
    };

    await githubDB.create(collections.forum_replies, reply);

    // Update post stats
    await this.updatePostStats(postId);

    // Send notification to post author
    if (post.userId !== userId) {
      await this.sendReplyNotification(post, reply);
    }

    return reply;
  }

  // Vote on post or reply
  static async vote(
    userId: string,
    entityType: 'post' | 'reply',
    entityId: string,
    voteType: 'up' | 'down'
  ): Promise<{ success: boolean; newVoteCount: number }> {
    // Check if user already voted
    const existingVote = await githubDB.findOne(collections.analytics_events, {
      userId,
      entityType,
      entityId,
      action: 'vote'
    });

    if (existingVote) {
      // Remove existing vote if same type, or update if different
      if (existingVote.data?.voteType === voteType) {
        await githubDB.delete(collections.analytics_events, existingVote.id);
      } else {
        await githubDB.update(collections.analytics_events, existingVote.id, {
          data: { voteType },
          timestamp: new Date().toISOString()
        });
      }
    } else {
      // Create new vote
      await githubDB.create(collections.analytics_events, {
        id: `vote_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId,
        action: 'vote',
        entityType,
        entityId,
        data: { voteType },
        timestamp: new Date().toISOString()
      });
    }

    // Recalculate vote count
    const votes = await githubDB.findMany(collections.analytics_events, {
      entityType,
      entityId,
      action: 'vote'
    });

    const upVotes = votes.filter(v => v.data?.voteType === 'up').length;
    const downVotes = votes.filter(v => v.data?.voteType === 'down').length;
    const newVoteCount = upVotes - downVotes;

    // Update entity vote count
    const collection = entityType === 'post' ? collections.forum_posts : collections.forum_replies;
    await githubDB.update(collection, entityId, {
      votes: newVoteCount,
      updatedAt: new Date().toISOString()
    });

    return { success: true, newVoteCount };
  }

  // Accept answer (mark reply as accepted)
  static async acceptAnswer(postId: string, replyId: string, userId: string): Promise<void> {
    const post = await githubDB.findById(collections.forum_posts, postId);
    if (!post) throw new Error('Post not found');
    if (post.userId !== userId) throw new Error('Only post author can accept answers');

    const reply = await githubDB.findById(collections.forum_replies, replyId);
    if (!reply) throw new Error('Reply not found');
    if (reply.postId !== postId) throw new Error('Reply does not belong to this post');

    // Unmark previous accepted answers
    const existingAccepted = await githubDB.findMany(collections.forum_replies, {
      postId,
      isAcceptedAnswer: true
    });

    for (const accepted of existingAccepted) {
      await githubDB.update(collections.forum_replies, accepted.id, {
        isAcceptedAnswer: false,
        updatedAt: new Date().toISOString()
      });
    }

    // Mark new answer as accepted
    await githubDB.update(collections.forum_replies, replyId, {
      isAcceptedAnswer: true,
      updatedAt: new Date().toISOString()
    });

    // Update post status
    await githubDB.update(collections.forum_posts, postId, {
      status: 'answered',
      isExpertAnswered: reply.isExpertReply,
      lastActivityAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    // Notify reply author
    if (reply.userId !== userId) {
      await githubDB.create(collections.notifications, {
        id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId: reply.userId,
        type: 'answer_accepted',
        title: 'Answer Accepted',
        message: `Your answer to "${post.title}" has been accepted!`,
        data: { postId, replyId },
        createdAt: new Date().toISOString(),
        read: false,
        priority: 'normal'
      });
    }
  }

  // Report content
  static async reportContent(
    reporterId: string,
    entityType: 'post' | 'reply',
    entityId: string,
    reason: ForumReport['reason'],
    description: string
  ): Promise<ForumReport> {
    const report: ForumReport = {
      id: `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      reporterId,
      entityType,
      entityId,
      reason,
      description: description.trim(),
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    await githubDB.create(collections.moderation_queue, report);

    // Create notification for moderators
    await githubDB.create(collections.notifications, {
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId: 'moderator',
      type: 'content_reported',
      title: 'Content Reported',
      message: `${entityType} reported for ${reason}`,
      data: { reportId: report.id, entityType, entityId },
      createdAt: new Date().toISOString(),
      read: false,
      priority: 'high'
    });

    return report;
  }

  // Moderate content
  static async moderateContent(
    moderatorId: string,
    entityType: 'post' | 'reply',
    entityId: string,
    action: ForumModeration['action'],
    reason: string,
    notes?: string
  ): Promise<void> {
    const moderation: ForumModeration = {
      id: `mod_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      moderatorId,
      entityType,
      entityId,
      action,
      reason,
      notes,
      performedAt: new Date().toISOString()
    };

    await githubDB.create(collections.audit_logs, {
      id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      action: 'forum_moderation',
      entityType,
      entityId,
      performedBy: moderatorId,
      performedAt: new Date().toISOString(),
      details: moderation,
      ipAddress: 'client-side'
    });

    // Apply moderation action
    const collection = entityType === 'post' ? collections.forum_posts : collections.forum_replies;
    const updates: any = { updatedAt: new Date().toISOString() };

    switch (action) {
      case 'approve':
        updates.moderationStatus = 'approved';
        break;
      case 'flag':
        updates.moderationStatus = 'flagged';
        break;
      case 'remove':
        updates.moderationStatus = 'removed';
        break;
      case 'pin':
        if (entityType === 'post') {
          updates.isPinned = true;
        }
        break;
      case 'lock':
        if (entityType === 'post') {
          updates.isLocked = true;
        }
        break;
      case 'unlock':
        if (entityType === 'post') {
          updates.isLocked = false;
        }
        break;
    }

    await githubDB.update(collection, entityId, updates);
  }

  // Get forum posts with pagination and filters
  static async getPosts(
    page: number = 1,
    limit: number = 20,
    filters?: {
      category?: string;
      type?: string;
      status?: string;
      authorRole?: string;
      hasExpertAnswer?: boolean;
    },
    sortBy: 'newest' | 'oldest' | 'mostVoted' | 'mostReplies' | 'lastActivity' = 'lastActivity'
  ): Promise<{ posts: ForumPost[]; total: number; hasMore: boolean }> {
    let posts = await githubDB.findMany(collections.forum_posts, {
      moderationStatus: 'approved'
    });

    // Apply filters
    if (filters) {
      if (filters.category) {
        posts = posts.filter(p => p.category === filters.category);
      }
      if (filters.type) {
        posts = posts.filter(p => p.type === filters.type);
      }
      if (filters.status) {
        posts = posts.filter(p => p.status === filters.status);
      }
      if (filters.authorRole) {
        posts = posts.filter(p => p.authorRole === filters.authorRole);
      }
      if (filters.hasExpertAnswer !== undefined) {
        posts = posts.filter(p => p.isExpertAnswered === filters.hasExpertAnswer);
      }
    }

    // Sort posts
    switch (sortBy) {
      case 'newest':
        posts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
      case 'oldest':
        posts.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        break;
      case 'mostVoted':
        posts.sort((a, b) => b.votes - a.votes);
        break;
      case 'mostReplies':
        posts.sort((a, b) => b.replyCount - a.replyCount);
        break;
      case 'lastActivity':
        posts.sort((a, b) => new Date(b.lastActivityAt).getTime() - new Date(a.lastActivityAt).getTime());
        break;
    }

    const total = posts.length;
    const start = (page - 1) * limit;
    const paginatedPosts = posts.slice(start, start + limit);

    return {
      posts: paginatedPosts,
      total,
      hasMore: start + limit < total
    };
  }

  // Get post with replies
  static async getPostWithReplies(postId: string): Promise<{
    post: ForumPost;
    replies: ForumReply[];
  }> {
    const post = await githubDB.findById(collections.forum_posts, postId);
    if (!post) throw new Error('Post not found');

    // Increment view count
    await githubDB.update(collections.forum_posts, postId, {
      views: post.views + 1,
      updatedAt: new Date().toISOString()
    });

    const replies = await githubDB.findMany(collections.forum_replies, {
      postId,
      moderationStatus: 'approved'
    });

    // Sort replies: accepted answer first, then by votes, then by date
    replies.sort((a, b) => {
      if (a.isAcceptedAnswer && !b.isAcceptedAnswer) return -1;
      if (!a.isAcceptedAnswer && b.isAcceptedAnswer) return 1;
      if (a.votes !== b.votes) return b.votes - a.votes;
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });

    return { post: { ...post, views: post.views + 1 }, replies };
  }

  // Search posts
  static async searchPosts(
    query: string,
    filters?: {
      category?: string;
      authorRole?: string;
    }
  ): Promise<ForumPost[]> {
    let posts = await githubDB.findMany(collections.forum_posts, {
      moderationStatus: 'approved'
    });

    // Text search
    if (query) {
      const lowerQuery = query.toLowerCase();
      posts = posts.filter(post =>
        post.title.toLowerCase().includes(lowerQuery) ||
        post.content.toLowerCase().includes(lowerQuery) ||
        post.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
      );
    }

    // Apply filters
    if (filters) {
      if (filters.category) {
        posts = posts.filter(p => p.category === filters.category);
      }
      if (filters.authorRole) {
        posts = posts.filter(p => p.authorRole === filters.authorRole);
      }
    }

    return posts;
  }

  // Update post stats
  private static async updatePostStats(postId: string): Promise<void> {
    const replies = await githubDB.findMany(collections.forum_replies, {
      postId,
      moderationStatus: 'approved'
    });

    const hasExpertReply = replies.some(r => r.isExpertReply);
    const hasAcceptedAnswer = replies.some(r => r.isAcceptedAnswer);

    await githubDB.update(collections.forum_posts, postId, {
      replyCount: replies.length,
      isExpertAnswered: hasExpertReply,
      status: hasAcceptedAnswer ? 'answered' : 'open',
      lastActivityAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  }

  // Update category stats
  private static async updateCategoryStats(category: string): Promise<void> {
    // This could be used to track category statistics
    // For now, we'll just log it
    console.log(`Category ${category} updated`);
  }

  // Send reply notification
  private static async sendReplyNotification(post: ForumPost, reply: ForumReply): Promise<void> {
    await githubDB.create(collections.notifications, {
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId: post.userId,
      type: 'forum_reply',
      title: 'New Reply to Your Post',
      message: `${reply.authorName} replied to your post "${post.title}"`,
      data: { postId: post.id, replyId: reply.id },
      createdAt: new Date().toISOString(),
      read: false,
      priority: 'normal'
    });
  }

  // Get moderation queue
  static async getModerationQueue(): Promise<ForumReport[]> {
    return await githubDB.findMany(collections.moderation_queue, {
      status: 'pending'
    });
  }

  // Get user's posts
  static async getUserPosts(userId: string): Promise<ForumPost[]> {
    return await githubDB.findMany(collections.forum_posts, { userId });
  }

  // Get user's replies
  static async getUserReplies(userId: string): Promise<ForumReply[]> {
    return await githubDB.findMany(collections.forum_replies, { userId });
  }
}

export default ForumService;