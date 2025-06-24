
import React from 'react';

interface CuerLogoProps {
  className?: string;
  alt?: string;
  isDark?: boolean; // true for dark backgrounds (show white logo), false for light backgrounds (show black logo)
}

const CuerLogo = ({ className = "h-8 w-auto", alt = "Cuer Logo", isDark = true }: CuerLogoProps) => {
  // Default to white logo (isDark=true) for always-dark pages like login, dashboard
  // Using v2 files to avoid cached corrupted versions
  const logoSrc = isDark 
    ? "/lovable-uploads/cuer-logo-white-v2.png?v=2"
    : "/lovable-uploads/cuer-logo-black-v2.png?v=2";

  return (
    <img 
      src={logoSrc}
      alt={alt}
      className={className}
      onError={(e) => {
        console.error('Logo failed to load:', logoSrc);
        // Fallback to a simple text logo if image fails
        const target = e.currentTarget;
        target.style.display = 'none';
        
        // Only create fallback if it doesn't already exist
        if (!target.nextSibling || target.nextSibling.textContent !== 'Cuer') {
          const textElement = document.createElement('div');
          textElement.innerHTML = 'Cuer';
          textElement.className = 'font-bold text-xl';
          textElement.style.color = isDark ? 'white' : 'black';
          target.parentNode?.insertBefore(textElement, target.nextSibling);
        }
      }}
    />
  );
};

export default CuerLogo;
