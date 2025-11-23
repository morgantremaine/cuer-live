import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Megaphone, X } from 'lucide-react';

interface AdminBannerControllerProps {
  userEmail?: string;
}

interface BannerData {
  id: string;
  message: string;
  active: boolean;
}

const AdminBannerController = ({ userEmail }: AdminBannerControllerProps) => {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [isActive, setIsActive] = useState(false);
  const [currentBanner, setCurrentBanner] = useState<BannerData | null>(null);
  const [isSending, setIsSending] = useState(false);
  const { toast } = useToast();

  // Only render for morgan@cuer.live
  if (userEmail !== 'morgan@cuer.live') {
    return null;
  }

  // Load current banner state when dialog opens
  useEffect(() => {
    if (open) {
      loadCurrentBanner();
    }
  }, [open]);

  const loadCurrentBanner = async () => {
    try {
      const { data, error } = await supabase
        .from('app_notifications')
        .select('*')
        .eq('type', 'banner')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setCurrentBanner({
          id: data.id,
          message: data.message || '',
          active: data.active
        });
        setMessage(data.message || '');
        setIsActive(data.active);
      } else {
        setCurrentBanner(null);
        setMessage('');
        setIsActive(false);
      }
    } catch (error) {
      console.error('Error loading banner:', error);
    }
  };

  const handleSaveBanner = async () => {
    if (!message.trim() && isActive) {
      toast({
        title: 'Message Required',
        description: 'Please enter a banner message before activating.',
        variant: 'destructive',
      });
      return;
    }

    setIsSending(true);

    try {
      if (currentBanner) {
        // Update existing banner
        const { error } = await supabase
          .from('app_notifications')
          .update({
            message: message.trim(),
            active: isActive,
          })
          .eq('id', currentBanner.id);

        if (error) throw error;
      } else {
        // Create new banner
        const { error } = await supabase
          .from('app_notifications')
          .insert({
            type: 'banner',
            title: 'System Update',
            message: message.trim(),
            active: isActive,
          });

        if (error) throw error;
      }

      toast({
        title: 'Banner Updated',
        description: isActive 
          ? 'Dashboard banner is now visible to all users.' 
          : 'Dashboard banner has been deactivated.',
      });

      setOpen(false);
    } catch (error) {
      console.error('Error saving banner:', error);
      toast({
        title: 'Error',
        description: 'Failed to save banner. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSending(false);
    }
  };

  const characterCount = message.length;
  const maxCharacters = 200;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          size="lg"
          className="bg-orange-600 hover:bg-orange-700 text-white border-0 flex items-center gap-2"
        >
          <Megaphone className="h-4 w-4" />
          Manage Dashboard Banner
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Manage Dashboard Banner</DialogTitle>
          <DialogDescription>
            Control the dashboard banner visible to all users. Toggle it on/off and customize the message.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {/* Banner Message Input */}
          <div className="space-y-2">
            <Label htmlFor="message">Banner Message</Label>
            <Textarea
              id="message"
              placeholder="Enter the banner message..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={maxCharacters}
              rows={3}
              className="resize-none"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>This message will appear at the top of all user dashboards</span>
              <span className={characterCount > maxCharacters * 0.9 ? 'text-destructive' : ''}>
                {characterCount}/{maxCharacters}
              </span>
            </div>
          </div>

          {/* Banner Status Toggle */}
          <div className="flex items-center justify-between py-2">
            <div className="space-y-0.5">
              <Label htmlFor="banner-status">Banner Status</Label>
              <p className="text-xs text-muted-foreground">
                {isActive ? 'Banner is currently visible to all users' : 'Banner is currently hidden'}
              </p>
            </div>
            <Switch
              id="banner-status"
              checked={isActive}
              onCheckedChange={setIsActive}
            />
          </div>

          {/* Preview */}
          {message.trim() && (
            <div className="space-y-2">
              <Label>Preview</Label>
              <Alert className="bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800">
                <AlertDescription className="flex items-start justify-between gap-2 text-blue-900 dark:text-blue-100">
                  <span className="flex-1">{message}</span>
                  <X className="h-4 w-4 shrink-0 opacity-50" />
                </AlertDescription>
              </Alert>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSaveBanner} disabled={isSending}>
            {isSending ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AdminBannerController;
