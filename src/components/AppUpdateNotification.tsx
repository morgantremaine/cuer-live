import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface AppNotification {
  id: string;
  type: string;
  title: string;
  message: string | null;
  created_at: string;
  active: boolean;
}

const AppUpdateNotification = () => {
  const location = useLocation();
  const [notification, setNotification] = useState<AppNotification | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [sessionStartTime] = useState(new Date().toISOString());

  // Only show on app pages, not landing page
  const shouldShowNotifications = 
    location.pathname.startsWith('/dashboard') ||
    location.pathname.startsWith('/rundown') ||
    location.pathname.startsWith('/shared/rundown');

  useEffect(() => {
    // Only fetch notifications on relevant pages
    if (!shouldShowNotifications) return;

    // Fetch current active notification that user hasn't dismissed and was created after session started
    const fetchActiveNotification = async () => {
      try {
        const { data: user } = await supabase.auth.getUser();
        if (!user.user) return;

        const { data, error } = await supabase
          .from('app_notifications')
          .select(`
            *,
            app_notification_dismissals!left(id)
          `)
          .eq('active', true)
          .eq('type', 'update')
          .gt('created_at', sessionStartTime)
          .is('app_notification_dismissals.id', null)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (data && !error) {
          setNotification(data);
          setIsVisible(true);
        }
      } catch (error) {
        // No active notification found or user already dismissed it
        console.log('No active notifications for this user session');
      }
    };

    fetchActiveNotification();

    // Set up real-time subscription for new notifications
    const channel = supabase
      .channel('app_notifications_updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'app_notifications',
          filter: 'active=eq.true'
        },
        (payload) => {
          console.log('New notification received:', payload);
          if (payload.new.type === 'update') {
            setNotification(payload.new as AppNotification);
            setIsVisible(true);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'app_notifications',
          filter: 'active=eq.false'
        },
        (payload) => {
          console.log('Notification deactivated:', payload);
          if (payload.new.id === notification?.id) {
            setIsVisible(false);
            setNotification(null);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [notification?.id, shouldShowNotifications, sessionStartTime]);

  const handleRefresh = () => {
    window.location.reload();
  };

  const handleDismiss = async () => {
    setIsVisible(false);
    
    // Record that this user has dismissed this notification
    if (notification) {
      try {
        const { data: user } = await supabase.auth.getUser();
        if (user.user) {
          await supabase
            .from('app_notification_dismissals')
            .insert({
              user_id: user.user.id,
              notification_id: notification.id
            });
        }
      } catch (error) {
        console.error('Error dismissing notification:', error);
      }
    }
  };

  if (!isVisible || !notification) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm animate-in slide-in-from-bottom-2">
      <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800 shadow-lg">
        <CardHeader className="pb-3">
          <div>
            <CardTitle className="text-blue-900 dark:text-blue-100 text-base">
              {notification.title}
            </CardTitle>
            {notification.message && (
              <CardDescription className="text-blue-700 dark:text-blue-300 mt-1">
                {notification.message}
              </CardDescription>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex gap-2">
            <Button
              onClick={handleRefresh}
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 text-white flex-1"
            >
              <RefreshCw className="h-4 w-4 mr-1" />
              Refresh
            </Button>
            <Button
              onClick={handleDismiss}
              variant="outline"
              size="sm"
              className="border-blue-300 text-blue-700 hover:bg-blue-50 dark:border-blue-700 dark:text-blue-300 dark:hover:bg-blue-900 flex-1"
            >
              Later
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AppUpdateNotification;