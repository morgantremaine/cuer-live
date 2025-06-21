
import React from 'react';
import { useTheme } from '@/hooks/useTheme';

const HeaderLogo = () => {
  const { isDark } = useTheme();
  
  // Use darker logo for light theme, lighter logo for dark theme
  const logoSrc = isDark 
    ? '/lovable-uploads/8057a074-8425-4624-8742-5685190f9716.png' // lighter logo for dark theme
    : '/lovable-uploads/80c14012-cb23-44c2-9c69-a3a3fd94d6fa.png'; // darker logo for light theme

  return (
    <img 
      src={logoSrc}
      alt="Cuer Logo" 
      className="h-8 w-auto"
    />
  );
};

export default HeaderLogo;
