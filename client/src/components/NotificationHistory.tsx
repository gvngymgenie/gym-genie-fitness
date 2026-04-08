import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/lib/auth';
import { Bell, CheckCircle, XCircle, Clock, ExternalLink, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';

interface NotificationHistoryItem {
  id: string;
  notificationId?: string;
  title?: string;
  body?: string;
  status: 'sent' | 'delivered' | 'clicked' | 'failed';
  deliveredAt?: string;
  clickedAt?: string;
  errorMessage?: string;
  createdAt: string;
}

export function NotificationHistory() {
  const { user, member, isAuthenticated, isMemberAuthenticated } = useAuth();
  const { toast } = useToast();
  const [history, setHistory] = useState<NotificationHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (isAuthenticated || isMemberAuthenticated) {
      fetchHistory();
    }
  }, [isAuthenticated, isMemberAuthenticated, member]);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (user?.id) params.append('userId', user.id);
      if (member?.id) params.append('memberId', member.id);
      const url = `/api/notifications/history${params.toString() ? '?' + params.toString() : ''}`;
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setHistory(data);
      }
    } catch (error) {
      console.error('Error fetching notification history:', error);
      toast({
        title: 'Load Failed',
        description: 'Failed to load notification history. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const refreshHistory = async () => {
    try {
      setRefreshing(true);
      await fetchHistory();
      toast({
        title: 'Refreshed',
        description: 'Notification history has been refreshed.',
      });
    } catch (error) {
      console.error('Error refreshing notification history:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      const response = await fetch(`/api/notifications/${id}/read`, {
        method: 'POST',
      });

      if (response.ok) {
        setHistory(prev => prev.map(item => 
          item.id === id ? { ...item, status: 'clicked', clickedAt: new Date().toISOString() } : item
        ));
        toast({
          title: 'Marked as Read',
          description: 'Notification has been marked as read.',
        });
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'delivered':
      case 'clicked':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'clicked':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'failed':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      default:
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return format(date, 'MMM d, yyyy h:mm a');
    } catch {
      return dateString;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Notification History</CardTitle>
          <CardDescription>Loading your notification history...</CardDescription>
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
            <Bell className="h-6 w-6 text-primary" />
            <div>
              <CardTitle>Notification History</CardTitle>
              <CardDescription>
                View your recent notifications and their delivery status
              </CardDescription>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={refreshHistory}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {history.length === 0 ? (
          <div className="text-center py-8">
            <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No Notification History</h3>
            <p className="text-muted-foreground">
              You haven't received any notifications yet. Notifications will appear here once you start receiving them.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>Showing {history.length} most recent notifications</span>
              <span>Sorted by most recent</span>
            </div>

            <Separator />

            <div className="space-y-3">
              {history.map((item) => (
                <div
                  key={item.id}
                  className={`p-4 rounded-lg border ${
                    item.status === 'clicked' 
                      ? 'bg-muted/50' 
                      : 'bg-background'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="mt-1">
                        {getStatusIcon(item.status)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium">
                            {item.title || 'Notification'}
                          </h4>
                          <Badge 
                            variant="outline" 
                            className={`text-xs ${getStatusColor(item.status)}`}
                          >
                            {item.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          {item.body || 'No message content'}
                        </p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span>Sent: {formatDate(item.createdAt)}</span>
                          {item.deliveredAt && (
                            <span>Delivered: {formatDate(item.deliveredAt)}</span>
                          )}
                          {item.clickedAt && (
                            <span>Read: {formatDate(item.clickedAt)}</span>
                          )}
                        </div>
                        {item.errorMessage && (
                          <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 rounded text-xs text-red-600 dark:text-red-400">
                            Error: {item.errorMessage}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 ml-4">
                      {item.status !== 'clicked' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => markAsRead(item.id)}
                        >
                          Mark as Read
                        </Button>
                      )}
                      {item.status === 'clicked' && (
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Read
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <Separator />

            <div className="flex items-center justify-between text-sm">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-3 w-3 text-green-500" />
                  <span>Delivered: {history.filter(h => h.status === 'delivered' || h.status === 'clicked').length}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-3 w-3 text-yellow-500" />
                  <span>Sent: {history.filter(h => h.status === 'sent').length}</span>
                </div>
                <div className="flex items-center gap-2">
                  <XCircle className="h-3 w-3 text-red-500" />
                  <span>Failed: {history.filter(h => h.status === 'failed').length}</span>
                </div>
              </div>
              <div className="text-right">
                <p className="font-medium">
                  Delivery Rate: {history.length > 0 
                    ? `${Math.round((history.filter(h => h.status === 'delivered' || h.status === 'clicked').length / history.length) * 100)}%`
                    : '0%'
                  }
                </p>
                <p className="text-xs text-muted-foreground">
                  Based on {history.length} notifications
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
