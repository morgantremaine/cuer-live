
import React from 'react';

interface CuerLogoProps {
  className?: string;
  alt?: string;
  isDark?: boolean;
}

const CuerLogo = ({ className = "h-8 w-auto", alt = "Cuer Logo", isDark = false }: CuerLogoProps) => {
  // Use dark logo for dark mode, light logo for light mode
  const logoSrc = isDark 
    ? "/lovable-uploads/cuer-logo.png"  // Dark mode (white logo)
    : "/lovable-uploads/cuer-logo-light-mode.png"; // Light mode (dark logo)

  return (
    <img 
      src={logoSrc}
      alt={alt}
      className={className}
    />
  );
};

export default CuerLogo;
