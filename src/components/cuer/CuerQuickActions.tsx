
import React from 'react';
import { Button } from '@/components/ui/button';
import { BarChart3 } from 'lucide-react';

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
  if (!isConnected || !rundownData) {
    return null;
  }

  return (
    <div className="border-b border-gray-200 bg-gray-50 p-3">
      <div className="flex flex-col space-y-2">
        <Button
          onClick={onAnalyzeRundown}
          disabled={isLoading}
          variant="outline"
          size="sm"
          className="w-full justify-start"
        >
          <BarChart3 className="h-4 w-4 mr-2" />
          Analyze Current Rundown
        </Button>
      </div>
    </div>
  );
};

export default CuerQuickActions;
