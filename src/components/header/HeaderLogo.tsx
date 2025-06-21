
import React, { useEffect } from 'react';
import { useTheme } from '@/hooks/useTheme';

const HeaderLogo = () => {
  const { isDark } = useTheme();
  
  // Use grey logo for light theme, white logo for dark theme
  // Double-checking the paths: c651349b = grey logo, 532ebea5 = white logo
  const logoSrc = isDark 
    ? '/lovable-uploads/532ebea5-3595-410d-bf43-7d64381798d7.png' // white logo for dark theme
    : '/lovable-uploads/c651349b-4259-451e-8648-9e8a329145c6.png'; // grey logo for light theme

  // Enhanced debugging to understand what's happening
  useEffect(() => {
    const documentClasses = document.documentElement.className;
    const localStorageTheme = localStorage.getItem('theme');
    const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    const actualIsDark = documentClasses.includes('dark');
    
    console.log('🎨 HeaderLogo: Complete theme analysis:', { 
      useThemeIsDark: isDark,
      actualDocumentIsDark: actualIsDark,
      logoSrc,
      documentClass: documentClasses,
      localStorageTheme,
      systemTheme,
      expectedLogo: actualIsDark ? 'white (532ebea5)' : 'grey (c651349b)',
      actualLogo: logoSrc.includes('532ebea5') ? 'white (532ebea5)' : 'grey (c651349b)'
    });

    // If there's a mismatch, force correct logo based on document class
    if (actualIsDark !== isDark) {
      console.log('🚨 HeaderLogo: Theme state mismatch detected!', {
        useThemeState: isDark,
        documentState: actualIsDark
      });
    }
  }, [isDark, logoSrc]);

  // Use document class as source of truth for theme detection
  const documentIsDark = document.documentElement.classList.contains('dark');
  const correctLogoSrc = documentIsDark 
    ? '/lovable-uploads/532ebea5-3595-410d-bf43-7d64381798d7.png' // white logo for dark theme
    : '/lovable-uploads/c651349b-4259-451e-8648-9e8a329145c6.png'; // grey logo for light theme

  return (
    <img 
      src={correctLogoSrc}
      alt="Cuer Logo" 
      className="h-8 w-auto"
      onLoad={() => {
        console.log('🎨 HeaderLogo: Successfully loaded:', correctLogoSrc);
      }}
      onError={(e) => {
        console.error('🎨 HeaderLogo: Failed to load image:', correctLogoSrc);
        // Fallback to grey logo if there's an error
        e.currentTarget.src = '/lovable-uploads/c651349b-4259-451e-8648-9e8a329145c6.png';
      }}
    />
  );
};

export default HeaderLogo;
