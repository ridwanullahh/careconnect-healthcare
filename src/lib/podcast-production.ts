// 5-Minute HealthTalk Podcast Production System
import { githubDB, collections } from './database';
import { logger } from './observability';

export interface PodcastEpisode {
  id: string;
  title: string;
  description: string;
  content_script: string;
  
  // Audio details
  audio_url?: string;
  duration_seconds?: number;
  file_size_bytes?: number;
  
  // Content metadata
  health_topics: string[];
  target_audience: string;
  difficulty_level: 'beginner' | 'intermediate' | 'advanced';
  
  // Production details
  host_name: string;
  guest_expert?: {
    name: string;
    credentials: string;
    bio: string;
  };
  
  // Publishing
  episode_number: number;
  season_number: number;
  publish_date: string;
  is_published: boolean;
  
  // Engagement
  play_count: number;
  download_count: number;
  rating: number;
  review_count: number;
  
  // Transcription
  transcript?: string;
  transcript_srt?: string;
  transcript_vtt?: string;
  
  // SEO and metadata
  keywords: string[];
  show_notes: string;
  
  // Status
  production_status: 'planning' | 'recording' | 'editing' | 'review' | 'published';
  
  // Timestamps
  created_at: string;
  updated_at: string;
  published_at?: string;
}

export interface PodcastSeries {
  id: string;
  name: string;
  description: string;
  cover_image_url: string;
  host_name: string;
  host_bio: string;
  
  // RSS and distribution
  rss_url: string;
  apple_podcasts_url?: string;
  spotify_url?: string;
  google_podcasts_url?: string;
  
  // Content strategy
  schedule: 'daily' | 'weekly' | 'bi-weekly';
  target_duration_minutes: number;
  content_themes: string[];
  
  // Analytics
  total_episodes: number;
  total_downloads: number;
  subscriber_count: number;
  average_rating: number;
  
  // Settings
  is_active: boolean;
  auto_publish: boolean;
  
  created_at: string;
  updated_at: string;
}

export class PodcastProductionService {
  
  // Create podcast series
  static async createPodcastSeries(seriesData: {
    name: string;
    description: string;
    host_name: string;
    host_bio: string;
    cover_image_url?: string;
    schedule?: PodcastSeries['schedule'];
    target_duration_minutes?: number;
    content_themes?: string[];
  }): Promise<PodcastSeries> {
    try {
      const series: Partial<PodcastSeries> = {
        name: seriesData.name,
        description: seriesData.description,
        cover_image_url: seriesData.cover_image_url || 'https://example.com/default-podcast-cover.jpg',
        host_name: seriesData.host_name,
        host_bio: seriesData.host_bio,
        rss_url: '',
        schedule: seriesData.schedule || 'weekly',
        target_duration_minutes: seriesData.target_duration_minutes || 5,
        content_themes: seriesData.content_themes || ['General Health', 'Wellness Tips', 'Medical News'],
        total_episodes: 0,
        total_downloads: 0,
        subscriber_count: 0,
        average_rating: 0,
        is_active: true,
        auto_publish: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const savedSeries = await githubDB.insert(collections.podcast_series, series);
      
      // Generate RSS URL
      const rssUrl = `${window.location.origin}/podcasts/${savedSeries.id}/rss.xml`;
      await githubDB.update(collections.podcast_series, savedSeries.id, {
        rss_url: rssUrl
      });

      await logger.info('podcast_series_created', 'Podcast series created', {
        series_id: savedSeries.id,
        name: seriesData.name,
        host: seriesData.host_name
      });

      return { ...savedSeries, rss_url: rssUrl };
    } catch (error) {
      await logger.error('podcast_series_creation_failed', 'Podcast series creation failed', {
        name: seriesData.name,
        error: error.message
      });
      throw error;
    }
  }

  // Create episode
  static async createEpisode(episodeData: {
    series_id: string;
    title: string;
    description: string;
    content_script: string;
    health_topics: string[];
    target_audience: string;
    difficulty_level: PodcastEpisode['difficulty_level'];
    host_name: string;
    guest_expert?: PodcastEpisode['guest_expert'];
    show_notes: string;
    keywords?: string[];
  }): Promise<PodcastEpisode> {
    try {
      // Get series to determine episode number
      const series = await githubDB.findById(collections.podcast_series, episodeData.series_id);
      if (!series) {
        throw new Error('Podcast series not found');
      }

      const episodeNumber = series.total_episodes + 1;

      const episode: Partial<PodcastEpisode> = {
        title: episodeData.title,
        description: episodeData.description,
        content_script: episodeData.content_script,
        health_topics: episodeData.health_topics,
        target_audience: episodeData.target_audience,
        difficulty_level: episodeData.difficulty_level,
        host_name: episodeData.host_name,
        guest_expert: episodeData.guest_expert,
        episode_number: episodeNumber,
        season_number: 1, // Default to season 1
        publish_date: new Date().toISOString(),
        is_published: false,
        play_count: 0,
        download_count: 0,
        rating: 0,
        review_count: 0,
        keywords: episodeData.keywords || [],
        show_notes: episodeData.show_notes,
        production_status: 'planning',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const savedEpisode = await githubDB.insert(collections.podcast_episodes, episode);

      await logger.info('podcast_episode_created', 'Podcast episode created', {
        episode_id: savedEpisode.id,
        series_id: episodeData.series_id,
        episode_number: episodeNumber,
        title: episodeData.title
      });

      return savedEpisode;
    } catch (error) {
      await logger.error('podcast_episode_creation_failed', 'Podcast episode creation failed', {
        series_id: episodeData.series_id,
        title: episodeData.title,
        error: error.message
      });
      throw error;
    }
  }

  // Update episode with audio file
  static async uploadEpisodeAudio(
    episodeId: string,
    audioData: {
      audio_url: string;
      duration_seconds: number;
      file_size_bytes: number;
    }
  ): Promise<PodcastEpisode> {
    try {
      const episode = await githubDB.findById(collections.podcast_episodes, episodeId);
      if (!episode) {
        throw new Error('Episode not found');
      }

      const updatedEpisode = await githubDB.update(collections.podcast_episodes, episodeId, {
        audio_url: audioData.audio_url,
        duration_seconds: audioData.duration_seconds,
        file_size_bytes: audioData.file_size_bytes,
        production_status: 'review',
        updated_at: new Date().toISOString()
      });

      await logger.info('podcast_audio_uploaded', 'Podcast audio uploaded', {
        episode_id: episodeId,
        duration_seconds: audioData.duration_seconds,
        file_size_mb: Math.round(audioData.file_size_bytes / 1024 / 1024)
      });

      return updatedEpisode;
    } catch (error) {
      await logger.error('podcast_audio_upload_failed', 'Podcast audio upload failed', {
        episode_id: episodeId,
        error: error.message
      });
      throw error;
    }
  }

  // Add transcript to episode
  static async addEpisodeTranscript(
    episodeId: string,
    transcriptData: {
      transcript: string;
      transcript_srt?: string;
      transcript_vtt?: string;
    }
  ): Promise<PodcastEpisode> {
    try {
      const updatedEpisode = await githubDB.update(collections.podcast_episodes, episodeId, {
        transcript: transcriptData.transcript,
        transcript_srt: transcriptData.transcript_srt,
        transcript_vtt: transcriptData.transcript_vtt,
        updated_at: new Date().toISOString()
      });

      await logger.info('podcast_transcript_added', 'Podcast transcript added', {
        episode_id: episodeId,
        transcript_length: transcriptData.transcript.length
      });

      return updatedEpisode;
    } catch (error) {
      await logger.error('podcast_transcript_addition_failed', 'Podcast transcript addition failed', {
        episode_id: episodeId,
        error: error.message
      });
      throw error;
    }
  }

  // Publish episode
  static async publishEpisode(episodeId: string): Promise<PodcastEpisode> {
    try {
      const episode = await githubDB.findById(collections.podcast_episodes, episodeId);
      if (!episode) {
        throw new Error('Episode not found');
      }

      if (!episode.audio_url) {
        throw new Error('Cannot publish episode without audio file');
      }

      const updatedEpisode = await githubDB.update(collections.podcast_episodes, episodeId, {
        is_published: true,
        production_status: 'published',
        published_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

      // Update series episode count
      const series = await githubDB.findById(collections.podcast_series, episode.series_id);
      if (series) {
        await githubDB.update(collections.podcast_series, series.id, {
          total_episodes: series.total_episodes + 1,
          updated_at: new Date().toISOString()
        });
      }

      // Update RSS feed
      await this.updateRSSFeed(episode.series_id);

      await logger.info('podcast_episode_published', 'Podcast episode published', {
        episode_id: episodeId,
        episode_number: episode.episode_number,
        title: episode.title
      });

      return updatedEpisode;
    } catch (error) {
      await logger.error('podcast_episode_publish_failed', 'Podcast episode publish failed', {
        episode_id: episodeId,
        error: error.message
      });
      throw error;
    }
  }

  // Generate RSS feed for podcast series
  static async generateRSSFeed(seriesId: string): Promise<string> {
    try {
      const series = await githubDB.findById(collections.podcast_series, seriesId);
      if (!series) {
        throw new Error('Podcast series not found');
      }

      const episodes = await githubDB.find(collections.podcast_episodes, {
        series_id: seriesId,
        is_published: true
      });

      // Sort episodes by episode number (descending)
      episodes.sort((a: PodcastEpisode, b: PodcastEpisode) => b.episode_number - a.episode_number);

      const rssXML = this.buildRSSXML(series, episodes);

      await logger.info('rss_feed_generated', 'RSS feed generated', {
        series_id: seriesId,
        episode_count: episodes.length
      });

      return rssXML;
    } catch (error) {
      await logger.error('rss_generation_failed', 'RSS feed generation failed', {
        series_id: seriesId,
        error: error.message
      });
      throw error;
    }
  }

  // Build RSS XML content
  private static buildRSSXML(series: PodcastSeries, episodes: PodcastEpisode[]): string {
    const baseUrl = window.location.origin;
    const buildDate = new Date().toUTCString();

    let rssContent = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd" xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>${this.escapeXML(series.name)}</title>
    <description>${this.escapeXML(series.description)}</description>
    <link>${baseUrl}/podcasts/${series.id}</link>
    <language>en-us</language>
    <copyright>© ${new Date().getFullYear()} CareConnect Healthcare Platform</copyright>
    <lastBuildDate>${buildDate}</lastBuildDate>
    <pubDate>${buildDate}</pubDate>
    <ttl>60</ttl>
    <image>
      <url>${series.cover_image_url}</url>
      <title>${this.escapeXML(series.name)}</title>
      <link>${baseUrl}/podcasts/${series.id}</link>
    </image>
    <itunes:author>${this.escapeXML(series.host_name)}</itunes:author>
    <itunes:summary>${this.escapeXML(series.description)}</itunes:summary>
    <itunes:owner>
      <itunes:name>${this.escapeXML(series.host_name)}</itunes:name>
      <itunes:email>podcast@careconnect.com</itunes:email>
    </itunes:owner>
    <itunes:image href="${series.cover_image_url}" />
    <itunes:category text="Health &amp; Fitness">
      <itunes:category text="Medicine" />
    </itunes:category>
    <itunes:explicit>no</itunes:explicit>`;

    // Add episodes
    episodes.forEach(episode => {
      const episodeUrl = `${baseUrl}/podcasts/${series.id}/episodes/${episode.id}`;
      const pubDate = new Date(episode.published_at!).toUTCString();
      
      rssContent += `
    <item>
      <title>${this.escapeXML(episode.title)}</title>
      <description>${this.escapeXML(episode.description)}</description>
      <link>${episodeUrl}</link>
      <guid isPermaLink="false">${episode.id}</guid>
      <pubDate>${pubDate}</pubDate>
      <enclosure url="${episode.audio_url}" length="${episode.file_size_bytes || 0}" type="audio/mpeg" />
      <itunes:author>${this.escapeXML(episode.host_name)}</itunes:author>
      <itunes:subtitle>${this.escapeXML(episode.description)}</itunes:subtitle>
      <itunes:summary>${this.escapeXML(episode.show_notes)}</itunes:summary>
      <itunes:duration>${this.formatDuration(episode.duration_seconds || 0)}</itunes:duration>
      <itunes:episode>${episode.episode_number}</itunes:episode>
      <itunes:season>${episode.season_number}</itunes:season>
      <itunes:episodeType>full</itunes:episodeType>
      <content:encoded><![CDATA[${episode.show_notes}]]></content:encoded>
    </item>`;
    });

    rssContent += `
  </channel>
</rss>`;

    return rssContent;
  }

  // Update RSS feed (save to storage)
  private static async updateRSSFeed(seriesId: string): Promise<void> {
    try {
      const rssContent = await this.generateRSSFeed(seriesId);
      
      // In a real implementation, you would save this to a file server or CDN
      // For now, we'll store it in the database
      const existingFeeds = await githubDB.find(collections.podcast_rss_feeds, { series_id: seriesId });
      
      if (existingFeeds.length > 0) {
        await githubDB.update(collections.podcast_rss_feeds, existingFeeds[0].id, {
          rss_content: rssContent,
          updated_at: new Date().toISOString()
        });
      } else {
        await githubDB.insert(collections.podcast_rss_feeds, {
          series_id: seriesId,
          rss_content: rssContent,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      }

      await logger.info('rss_feed_updated', 'RSS feed updated', {
        series_id: seriesId
      });

    } catch (error) {
      await logger.error('rss_feed_update_failed', 'RSS feed update failed', {
        series_id: seriesId,
        error: error.message
      });
    }
  }

  // Track episode play
  static async trackEpisodePlay(episodeId: string): Promise<void> {
    try {
      const episode = await githubDB.findById(collections.podcast_episodes, episodeId);
      if (!episode) return;

      await githubDB.update(collections.podcast_episodes, episodeId, {
        play_count: episode.play_count + 1,
        updated_at: new Date().toISOString()
      });

      // Update series total downloads
      const series = await githubDB.findById(collections.podcast_series, episode.series_id);
      if (series) {
        await githubDB.update(collections.podcast_series, series.id, {
          total_downloads: series.total_downloads + 1
        });
      }

    } catch (error) {
      await logger.error('episode_play_tracking_failed', 'Episode play tracking failed', {
        episode_id: episodeId,
        error: error.message
      });
    }
  }

  // Auto-generate episode content based on health topics
  static async generateEpisodeContent(healthTopic: string): Promise<{
    title: string;
    description: string;
    content_script: string;
    show_notes: string;
    keywords: string[];
  }> {
    try {
      // In a real implementation, this could use AI to generate content
      // For now, we'll use template-based generation
      const templates = {
        'nutrition': {
          title: '5-Minute Nutrition Boost: [TOPIC]',
          description: 'Quick, evidence-based nutrition tips to improve your health in just 5 minutes.',
          script_intro: 'Welcome to 5-Minute HealthTalk! I\'m your host, and today we\'re diving into nutrition...',
          keywords: ['nutrition', 'diet', 'healthy eating', 'wellness', 'food']
        },
        'exercise': {
          title: 'Move More, Live Better: [TOPIC]',
          description: 'Simple exercise tips and movement strategies for a healthier lifestyle.',
          script_intro: 'Hello health enthusiasts! Today we\'re talking about movement and exercise...',
          keywords: ['exercise', 'fitness', 'movement', 'physical activity', 'health']
        },
        'mental health': {
          title: 'Mind Matters: [TOPIC]',
          description: 'Essential mental health insights and practical tips for emotional wellbeing.',
          script_intro: 'Welcome back to 5-Minute HealthTalk. Mental health is just as important as physical health...',
          keywords: ['mental health', 'wellbeing', 'psychology', 'stress', 'mindfulness']
        }
      };

      const template = templates[healthTopic.toLowerCase() as keyof typeof templates] || templates['nutrition'];
      
      return {
        title: template.title.replace('[TOPIC]', this.toTitleCase(healthTopic)),
        description: template.description,
        content_script: this.generateScript(template.script_intro, healthTopic),
        show_notes: this.generateShowNotes(healthTopic),
        keywords: template.keywords
      };

    } catch (error) {
      await logger.error('episode_content_generation_failed', 'Episode content generation failed', {
        health_topic: healthTopic,
        error: error.message
      });
      throw error;
    }
  }

  // Helper methods
  private static escapeXML(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  private static formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }

  private static toTitleCase(str: string): string {
    return str.replace(/\w\S*/g, (txt) => {
      return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
    });
  }

  private static generateScript(intro: string, topic: string): string {
    return `${intro}

[INTRODUCTION - 30 seconds]
Today's topic: ${topic}

[MAIN CONTENT - 3.5 minutes]
Let's explore the key points about ${topic}:

1. [Key Point 1]
2. [Key Point 2] 
3. [Key Point 3]

[PRACTICAL TIPS - 1 minute]
Here are actionable steps you can take today:
- [Tip 1]
- [Tip 2]
- [Tip 3]

[CONCLUSION - 30 seconds]
Thank you for joining me for this 5-minute health talk. Remember, small changes can make a big difference in your health journey.

Until next time, stay healthy!

[END]

---
Total Duration: Approximately 5 minutes
Host Notes: Speak clearly and maintain an engaging, friendly tone throughout.`;
  }

  private static generateShowNotes(topic: string): string {
    return `In this episode, we explore ${topic} and provide practical, evidence-based tips you can implement immediately.

Key Takeaways:
• Understanding the importance of ${topic}
• Practical strategies for improvement
• Common mistakes to avoid
• Quick action steps

Resources mentioned:
• [Add relevant resources]
• [Add studies or references]

Connect with us:
• Website: careconnect.com
• Email: podcast@careconnect.com

Disclaimer: This podcast is for educational purposes only and should not replace professional medical advice. Always consult with your healthcare provider before making significant health changes.`;
  }

  // Get podcast analytics
  static async getPodcastAnalytics(seriesId: string): Promise<any> {
    try {
      const series = await githubDB.findById(collections.podcast_series, seriesId);
      const episodes = await githubDB.find(collections.podcast_episodes, { series_id: seriesId });
      
      const publishedEpisodes = episodes.filter((ep: PodcastEpisode) => ep.is_published);
      const totalPlays = episodes.reduce((sum: number, ep: PodcastEpisode) => sum + ep.play_count, 0);
      const totalDownloads = episodes.reduce((sum: number, ep: PodcastEpisode) => sum + ep.download_count, 0);
      const averageRating = episodes.reduce((sum: number, ep: PodcastEpisode) => sum + ep.rating, 0) / episodes.length || 0;

      return {
        series_info: {
          name: series?.name,
          total_episodes: series?.total_episodes || 0,
          subscriber_count: series?.subscriber_count || 0
        },
        performance: {
          total_plays: totalPlays,
          total_downloads: totalDownloads,
          average_rating: Math.round(averageRating * 10) / 10,
          published_episodes: publishedEpisodes.length
        },
        recent_episodes: publishedEpisodes
          .sort((a: PodcastEpisode, b: PodcastEpisode) => b.episode_number - a.episode_number)
          .slice(0, 5)
          .map((ep: PodcastEpisode) => ({
            title: ep.title,
            episode_number: ep.episode_number,
            play_count: ep.play_count,
            rating: ep.rating,
            published_at: ep.published_at
          }))
      };

    } catch (error) {
      await logger.error('podcast_analytics_failed', 'Podcast analytics failed', {
        series_id: seriesId,
        error: error.message
      });
      return null;
    }
  }
}