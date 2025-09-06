import { supabase } from '@/lib/supabaseClient';
import { logger } from '@/utils/logger';

/**
 * Triggers an app update notification to all active users
 * This should be called manually when you publish an update
 * Only available to the app admin
 */
export const triggerAppUpdateNotification = async (message?: string) => {
  try {
    logger.log('📢 Triggering app update notification');
    
    const { data, error } = await supabase
      .from('app_notifications')
      .insert({
        type: 'update',
        title: 'Cuer has an update!',
        message: message || '',
        active: true
      })
      .select()
      .single();

    if (error) {
      logger.error('❌ Failed to trigger app update notification:', error);
      throw error;
    }

    logger.log('✅ App update notification triggered successfully:', data);
    return data;
  } catch (error) {
    logger.error('❌ Error triggering app update notification:', error);
    throw error;
  }
};

/**
 * Deactivates old notifications to clean up
 */
export const cleanupOldNotifications = async () => {
  try {
    const { error } = await supabase
      .from('app_notifications')
      .update({ active: false })
      .lt('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()); // 24 hours ago

    if (error) {
      logger.error('❌ Failed to cleanup old notifications:', error);
    } else {
      logger.log('🧹 Cleaned up old notifications');
    }
  } catch (error) {
    logger.error('❌ Error cleaning up notifications:', error);
  }
};