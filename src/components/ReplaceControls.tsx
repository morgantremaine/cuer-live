
import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface ReplaceControlsProps {
  replaceText: string;
  onReplaceTextChange: (value: string) => void;
  onReplace: () => void;
  onReplaceAll: () => void;
  hasMatches: boolean;
}

const ReplaceControls = ({ 
  replaceText, 
  onReplaceTextChange, 
  onReplace, 
  onReplaceAll, 
  hasMatches 
}: ReplaceControlsProps) => {
  return (
    <div className="space-y-3">
      <Input
        placeholder="Replace with..."
        value={replaceText}
        onChange={(e) => onReplaceTextChange(e.target.value)}
      />
      {hasMatches && (
        <div className="flex space-x-2">
          <Button variant="outline" size="sm" onClick={onReplace}>
            Replace
          </Button>
          <Button variant="outline" size="sm" onClick={onReplaceAll}>
            Replace All
          </Button>
        </div>
      )}
    </div>
  );
};

export default ReplaceControls;
