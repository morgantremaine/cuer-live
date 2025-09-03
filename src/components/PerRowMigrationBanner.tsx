import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info, CheckCircle, AlertCircle } from 'lucide-react';
import { logger } from '@/utils/logger';

interface PerRowMigrationBannerProps {
  rundownId: string;
  onMigrate: () => Promise<boolean>;
  onDismiss: () => void;
}

export const PerRowMigrationBanner = ({ rundownId, onMigrate, onDismiss }: PerRowMigrationBannerProps) => {
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationStatus, setMigrationStatus] = useState<'pending' | 'success' | 'error'>('pending');

  const handleMigrate = async () => {
    setIsMigrating(true);
    try {
      const success = await onMigrate();
      setMigrationStatus(success ? 'success' : 'error');
      
      if (success) {
        logger.info('Rundown migrated to per-row persistence successfully');
        setTimeout(onDismiss, 2000); // Auto-dismiss after success
      }
    } catch (error) {
      logger.error('Migration failed:', error);
      setMigrationStatus('error');
    } finally {
      setIsMigrating(false);
    }
  };

  if (migrationStatus === 'success') {
    return (
      <Alert className="mb-4 border-green-200 bg-green-50">
        <CheckCircle className="h-4 w-4 text-green-600" />
        <AlertDescription className="text-green-800">
          ✅ Rundown successfully migrated to per-row persistence! Real-time collaboration is now active.
        </AlertDescription>
      </Alert>
    );
  }

  if (migrationStatus === 'error') {
    return (
      <Alert className="mb-4 border-red-200 bg-red-50">
        <AlertCircle className="h-4 w-4 text-red-600" />
        <AlertDescription className="text-red-800">
          ❌ Migration failed. Please try again or contact support if the issue persists.
          <div className="mt-2 flex gap-2">
            <Button 
              size="sm" 
              variant="outline" 
              onClick={() => setMigrationStatus('pending')}
            >
              Try Again
            </Button>
            <Button 
              size="sm" 
              variant="ghost" 
              onClick={onDismiss}
            >
              Dismiss
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Alert className="mb-4 border-blue-200 bg-blue-50">
      <Info className="h-4 w-4 text-blue-600" />
      <AlertDescription className="text-blue-800">
        <div className="flex items-center justify-between">
          <div>
            <strong>Enhanced Collaboration Available!</strong>
            <p className="mt-1 text-sm">
              Migrate this rundown to per-row persistence for better real-time collaboration. 
              Multiple users can edit different rows simultaneously without conflicts.
            </p>
          </div>
          <div className="flex gap-2 ml-4">
            <Button 
              size="sm" 
              onClick={handleMigrate}
              disabled={isMigrating}
            >
              {isMigrating ? 'Migrating...' : 'Enable'}
            </Button>
            <Button 
              size="sm" 
              variant="ghost" 
              onClick={onDismiss}
            >
              Later
            </Button>
          </div>
        </div>
      </AlertDescription>
    </Alert>
  );
};