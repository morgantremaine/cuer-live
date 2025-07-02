
import React from 'react';
import { Search } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface FindReplaceButtonProps {
  onClick: () => void;
  size?: 'sm' | 'default' | 'lg';
  variant?: 'default' | 'outline' | 'ghost';
  className?: string;
}

const FindReplaceButton = ({ 
  onClick, 
  size = 'sm', 
  variant = 'outline',
  className = ''
}: FindReplaceButtonProps) => {
  return (
    <Button 
      onClick={onClick} 
      variant={variant} 
      size={size}
      className={`flex items-center space-x-1 ${className}`}
    >
      <Search className="h-4 w-4" />
      <span>Find & Replace</span>
    </Button>
  );
};

export default FindReplaceButton;
