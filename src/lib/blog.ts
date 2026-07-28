import { githubDB, collections } from './database';

export interface Author {
  name: string;
  avatar?: string;
  credentials?: string;
  bio?: string;
}

export interface BlogPost {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  author: Author;
  category: string;
  tags: string[];
  publishedAt: string;
  updatedAt?: string;
  featuredImage?: string;
  readTime: number;
  views: number;
  likes: number;
  commentsCount: number;
  isFeatured: boolean;
  entityId?: string;
  entityName?: string;
}

export class BlogService {
  static async createPost(postData: Partial<BlogPost>): Promise<BlogPost> {
    const post = await githubDB.insert(collections.blog_posts, {
      ...postData,
      views: 0,
      likes: 0,
      commentsCount: 0,
      isFeatured: false,
      publishedAt: new Date().toISOString(),
    });
    return post;
  }

  static async updatePost(postId: string, updates: Partial<BlogPost>): Promise<BlogPost> {
    return await githubDB.update(collections.blog_posts, postId, { ...updates, updatedAt: new Date().toISOString() });
  }

  static async deletePost(postId: string): Promise<void> {
    await githubDB.delete(collections.blog_posts, postId);
  }

  static async getPosts(filters: {
    query?: string;
    category?: string;
    tag?: string;
    sortBy?: 'newest' | 'popular' | 'likes' | 'comments';
    entityId?: string;
  }): Promise<BlogPost[]> {
    let posts = await githubDB.find(collections.blog_posts, {});

    if (filters.entityId) {
      posts = posts.filter(post => post.entityId === filters.entityId);
    }

    if (filters.query) {
      const query = filters.query.toLowerCase();
      posts = posts.filter(post =>
        post.title.toLowerCase().includes(query) ||
        post.excerpt.toLowerCase().includes(query) ||
        post.tags.some((tag: string) => tag.toLowerCase().includes(query)) ||
        post.author.name.toLowerCase().includes(query)
      );
    }

    if (filters.category) {
      posts = posts.filter(post => post.category === filters.category);
    }

    if (filters.tag) {
      posts = posts.filter(post => post.tags.includes(filters.tag!));
    }

    switch (filters.sortBy) {
      case 'popular':
        posts.sort((a, b) => b.views - a.views);
        break;
      case 'likes':
        posts.sort((a, b) => b.likes - a.likes);
        break;
      case 'comments':
        posts.sort((a, b) => b.commentsCount - a.commentsCount);
        break;
      default:
        posts.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
    }

    return posts;
  }

  static async getPost(postId: string): Promise<BlogPost | null> {
    return await githubDB.findById(collections.blog_posts, postId);
  }
}