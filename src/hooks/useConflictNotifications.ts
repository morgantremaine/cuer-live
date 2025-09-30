import { useCallback } from 'react';
import { toast } from 'sonner';

interface ConflictNotification {
  type: 'local-preserved' | 'remote-accepted' | 'merged';
  field: string;
  details?: string;
}

/**
 * User-facing notifications for conflict resolutions
 * Provides clear feedback when concurrent editing conflicts occur
 */
export const useConflictNotifications = () => {
  
  const notifyConflictResolved = useCallback((notification: ConflictNotification) => {
    const { type, field, details } = notification;

    switch (type) {
      case 'local-preserved':
        toast.success('Your changes preserved', {
          description: `Your edit to "${field}" was kept while other changes were applied.`,
          duration: 3000
        });
        break;

      case 'remote-accepted':
        toast.info('Changes from another user', {
          description: `Updated "${field}" with changes from another user.`,
          duration: 3000
        });
        break;

      case 'merged':
        toast.info('Changes merged', {
          description: `Your changes and remote changes to "${field}" were merged successfully.`,
          duration: 3000
        });
        break;
    }
  }, []);

  const notifyMultipleConflicts = useCallback((count: number, preservedCount: number) => {
    toast.info(`Resolved ${count} editing conflicts`, {
      description: `${preservedCount} of your recent edits were preserved.`,
      duration: 4000
    });
  }, []);

  const notifyRowMoved = useCallback((itemName: string, fromUser: string) => {
    toast.info('Row moved by another user', {
      description: `"${itemName}" was repositioned by ${fromUser}. Your edits were preserved.`,
      duration: 3000
    });
  }, []);

  return {
    notifyConflictResolved,
    notifyMultipleConflicts,
    notifyRowMoved
  };
};
