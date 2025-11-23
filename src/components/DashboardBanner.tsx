import { useEffect, useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, Megaphone } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface BannerNotification {
  id: string;
  message: string;
  active: boolean;
}

const DashboardBanner = () => {
  const [banner, setBanner] = useState<BannerNotification | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    loadBanner();

    // Subscribe to real-time changes
    const channel = supabase
      .channel('dashboard_banner_updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'app_notifications',
          filter: 'type=eq.banner'
        },
        (payload) => {
          console.log('Banner update received:', payload);
          
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const newBanner = payload.new as BannerNotification;
            if (newBanner.active) {
              checkAndShowBanner(newBanner);
            } else {
              setIsVisible(false);
              setBanner(null);
            }
          } else if (payload.eventType === 'DELETE') {
            setIsVisible(false);
            setBanner(null);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadBanner = async () => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      // Get active banner that user hasn't dismissed
      const { data, error } = await supabase
        .from('app_notifications')
        .select(`
          id,
          message,
          active,
          app_notification_dismissals!left(id)
        `)
        .eq('type', 'banner')
        .eq('active', true)
        .is('app_notification_dismissals.id', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setBanner({
          id: data.id,
          message: data.message || '',
          active: data.active
        });
        setIsVisible(true);
      }
    } catch (error) {
      console.error('Error loading banner:', error);
    }
  };

  const checkAndShowBanner = async (newBanner: BannerNotification) => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      // Check if user has dismissed this banner
      const { data: dismissal } = await supabase
        .from('app_notification_dismissals')
        .select('id')
        .eq('user_id', user.user.id)
        .eq('notification_id', newBanner.id)
        .maybeSingle();

      if (!dismissal) {
        setBanner(newBanner);
        setIsVisible(true);
      }
    } catch (error) {
      console.error('Error checking banner dismissal:', error);
    }
  };

  const handleDismiss = async () => {
    if (!banner) return;

    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      // Record dismissal
      await supabase
        .from('app_notification_dismissals')
        .insert({
          user_id: user.user.id,
          notification_id: banner.id
        });

      setIsVisible(false);
    } catch (error) {
      console.error('Error dismissing banner:', error);
    }
  };

  if (!isVisible || !banner) {
    return null;
  }

  return (
    <div className="mb-4 animate-in slide-in-from-top-2">
      <Alert className="relative overflow-hidden bg-gradient-to-r from-blue-600 to-blue-700 dark:from-blue-700 dark:to-blue-800 border-l-4 border-blue-400 dark:border-blue-300 shadow-lg">
        <AlertDescription className="flex items-start gap-4 py-1.5">
          <div className="flex items-start gap-3 flex-1">
            <Megaphone className="h-4 w-4 text-blue-100 dark:text-blue-200 mt-0.5 shrink-0" />
            <div className="flex flex-col gap-1 flex-1">
              <Badge variant="secondary" className="w-fit text-xs font-semibold uppercase tracking-wider bg-blue-500 dark:bg-blue-600 text-white border-none">
                CUER ANNOUNCEMENT
              </Badge>
              <p className="text-sm text-blue-50 dark:text-blue-100 leading-relaxed">
                {banner.message}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDismiss}
            className="shrink-0 h-6 w-6 p-0 hover:bg-blue-500 dark:hover:bg-blue-600 text-blue-100 hover:text-white"
          >
            <X className="h-4 w-4" />
          </Button>
        </AlertDescription>
      </Alert>
    </div>
  );
};

export default DashboardBanner;
