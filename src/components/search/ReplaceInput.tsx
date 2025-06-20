
import React from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface ReplaceInputProps {
  replaceTerm: string;
  onReplaceChange: (value: string) => void;
  onReplace: () => void;
  onReplaceAll: () => void;
  hasMatches: boolean;
}

const ReplaceInput = ({
  replaceTerm,
  onReplaceChange,
  onReplace,
  onReplaceAll,
  hasMatches
}: ReplaceInputProps) => {
  return (
    <div className="flex items-center space-x-2">
      <Input
        placeholder="Replace with..."
        value={replaceTerm}
        onChange={(e) => onReplaceChange(e.target.value)}
        className="flex-1"
      />
      <Button
        variant="outline"
        size="sm"
        onClick={onReplace}
        disabled={!hasMatches}
      >
        Replace
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={onReplaceAll}
        disabled={!hasMatches}
      >
        Replace All
      </Button>
    </div>
  );
};

export default ReplaceInput;
