import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';

interface SessionConflictDialogProps {
  open: boolean;
  onClose?: () => void;
}

export const SessionConflictDialog = ({ open, onClose }: SessionConflictDialogProps) => {
  const { signOut } = useAuth();

  const handleReload = () => {
    window.location.reload();
  };

  const handleSignOut = async () => {
    await signOut();
    onClose?.();
  };

  return (
    <AlertDialog open={open}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <span className="text-orange-500">⚠️</span>
            Session Conflict
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-4">
            <p>
              You've been logged in from another location. Only one active session is allowed per account.
            </p>
            <p className="text-sm text-muted-foreground">
              This helps ensure data consistency and prevents conflicts during collaboration.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        <div className="flex flex-col gap-2 mt-6">
          <Button onClick={handleReload} className="w-full">
            Reload & Continue Here
          </Button>
          <Button 
            variant="outline" 
            onClick={handleSignOut} 
            className="w-full"
          >
            Sign Out
          </Button>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
};