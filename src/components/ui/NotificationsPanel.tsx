// Notifications Panel Component
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../lib/auth';
import { githubDB, collections } from '../../lib/database';
import { Button } from './button';
import { Card, CardContent, CardHeader, CardTitle } from './card';
import { ScrollArea } from './scroll-area';
import { Badge } from './badge';
import { Bell, BellRing, Check, X, Calendar, MessageSquare, AlertTriangle, Heart } from 'lucide-react';
import { logger } from '../../lib/observability';

interface Notification {
  id: string;
  user_id: string;
  type: 'booking_confirmation' | 'appointment_reminder' | 'health_alert' | 'system_update' | 'message' | 'payment' | 'general';
  title: string;
  message: string;
  data?: Record<string, any>;
  is_read: boolean;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  created_at: string;
  expires_at?: string;
}

const NotificationsPanel: React.FC<{ onClose?: () => void }> = ({ onClose }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread' | 'urgent'>('all');

  useEffect(() => {
    if (user) {
      loadNotifications();
    }
  }, [user, filter]);

  const loadNotifications = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      let query: Record<string, any> = { user_id: user.id };
      
      if (filter === 'unread') {
        query.is_read = false;
      } else if (filter === 'urgent') {
        query.priority = 'urgent';
      }

      let userNotifications = await githubDB.find(collections.notifications, query);
      
      // Filter out expired notifications
      const now = new Date();
      userNotifications = userNotifications.filter(notification => 
        !notification.expires_at || new Date(notification.expires_at) > now
      );

      // Sort by priority and date
      userNotifications.sort((a, b) => {
        const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
        const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
        if (priorityDiff !== 0) return priorityDiff;
        
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });

      setNotifications(userNotifications);
    } catch (error) {
      await logger.error('notifications_load_failed', 'Failed to load notifications', {
        error: error.message
      }, user.id);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      await githubDB.update(collections.notifications, notificationId, {
        is_read: true,
        read_at: new Date().toISOString()
      });

      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
      );

      await logger.info('notification_marked_read', 'Notification marked as read', {
        notification_id: notificationId
      }, user?.id);
    } catch (error) {
      await logger.error('notification_mark_read_failed', 'Failed to mark notification as read', {
        notification_id: notificationId,
        error: error.message
      }, user?.id);
    }
  };

  const markAllAsRead = async () => {
    if (!user) return;

    try {
      const unreadNotifications = notifications.filter(n => !n.is_read);
      
      for (const notification of unreadNotifications) {
        await githubDB.update(collections.notifications, notification.id, {
          is_read: true,
          read_at: new Date().toISOString()
        });
      }

      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));

      await logger.info('all_notifications_marked_read', 'All notifications marked as read', {
        count: unreadNotifications.length
      }, user.id);
    } catch (error) {
      await logger.error('mark_all_read_failed', 'Failed to mark all notifications as read', {
        error: error.message
      }, user.id);
    }
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      await githubDB.delete(collections.notifications, notificationId);
      setNotifications(prev => prev.filter(n => n.id !== notificationId));

      await logger.info('notification_deleted', 'Notification deleted', {
        notification_id: notificationId
      }, user?.id);
    } catch (error) {
      await logger.error('notification_delete_failed', 'Failed to delete notification', {
        notification_id: notificationId,
        error: error.message
      }, user?.id);
    }
  };

  const getNotificationIcon = (type: string, priority: string) => {
    const iconProps = { className: `w-4 h-4 ${getPriorityColor(priority)}` };
    
    switch (type) {
      case 'booking_confirmation':
      case 'appointment_reminder':
        return <Calendar {...iconProps} />;
      case 'message':
        return <MessageSquare {...iconProps} />;
      case 'health_alert':
        return <AlertTriangle {...iconProps} />;
      case 'payment':
        return <Heart {...iconProps} />;
      default:
        return <Bell {...iconProps} />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'text-red-600';
      case 'high': return 'text-orange-600';
      case 'medium': return 'text-blue-600';
      default: return 'text-gray-600';
    }
  };

  const getPriorityBadgeColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffMs = now.getTime() - time.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return time.toLocaleDateString();
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;
  const filteredNotifications = notifications.slice(0, 50); // Limit to 50 most recent

  if (loading) {
    return (
      <Card className="w-96">
        <CardContent className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-96 max-h-[600px] flex flex-col">
      <CardHeader className="flex-shrink-0">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center">
            <BellRing className="w-5 h-5 mr-2" />
            Notifications
            {unreadCount > 0 && (
              <Badge className="ml-2 bg-red-500 text-white">
                {unreadCount}
              </Badge>
            )}
          </CardTitle>
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
        
        {/* Filter Tabs */}
        <div className="flex space-x-1 mt-4">
          {['all', 'unread', 'urgent'].map(f => (
            <Button
              key={f}
              variant={filter === f ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setFilter(f as any)}
              className="capitalize"
            >
              {f}
              {f === 'unread' && unreadCount > 0 && (
                <Badge className="ml-1 bg-red-500 text-white text-xs">
                  {unreadCount}
                </Badge>
              )}
            </Button>
          ))}
        </div>

        {/* Actions */}
        {unreadCount > 0 && (
          <div className="flex justify-end mt-2">
            <Button variant="outline" size="sm" onClick={markAllAsRead}>
              <Check className="w-4 h-4 mr-1" />
              Mark all read
            </Button>
          </div>
        )}
      </CardHeader>

      <CardContent className="flex-1 p-0">
        <ScrollArea className="h-full">
          {filteredNotifications.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <Bell className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No notifications</p>
              <p className="text-sm">You're all caught up!</p>
            </div>
          ) : (
            <div className="space-y-1">
              {filteredNotifications.map(notification => (
                <div
                  key={notification.id}
                  className={`p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                    !notification.is_read ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3 flex-1">
                      {getNotificationIcon(notification.type, notification.priority)}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-1">
                          <h4 className={`text-sm font-medium ${
                            !notification.is_read ? 'text-gray-900' : 'text-gray-700'
                          }`}>
                            {notification.title}
                          </h4>
                          <Badge className={`text-xs ${getPriorityBadgeColor(notification.priority)}`}>
                            {notification.priority}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 line-clamp-2">
                          {notification.message}
                        </p>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs text-gray-500">
                            {formatTimeAgo(notification.created_at)}
                          </span>
                          {notification.data?.booking_reference && (
                            <span className="text-xs text-blue-600 font-mono">
                              #{notification.data.booking_reference}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-1 ml-2">
                      {!notification.is_read && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => markAsRead(notification.id)}
                          className="p-1 h-auto"
                        >
                          <Check className="w-3 h-3" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteNotification(notification.id)}
                        className="p-1 h-auto text-gray-400 hover:text-red-600"
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>

                  {/* Action buttons for specific notification types */}
                  {notification.type === 'appointment_reminder' && notification.data?.telehealth_url && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <Button size="sm" className="w-full" asChild>
                        <a href={notification.data.telehealth_url} target="_blank" rel="noopener noreferrer">
                          Join Telehealth Session
                        </a>
                      </Button>
                    </div>
                  )}

                  {notification.type === 'booking_confirmation' && notification.data?.booking_id && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <Button variant="outline" size="sm" className="w-full" asChild>
                        <a href={`/dashboard/appointments`}>
                          View Appointment Details
                        </a>
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default NotificationsPanel;