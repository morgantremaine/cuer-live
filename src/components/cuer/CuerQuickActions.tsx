
import React from 'react';
import { Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CuerQuickActionsProps {
  rundownData?: any;
  isConnected: boolean | null;
  isLoading: boolean;
  onAnalyzeRundown: () => void;
}

const CuerQuickActions = ({
  rundownData,
  isConnected,
  isLoading,
  onAnalyzeRundown
}: CuerQuickActionsProps) => {
  if (!rundownData || !isConnected) return null;

  return (
    <div className="p-3 border-b border-gray-200 bg-gray-50">
      <Button
        variant="outline"
        size="sm"
        onClick={onAnalyzeRundown}
        disabled={isLoading}
        className="w-full"
      >
        <Zap className="w-4 h-4 mr-2" />
        Analyze Current Rundown
      </Button>
    </div>
  );
};

export default CuerQuickActions;
