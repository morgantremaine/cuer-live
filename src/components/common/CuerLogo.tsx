
import React from 'react';

interface CuerLogoProps {
  className?: string;
  alt?: string;
}

const CuerLogo = ({ className = "h-8 w-auto", alt = "Cuer Logo" }: CuerLogoProps) => {
  return (
    <img 
      src="/lovable-uploads/d784967d-1e5e-4678-8c5b-a5139e079c11.png"
      alt={alt}
      className={className}
    />
  );
};

export default CuerLogo;
