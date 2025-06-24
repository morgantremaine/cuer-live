
import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '@/hooks/useTheme';
import CuerLogo from '@/components/common/CuerLogo';

const HeaderLogo = () => {
  const navigate = useNavigate();
  const { isDark } = useTheme();

  const handleBackToDashboard = () => {
    navigate('/dashboard');
  };

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
      <CuerLogo isDark={isDark} />
    </div>
  );
};

export default HeaderLogo;
