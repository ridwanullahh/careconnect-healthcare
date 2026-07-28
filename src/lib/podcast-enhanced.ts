// Enhanced 5-Minute HealthTalk Podcast System
import { githubDB, collections } from './database';

export interface PodcastSeries {
  id: string;
  title: string;
  description: string;
  hostName: string;
  hostBio: string;
  hostImage?: string;
  category: 'general_health' | 'mental_health' | 'nutrition' | 'fitness' | 'medical_research' | 'wellness' | 'chronic_conditions';
  language: string;
  coverImage: string;
  isActive: boolean;
  episodeCount: number;
  totalDuration: number; // in minutes
  subscriberCount: number;
  averageRating: number;
  ratingCount: number;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  lastEpisodeAt?: string;
  rssUrl?: string;
  itunesUrl?: string;
  spotifyUrl?: string;
}

export interface PodcastEpisode {
  id: string;
  seriesId: string;
  episodeNumber: number;
  title: string;
  description: string;
  audioUrl: string;
  duration: number; // in minutes (target: 5 minutes)
  fileSize: number; // in bytes
  transcript?: string;
  summary: string;
  keyPoints: string[];
  tags: string[];
  publishedAt: string;
  scheduledAt?: string;
  status: 'draft' | 'scheduled' | 'published' | 'archived';
  playCount: number;
  downloadCount: number;
  likeCount: number;
  shareCount: number;
  averageRating: number;
  ratingCount: number;
  guestName?: string;
  guestBio?: string;
  guestImage?: string;
  showNotes: string;
  resources: EpisodeResource[];
  createdAt: string;
  updatedAt: string;
}

export interface EpisodeResource {
  id: string;
  title: string;
  url: string;
  type: 'article' | 'study' | 'website' | 'video' | 'book' | 'tool';
  description?: string;
}

export interface PodcastSubscription {
  id: string;
  userId: string;
  seriesId: string;
  subscribedAt: string;
  notificationsEnabled: boolean;
  autoDownload: boolean;
  lastListenedAt?: string;
  progress: Record<string, number>; // episodeId -> progress percentage
}

export interface PodcastRSSFeed {
  id: string;
  seriesId: string;
  xmlContent: string;
  lastUpdatedAt: string;
  url: string;
  itemCount: number;
}

export interface EpisodeListening {
  id: string;
  userId: string;
  episodeId: string;
  seriesId: string;
  startedAt: string;
  completedAt?: string;
  progress: number; // percentage 0-100
  totalListenTime: number; // in seconds
  lastPositionSeconds: number;
  deviceType: 'web' | 'mobile' | 'tablet';
}

export class PodcastService {
  // Create podcast series
  static async createSeries(seriesData: Omit<PodcastSeries, 'id' | 'episodeCount' | 'totalDuration' | 'subscriberCount' | 'averageRating' | 'ratingCount' | 'createdAt' | 'updatedAt'>): Promise<PodcastSeries> {
    const series: PodcastSeries = {
      id: `series_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...seriesData,
      episodeCount: 0,
      totalDuration: 0,
      subscriberCount: 0,
      averageRating: 0,
      ratingCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await githubDB.create(collections.podcast_series, series);
    return series;
  }

  // Create podcast episode
  static async createEpisode(episodeData: Omit<PodcastEpisode, 'id' | 'episodeNumber' | 'playCount' | 'downloadCount' | 'likeCount' | 'shareCount' | 'averageRating' | 'ratingCount' | 'createdAt' | 'updatedAt'>): Promise<PodcastEpisode> {
    // Get series to determine episode number
    const series = await githubDB.findById(collections.podcast_series, episodeData.seriesId);
    if (!series) throw new Error('Podcast series not found');

    const existingEpisodes = await githubDB.findMany(collections.podcast_episodes, {
      seriesId: episodeData.seriesId
    });

    const episodeNumber = existingEpisodes.length + 1;

    const episode: PodcastEpisode = {
      id: `episode_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...episodeData,
      episodeNumber,
      playCount: 0,
      downloadCount: 0,
      likeCount: 0,
      shareCount: 0,
      averageRating: 0,
      ratingCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await githubDB.create(collections.podcast_episodes, episode);

    // Update series stats
    await this.updateSeriesStats(episodeData.seriesId);

    // Generate/update RSS feed if episode is published
    if (episode.status === 'published') {
      await this.generateRSSFeed(episodeData.seriesId);
    }

    return episode;
  }

  // Publish episode
  static async publishEpisode(episodeId: string): Promise<PodcastEpisode> {
    const episode = await githubDB.findById(collections.podcast_episodes, episodeId);
    if (!episode) throw new Error('Episode not found');

    const updatedEpisode = {
      ...episode,
      status: 'published' as const,
      publishedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await githubDB.update(collections.podcast_episodes, episodeId, updatedEpisode);

    // Update RSS feed
    await this.generateRSSFeed(episode.seriesId);

    // Notify subscribers
    await this.notifySubscribers(episode.seriesId, episodeId);

    // Update series last episode date
    await githubDB.update(collections.podcast_series, episode.seriesId, {
      lastEpisodeAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    return updatedEpisode;
  }

  // Generate RSS feed for podcast series
  static async generateRSSFeed(seriesId: string): Promise<PodcastRSSFeed> {
    const series = await githubDB.findById(collections.podcast_series, seriesId);
    if (!series) throw new Error('Podcast series not found');

    const episodes = await githubDB.findMany(collections.podcast_episodes, {
      seriesId,
      status: 'published'
    });

    // Sort episodes by episode number (descending for RSS)
    episodes.sort((a, b) => b.episodeNumber - a.episodeNumber);

    const rssXml = this.generateRSSXML(series, episodes);
    
    const existingFeed = await githubDB.findOne(collections.podcast_rss_feeds, { seriesId });
    
    const feedData = {
      seriesId,
      xmlContent: rssXml,
      lastUpdatedAt: new Date().toISOString(),
      url: `https://careconnect.com/podcast/${seriesId}/rss.xml`,
      itemCount: episodes.length
    };

    if (existingFeed) {
      await githubDB.update(collections.podcast_rss_feeds, existingFeed.id, feedData);
      return { ...existingFeed, ...feedData };
    } else {
      const feed: PodcastRSSFeed = {
        id: `rss_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        ...feedData
      };
      await githubDB.create(collections.podcast_rss_feeds, feed);
      return feed;
    }
  }

  // Generate RSS XML content
  private static generateRSSXML(series: PodcastSeries, episodes: PodcastEpisode[]): string {
    const now = new Date();
    const pubDate = now.toUTCString();

    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd" xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title><![CDATA[${series.title}]]></title>
    <description><![CDATA[${series.description}]]></description>
    <link>https://careconnect.com/podcast/${series.id}</link>
    <language>${series.language}</language>
    <pubDate>${pubDate}</pubDate>
    <lastBuildDate>${pubDate}</lastBuildDate>
    <managingEditor>podcast@careconnect.com (${series.hostName})</managingEditor>
    <webMaster>podcast@careconnect.com</webMaster>
    <category>Health</category>
    <itunes:category text="Health &amp; Fitness">
      <itunes:category text="Medicine"/>
    </itunes:category>
    <itunes:explicit>no</itunes:explicit>
    <itunes:author><![CDATA[${series.hostName}]]></itunes:author>
    <itunes:summary><![CDATA[${series.description}]]></itunes:summary>
    <itunes:owner>
      <itunes:name><![CDATA[CareConnect]]></itunes:name>
      <itunes:email>podcast@careconnect.com</itunes:email>
    </itunes:owner>
    <itunes:image href="${series.coverImage}"/>
    <image>
      <url>${series.coverImage}</url>
      <title><![CDATA[${series.title}]]></title>
      <link>https://careconnect.com/podcast/${series.id}</link>
    </image>`;

    episodes.forEach(episode => {
      const episodePubDate = new Date(episode.publishedAt).toUTCString();
      const durationFormatted = this.formatDuration(episode.duration * 60); // Convert minutes to seconds

      xml += `
    <item>
      <title><![CDATA[${episode.title}]]></title>
      <description><![CDATA[${episode.description}]]></description>
      <link>https://careconnect.com/podcast/${series.id}/episode/${episode.id}</link>
      <guid isPermaLink="false">${episode.id}</guid>
      <pubDate>${episodePubDate}</pubDate>
      <enclosure url="${episode.audioUrl}" length="${episode.fileSize}" type="audio/mpeg"/>
      <itunes:duration>${durationFormatted}</itunes:duration>
      <itunes:summary><![CDATA[${episode.summary}]]></itunes:summary>
      <itunes:explicit>no</itunes:explicit>
      <itunes:episodeType>full</itunes:episodeType>
      <itunes:episode>${episode.episodeNumber}</itunes:episode>
      <content:encoded><![CDATA[
        <p>${episode.description}</p>
        <h3>Key Points:</h3>
        <ul>
          ${episode.keyPoints.map(point => `<li>${point}</li>`).join('')}
        </ul>
        ${episode.showNotes ? `<h3>Show Notes:</h3><p>${episode.showNotes}</p>` : ''}
        ${episode.resources.length > 0 ? `
          <h3>Resources:</h3>
          <ul>
            ${episode.resources.map(resource => `<li><a href="${resource.url}">${resource.title}</a>${resource.description ? ` - ${resource.description}` : ''}</li>`).join('')}
          </ul>
        ` : ''}
      ]]></content:encoded>
    </item>`;
    });

    xml += `
  </channel>
</rss>`;

    return xml;
  }

  // Format duration for RSS (HH:MM:SS)
  private static formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    } else {
      return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
  }

  // Subscribe to podcast series
  static async subscribeToPodcast(userId: string, seriesId: string): Promise<PodcastSubscription> {
    // Check if already subscribed
    const existing = await githubDB.findOne(collections.analytics_events, {
      userId,
      entityId: seriesId,
      action: 'podcast_subscribe'
    });

    if (existing) {
      throw new Error('Already subscribed to this podcast');
    }

    const subscription: PodcastSubscription = {
      id: `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      seriesId,
      subscribedAt: new Date().toISOString(),
      notificationsEnabled: true,
      autoDownload: false,
      progress: {}
    };

    // Store subscription in analytics events for tracking
    await githubDB.create(collections.analytics_events, {
      id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      action: 'podcast_subscribe',
      entityType: 'podcast_series',
      entityId: seriesId,
      data: subscription,
      timestamp: new Date().toISOString()
    });

    // Update series subscriber count
    const series = await githubDB.findById(collections.podcast_series, seriesId);
    if (series) {
      await githubDB.update(collections.podcast_series, seriesId, {
        subscriberCount: series.subscriberCount + 1,
        updatedAt: new Date().toISOString()
      });
    }

    return subscription;
  }

  // Notify subscribers of new episode
  private static async notifySubscribers(seriesId: string, episodeId: string): Promise<void> {
    const series = await githubDB.findById(collections.podcast_series, seriesId);
    const episode = await githubDB.findById(collections.podcast_episodes, episodeId);
    
    if (!series || !episode) return;

    // Get subscribers
    const subscriptions = await githubDB.findMany(collections.analytics_events, {
      action: 'podcast_subscribe',
      entityId: seriesId
    });

    for (const subscription of subscriptions) {
      if (subscription.data?.notificationsEnabled !== false) {
        await githubDB.create(collections.notifications, {
          id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          userId: subscription.userId,
          type: 'new_podcast_episode',
          title: 'New Podcast Episode',
          message: `New episode of "${series.title}": ${episode.title}`,
          data: { seriesId, episodeId },
          createdAt: new Date().toISOString(),
          read: false,
          priority: 'low'
        });
      }
    }
  }

  // Update series statistics
  private static async updateSeriesStats(seriesId: string): Promise<void> {
    const episodes = await githubDB.findMany(collections.podcast_episodes, { seriesId });
    const publishedEpisodes = episodes.filter(e => e.status === 'published');
    
    const totalDuration = publishedEpisodes.reduce((sum, e) => sum + e.duration, 0);
    const episodeCount = publishedEpisodes.length;
    
    // Calculate average rating
    const ratingsSum = publishedEpisodes.reduce((sum, e) => sum + (e.averageRating * e.ratingCount), 0);
    const totalRatings = publishedEpisodes.reduce((sum, e) => sum + e.ratingCount, 0);
    const averageRating = totalRatings > 0 ? ratingsSum / totalRatings : 0;

    await githubDB.update(collections.podcast_series, seriesId, {
      episodeCount,
      totalDuration,
      averageRating,
      ratingCount: totalRatings,
      updatedAt: new Date().toISOString()
    });
  }

  // Get podcast series with episodes
  static async getSeriesWithEpisodes(seriesId: string): Promise<{
    series: PodcastSeries;
    episodes: PodcastEpisode[];
  }> {
    const series = await githubDB.findById(collections.podcast_series, seriesId);
    if (!series) throw new Error('Podcast series not found');

    const episodes = await githubDB.findMany(collections.podcast_episodes, {
      seriesId,
      status: 'published'
    });

    episodes.sort((a, b) => b.episodeNumber - a.episodeNumber);

    return { series, episodes };
  }

  // Get RSS feed content
  static async getRSSFeedContent(seriesId: string): Promise<string> {
    const feed = await githubDB.findOne(collections.podcast_rss_feeds, { seriesId });
    
    if (!feed) {
      // Generate RSS feed if it doesn't exist
      const generatedFeed = await this.generateRSSFeed(seriesId);
      return generatedFeed.xmlContent;
    }

    return feed.xmlContent;
  }

  // Search podcast episodes
  static async searchEpisodes(query: string, seriesId?: string): Promise<PodcastEpisode[]> {
    let episodes = await githubDB.findMany(collections.podcast_episodes, {
      status: 'published',
      ...(seriesId && { seriesId })
    });

    if (query) {
      const lowerQuery = query.toLowerCase();
      episodes = episodes.filter(episode =>
        episode.title.toLowerCase().includes(lowerQuery) ||
        episode.description.toLowerCase().includes(lowerQuery) ||
        episode.tags.some(tag => tag.toLowerCase().includes(lowerQuery)) ||
        episode.keyPoints.some(point => point.toLowerCase().includes(lowerQuery))
      );
    }

    return episodes.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
  }

  // Get popular episodes
  static async getPopularEpisodes(limit: number = 10): Promise<PodcastEpisode[]> {
    const episodes = await githubDB.findMany(collections.podcast_episodes, {
      status: 'published'
    });

    return episodes
      .sort((a, b) => b.playCount - a.playCount)
      .slice(0, limit);
  }

  // Get recent episodes
  static async getRecentEpisodes(limit: number = 20): Promise<PodcastEpisode[]> {
    const episodes = await githubDB.findMany(collections.podcast_episodes, {
      status: 'published'
    });

    return episodes
      .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
      .slice(0, limit);
  }
}

export default PodcastService;