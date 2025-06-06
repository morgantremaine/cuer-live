
import React from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';

interface RefreshButtonProps {
  onRefresh: () => void;
  hasPendingUpdates?: boolean;
  isLoading?: boolean;
}

const RefreshButton = ({ onRefresh, hasPendingUpdates = false, isLoading = false }: RefreshButtonProps) => {
  return (
    <Button
      variant={hasPendingUpdates ? "default" : "outline"}
      size="sm"
      onClick={onRefresh}
      disabled={isLoading}
      className={`relative ${hasPendingUpdates ? 'bg-blue-600 hover:bg-blue-700 text-white animate-pulse' : ''}`}
    >
      <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
      {hasPendingUpdates ? 'New Changes' : 'Refresh'}
      {hasPendingUpdates && (
        <span className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full"></span>
      )}
    </Button>
  );
};

export default RefreshButton;
