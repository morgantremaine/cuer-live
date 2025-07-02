
import React from 'react';
import { Wifi } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AnimatedWifiIconProps {
  className?: string;
  isAnimating?: boolean;
}

const AnimatedWifiIcon = ({ className, isAnimating = false }: AnimatedWifiIconProps) => {
  if (isAnimating) {
    return (
      <div className={cn('relative inline-flex items-center justify-center', className)}>
        <Wifi 
          className="h-4 w-4 animate-pulse"
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-3 h-3 border border-current rounded-full animate-ping opacity-25" />
        </div>
      </div>
    );
  }

  return (
    <Wifi className={cn('h-4 w-4', className)} />
  );
};

export default AnimatedWifiIcon;
