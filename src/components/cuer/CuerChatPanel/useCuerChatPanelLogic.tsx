
import { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useCuerChat } from '@/hooks/useCuerChat';
import { useParams } from 'react-router-dom';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export const useCuerChatPanelLogic = (isOpen: boolean, rundownData?: any) => {
  const [inputValue, setInputValue] = useState('');
  const [showApiKeySetup, setShowApiKeySetup] = useState(false);
  const [needsApiKeySetup, setNeedsApiKeySetup] = useState(false);
  const { id: rundownId } = useParams();

  const {
    messages,
    isLoading,
    isConnected,
    sendMessage,
    analyzeRundown,
    clearChat,
    checkConnection
  } = useCuerChat();

  useEffect(() => {
    if (isOpen) {
      checkConnection();
    }
  }, [isOpen, checkConnection]);

  const handleSendMessage = () => {
    if (!inputValue.trim()) return;
    sendMessage(inputValue.trim(), rundownData, rundownId);
    setInputValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleAnalyzeRundown = () => {
    analyzeRundown(rundownData, rundownId);
  };

  const handleSettingsClick = () => {
    setShowApiKeySetup(true);
  };

  return {
    inputValue,
    setInputValue,
    messages,
    isLoading,
    isConnected,
    showApiKeySetup,
    setShowApiKeySetup,
    needsApiKeySetup,
    handleSendMessage,
    handleKeyDown,
    handleAnalyzeRundown,
    handleSettingsClick,
    clearChat,
  };
};
