import React, { useState, useRef, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface AddSegmentButtonProps {
  onAddSegments: (count: number) => void;
  disabled?: boolean;
  size?: 'default' | 'sm' | 'lg';
  className?: string;
  isMobile?: boolean;
}

const AddSegmentButton = ({ 
  onAddSegments, 
  disabled = false, 
  size = 'default',
  className = '',
  isMobile = false
}: AddSegmentButtonProps) => {
  const [count, setCount] = useState<string>('');
  const [showInput, setShowInput] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (showInput && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [showInput]);

  const handleClick = () => {
    if (count && parseInt(count) > 0) {
      const numCount = Math.min(parseInt(count), 50);
      onAddSegments(numCount);
      setCount('');
      setShowInput(false);
    } else {
      onAddSegments(1);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === '' || (/^\d+$/.test(value) && parseInt(value) <= 50)) {
      setCount(value);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleClick();
    } else if (e.key === 'Escape') {
      setCount('');
      setShowInput(false);
    }
  };

  const handleInputClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!showInput) {
      setShowInput(true);
    }
  };

  const getButtonText = () => {
    const numCount = count ? parseInt(count) : 0;
    if (numCount > 1) {
      return `${numCount} Segments`;
    }
    return 'Add Segment';
  };

  return (
    <Button 
      onClick={handleClick}
      variant="outline" 
      size={size} 
      disabled={disabled}
      className={`flex items-center gap-1.5 ${isMobile ? 'justify-start' : 'space-x-1'} ${className}`}
    >
      <Plus className="h-4 w-4 flex-shrink-0" />
      <span className="whitespace-nowrap">{getButtonText()}</span>
      <div 
        onClick={handleInputClick}
        className="flex items-center"
      >
        {showInput && (
          <Input
            ref={inputRef}
            type="text"
            value={count}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onBlur={() => {
              if (!count) setShowInput(false);
            }}
            placeholder="#"
            className="w-10 h-6 px-1 text-center ml-1"
            disabled={disabled}
          />
        )}
        {!showInput && (
          <div className="w-6 h-6 ml-1 border rounded flex items-center justify-center text-xs text-muted-foreground hover:bg-accent cursor-text">
            #
          </div>
        )}
      </div>
    </Button>
  );
};

export default AddSegmentButton;
