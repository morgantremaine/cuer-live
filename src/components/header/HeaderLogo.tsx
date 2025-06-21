
import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '@/hooks/useTheme';

const HeaderLogo = () => {
  const navigate = useNavigate();
  const { isDark } = useTheme();

  // Debug logging to track theme changes
  console.log('🎨 HeaderLogo theme state:', { isDark });

  const handleBackToDashboard = () => {
    navigate('/dashboard');
  };

  const logoSrc = isDark 
    ? "/lovable-uploads/afeee545-0420-4bb9-a4c1-cc3e2931ec3e.png" 
    : "/lovable-uploads/9bfd48af-1719-4d02-9dee-8af16d6c8322.png";

  console.log('🖼️ HeaderLogo using logo:', logoSrc);

  return (
    <div className="flex items-center space-x-4">
      <Button
        variant="ghost"
        size="sm"
        onClick={handleBackToDashboard}
        className="text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 p-2"
        title="Back to Dashboard"
      >
        <ArrowLeft className="h-5 w-5" />
      </Button>
      <img 
        src={logoSrc}
        alt="Cuer Logo" 
        className="h-8 w-auto"
      />
    </div>
  );
};

export default HeaderLogo;
