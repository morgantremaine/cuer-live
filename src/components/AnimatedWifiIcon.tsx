
import React from 'react';
import { Wifi } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AnimatedWifiIconProps {
  className?: string;
  isAnimating?: boolean;
}

const AnimatedWifiIcon = ({ className, isAnimating = false }: AnimatedWifiIconProps) => {
  return (
    <div className={cn('relative', className)}>
      <Wifi 
        className={cn(
          'h-3 w-3',
          isAnimating && 'animate-wifi-building'
        )}
      />
    </div>
  );
};

export default AnimatedWifiIcon;
