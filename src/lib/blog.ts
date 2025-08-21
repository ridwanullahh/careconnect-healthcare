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
  static async getPosts(filters: {
    query?: string;
    category?: string;
    tag?: string;
    sortBy?: 'newest' | 'popular' | 'likes' | 'comments';
  }): Promise<BlogPost[]> {
    let posts = await githubDB.find(collections.blog_posts, {});

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