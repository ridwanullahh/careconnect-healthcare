// Enhanced HealthTalk Podcast System with Admin Management
import { githubDB, collections } from './database';
import { logger } from './observability';

export interface PodcastEpisode {
  id: string;
  title: string;
  description: string;
  audioUrl: string;
  duration: number; // in seconds
  publishedAt: string;
  category: 'general' | 'nutrition' | 'mental-health' | 'chronic-conditions' | 'prevention' | 'technology';
  host: {
    name: string;
    credentials: string;
    avatar?: string;
    bio?: string;
  };
  transcript?: string;
  tags: string[];
  playCount: number;
  likes: number;
  isLive: boolean;
  isFeatured: boolean;
  seasonNumber?: number;
  episodeNumber?: number;
  guests?: {
    name: string;
    credentials: string;
    bio?: string;
  }[];
  resources?: {
    title: string;
    url: string;
    type: 'article' | 'study' | 'tool' | 'website';
  }[];
  status: 'draft' | 'published' | 'archived';
  created_at: string;
  updated_at: string;
}

export interface LiveSession {
  id: string;
  title: string;
  description: string;
  scheduledAt: string;
  duration: number;
  host: {
    name: string;
    credentials: string;
    avatar?: string;
  };
  category: string;
  tags: string[];
  maxParticipants: number;
  currentParticipants: number;
  registrationRequired: boolean;
  streamUrl?: string;
  chatEnabled: boolean;
  recordingEnabled: boolean;
  status: 'scheduled' | 'live' | 'ended' | 'cancelled';
  registrations: string[]; // user IDs
  created_at: string;
  updated_at: string;
}

export class PodcastService {
  // Initialize podcast system with sample data
  static async initializePodcastSystem(): Promise<void> {
    try {
      const existingEpisodes = await githubDB.find(collections.podcasts, {});
      
      if (existingEpisodes.length === 0) {
        const sampleEpisodes = this.getSampleEpisodes();
        
        for (const episode of sampleEpisodes) {
          await githubDB.insert(collections.podcasts, {
            ...episode,
            id: crypto.randomUUID(),
            playCount: 0,
            likes: 0,
            isLive: false,
            status: 'published',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
        }
        
        await logger.info('podcast_system_initialized', 'Podcast system initialized', {
          episodes_created: sampleEpisodes.length
        });
      }
    } catch (error) {
      await logger.error('podcast_init_failed', 'Podcast system initialization failed', {
        error: error.message
      });
    }
  }

  private static getSampleEpisodes(): Partial<PodcastEpisode>[] {
    return [
      {
        title: 'Daily Wellness Check: Heart Health Basics',
        description: 'Understanding cardiovascular health, risk factors, and simple prevention strategies everyone should know.',
        audioUrl: '/audio/podcasts/heart-health-basics.mp3',
        duration: 300,
        publishedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        category: 'general',
        host: {
          name: 'Dr. Sarah Chen',
          credentials: 'MD, Cardiologist',
          avatar: '/images/hosts/dr-chen.jpg',
          bio: 'Board-certified cardiologist with 15 years experience in preventive cardiology.'
        },
        transcript: 'Welcome to today\'s HealthTalk! I\'m Dr. Sarah Chen, and today we\'re discussing heart health basics...',
        tags: ['heart health', 'prevention', 'wellness'],
        isFeatured: true,
        seasonNumber: 1,
        episodeNumber: 1,
        resources: [
          {
            title: 'American Heart Association Guidelines',
            url: 'https://www.heart.org',
            type: 'website'
          }
        ]
      },
      {
        title: 'Nutrition Minute: Building Healthy Eating Habits',
        description: 'Simple, science-based tips for developing sustainable healthy eating patterns that fit your lifestyle.',
        audioUrl: '/audio/podcasts/healthy-eating-habits.mp3',
        duration: 295,
        publishedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        category: 'nutrition',
        host: {
          name: 'Lisa Rodriguez, RD',
          credentials: 'Registered Dietitian',
          avatar: '/images/hosts/lisa-rodriguez.jpg',
          bio: 'Clinical nutritionist specializing in behavioral nutrition and sustainable eating patterns.'
        },
        tags: ['nutrition', 'diet', 'healthy habits'],
        isFeatured: false,
        seasonNumber: 1,
        episodeNumber: 2
      },
      {
        title: 'Mental Wellness Today: Managing Daily Stress',
        description: 'Quick, effective strategies for managing everyday stress and maintaining mental wellness in busy times.',
        audioUrl: '/audio/podcasts/daily-stress-management.mp3',
        duration: 318,
        publishedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        category: 'mental-health',
        host: {
          name: 'Dr. Michael Thompson',
          credentials: 'PhD, Clinical Psychologist',
          avatar: '/images/hosts/dr-thompson.jpg',
          bio: 'Licensed clinical psychologist specializing in stress management and cognitive behavioral therapy.'
        },
        tags: ['stress management', 'mental health', 'wellness'],
        isFeatured: true,
        seasonNumber: 1,
        episodeNumber: 3,
        guests: [
          {
            name: 'Dr. Emily Zhang',
            credentials: 'MD, Psychiatrist',
            bio: 'Psychiatrist focusing on stress-related disorders and workplace mental health.'
          }
        ]
      }
    ];
  }

  // Create new episode (Admin)
  static async createEpisode(episodeData: Partial<PodcastEpisode>): Promise<PodcastEpisode> {
    try {
      const episode = await githubDB.insert(collections.podcasts, {
        ...episodeData,
        id: crypto.randomUUID(),
        playCount: 0,
        likes: 0,
        isLive: false,
        status: episodeData.status || 'draft',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

      await logger.info('podcast_episode_created', 'Podcast episode created', {
        episode_id: episode.id,
        title: episode.title
      });

      return episode;
    } catch (error) {
      await logger.error('podcast_creation_failed', 'Podcast episode creation failed', {
        error: error.message,
        episode_data: episodeData
      });
      throw error;
    }
  }

  // Update episode
  static async updateEpisode(episodeId: string, updates: Partial<PodcastEpisode>): Promise<PodcastEpisode> {
    try {
      const updated = await githubDB.update(collections.podcasts, episodeId, {
        ...updates,
        updated_at: new Date().toISOString()
      });

      await logger.info('podcast_episode_updated', 'Podcast episode updated', {
        episode_id: episodeId
      });

      return updated;
    } catch (error) {
      await logger.error('podcast_update_failed', 'Podcast episode update failed', {
        episode_id: episodeId,
        error: error.message
      });
      throw error;
    }
  }

  // Delete episode
  static async deleteEpisode(episodeId: string): Promise<void> {
    try {
      await githubDB.delete(collections.podcasts, episodeId);

      await logger.info('podcast_episode_deleted', 'Podcast episode deleted', {
        episode_id: episodeId
      });
    } catch (error) {
      await logger.error('podcast_deletion_failed', 'Podcast episode deletion failed', {
        episode_id: episodeId,
        error: error.message
      });
      throw error;
    }
  }

  // Get all episodes with filters
  static async getEpisodes(filters: {
    category?: string;
    status?: string;
    featured?: boolean;
    limit?: number;
    offset?: number;
  } = {}): Promise<{ episodes: PodcastEpisode[]; total: number }> {
    try {
      let query: Record<string, any> = {};

      if (filters.category) {
        query.category = filters.category;
      }

      if (filters.status) {
        query.status = filters.status;
      }

      if (filters.featured !== undefined) {
        query.isFeatured = filters.featured;
      }

      let episodes = await githubDB.find(collections.podcasts, query);

      // Sort by published date (newest first)
      episodes.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());

      const total = episodes.length;
      const offset = filters.offset || 0;
      const limit = filters.limit || 25;

      episodes = episodes.slice(offset, offset + limit);

      return { episodes, total };
    } catch (error) {
      await logger.error('get_episodes_failed', 'Failed to get episodes', {
        error: error.message,
        filters
      });
      throw error;
    }
  }

  // Get single episode
  static async getEpisode(episodeId: string): Promise<PodcastEpisode | null> {
    try {
      return await githubDB.findById(collections.podcasts, episodeId);
    } catch (error) {
      await logger.error('get_episode_failed', 'Failed to get episode', {
        episode_id: episodeId,
        error: error.message
      });
      return null;
    }
  }

  // Record play (analytics)
  static async recordPlay(episodeId: string, userId?: string): Promise<void> {
    try {
      const episode = await githubDB.findById(collections.podcasts, episodeId);
      if (episode) {
        await githubDB.update(collections.podcasts, episodeId, {
          playCount: (episode.playCount || 0) + 1,
          updated_at: new Date().toISOString()
        });

        // Record in analytics
        await githubDB.insert(collections.analytics_events, {
          user_id: userId,
          event_type: 'podcast_play',
          event_data: {
            episode_id: episodeId,
            episode_title: episode.title,
            category: episode.category
          },
          timestamp: new Date().toISOString(),
          page_url: window.location.href,
          referrer: document.referrer
        });
      }
    } catch (error) {
      await logger.error('record_play_failed', 'Failed to record play', {
        episode_id: episodeId,
        error: error.message
      });
    }
  }

  // Like episode
  static async likeEpisode(episodeId: string, userId: string): Promise<void> {
    try {
      const episode = await githubDB.findById(collections.podcasts, episodeId);
      if (episode) {
        await githubDB.update(collections.podcasts, episodeId, {
          likes: (episode.likes || 0) + 1,
          updated_at: new Date().toISOString()
        });

        // Store user's like
        await githubDB.insert(collections.analytics_events, {
          user_id: userId,
          event_type: 'podcast_like',
          event_data: {
            episode_id: episodeId,
            episode_title: episode.title
          },
          timestamp: new Date().toISOString(),
          page_url: window.location.href,
          referrer: document.referrer
        });
      }
    } catch (error) {
      await logger.error('like_episode_failed', 'Failed to like episode', {
        episode_id: episodeId,
        user_id: userId,
        error: error.message
      });
    }
  }

  // Generate simple RSS feed data
  static async generateRSSData(): Promise<string> {
    try {
      const { episodes } = await this.getEpisodes({ status: 'published', limit: 50 });
      
      const rssItems = episodes.map(episode => ({
        title: episode.title,
        description: episode.description,
        pubDate: new Date(episode.publishedAt).toUTCString(),
        link: `${window.location.origin}/health-talk-podcast/${episode.id}`,
        guid: episode.id,
        duration: this.formatDuration(episode.duration),
        category: episode.category,
        author: episode.host.name
      }));

      const rssData = {
        title: 'HealthTalk Podcast - CareConnect',
        description: '5-minute daily healthcare insights from verified professionals',
        link: `${window.location.origin}/health-talk-podcast`,
        language: 'en-us',
        lastBuildDate: new Date().toUTCString(),
        items: rssItems
      };

      return JSON.stringify(rssData, null, 2);
    } catch (error) {
      await logger.error('rss_generation_failed', 'RSS generation failed', {
        error: error.message
      });
      throw error;
    }
  }

  private static formatDuration(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  // Live session management
  static async createLiveSession(sessionData: Partial<LiveSession>): Promise<LiveSession> {
    try {
      const session = await githubDB.insert(collections.live_sessions, {
        ...sessionData,
        id: crypto.randomUUID(),
        currentParticipants: 0,
        registrations: [],
        status: 'scheduled',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

      await logger.info('live_session_created', 'Live session created', {
        session_id: session.id,
        title: session.title
      });

      return session;
    } catch (error) {
      await logger.error('live_session_creation_failed', 'Live session creation failed', {
        error: error.message
      });
      throw error;
    }
  }

  static async getLiveSessions(filters: {
    status?: string;
    upcoming?: boolean;
  } = {}): Promise<LiveSession[]> {
    try {
      let sessions = await githubDB.find(collections.live_sessions, {});

      if (filters.status) {
        sessions = sessions.filter(s => s.status === filters.status);
      }

      if (filters.upcoming) {
        const now = new Date();
        sessions = sessions.filter(s => new Date(s.scheduledAt) > now);
      }

      return sessions.sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
    } catch (error) {
      await logger.error('get_live_sessions_failed', 'Failed to get live sessions', {
        error: error.message
      });
      return [];
    }
  }

  static async registerForLiveSession(sessionId: string, userId: string): Promise<void> {
    try {
      const session = await githubDB.findById(collections.live_sessions, sessionId);
      if (session && !session.registrations.includes(userId)) {
        await githubDB.update(collections.live_sessions, sessionId, {
          registrations: [...session.registrations, userId],
          updated_at: new Date().toISOString()
        });

        await logger.info('live_session_registration', 'User registered for live session', {
          session_id: sessionId,
          user_id: userId
        });
      }
    } catch (error) {
      await logger.error('live_session_registration_failed', 'Live session registration failed', {
        session_id: sessionId,
        user_id: userId,
        error: error.message
      });
    }
  }
}