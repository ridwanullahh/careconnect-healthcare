import { githubDB, collections } from './database';

export interface ForumPost {
  id: string;
  title: string;
  content: string;
  author: {
    name: string;
    avatar?: string;
    role: string;
    verified: boolean;
  };
  category: string;
  tags: string[];
  createdAt: string;
  lastActivity: string;
  views: number;
  likes: number;
  replies: number;
  isPinned: boolean;
  isClosed: boolean;
  isModerated: boolean;
}

export class CommunityService {
  static async getPosts(filters: {
    query?: string;
    category?: string;
    sortBy?: 'recent' | 'popular' | 'replies' | 'views';
  }): Promise<ForumPost[]> {
    let posts = await githubDB.find(collections.forum_posts, {});

    if (filters.query) {
      const query = filters.query.toLowerCase();
      posts = posts.filter(post =>
        post.title.toLowerCase().includes(query) ||
        post.content.toLowerCase().includes(query) ||
        post.tags.some((tag: string) => tag.toLowerCase().includes(query))
      );
    }

    if (filters.category) {
      posts = posts.filter(post => post.category === filters.category);
    }

    switch (filters.sortBy) {
      case 'popular':
        posts.sort((a, b) => b.likes - a.likes);
        break;
      case 'replies':
        posts.sort((a, b) => b.replies - a.replies);
        break;
      case 'views':
        posts.sort((a, b) => b.views - a.views);
        break;
      default:
        posts.sort((a, b) => new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime());
    }

    const pinnedPosts = posts.filter(p => p.isPinned);
    const regularPosts = posts.filter(p => !p.isPinned);

    return [...pinnedPosts, ...regularPosts];
  }

  static async getPost(postId: string): Promise<ForumPost | null> {
    return await githubDB.findById(collections.forum_posts, postId);
  }

  static async createPost(postData: Partial<ForumPost>): Promise<ForumPost> {
    const post = await githubDB.insert(collections.forum_posts, {
      ...postData,
      createdAt: new Date().toISOString(),
      lastActivity: new Date().toISOString(),
      views: 0,
      likes: 0,
      replies: 0,
      isPinned: false,
      isClosed: false,
      isModerated: false,
    });
    return post;
  }
}