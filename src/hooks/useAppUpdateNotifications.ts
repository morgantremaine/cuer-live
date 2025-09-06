import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { logger } from '@/utils/logger';

interface AppNotification {
  id: string;
  type: string;
  title: string;
  message?: string;
  created_at: string;
}

export const useAppUpdateNotifications = () => {
  const [notification, setNotification] = useState<AppNotification | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    logger.log('🔔 Setting up app update notification listener');
    
    // Listen for new app notifications
    const channel = supabase
      .channel('app-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'app_notifications',
          filter: 'active=eq.true'
        },
        (payload) => {
          logger.log('🔔 Received app notification:', payload.new);
          const newNotification = payload.new as AppNotification;
          
          // Only show update notifications
          if (newNotification.type === 'update') {
            setNotification(newNotification);
            setIsVisible(true);
          }
        }
      )
      .subscribe();

    return () => {
      logger.log('🔔 Cleaning up app notification listener');
      supabase.removeChannel(channel);
    };
  }, []);

  const dismissNotification = () => {
    setIsVisible(false);
    setNotification(null);
  };

  const refreshApp = () => {
    logger.log('🔄 Refreshing app due to update notification');
    window.location.reload();
  };

  return {
    notification,
    isVisible,
    dismissNotification,
    refreshApp
  };
};