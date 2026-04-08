import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/lib/auth';
import { BarChart3, TrendingUp, TrendingDown, Target, Bell, RefreshCw } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

interface NotificationStatsData {
  total: number;
  sent: number;
  delivered: number;
  clicked: number;
  failed: number;
  byCategory: Record<string, number>;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

export function NotificationStats() {
  const { user, member, isAuthenticated, isMemberAuthenticated } = useAuth();
  const { toast } = useToast();
  const [stats, setStats] = useState<NotificationStatsData>({
    total: 0,
    sent: 0,
    delivered: 0,
    clicked: 0,
    failed: 0,
    byCategory: {},
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (isAuthenticated || isMemberAuthenticated) {
      fetchStats();
    }
  }, [isAuthenticated, isMemberAuthenticated, member]);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (user?.id) params.append('userId', user.id);
      if (member?.id) params.append('memberId', member.id);
      const url = `/api/notifications/stats${params.toString() ? '?' + params.toString() : ''}`;
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Error fetching notification stats:', error);
      toast({
        title: 'Load Failed',
        description: 'Failed to load notification statistics. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const refreshStats = async () => {
    try {
      setRefreshing(true);
      await fetchStats();
      toast({
        title: 'Refreshed',
        description: 'Notification statistics have been refreshed.',
      });
    } catch (error) {
      console.error('Error refreshing notification stats:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const getDeliveryRate = () => {
    if (stats.total === 0) return 0;
    return Math.round(((stats.delivered + stats.clicked) / stats.total) * 100);
  };

  const getClickThroughRate = () => {
    if (stats.delivered === 0) return 0;
    return Math.round((stats.clicked / stats.delivered) * 100);
  };

  const getFailureRate = () => {
    if (stats.total === 0) return 0;
    return Math.round((stats.failed / stats.total) * 100);
  };

  const statusData = [
    { name: 'Sent', value: stats.sent, color: '#3B82F6' },
    { name: 'Delivered', value: stats.delivered, color: '#10B981' },
    { name: 'Clicked', value: stats.clicked, color: '#6366F1' },
    { name: 'Failed', value: stats.failed, color: '#EF4444' },
  ];

  const categoryData = Object.entries(stats.byCategory).map(([name, value], index) => ({
    name,
    value,
    color: COLORS[index % COLORS.length],
  }));

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Notification Statistics</CardTitle>
          <CardDescription>Loading your notification statistics...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BarChart3 className="h-6 w-6 text-primary" />
            <div>
              <CardTitle>Notification Statistics</CardTitle>
              <CardDescription>
                Insights into your notification engagement and performance
              </CardDescription>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={refreshStats}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Notifications</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
                <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                  <Bell className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Delivery Rate</p>
                  <p className="text-2xl font-bold">{getDeliveryRate()}%</p>
                </div>
                <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Click-Through Rate</p>
                  <p className="text-2xl font-bold">{getClickThroughRate()}%</p>
                </div>
                <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                  <Target className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Failure Rate</p>
                  <p className="text-2xl font-bold">{getFailureRate()}%</p>
                </div>
                <div className="p-2 bg-red-100 dark:bg-red-900 rounded-lg">
                  <TrendingDown className="h-5 w-5 text-red-600 dark:text-red-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Separator />

        {/* Status Distribution */}
        <div>
          <h3 className="text-lg font-semibold mb-4">Notification Status Distribution</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statusData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip 
                  formatter={(value) => [`${value} notifications`, 'Count']}
                  labelFormatter={(label) => `Status: ${label}`}
                />
                <Legend />
                <Bar dataKey="value" name="Count" fill="#8884d8">
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <Separator />

        {/* Category Distribution */}
        {categoryData.length > 0 && (
          <>
            <div>
              <h3 className="text-lg font-semibold mb-4">Notification Categories</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value) => [`${value} notifications`, 'Count']}
                      labelFormatter={(label) => `Category: ${label}`}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
            <Separator />
          </>
        )}

        {/* Detailed Breakdown */}
        <div>
          <h3 className="text-lg font-semibold mb-4">Detailed Breakdown</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h4 className="font-medium">Status Summary</h4>
              <div className="space-y-3">
                {statusData.map((status) => (
                  <div key={status.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div 
                        className="h-3 w-3 rounded-full" 
                        style={{ backgroundColor: status.color }}
                      />
                      <span>{status.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{status.value}</span>
                      <span className="text-sm text-muted-foreground">
                        ({stats.total > 0 ? Math.round((status.value / stats.total) * 100) : 0}%)
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="font-medium">Performance Metrics</h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span>Total Engagement</span>
                  <span className="font-medium">{stats.clicked} clicks</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Average Delivery Time</span>
                  <span className="font-medium">Instant</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Most Active Time</span>
                  <span className="font-medium">Morning</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Preferred Category</span>
                  <span className="font-medium">
                    {categoryData.length > 0 
                      ? categoryData.reduce((prev, current) => 
                          prev.value > current.value ? prev : current
                        ).name
                      : 'N/A'
                    }
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Recommendations */}
        <Card className="bg-muted/50">
          <CardHeader>
            <CardTitle className="text-lg">Recommendations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {getDeliveryRate() < 80 && (
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-yellow-100 dark:bg-yellow-900 rounded-lg">
                    <Bell className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                  </div>
                  <div>
                    <h4 className="font-medium">Improve Delivery Rate</h4>
                    <p className="text-sm text-muted-foreground">
                      Your notification delivery rate is below optimal. Make sure your browser notifications are enabled and check your internet connection.
                    </p>
                  </div>
                </div>
              )}

              {getClickThroughRate() < 30 && (
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                    <Target className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h4 className="font-medium">Increase Engagement</h4>
                    <p className="text-sm text-muted-foreground">
                      Consider enabling more notification categories or adjusting quiet hours to receive notifications at more convenient times.
                    </p>
                  </div>
                </div>
              )}

              {getFailureRate() > 20 && (
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-red-100 dark:bg-red-900 rounded-lg">
                    <TrendingDown className="h-4 w-4 text-red-600 dark:text-red-400" />
                  </div>
                  <div>
                    <h4 className="font-medium">Reduce Failures</h4>
                    <p className="text-sm text-muted-foreground">
                      High failure rate detected. This could be due to browser restrictions or network issues. Check your notification settings.
                    </p>
                  </div>
                </div>
              )}

              {getDeliveryRate() >= 80 && getClickThroughRate() >= 30 && (
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                    <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <h4 className="font-medium">Great Performance!</h4>
                    <p className="text-sm text-muted-foreground">
                      Your notification settings are working well. Consider exploring additional notification categories for more personalized updates.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </CardContent>
    </Card>
  );
}
