// HealthTalk Podcast System - 5-minute Daily Healthcare Podcasts
import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  Download,
  Share2,
  Calendar,
  Clock,
  Users,
  Heart,
  Bookmark,
  Radio,
  Headphones,
  Mic,
  TrendingUp
} from 'lucide-react';
import { dbHelpers, collections } from '../lib/database';
import LoadingSpinner from '../components/ui/LoadingSpinner';

interface PodcastEpisode {
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
  };
  transcript?: string;
  tags: string[];
  playCount: number;
  likes: number;
  isLive: boolean;
  scheduledFor?: string;
}

interface LiveSession {
  id: string;
  title: string;
  description: string;
  host: {
    name: string;
    credentials: string;
    avatar?: string;
  };
  scheduledStart: string;
  duration: number;
  attendeeCount: number;
  isActive: boolean;
  streamUrl?: string;
}

const HealthTalkPodcastPage: React.FC = () => {
  const [episodes, setEpisodes] = useState<PodcastEpisode[]>([]);
  const [liveSessions, setLiveSessions] = useState<LiveSession[]>([]);
  const [currentEpisode, setCurrentEpisode] = useState<PodcastEpisode | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [view, setView] = useState<'episodes' | 'live' | 'schedule'>('episodes');
  
  const audioRef = useRef<HTMLAudioElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);

  const categories = [
    { id: 'general', name: 'General Health', color: 'bg-blue-100 text-blue-800' },
    { id: 'nutrition', name: 'Nutrition', color: 'bg-green-100 text-green-800' },
    { id: 'mental-health', name: 'Mental Health', color: 'bg-purple-100 text-purple-800' },
    { id: 'chronic-conditions', name: 'Chronic Conditions', color: 'bg-red-100 text-red-800' },
    { id: 'prevention', name: 'Prevention', color: 'bg-teal-100 text-teal-800' },
    { id: 'technology', name: 'Health Tech', color: 'bg-indigo-100 text-indigo-800' }
  ];

  useEffect(() => {
    loadPodcastData();
  }, [selectedCategory]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [currentEpisode]);

  const loadPodcastData = async () => {
    setIsLoading(true);
    try {
      // Mock podcast episodes (in real app, fetch from database)
      const mockEpisodes: PodcastEpisode[] = [
        {
          id: '1',
          title: 'Daily Wellness Check: Heart Health Basics',
          description: 'Understanding cardiovascular health, risk factors, and simple prevention strategies everyone should know.',
          audioUrl: '/audio/podcasts/heart-health-basics.mp3',
          duration: 300, // 5 minutes
          publishedAt: '2024-01-20',
          category: 'general',
          host: {
            name: 'Dr. Sarah Chen',
            credentials: 'MD, Cardiologist',
            avatar: '/images/hosts/dr-chen.jpg'
          },
          transcript: 'Welcome to today\'s HealthTalk! I\'m Dr. Sarah Chen, and today we\'re discussing heart health basics...',
          tags: ['heart health', 'prevention', 'wellness'],
          playCount: 2847,
          likes: 234,
          isLive: false
        },
        {
          id: '2',
          title: 'Nutrition Minute: Building Healthy Eating Habits',
          description: 'Simple, science-based tips for developing sustainable healthy eating patterns that fit your lifestyle.',
          audioUrl: '/audio/podcasts/healthy-eating-habits.mp3',
          duration: 295,
          publishedAt: '2024-01-19',
          category: 'nutrition',
          host: {
            name: 'Lisa Rodriguez, RD',
            credentials: 'Registered Dietitian',
            avatar: '/images/hosts/lisa-rodriguez.jpg'
          },
          tags: ['nutrition', 'diet', 'healthy habits'],
          playCount: 1923,
          likes: 156,
          isLive: false
        },
        {
          id: '3',
          title: 'Mental Wellness Today: Managing Daily Stress',
          description: 'Quick, effective strategies for managing everyday stress and maintaining mental wellness in busy times.',
          audioUrl: '/audio/podcasts/daily-stress-management.mp3',
          duration: 318,
          publishedAt: '2024-01-18',
          category: 'mental-health',
          host: {
            name: 'Dr. Michael Thompson',
            credentials: 'PhD, Clinical Psychologist',
            avatar: '/images/hosts/dr-thompson.jpg'
          },
          tags: ['stress management', 'mental health', 'wellness'],
          playCount: 3156,
          likes: 287,
          isLive: false
        }
      ];

      const mockLiveSessions: LiveSession[] = [
        {
          id: '1',
          title: 'Live Q&A: Diabetes Management',
          description: 'Join Dr. Amanda Foster for a live discussion about diabetes management, nutrition tips, and answering your questions.',
          host: {
            name: 'Dr. Amanda Foster',
            credentials: 'MD, Endocrinologist',
            avatar: '/images/hosts/dr-foster.jpg'
          },
          scheduledStart: '2024-01-21T15:00:00Z',
          duration: 1800, // 30 minutes
          attendeeCount: 0,
          isActive: false
        }
      ];

      let filteredEpisodes = mockEpisodes;
      if (selectedCategory) {
        filteredEpisodes = filteredEpisodes.filter(ep => ep.category === selectedCategory);
      }

      setEpisodes(filteredEpisodes);
      setLiveSessions(mockLiveSessions);
    } catch (error) {
      console.error('Failed to load podcast data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const playEpisode = (episode: PodcastEpisode) => {
    if (currentEpisode?.id === episode.id) {
      togglePlayPause();
    } else {
      setCurrentEpisode(episode);
      setCurrentTime(0);
      setIsPlaying(true);
    }
  };

  const togglePlayPause = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
    setIsPlaying(!isPlaying);
  };

  const seekTo = (time: number) => {
    const audio = audioRef.current;
    if (audio) {
      audio.currentTime = time;
      setCurrentTime(time);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const shareEpisode = (episode: PodcastEpisode) => {
    if (navigator.share) {
      navigator.share({
        title: episode.title,
        text: episode.description,
        url: window.location.href
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      // Show toast notification
    }
  };

  return (
    <div className="min-h-screen bg-light">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-primary/10 via-white to-accent/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <div className="flex justify-center mb-6">
              <div className="w-20 h-20 bg-primary rounded-full flex items-center justify-center">
                <Headphones className="w-10 h-10 text-white" />
              </div>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-dark mb-6">
              HealthTalk Podcasts
              <span className="block text-primary">5-Minute Daily Health</span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              Quick, expert-led health insights you can listen to anywhere. 
              Daily episodes covering everything from wellness tips to medical breakthroughs.
            </p>
            
            {/* Live Indicator */}
            {liveSessions.some(s => s.isActive) && (
              <div className="inline-flex items-center bg-red-100 text-red-800 px-4 py-2 rounded-full mb-6">
                <Radio className="w-5 h-5 mr-2 animate-pulse" />
                <span className="font-semibold">LIVE NOW</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Navigation Tabs */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
            <div className="flex space-x-1">
              <button
                onClick={() => setView('episodes')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  view === 'episodes' 
                    ? 'bg-primary text-white' 
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                Episodes
              </button>
              <button
                onClick={() => setView('live')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center ${
                  view === 'live' 
                    ? 'bg-primary text-white' 
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Radio className="w-4 h-4 mr-1" />
                Live
              </button>
              <button
                onClick={() => setView('schedule')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center ${
                  view === 'schedule' 
                    ? 'bg-primary text-white' 
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Calendar className="w-4 h-4 mr-1" />
                Schedule
              </button>
            </div>

            {view === 'episodes' && (
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="">All Categories</option>
                {categories.map(category => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <LoadingSpinner size="lg" />
          </div>
        ) : (
          <div className="space-y-8">
            {/* Episodes View */}
            {view === 'episodes' && (
              <div className="grid grid-cols-1 gap-6">
                {episodes.map((episode) => {
                  const categoryInfo = categories.find(c => c.id === episode.category);
                  const isCurrentlyPlaying = currentEpisode?.id === episode.id;
                  
                  return (
                    <div key={episode.id} className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow">
                      <div className="flex items-start space-x-4">
                        {/* Play Button */}
                        <button
                          onClick={() => playEpisode(episode)}
                          className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
                            isCurrentlyPlaying && isPlaying
                              ? 'bg-accent text-dark'
                              : 'bg-primary text-white hover:bg-primary/90'
                          }`}
                        >
                          {isCurrentlyPlaying && isPlaying ? (
                            <Pause className="w-5 h-5" />
                          ) : (
                            <Play className="w-5 h-5 ml-0.5" />
                          )}
                        </button>

                        {/* Episode Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-2">
                            <h3 className="text-lg font-semibold text-dark">{episode.title}</h3>
                            {categoryInfo && (
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${categoryInfo.color}`}>
                                {categoryInfo.name}
                              </span>
                            )}
                          </div>
                          
                          <p className="text-gray-600 mb-3 line-clamp-2">{episode.description}</p>
                          
                          <div className="flex items-center space-x-4 text-sm text-gray-500">
                            <div className="flex items-center">
                              <Mic className="w-4 h-4 mr-1" />
                              <span>{episode.host.name}</span>
                            </div>
                            <div className="flex items-center">
                              <Clock className="w-4 h-4 mr-1" />
                              <span>{formatTime(episode.duration)}</span>
                            </div>
                            <div className="flex items-center">
                              <Headphones className="w-4 h-4 mr-1" />
                              <span>{episode.playCount.toLocaleString()} plays</span>
                            </div>
                            <div className="flex items-center">
                              <Heart className="w-4 h-4 mr-1" />
                              <span>{episode.likes.toLocaleString()}</span>
                            </div>
                          </div>

                          {/* Progress Bar (if currently playing) */}
                          {isCurrentlyPlaying && (
                            <div className="mt-3">
                              <div className="flex items-center space-x-2 text-sm text-gray-500 mb-1">
                                <span>{formatTime(currentTime)}</span>
                                <div className="flex-1 bg-gray-200 rounded-full h-1 cursor-pointer">
                                  <div 
                                    className="bg-primary rounded-full h-1 transition-all duration-300"
                                    style={{ width: `${(currentTime / episode.duration) * 100}%` }}
                                  />
                                </div>
                                <span>{formatTime(episode.duration)}</span>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center space-x-2">
                          <button className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
                            <Bookmark className="w-5 h-5" />
                          </button>
                          <button 
                            onClick={() => shareEpisode(episode)}
                            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                          >
                            <Share2 className="w-5 h-5" />
                          </button>
                          <button className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
                            <Download className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Live Sessions View */}
            {view === 'live' && (
              <div className="space-y-6">
                {liveSessions.length === 0 ? (
                  <div className="text-center py-12">
                    <Radio className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-gray-600 mb-2">No Live Sessions</h3>
                    <p className="text-gray-500">Check back later for live health talks and Q&A sessions.</p>
                  </div>
                ) : (
                  liveSessions.map((session) => (
                    <div key={session.id} className="bg-white rounded-lg shadow-sm p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                            <Radio className="w-6 h-6 text-red-600" />
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold text-dark">{session.title}</h3>
                            <p className="text-gray-600">{session.description}</p>
                          </div>
                        </div>
                        {session.isActive && (
                          <span className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-medium">
                            LIVE
                          </span>
                        )}
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                          <div className="flex items-center">
                            <Mic className="w-4 h-4 mr-1" />
                            <span>{session.host.name}</span>
                          </div>
                          <div className="flex items-center">
                            <Users className="w-4 h-4 mr-1" />
                            <span>{session.attendeeCount} attending</span>
                          </div>
                          <div className="flex items-center">
                            <Clock className="w-4 h-4 mr-1" />
                            <span>{formatTime(session.duration)}</span>
                          </div>
                        </div>
                        
                        <button className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                          session.isActive 
                            ? 'bg-red-600 text-white hover:bg-red-700'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}>
                          {session.isActive ? 'Join Live' : 'Notify Me'}
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Audio Player */}
      {currentEpisode && (
        <audio
          ref={audioRef}
          src={currentEpisode.audioUrl}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onLoadedMetadata={() => {
            // Update duration if needed
          }}
        />
      )}
    </div>
  );
};

export default HealthTalkPodcastPage;