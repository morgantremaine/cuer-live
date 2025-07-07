
import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTheme } from '@/hooks/useTheme';
import CuerLogo from '@/components/common/CuerLogo';
import { DEMO_RUNDOWN_ID } from '@/data/demoRundownData';

interface HeaderLogoProps {
  rundownId?: string | null;
}

const HeaderLogo = ({ rundownId }: HeaderLogoProps) => {
  const navigate = useNavigate();
  const { isDark } = useTheme();

  const location = useLocation();
  
  const handleBackToDashboard = () => {
    // For demo rundown, go back to home page instead of dashboard
    if (location.pathname === '/demo') {
      navigate('/');
    } else {
      navigate('/dashboard');
    }
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
