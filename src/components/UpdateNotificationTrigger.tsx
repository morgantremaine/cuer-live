import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { Megaphone, Loader2 } from 'lucide-react';
import { triggerAppUpdateNotification } from '@/utils/appNotifications';
import { toast } from 'sonner';

const UpdateNotificationTrigger = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleTriggerNotification = async () => {
    setIsLoading(true);
    try {
      await triggerAppUpdateNotification(message || undefined);
      toast.success('Update notification sent to all active users!');
      setIsOpen(false);
      setMessage('');
    } catch (error) {
      toast.error('Failed to send update notification');
      console.error('Failed to trigger notification:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Megaphone className="h-4 w-4" />
          Notify Update
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Notify App Update</DialogTitle>
          <DialogDescription>
            Send a notification to all active users that a new version of the app is available.
            Use this after you've published an update.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="message">Custom Message (Optional)</Label>
            <Input
              id="message"
              placeholder="e.g., New features and bug fixes are now available!"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button 
            variant="outline" 
            onClick={() => setIsOpen(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleTriggerNotification}
            disabled={isLoading}
          >
            {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Send Notification
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default UpdateNotificationTrigger;