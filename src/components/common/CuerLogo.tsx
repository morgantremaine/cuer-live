
import React from 'react';

interface CuerLogoProps {
  className?: string;
  alt?: string;
  isDark?: boolean; // true for dark backgrounds (show white text), false for light backgrounds (show black text)
}

const CuerLogo = ({ className = "h-8 w-auto", alt = "Cuer Logo", isDark = true }: CuerLogoProps) => {
  return (
    <div 
      className={`font-bold text-2xl ${isDark ? 'text-white' : 'text-black'} ${className}`}
      title={alt}
    >
      Cuer
    </div>
  );
};

export default CuerLogo;
