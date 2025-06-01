
import { useState, useEffect } from 'react';
import { useCuerChat } from '@/hooks/useCuerChat';
import { useCuerModifications } from '@/hooks/useCuerModifications';
import { toast } from 'sonner';

export const useCuerChatPanelLogic = (isOpen: boolean, rundownData?: any) => {
  const [inputValue, setInputValue] = useState('');
  const [showApiKeySetup, setShowApiKeySetup] = useState(false);
  
  const {
    messages,
    isLoading,
    isConnected,
    pendingModifications,
    sendMessage,
    analyzeRundown,
    clearChat,
    checkConnection,
    setApiKey,
    hasApiKey,
    clearPendingModifications
  } = useCuerChat();

  const { applyModifications } = useCuerModifications();

  useEffect(() => {
    if (isOpen) {
      checkConnection();
    }
  }, [isOpen, checkConnection]);

  useEffect(() => {
    console.log('🔔 Pending modifications changed:', pendingModifications);
    if (pendingModifications && pendingModifications.length > 0) {
      console.log('📋 Should show modification dialog for:', pendingModifications);
    }
  }, [pendingModifications]);

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

  const handleConfirmModifications = () => {
    console.log('✅ Confirming modifications:', pendingModifications);
    if (pendingModifications && pendingModifications.length > 0) {
      // Apply modifications immediately without setTimeout
      const success = applyModifications(pendingModifications);
      if (success) {
        toast.success(`Applied ${pendingModifications.length} modification(s) to the rundown`);
        // Clear pending modifications immediately after successful application
        clearPendingModifications();
      } else {
        toast.error('Failed to apply some modifications - items may still be loading');
      }
    }
  };

  const handleCancelModifications = () => {
    console.log('❌ Canceling modifications');
    toast.info('Modifications canceled');
    clearPendingModifications();
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
    pendingModifications,
    needsApiKeySetup,
    handleSendMessage,
    handleKeyDown,
    handleAnalyzeRundown,
    handleApiKeySet,
    handleSettingsClick,
    handleConfirmModifications,
    handleCancelModifications,
    clearChat
  };
};
