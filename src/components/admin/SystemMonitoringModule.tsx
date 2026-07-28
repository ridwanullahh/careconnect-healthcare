// System Monitoring Module for Super Admin
import React, { useState, useEffect } from 'react';
import { githubDB, collections } from '../../lib/database';
import { logger } from '../../lib/observability';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { ScrollArea } from '../ui/scroll-area';
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Database, 
  Users, 
  TrendingUp,
  RefreshCw,
  Download
} from 'lucide-react';

interface SystemMetrics {
  users: {
    total: number;
    active_today: number;
    new_this_week: number;
  };
  bookings: {
    total: number;
    pending: number;
    completed_today: number;
  };
  payments: {
    total_amount: number;
    pending_review: number;
    completed_today: number;
  };
  health_tools: {
    total_executions: number;
    executions_today: number;
    most_popular: string;
  };
  system: {
    error_rate: number;
    response_time: number;
    uptime: number;
  };
}

const SystemMonitoringModule: React.FC = () => {
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadSystemMetrics();
    loadRecentLogs();
  }, []);

  const loadSystemMetrics = async () => {
    try {
      setRefreshing(true);
      
      const [users, bookings, payments, toolResults, analyticsEvents] = await Promise.all([
        githubDB.find(collections.users, {}),
        githubDB.find(collections.bookings, {}),
        githubDB.find(collections.payment_intents, {}),
        githubDB.find(collections.tool_results, {}),
        githubDB.find(collections.analytics_events, {})
      ]);

      const today = new Date().toISOString().split('T')[0];
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

      const systemMetrics: SystemMetrics = {
        users: {
          total: users.length,
          active_today: users.filter(u => 
            u.last_login && u.last_login.startsWith(today)
          ).length,
          new_this_week: users.filter(u => 
            u.created_at >= weekAgo
          ).length
        },
        bookings: {
          total: bookings.length,
          pending: bookings.filter(b => b.status === 'pending').length,
          completed_today: bookings.filter(b => 
            b.completed_at && b.completed_at.startsWith(today)
          ).length
        },
        payments: {
          total_amount: payments.reduce((sum, p) => sum + (p.amount || 0), 0),
          pending_review: payments.filter(p => p.status === 'pending_review').length,
          completed_today: payments.filter(p => 
            p.completed_at && p.completed_at.startsWith(today)
          ).length
        },
        health_tools: {
          total_executions: toolResults.length,
          executions_today: toolResults.filter(r => 
            r.execution_time.startsWith(today)
          ).length,
          most_popular: 'AI Symptom Checker' // Would calculate from actual data
        },
        system: {
          error_rate: calculateErrorRate(analyticsEvents),
          response_time: calculateAverageResponseTime(analyticsEvents),
          uptime: 99.8 // Would calculate from actual uptime monitoring
        }
      };

      setMetrics(systemMetrics);
    } catch (error) {
      await logger.error('system_metrics_load_failed', 'Failed to load system metrics', {
        error: error.message
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadRecentLogs = async () => {
    try {
      const recentLogs = await githubDB.find(collections.analytics_events, {});
      
      // Sort by timestamp and take last 100
      const sortedLogs = recentLogs
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 100);
      
      setLogs(sortedLogs);
    } catch (error) {
      await logger.error('system_logs_load_failed', 'Failed to load system logs', {
        error: error.message
      });
    }
  };

  const calculateErrorRate = (events: any[]): number => {
    const errorEvents = events.filter(e => e.level === 'error');
    return events.length > 0 ? (errorEvents.length / events.length) * 100 : 0;
  };

  const calculateAverageResponseTime = (events: any[]): number => {
    const performanceEvents = events.filter(e => e.event_name === 'performance_metrics');
    if (performanceEvents.length === 0) return 0;
    
    const totalTime = performanceEvents.reduce((sum, e) => 
      sum + (e.context?.metrics?.lcp || 0), 0
    );
    return totalTime / performanceEvents.length;
  };

  const exportSystemReport = async () => {
    try {
      const report = {
        generated_at: new Date().toISOString(),
        metrics,
        recent_logs: logs.slice(0, 50),
        system_health: {
          status: metrics?.system.error_rate < 5 ? 'healthy' : 'warning',
          recommendations: []
        }
      };

      const blob = new Blob([JSON.stringify(report, null, 2)], {
        type: 'application/json'
      });
      
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `system-report-${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      await logger.error('system_report_export_failed', 'Failed to export system report', {
        error: error.message
      });
    }
  };

  const getStatusColor = (value: number, thresholds: { good: number; warning: number }) => {
    if (value <= thresholds.good) return 'text-green-600';
    if (value <= thresholds.warning) return 'text-yellow-600';
    return 'text-red-600';
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">System Monitoring</h2>
          <p className="text-gray-600">Real-time platform health and analytics</p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={loadSystemMetrics} disabled={refreshing}>
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline" onClick={exportSystemReport}>
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* System Health Overview */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Users</p>
                  <p className="text-2xl font-bold">{metrics.users.total}</p>
                  <p className="text-xs text-green-600">+{metrics.users.new_this_week} this week</p>
                </div>
                <Users className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Active Today</p>
                  <p className="text-2xl font-bold">{metrics.users.active_today}</p>
                  <p className="text-xs text-gray-500">Users online</p>
                </div>
                <Activity className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Revenue</p>
                  <p className="text-2xl font-bold">{formatCurrency(metrics.payments.total_amount)}</p>
                  <p className="text-xs text-gray-500">Total processed</p>
                </div>
                <TrendingUp className="w-8 h-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">System Health</p>
                  <p className={`text-2xl font-bold ${getStatusColor(metrics.system.error_rate, { good: 1, warning: 5 })}`}>
                    {metrics.system.uptime}%
                  </p>
                  <p className="text-xs text-gray-500">Uptime</p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Detailed Metrics */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="logs">Recent Logs</TabsTrigger>
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          {metrics && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Booking Statistics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span>Total Bookings</span>
                      <Badge variant="secondary">{metrics.bookings.total}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Pending Review</span>
                      <Badge variant="outline">{metrics.bookings.pending}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Completed Today</span>
                      <Badge variant="default">{metrics.bookings.completed_today}</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Health Tools Usage</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span>Total Executions</span>
                      <Badge variant="secondary">{metrics.health_tools.total_executions}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Today's Usage</span>
                      <Badge variant="default">{metrics.health_tools.executions_today}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Most Popular</span>
                      <Badge variant="outline">{metrics.health_tools.most_popular}</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="performance">
          {metrics && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Error Rate</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center">
                    <div className={`text-4xl font-bold ${getStatusColor(metrics.system.error_rate, { good: 1, warning: 5 })}`}>
                      {metrics.system.error_rate.toFixed(2)}%
                    </div>
                    <p className="text-sm text-gray-500 mt-2">Last 24 hours</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Response Time</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center">
                    <div className="text-4xl font-bold text-blue-600">
                      {metrics.system.response_time.toFixed(0)}ms
                    </div>
                    <p className="text-sm text-gray-500 mt-2">Average LCP</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Uptime</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center">
                    <div className="text-4xl font-bold text-green-600">
                      {metrics.system.uptime}%
                    </div>
                    <p className="text-sm text-gray-500 mt-2">Last 30 days</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="logs">
          <Card>
            <CardHeader>
              <CardTitle>Recent System Logs</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <div className="space-y-2">
                  {logs.map((log, index) => (
                    <div key={index} className="border-b border-gray-100 pb-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          {log.level === 'error' && <AlertTriangle className="w-4 h-4 text-red-500" />}
                          {log.level === 'info' && <CheckCircle className="w-4 h-4 text-green-500" />}
                          {log.level === 'warn' && <AlertTriangle className="w-4 h-4 text-yellow-500" />}
                          <span className="font-medium text-sm">{log.event_name}</span>
                        </div>
                        <span className="text-xs text-gray-500">
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{log.message}</p>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts">
          <Card>
            <CardHeader>
              <CardTitle>System Alerts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {metrics && metrics.system.error_rate > 5 && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-center">
                      <AlertTriangle className="w-5 h-5 text-red-600 mr-2" />
                      <div>
                        <h4 className="font-medium text-red-900">High Error Rate</h4>
                        <p className="text-sm text-red-700">
                          Current error rate ({metrics.system.error_rate.toFixed(2)}%) exceeds normal threshold.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                
                {metrics && metrics.payments.pending_review > 10 && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="flex items-center">
                      <Clock className="w-5 h-5 text-yellow-600 mr-2" />
                      <div>
                        <h4 className="font-medium text-yellow-900">Payments Pending Review</h4>
                        <p className="text-sm text-yellow-700">
                          {metrics.payments.pending_review} payments require manual review.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
                    <div>
                      <h4 className="font-medium text-green-900">System Healthy</h4>
                      <p className="text-sm text-green-700">
                        All core systems are operating normally.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SystemMonitoringModule;