import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface TeleprompterConnectionWarningProps {
  show: boolean;
  isFullscreen: boolean;
}

const TeleprompterConnectionWarning: React.FC<TeleprompterConnectionWarningProps> = ({
  show,
  isFullscreen
}) => {
  // Only show in fullscreen mode when there's a connection issue
  if (!show || !isFullscreen) return null;
  
  return (
    <div 
      className="fixed bottom-4 left-4 z-50 flex items-center gap-2 px-3 py-2 rounded-md bg-yellow-900/60 text-yellow-200 text-sm font-medium backdrop-blur-sm"
      style={{ opacity: 0.7 }}
    >
      <AlertTriangle className="h-4 w-4" />
      <span>Connection issue - refresh when possible</span>
    </div>
  );
};

export default TeleprompterConnectionWarning;
