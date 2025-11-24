import { useEffect, useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface FailedOperationsWarningProps {
  rundownId: string | null;
  onRetry?: () => void;
  getFailedCount?: () => number;
}

export const FailedOperationsWarning = ({ 
  rundownId, 
  onRetry,
  getFailedCount
}: FailedOperationsWarningProps) => {
  const [failedCount, setFailedCount] = useState(0);
  const [nextRetryIn, setNextRetryIn] = useState<number | null>(null);

  useEffect(() => {
    if (!rundownId) return;

    const checkFailedOps = () => {
      try {
        const storageKey = `rundown_failed_operations_${rundownId}`;
        const stored = localStorage.getItem(storageKey);
        
        if (stored) {
          const ops = JSON.parse(stored);
          setFailedCount(ops.length);
        } else {
          setFailedCount(0);
        }
      } catch (error) {
        console.error('Error checking failed operations:', error);
      }
    };

    // Check immediately
    checkFailedOps();

    // Check every 2 seconds
    const interval = setInterval(checkFailedOps, 2000);

    return () => clearInterval(interval);
  }, [rundownId]);

  // Prevent tab close when unsaved operations exist
  useEffect(() => {
    if (failedCount === 0) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
      return e.returnValue;
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [failedCount]);

  if (failedCount === 0) return null;

  const handleRetryClick = () => {
    if (onRetry) {
      onRetry();
    }
  };

  return (
    <Alert variant="destructive" className="mx-4 mt-4 mb-4 border-l-4 border-destructive">
      <AlertCircle className="h-4 w-4" />
      <AlertDescription className="flex items-center justify-between gap-4">
        <div className="flex-1">
          <div className="font-semibold">
            {failedCount} change{failedCount > 1 ? 's' : ''} failed to save
          </div>
          <div className="text-sm mt-1 text-muted-foreground">
            Your changes are saved locally. Check your connection or refresh the page.
          </div>
        </div>
        <Button 
          onClick={handleRetryClick}
          size="sm"
          variant="outline"
          className="shrink-0"
        >
          <RefreshCw className="h-3 w-3 mr-2" />
          Retry Now
        </Button>
      </AlertDescription>
    </Alert>
  );
};
