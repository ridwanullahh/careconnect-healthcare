import { githubDB as db, collections } from './database';

export interface ForumVote {
  id?: string;
  uid?: string;
  post_id: string;
  user_id: string;
  vote_type: 'upvote' | 'downvote';
  created_at: string;
}

export interface ForumReport {
  id?: string;
  uid?: string;
  post_id: string;
  reporter_id: string;
  reason: string;
  details?: string;
  status: 'pending' | 'reviewed' | 'dismissed' | 'actioned';
  created_at: string;
  reviewed_by?: string;
  reviewed_at?: string;
}

export interface ForumExpertTag {
  id?: string;
  uid?: string;
  user_id: string;
  specialty: string;
  verified: boolean;
  credentials?: string;
  granted_by?: string;
  granted_at: string;
}

export class ForumInteractionService {
  static async vote(postId: string, userId: string, voteType: 'upvote' | 'downvote'): Promise<{
    upvotes: number;
    downvotes: number;
    userVote: string | null;
  }> {
    const existingVotes = await db.find(collections.comments, (v: any) =>
      v.post_id === postId && v.user_id === userId && v.type === 'vote'
    ) as any[];

    if (existingVotes.length > 0) {
      const existingVote = existingVotes[0];
      if (existingVote.vote_type === voteType) {
        await db.delete(collections.comments, existingVote.id);
      } else {
        await db.update(collections.comments, existingVote.id, {
          vote_type: voteType,
          updated_at: new Date().toISOString(),
        });
      }
    } else {
      await db.insert(collections.comments, {
        post_id: postId,
        user_id: userId,
        type: 'vote',
        vote_type: voteType,
        created_at: new Date().toISOString(),
      });
    }

    return this.getVoteCounts(postId);
  }

  static async getVoteCounts(postId: string): Promise<{ upvotes: number; downvotes: number; userVote: string | null }> {
    const votes = await db.find(collections.comments, (v: any) =>
      v.post_id === postId && v.type === 'vote'
    ) as any[];

    return {
      upvotes: votes.filter(v => v.vote_type === 'upvote').length,
      downvotes: votes.filter(v => v.vote_type === 'downvote').length,
      userVote: null,
    };
  }

  static async getUserVote(postId: string, userId: string): Promise<string | null> {
    const votes = await db.find(collections.comments, (v: any) =>
      v.post_id === postId && v.user_id === userId && v.type === 'vote'
    ) as any[];
    return votes.length > 0 ? votes[0].vote_type : null;
  }

  static async reportPost(postId: string, reporterId: string, reason: string, details?: string): Promise<ForumReport> {
    const existing = await db.find(collections.moderation_queue, (r: any) =>
      r.post_id === postId && r.reporter_id === reporterId && r.status === 'pending'
    );
    if (existing.length > 0) throw new Error('You have already reported this post');

    return db.insert(collections.moderation_queue, {
      post_id: postId,
      reporter_id: reporterId,
      reason,
      details: details || '',
      status: 'pending',
      type: 'forum_report',
      created_at: new Date().toISOString(),
    }) as Promise<ForumReport>;
  }

  static async resolveReport(reportId: string, reviewerId: string, action: 'dismissed' | 'actioned', notes?: string): Promise<void> {
    await db.update(collections.moderation_queue, reportId, {
      status: action,
      reviewed_by: reviewerId,
      reviewed_at: new Date().toISOString(),
      review_notes: notes || '',
    });

    if (action === 'actioned') {
      const report = await db.findById(collections.moderation_queue, reportId) as any;
      if (report?.post_id) {
        try {
          await db.update(collections.forum_posts, report.post_id, {
            is_hidden: true,
            hidden_reason: 'Reported and actioned by moderator',
            hidden_at: new Date().toISOString(),
          });
        } catch {}
      }
    }
  }

  static async getPendingReports(): Promise<ForumReport[]> {
    return db.find(collections.moderation_queue, (r: any) =>
      r.status === 'pending' && r.type === 'forum_report'
    ) as Promise<ForumReport[]>;
  }

  static async grantExpertTag(userId: string, specialty: string, credentials: string, grantedBy: string): Promise<ForumExpertTag> {
    const existing = await db.find(collections.user_roles, (t: any) =>
      t.user_id === userId && t.role_type === 'expert' && t.specialty === specialty
    );
    if (existing.length > 0) throw new Error('Expert tag already granted for this specialty');

    return db.insert(collections.user_roles, {
      user_id: userId,
      role_type: 'expert',
      specialty,
      verified: true,
      credentials,
      granted_by: grantedBy,
      granted_at: new Date().toISOString(),
    }) as Promise<ForumExpertTag>;
  }

  static async getUserExpertTags(userId: string): Promise<ForumExpertTag[]> {
    return db.find(collections.user_roles, (t: any) =>
      t.user_id === userId && t.role_type === 'expert'
    ) as Promise<ForumExpertTag[]>;
  }

  static async notifyReply(postId: string, replierId: string, replierName: string): Promise<void> {
    try {
      const post = await db.findById(collections.forum_posts, postId) as any;
      if (!post || post.author === replierId) return;

      await db.insert(collections.notifications, {
        user_id: post.author || post.user_id,
        type: 'forum_reply',
        title: 'New Reply',
        message: `${replierName} replied to your post "${post.title}"`,
        link: `/community/${postId}`,
        is_read: false,
        created_at: new Date().toISOString(),
      });
    } catch {}
  }
}

export default ForumInteractionService;
