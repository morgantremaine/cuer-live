
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

  console.log('CuerLogo rendering with isDark:', isDark, 'logoSrc:', logoSrc);

  return (
    <img 
      src={logoSrc}
      alt={alt}
      className={className}
      onError={(e) => {
        console.error('Logo failed to load:', logoSrc);
        // Fallback to a simple text logo if image fails
        e.currentTarget.style.display = 'none';
        const textElement = document.createElement('div');
        textElement.innerHTML = 'Cuer';
        textElement.className = 'font-bold text-xl';
        textElement.style.color = isDark ? 'white' : 'black';
        e.currentTarget.parentNode?.appendChild(textElement);
      }}
    />
  );
};

export default CuerLogo;
