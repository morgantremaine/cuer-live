import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Send } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AdminNotificationSenderProps {
  userEmail?: string;
}

const AdminNotificationSender = ({ userEmail }: AdminNotificationSenderProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [customMessage, setCustomMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const { toast } = useToast();

  // Only show for morgan@cuer.live
  if (userEmail !== 'morgan@cuer.live') {
    return null;
  }

  const handleSendNotification = async () => {
    try {
      setIsSending(true);

      // Deactivate any existing notifications first
      await supabase
        .from('app_notifications')
        .update({ active: false })
        .eq('active', true);

      // Create new notification
      const { error } = await supabase
        .from('app_notifications')
        .insert({
          type: 'update',
          title: 'Cuer has an update!',
          message: customMessage.trim() || null,
          active: true
        });

      if (error) {
        throw error;
      }

      toast({
        title: 'Notification sent!',
        description: 'Update notification has been sent to all users.',
      });

      setIsOpen(false);
      setCustomMessage('');
    } catch (error) {
      console.error('Error sending notification:', error);
      toast({
        title: 'Error',
        description: 'Failed to send notification. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="bg-blue-600 hover:bg-blue-700 text-white border-blue-600"
        >
          <Send className="h-4 w-4 mr-2" />
          Send Update Notification
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Send Update Notification</DialogTitle>
          <DialogDescription>
            Send a notification to all users with open rundowns. The base message will be "Cuer has an update!" with optional custom text.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="custom-message">Custom Message (Optional)</Label>
            <Input
              id="custom-message"
              placeholder="Additional message for users..."
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              maxLength={200}
            />
            <p className="text-sm text-muted-foreground mt-1">
              {200 - customMessage.length} characters remaining
            </p>
          </div>
          <div className="bg-muted p-3 rounded-md">
            <p className="text-sm font-medium">Preview:</p>
            <p className="text-sm">Cuer has an update!</p>
            {customMessage.trim() && (
              <p className="text-sm text-muted-foreground mt-1">{customMessage}</p>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setIsOpen(false)}
            disabled={isSending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSendNotification}
            disabled={isSending}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isSending ? 'Sending...' : 'Send Notification'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AdminNotificationSender;