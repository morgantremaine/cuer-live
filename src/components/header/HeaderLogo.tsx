
import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

const HeaderLogo = () => {
  const navigate = useNavigate();

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
      <img 
        src="/lovable-uploads/532ebea5-3595-410d-bf43-7d64381798d7.png" 
        alt="Cuer Logo" 
        className="h-8 w-auto"
      />
    </div>
  );
};

export default HeaderLogo;
