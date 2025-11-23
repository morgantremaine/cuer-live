import React from 'react';
import { MapPin } from 'lucide-react';
import { Switch } from '@/components/ui/switch';

interface AutoScrollToggleProps {
  autoScrollEnabled: boolean;
  onToggleAutoScroll: () => void;
  onJumpToCurrentSegment?: () => void;
  size?: 'sm' | 'default';
}

const AutoScrollToggle = ({
  autoScrollEnabled,
  onToggleAutoScroll,
  onJumpToCurrentSegment,
  size = 'default'
}: AutoScrollToggleProps) => {
  const handleToggleAutoScroll = (checked: boolean) => {
    onToggleAutoScroll();
  };

  return (
    <div 
      className={`flex items-center space-x-1.5 px-2 rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground cursor-pointer ${
        size === 'sm' ? 'h-9' : 'h-10'
      }`}
      onClick={onJumpToCurrentSegment}
      title="Jump to current segment"
    >
      <MapPin className={`h-3.5 w-3.5 transition-colors ${autoScrollEnabled ? 'text-blue-500' : 'text-gray-400'}`} />
      <Switch
        checked={autoScrollEnabled}
        onCheckedChange={handleToggleAutoScroll}
        className="scale-75"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
};

export default AutoScrollToggle;
