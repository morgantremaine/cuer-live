
import React from 'react';
import { useTheme } from '@/hooks/useTheme';

const HeaderLogo = () => {
  const { isDark } = useTheme();
  
  // Use grey logo for light theme, white logo for dark theme
  // Double-checking the paths: c651349b = grey logo, 532ebea5 = white logo
  const logoSrc = isDark 
    ? '/lovable-uploads/532ebea5-3595-410d-bf43-7d64381798d7.png' // white logo for dark theme
    : '/lovable-uploads/c651349b-4259-451e-8648-9e8a329145c6.png'; // grey logo for light theme

  console.log('HeaderLogo: Theme state:', { isDark, logoSrc }); // Debug logging

  return (
    <img 
      src={logoSrc}
      alt="Cuer Logo" 
      className="h-8 w-auto"
      onError={(e) => {
        console.error('HeaderLogo: Failed to load image:', logoSrc);
        // Fallback to grey logo if there's an error
        e.currentTarget.src = '/lovable-uploads/c651349b-4259-451e-8648-9e8a329145c6.png';
      }}
    />
  );
};

export default HeaderLogo;
