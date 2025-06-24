
import React from 'react';

interface CuerLogoProps {
  className?: string;
  alt?: string;
}

const CuerLogo = ({ className = "h-8 w-auto", alt = "Cuer Logo" }: CuerLogoProps) => {
  return (
    <img 
      src="/lovable-uploads/869e158d-5df6-4204-9809-32af0c8cb7d8.png"
      alt={alt}
      className={className}
    />
  );
};

export default CuerLogo;
