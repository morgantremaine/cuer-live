
import React from 'react';
import { useTheme } from '@/hooks/useTheme';

const HeaderLogo = () => {
  const { isDark } = useTheme();
  
  // Use grey logo for light theme, white logo for dark theme
  const logoSrc = isDark 
    ? '/lovable-uploads/532ebea5-3595-410d-bf43-7d64381798d7.png' // white logo for dark theme
    : '/lovable-uploads/c651349b-4259-451e-8648-9e8a329145c6.png'; // grey logo for light theme

  return (
    <img 
      src={logoSrc}
      alt="Cuer Logo" 
      className="h-8 w-auto"
    />
  );
};

export default HeaderLogo;
