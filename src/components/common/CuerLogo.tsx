
import React from 'react';

interface CuerLogoProps {
  className?: string;
  alt?: string;
  isDark?: boolean;
}

const CuerLogo = ({ className = "h-8 w-auto", alt = "Cuer Logo", isDark = false }: CuerLogoProps) => {
  // Use dark logo for dark mode, light logo for light mode
  const logoSrc = isDark 
    ? "/lovable-uploads/9bfd48af-1719-4d02-9dee-8af16d6c8322.png"  // Dark mode (white logo)
    : "/lovable-uploads/afeee545-0420-4bb9-a4c1-cc3e2931ec3e.png"; // Light mode (dark logo)

  return (
    <img 
      src={logoSrc}
      alt={alt}
      className={className}
    />
  );
};

export default CuerLogo;
