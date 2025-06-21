
import React, { useEffect } from 'react';
import { useTheme } from '@/hooks/useTheme';

const HeaderLogo = () => {
  const { isDark } = useTheme();
  
  // Use grey logo for light theme, white logo for dark theme
  // Double-checking the paths: c651349b = grey logo, 532ebea5 = white logo
  const logoSrc = isDark 
    ? '/lovable-uploads/532ebea5-3595-410d-bf43-7d64381798d7.png' // white logo for dark theme
    : '/lovable-uploads/c651349b-4259-451e-8648-9e8a329145c6.png'; // grey logo for light theme

  // Enhanced debugging
  useEffect(() => {
    console.log('🎨 HeaderLogo: Theme state detailed:', { 
      isDark, 
      logoSrc,
      documentClass: document.documentElement.className,
      localStorageTheme: localStorage.getItem('theme'),
      systemTheme: window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    });
  }, [isDark, logoSrc]);

  return (
    <img 
      src={logoSrc}
      alt="Cuer Logo" 
      className="h-8 w-auto"
      onLoad={() => {
        console.log('🎨 HeaderLogo: Successfully loaded:', logoSrc);
      }}
      onError={(e) => {
        console.error('🎨 HeaderLogo: Failed to load image:', logoSrc);
        // Fallback to grey logo if there's an error
        e.currentTarget.src = '/lovable-uploads/c651349b-4259-451e-8648-9e8a329145c6.png';
      }}
    />
  );
};

export default HeaderLogo;
