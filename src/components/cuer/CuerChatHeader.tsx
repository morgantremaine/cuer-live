
import React from 'react';
import { X, MessageCircle, Trash2, Wifi, WifiOff, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CuerChatHeaderProps {
  isConnected: boolean | null;
  needsApiKeySetup: boolean;
  messagesLength: number;
  onSettingsClick: () => void;
  onClearChat: () => void;
  onClose: () => void;
}

const CuerChatHeader = ({
  isConnected,
  needsApiKeySetup,
  messagesLength,
  onSettingsClick,
  onClearChat,
  onClose
}: CuerChatHeaderProps) => {
  return (
    <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50 rounded-t-lg">
      <div className="flex items-center space-x-2">
        <MessageCircle className="w-5 h-5 text-blue-600" />
        <span className="font-semibold text-gray-900">Cuer AI Assistant</span>
        {isConnected !== null && (
          isConnected ? 
            <Wifi className="w-4 h-4 text-green-500" /> : 
            <WifiOff className="w-4 h-4 text-red-500" />
        )}
      </div>
      <div className="flex items-center space-x-2">
        {needsApiKeySetup && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onSettingsClick}
            title="API Settings"
            className="hover:bg-gray-200 text-gray-700"
          >
            <Settings className="w-4 h-4" />
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearChat}
          disabled={messagesLength === 0}
          className="hover:bg-gray-200 text-gray-700 disabled:text-gray-400"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={onClose}
          className="hover:bg-gray-200 text-gray-700"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};

export default CuerChatHeader;
