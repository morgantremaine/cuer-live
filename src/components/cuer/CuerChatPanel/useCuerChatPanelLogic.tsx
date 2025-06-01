
import { useState, useEffect } from 'react';
import { useCuerChat } from '@/hooks/useCuerChat';
import { toast } from 'sonner';

export const useCuerChatPanelLogic = (isOpen: boolean, rundownData?: any) => {
  const [inputValue, setInputValue] = useState('');
  const [showApiKeySetup, setShowApiKeySetup] = useState(false);
  
  const {
    messages,
    isLoading,
    isConnected,
    sendMessage,
    analyzeRundown,
    clearChat,
    checkConnection,
    setApiKey,
    hasApiKey
  } = useCuerChat();

  useEffect(() => {
    if (isOpen) {
      checkConnection();
    }
  }, [isOpen, checkConnection]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;
    
    console.log('💬 Sending message with rundown data:', {
      messageLength: inputValue.length,
      hasRundownData: !!rundownData,
      itemsCount: rundownData?.items?.length || 0
    });
    
    await sendMessage(inputValue, rundownData);
    setInputValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleAnalyzeRundown = () => {
    if (rundownData) {
      console.log('🔍 Analyzing rundown with data:', {
        itemsCount: rundownData.items?.length || 0,
        hasTitle: !!rundownData.title
      });
      analyzeRundown(rundownData);
    } else {
      console.warn('⚠️ No rundown data available for analysis');
      toast.error('No rundown data available for analysis');
    }
  };

  const handleApiKeySet = (apiKey: string) => {
    setApiKey(apiKey);
    setShowApiKeySetup(false);
  };

  const handleSettingsClick = () => {
    setShowApiKeySetup(true);
  };

  const needsApiKeySetup = !hasApiKey() && isConnected === false;

  return {
    inputValue,
    setInputValue,
    showApiKeySetup,
    setShowApiKeySetup,
    messages,
    isLoading,
    isConnected,
    needsApiKeySetup,
    handleSendMessage,
    handleKeyDown,
    handleAnalyzeRundown,
    handleApiKeySet,
    handleSettingsClick,
    clearChat
  };
};
