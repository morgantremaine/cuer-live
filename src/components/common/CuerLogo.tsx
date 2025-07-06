
import React from 'react';

interface CuerLogoProps {
  className?: string;
  alt?: string;
  isDark?: boolean; // true for dark backgrounds (show white logo), false for light backgrounds (show black logo)
}

const CuerLogo = ({ className = "h-8 w-auto", alt = "Cuer Logo", isDark = true }: CuerLogoProps) => {
  // Use the uploaded logo images
  const logoSrc = isDark 
    ? "/lovable-uploads/376f4f6f-fa91-4af6-b8fd-8da723bdc3fa.png" // White logo for dark backgrounds
    : "/lovable-uploads/afb9e93f-aa34-4180-9c2a-5e154e539215.png"; // Black logo for light backgrounds

  return (
    <img 
      src={logoSrc}
      alt={alt}
      className={className}
      draggable={false}
      onContextMenu={(e) => e.preventDefault()}
      onDragStart={(e) => e.preventDefault()}
      style={{ userSelect: 'none', WebkitUserSelect: 'none' }}
      onError={(e) => {
        // Fallback to text logo if image fails
        const target = e.currentTarget;
        target.style.display = 'none';
        
        // Only create fallback if it doesn't already exist
        if (!target.nextSibling || target.nextSibling.textContent !== 'Cuer') {
          const textElement = document.createElement('div');
          textElement.innerHTML = 'Cuer';
          textElement.className = `font-bold text-2xl ${isDark ? 'text-white' : 'text-black'}`;
          target.parentNode?.insertBefore(textElement, target.nextSibling);
        }
      }}
    />
  );
};

export default CuerLogo;
