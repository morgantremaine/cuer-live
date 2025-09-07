import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { X, RefreshCw } from 'lucide-react';
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
  const [notification, setNotification] = useState<AppNotification | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Fetch current active notification
    const fetchActiveNotification = async () => {
      try {
        const { data, error } = await supabase
          .from('app_notifications')
          .select('*')
          .eq('active', true)
          .eq('type', 'update')
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (data && !error) {
          setNotification(data);
          setIsVisible(true);
        }
      } catch (error) {
        // No active notification found
        console.log('No active notifications');
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
  }, [notification?.id]);

  const handleRefresh = () => {
    window.location.reload();
  };

  const handleDismiss = async () => {
    setIsVisible(false);
    
    // Optionally mark as inactive for this specific notification
    if (notification) {
      try {
        await supabase
          .from('app_notifications')
          .update({ active: false })
          .eq('id', notification.id);
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
          <div className="flex items-start justify-between">
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
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDismiss}
              className="h-6 w-6 p-0 text-blue-600 hover:text-blue-800 hover:bg-blue-100 dark:text-blue-400 dark:hover:text-blue-200 dark:hover:bg-blue-900"
            >
              <X className="h-4 w-4" />
            </Button>
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