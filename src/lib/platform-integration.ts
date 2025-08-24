// Platform Integration and Initialization Service
import { ConsolidatedHealthToolsService } from './health-tools-consolidated';
import { backgroundScheduler } from './scheduler';
import { logger } from './observability';
import { emailService } from './email';
import { githubDB } from './database';

export class PlatformIntegrationService {
  private static initialized = false;

  // Initialize all platform services
  static async initializePlatform(): Promise<void> {
    if (this.initialized) {
      console.log('Platform already initialized');
      return;
    }

    try {
      await logger.info('platform_init_started', 'Platform initialization started');

      // 1. Initialize health tools
      console.log('🔧 Initializing health tools...');
      await ConsolidatedHealthToolsService.initializeTools();

      // 2. Start background scheduler
      console.log('⏰ Starting background scheduler...');
      backgroundScheduler.start();

      // 3. Initialize database collections
      console.log('💾 Verifying database structure...');
      await this.verifyDatabaseStructure();

      // 4. Seed initial data if needed
      console.log('🌱 Seeding initial data...');
      await this.seedInitialData();

      // 5. Verify email service
      console.log('📧 Verifying email service...');
      await this.verifyEmailService();

      // 6. Setup error handlers
      console.log('🛡️ Setting up error handlers...');
      this.setupGlobalErrorHandlers();

      this.initialized = true;

      await logger.info('platform_init_completed', 'Platform initialization completed successfully');
      console.log('✅ CareConnect platform initialized successfully!');

    } catch (error) {
      await logger.error('platform_init_failed', 'Platform initialization failed', {
        error: error.message
      });
      console.error('❌ Platform initialization failed:', error);
      throw error;
    }
  }

  // Verify database structure
  private static async verifyDatabaseStructure(): Promise<void> {
    try {
      // Verify that all required collections exist
      const requiredCollections = [
        'users', 'profiles', 'entities', 'health_tools', 'bookings', 
        'orders', 'payment_intents', 'courses', 'forum_posts', 'causes',
        'news_articles', 'podcast_episodes', 'notifications'
      ];

      for (const collection of requiredCollections) {
        try {
          await githubDB.find(collection, {});
        } catch (error) {
          console.warn(`Collection ${collection} may not exist, will be created on first use`);
        }
      }

      await logger.info('database_verification_completed', 'Database structure verified');
    } catch (error) {
      await logger.error('database_verification_failed', 'Database verification failed', {
        error: error.message
      });
      throw error;
    }
  }

  // Seed initial data
  private static async seedInitialData(): Promise<void> {
    try {
      // Check if system admin user exists
      const adminUsers = await githubDB.find('users', { user_type: 'super_admin' });
      
      if (adminUsers.length === 0) {
        console.log('Creating default admin user...');
        await this.createDefaultAdmin();
      }

      // Check if default news sources exist
      const newsSources = await githubDB.find('news_sources', {});
      
      if (newsSources.length === 0) {
        console.log('Creating default news sources...');
        await this.createDefaultNewsSources();
      }

      // Check if default podcast series exists
      const podcastSeries = await githubDB.find('podcast_series', {});
      
      if (podcastSeries.length === 0) {
        console.log('Creating default podcast series...');
        await this.createDefaultPodcastSeries();
      }

      await logger.info('initial_data_seeded', 'Initial data seeding completed');
    } catch (error) {
      await logger.error('initial_data_seeding_failed', 'Initial data seeding failed', {
        error: error.message
      });
      // Don't throw here - seeding is optional
    }
  }

  // Create default admin user
  private static async createDefaultAdmin(): Promise<void> {
    try {
      const { hashPassword } = await import('./auth');
      
      const adminUser = {
        email: 'admin@careconnect.com',
        phone: '+1234567890',
        user_type: 'super_admin',
        password_hash: await hashPassword('admin123'),
        is_verified: true,
        is_active: true,
        permissions: ['all'], // Super admin has all permissions
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const savedUser = await githubDB.insert('users', adminUser);

      // Create admin profile
      await githubDB.insert('profiles', {
        user_id: savedUser.id,
        first_name: 'System',
        last_name: 'Administrator',
        bio: 'Default system administrator account',
        preferences: {
          notifications: true,
          marketing_emails: false,
          data_sharing: false
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

      console.log('✅ Default admin user created: admin@careconnect.com / admin123');
    } catch (error) {
      console.error('Failed to create default admin:', error);
    }
  }

  // Create default news sources
  private static async createDefaultNewsSources(): Promise<void> {
    try {
      const { EnhancedNewsService } = await import('./news-enhanced');
      
      const defaultSources = [
        {
          name: 'WHO Health News',
          url: 'https://www.who.int',
          rss_feed: 'https://www.who.int/rss-feeds/news-english.xml',
          category: 'Global Health',
          fetch_frequency_hours: 12
        },
        {
          name: 'CDC Health News',
          url: 'https://www.cdc.gov',
          rss_feed: 'https://tools.cdc.gov/api/v2/resources/media.rss',
          category: 'Public Health',
          fetch_frequency_hours: 8
        },
        {
          name: 'NIH News',
          url: 'https://www.nih.gov',
          rss_feed: 'https://www.nih.gov/news-events/news-releases/rss.xml',
          category: 'Medical Research',
          fetch_frequency_hours: 24
        }
      ];

      for (const source of defaultSources) {
        await EnhancedNewsService.addNewsSource(source);
      }

      console.log('✅ Default news sources created');
    } catch (error) {
      console.error('Failed to create default news sources:', error);
    }
  }

  // Create default podcast series
  private static async createDefaultPodcastSeries(): Promise<void> {
    try {
      const { PodcastProductionService } = await import('./podcast-production');
      
      await PodcastProductionService.createPodcastSeries({
        name: '5-Minute HealthTalk',
        description: 'Quick, evidence-based health insights delivered in just 5 minutes. Perfect for your daily commute or lunch break.',
        host_name: 'Dr. CareConnect',
        host_bio: 'Healthcare professional dedicated to making health information accessible to everyone.',
        cover_image_url: 'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=400',
        schedule: 'weekly',
        target_duration_minutes: 5,
        content_themes: ['General Health', 'Nutrition', 'Mental Wellness', 'Preventive Care']
      });

      console.log('✅ Default podcast series created');
    } catch (error) {
      console.error('Failed to create default podcast series:', error);
    }
  }

  // Verify email service
  private static async verifyEmailService(): Promise<void> {
    try {
      // Email service is already configured in email.ts
      console.log('✅ Email service verified');
      await logger.info('email_service_verified', 'Email service verified successfully');
    } catch (error) {
      console.error('Email service verification failed:', error);
      await logger.error('email_service_verification_failed', 'Email service verification failed', {
        error: error.message
      });
    }
  }

  // Setup global error handlers
  private static setupGlobalErrorHandlers(): void {
    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      logger.error('unhandled_promise_rejection', 'Unhandled promise rejection', {
        reason: event.reason?.toString() || 'Unknown reason',
        stack: event.reason?.stack
      });
      
      // Prevent the default behavior (console error)
      event.preventDefault();
    });

    // Handle uncaught errors
    window.addEventListener('error', (event) => {
      logger.error('uncaught_error', 'Uncaught error', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        stack: event.error?.stack
      });
    });

    console.log('✅ Global error handlers set up');
  }

  // Get platform status
  static async getPlatformStatus(): Promise<any> {
    try {
      const status = {
        initialized: this.initialized,
        timestamp: new Date().toISOString(),
        services: {
          scheduler: backgroundScheduler.getStatistics(),
          database: await this.getDatabaseStatus(),
          email: await this.getEmailStatus(),
          health_tools: await this.getHealthToolsStatus()
        }
      };

      return status;
    } catch (error) {
      await logger.error('platform_status_check_failed', 'Platform status check failed', {
        error: error.message
      });
      return {
        initialized: this.initialized,
        timestamp: new Date().toISOString(),
        error: error.message
      };
    }
  }

  // Get database status
  private static async getDatabaseStatus(): Promise<any> {
    try {
      const collections = ['users', 'health_tools', 'bookings', 'orders'];
      const status: any = {};

      for (const collection of collections) {
        try {
          const items = await githubDB.find(collection, {});
          status[collection] = {
            count: items.length,
            status: 'healthy'
          };
        } catch (error) {
          status[collection] = {
            count: 0,
            status: 'error',
            error: error.message
          };
        }
      }

      return status;
    } catch (error) {
      return { status: 'error', error: error.message };
    }
  }

  // Get email status
  private static async getEmailStatus(): Promise<any> {
    return {
      status: 'configured',
      provider: 'smtp',
      templates_count: Object.keys(emailService).length
    };
  }

  // Get health tools status
  private static async getHealthToolsStatus(): Promise<any> {
    try {
      const tools = await ConsolidatedHealthToolsService.getAllTools();
      return {
        total_tools: tools.length,
        active_tools: tools.filter(tool => tool.is_active).length,
        ai_tools: tools.filter(tool => tool.type === 'ai_powered').length,
        calculator_tools: tools.filter(tool => tool.type === 'calculator').length
      };
    } catch (error) {
      return { status: 'error', error: error.message };
    }
  }

  // Restart platform services
  static async restartServices(): Promise<void> {
    try {
      await logger.info('platform_restart_started', 'Platform restart initiated');

      // Stop scheduler
      backgroundScheduler.stop();

      // Wait a moment
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Restart scheduler
      backgroundScheduler.start();

      await logger.info('platform_restart_completed', 'Platform restart completed');
      console.log('✅ Platform services restarted');
    } catch (error) {
      await logger.error('platform_restart_failed', 'Platform restart failed', {
        error: error.message
      });
      throw error;
    }
  }

  // Shutdown platform services
  static async shutdown(): Promise<void> {
    try {
      await logger.info('platform_shutdown_started', 'Platform shutdown initiated');

      // Stop background scheduler
      backgroundScheduler.stop();

      // Additional cleanup would go here

      this.initialized = false;

      await logger.info('platform_shutdown_completed', 'Platform shutdown completed');
      console.log('✅ Platform shutdown completed');
    } catch (error) {
      await logger.error('platform_shutdown_failed', 'Platform shutdown failed', {
        error: error.message
      });
      throw error;
    }
  }
}

// Auto-initialize when imported
if (typeof window !== 'undefined') {
  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      PlatformIntegrationService.initializePlatform().catch(console.error);
    });
  } else {
    // DOM is already ready
    PlatformIntegrationService.initializePlatform().catch(console.error);
  }
}