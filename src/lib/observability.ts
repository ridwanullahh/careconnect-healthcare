// Client-side observability and structured logging
import { githubDB, collections } from './database';

export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn', 
  INFO = 'info',
  DEBUG = 'debug'
}

export interface LogEvent {
  id: string;
  session_id: string;
  correlation_id: string;
  timestamp: string;
  level: LogLevel;
  event_name: string;
  message: string;
  context: Record<string, any>;
  user_id?: string;
  page_url: string;
  user_agent: string;
  performance_metrics?: {
    fcp?: number;
    lcp?: number;
    tti?: number;
    memory_used?: number;
  };
}

export interface AnalyticsEvent {
  id: string;
  session_id: string;
  user_id?: string;
  event_type: string;
  event_data: Record<string, any>;
  timestamp: string;
  page_url: string;
  referrer: string;
}

class ObservabilityService {
  private sessionId: string;
  private correlationId: string;
  private rateLimitCounter: number = 0;
  private maxEventsPerMinute: number = 100;

  constructor() {
    this.sessionId = this.generateId();
    this.correlationId = this.generateId();
    this.initPerformanceObserver();
    this.resetRateLimit();
  }

  private generateId(): string {
    return crypto.randomUUID();
  }

  private resetRateLimit(): void {
    setInterval(() => {
      this.rateLimitCounter = 0;
    }, 60000); // Reset every minute
  }

  private isRateLimited(): boolean {
    return this.rateLimitCounter >= this.maxEventsPerMinute;
  }

  async log(
    level: LogLevel,
    eventName: string,
    message: string,
    context: Record<string, any> = {},
    userId?: string
  ): Promise<void> {
    if (this.isRateLimited()) return;

    this.rateLimitCounter++;

    const logEvent: Partial<LogEvent> = {
      session_id: this.sessionId,
      correlation_id: this.correlationId,
      timestamp: new Date().toISOString(),
      level,
      event_name: eventName,
      message,
      context,
      user_id: userId,
      page_url: window.location.href,
      user_agent: navigator.userAgent
    };

    try {
      await githubDB.insert(collections.analytics_events, logEvent);
    } catch (error) {
      console.error('Failed to log event:', error);
    }

    // Also log to console for development
    const consoleMethod = level === LogLevel.ERROR ? console.error :
                         level === LogLevel.WARN ? console.warn :
                         console.log;
    
    consoleMethod(`[${level.toUpperCase()}] ${eventName}: ${message}`, context);
  }

  async trackEvent(
    eventType: string,
    eventData: Record<string, any> = {},
    userId?: string
  ): Promise<void> {
    if (this.isRateLimited()) return;

    this.rateLimitCounter++;

    const analyticsEvent: Partial<AnalyticsEvent> = {
      session_id: this.sessionId,
      user_id: userId,
      event_type: eventType,
      event_data: eventData,
      timestamp: new Date().toISOString(),
      page_url: window.location.href,
      referrer: document.referrer
    };

    try {
      await githubDB.insert(collections.analytics_events, analyticsEvent);
    } catch (error) {
      console.error('Failed to track event:', error);
    }
  }

  async trackPerformance(metrics: {
    fcp?: number;
    lcp?: number;
    tti?: number;
  }): Promise<void> {
    const memoryInfo = (performance as any).memory;
    const performanceMetrics = {
      ...metrics,
      memory_used: memoryInfo ? memoryInfo.usedJSHeapSize : undefined
    };

    await this.log(
      LogLevel.INFO,
      'performance_metrics',
      'Page performance metrics captured',
      { metrics: performanceMetrics }
    );
  }

  private initPerformanceObserver(): void {
    // Observe Core Web Vitals
    if ('PerformanceObserver' in window) {
      // First Contentful Paint
      const fcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const fcp = entries[entries.length - 1]?.startTime;
        if (fcp) this.trackPerformance({ fcp });
      });
      fcpObserver.observe({ entryTypes: ['paint'] });

      // Largest Contentful Paint
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lcp = entries[entries.length - 1]?.startTime;
        if (lcp) this.trackPerformance({ lcp });
      });
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
    }
  }

  newCorrelationId(): string {
    this.correlationId = this.generateId();
    return this.correlationId;
  }

  getSessionId(): string {
    return this.sessionId;
  }

  getCorrelationId(): string {
    return this.correlationId;
  }
}

// Global instance
export const observability = new ObservabilityService();

// Convenience methods
export const logger = {
  error: (eventName: string, message: string, context?: Record<string, any>, userId?: string) =>
    observability.log(LogLevel.ERROR, eventName, message, context, userId),
  
  warn: (eventName: string, message: string, context?: Record<string, any>, userId?: string) =>
    observability.log(LogLevel.WARN, eventName, message, context, userId),
  
  info: (eventName: string, message: string, context?: Record<string, any>, userId?: string) =>
    observability.log(LogLevel.INFO, eventName, message, context, userId),
  
  debug: (eventName: string, message: string, context?: Record<string, any>, userId?: string) =>
    observability.log(LogLevel.DEBUG, eventName, message, context, userId)
};

export const analytics = {
  track: (eventType: string, eventData?: Record<string, any>, userId?: string) =>
    observability.trackEvent(eventType, eventData, userId)
};