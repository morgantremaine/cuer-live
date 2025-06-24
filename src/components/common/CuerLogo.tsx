
import React from 'react';

interface CuerLogoProps {
  className?: string;
  alt?: string;
  isDark?: boolean; // true for dark backgrounds (show white logo), false for light backgrounds (show black logo)
}

const CuerLogo = ({ className = "h-8 w-auto", alt = "Cuer Logo", isDark = true }: CuerLogoProps) => {
  // Default to white logo (isDark=true) for always-dark pages like login, dashboard
  const logoSrc = isDark 
    ? "/lovable-uploads/cuer-logo-white.png"
    : "/lovable-uploads/cuer-logo-black.png";

  return (
    <img 
      src={logoSrc}
      alt={alt}
      className={className}
    />
  );
};

export default CuerLogo;
