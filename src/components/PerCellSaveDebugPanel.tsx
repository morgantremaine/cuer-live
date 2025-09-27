import { useAuth } from '@/hooks/useAuth';
import { usePerCellSaveFeatureFlag } from '@/hooks/usePerCellSaveFeatureFlag';

export const PerCellSaveDebugPanel = () => {
  const { user } = useAuth();
  const { isPerCellSaveEnabled, isLoading, userEmails } = usePerCellSaveFeatureFlag();

  if (!user) return null;

  return (
    <div className="fixed bottom-4 right-4 bg-background border rounded-lg p-4 text-sm shadow-lg z-50">
      <div className="font-semibold mb-2">Per-Cell Save Debug</div>
      <div>User: {user.email}</div>
      <div>Feature Enabled: {isLoading ? 'Loading...' : isPerCellSaveEnabled ? '✅ YES' : '❌ NO'}</div>
      <div>Test Emails: {userEmails.join(', ')}</div>
      {isPerCellSaveEnabled && (
        <div className="text-green-600 font-medium mt-2">
          🚀 Per-cell save is ACTIVE for this user!
        </div>
      )}
    </div>
  );
};