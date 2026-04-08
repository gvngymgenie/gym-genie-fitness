import { Link } from "wouter";
import { MemberLayout } from "@/components/layout/MemberLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Bell, CheckCheck, AlertCircle, Gift, Calendar, Loader2, Settings, Wifi, WifiOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { formatDistanceToNow } from "date-fns";
import { useWebSocket } from "@/lib/websocket";
import { useEffect } from "react";

interface Notification {
  id: string;
  message: string;
  date: string;
  sentTo: string;
  sentToType: string;
  status: string;
  deliveryStatus: string;
  createdAt: string;
}

export default function MemberNotifications() {
  const queryClient = useQueryClient();
  const { isConnected, lastNotification } = useWebSocket();
  const isVercelDeployment = window.location.hostname.includes('vercel.app');

  const { data: notifications = [], isLoading } = useQuery<Notification[]>({
    queryKey: ["/api/notifications"],
    refetchInterval: isVercelDeployment ? 30000 : false, // Poll every 30 seconds on Vercel
    refetchIntervalInBackground: false, // Don't poll when tab is not visible
  });

  // Refresh notifications when a new one arrives via WebSocket
  useEffect(() => {
    if (lastNotification) {
      console.log('Real-time notification received, refreshing notifications list');
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
    }
  }, [lastNotification, queryClient]);

  const getNotificationColor = (sentToType: string) => {
    switch(sentToType) {
      case "all": return "border-l-primary";
      case "individual": return "border-l-accent";
      default: return "border-l-muted";
    }
  };

  const getNotificationIcon = (sentToType: string) => {
    switch(sentToType) {
      case "all": return Bell;
      case "individual": return AlertCircle;
      default: return Bell;
    }
  };

  const getNotificationTitle = (notification: Notification) => {
    if (notification.sentToType === "all") {
      return "Gym Announcement";
    } else {
      return `Message for ${notification.sentTo}`;
    }
  };

  if (isLoading) {
    return (
      <MemberLayout>
        <div className="space-y-8">
          <div className="flex flex-col gap-2">
            <h1 className="text-4xl font-bold font-heading text-foreground">NOTIFICATIONS</h1>
            <p className="text-muted-foreground">Stay updated with your gym activities and offers.</p>
          </div>
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </div>
      </MemberLayout>
    );
  }

  return (
    <MemberLayout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-2">
            <h1 className="text-4xl font-bold font-heading text-foreground">
              NOTIFICATIONS
              <Badge className="bg-accent/20 text-accent border-accent/30 border ml-2">
                {notifications.length} Total
              </Badge>
              <Badge
                variant="outline"
                className={`ml-2 ${isConnected ? 'border-green-500 text-green-600' : isVercelDeployment ? 'border-yellow-500 text-yellow-600' : 'border-red-500 text-red-600'}`}
              >
                {isConnected ? (
                  <>
                    <Wifi className="h-3 w-3 mr-1" />
                    Live
                  </>
                ) : isVercelDeployment ? (
                  <>
                    <Bell className="h-3 w-3 mr-1" />
                    Live Alerts
                  </>
                ) : (
                  <>
                    <WifiOff className="h-3 w-3 mr-1" />
                    Offline
                  </>
                )}
              </Badge>
            </h1>
            <p className="text-muted-foreground">Stay updated with your gym activities and offers.</p>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/member/notification-settings">
              <Button variant="outline" size="sm" className="gap-2">
                <Settings className="h-4 w-4" />
                Settings
              </Button>
            </Link>
          </div>
        </div>

        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Bell className="h-12 w-12 mb-4 opacity-50" />
            <p className="text-lg font-medium">No notifications yet</p>
            <p className="text-sm">You'll receive notifications from your gym here</p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map(notif => {
              const IconComponent = getNotificationIcon(notif.sentToType);
              return (
                <Card
                  key={notif.id}
                  className={`bg-card/50 backdrop-blur-sm border-l-4 ${getNotificationColor(notif.sentToType)}`}
                >
                  <CardContent className="pt-6 pb-6 flex gap-4">
                    <div className="h-10 w-10 rounded-full bg-primary/20 text-primary flex items-center justify-center flex-shrink-0">
                      <IconComponent className="h-5 w-5" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h3 className="font-bold text-foreground">{getNotificationTitle(notif)}</h3>
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true })}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{notif.message}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <CheckCheck className="h-3 w-3" />
                        <span>
                          {notif.deliveryStatus === 'delivered' ? 'Delivered' :
                           notif.deliveryStatus === 'sending' ? 'Sending' :
                           notif.deliveryStatus === 'partial' ? 'Partially delivered' :
                           notif.deliveryStatus === 'failed' ? 'Failed to deliver' :
                           notif.deliveryStatus}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </MemberLayout>
  );
}
