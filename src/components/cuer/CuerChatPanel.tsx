import React, { useState, useEffect } from 'react';
import { useCuerChat } from '@/hooks/useCuerChat';
import { useCuerModifications } from '@/hooks/useCuerModifications';
import ApiKeySetup from './ApiKeySetup';
import RundownModificationDialog from './RundownModificationDialog';
import CuerChatHeader from './CuerChatHeader';
import CuerQuickActions from './CuerQuickActions';
import CuerChatMessages from './CuerChatMessages';
import CuerChatInput from './CuerChatInput';

interface CuerChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
  rundownData?: any;
}

const CuerChatPanel = ({ isOpen, onClose, rundownData }: CuerChatPanelProps) => {
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

  // Debug effect to track pending modifications
  useEffect(() => {
    console.log('Pending modifications changed:', pendingModifications);
    if (pendingModifications && pendingModifications.length > 0) {
      console.log('Should show modification dialog');
    }
  }, [pendingModifications]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;
    
    await sendMessage(inputValue);
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
      analyzeRundown(rundownData);
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
    console.log('Confirming modifications:', pendingModifications);
    if (pendingModifications) {
      applyModifications(pendingModifications);
      clearPendingModifications();
    }
  };

  const handleCancelModifications = () => {
    console.log('Canceling modifications');
    clearPendingModifications();
  };

  if (!isOpen) return null;

  const needsApiKeySetup = !hasApiKey() && isConnected === false;

  return (
    <>
      <div className="fixed right-4 bottom-4 w-96 h-[600px] bg-white border border-gray-200 rounded-lg shadow-xl z-50 flex flex-col">
        <CuerChatHeader
          isConnected={isConnected}
          needsApiKeySetup={needsApiKeySetup}
          messagesLength={messages.length}
          onSettingsClick={handleSettingsClick}
          onClearChat={clearChat}
          onClose={onClose}
        />

        {showApiKeySetup && needsApiKeySetup && (
          <div className="border-b border-gray-200 bg-white">
            <div className="p-4 text-center">
              <h3 className="font-semibold text-gray-900 mb-2">Configure OpenAI API Key</h3>
              <p className="text-sm text-gray-600 mb-4">
                To use Cuer AI, you need to add your OpenAI API key to Supabase secrets.
              </p>
              <div className="text-xs text-gray-500 space-y-1">
                <p>1. Go to your Supabase dashboard</p>
                <p>2. Navigate to Settings → Edge Functions → Secrets</p>
                <p>3. Add a new secret: OPENAI_API_KEY</p>
                <p>4. Get your API key from <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">OpenAI Platform</a></p>
              </div>
              <button
                onClick={() => setShowApiKeySetup(false)}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Done
              </button>
            </div>
          </div>
        )}

        {!showApiKeySetup && isConnected === false && (
          <div className="p-3 bg-red-50 border-b border-red-200 text-sm text-red-700">
            {needsApiKeySetup ? 
              '⚠️ Please configure your OpenAI API key in Supabase secrets.' :
              '⚠️ Connection failed. Please check your Supabase edge function.'
            }
          </div>
        )}

        {!showApiKeySetup && (
          <CuerQuickActions
            rundownData={rundownData}
            isConnected={isConnected}
            isLoading={isLoading}
            onAnalyzeRundown={handleAnalyzeRundown}
          />
        )}

        {!showApiKeySetup && (
          <div className="flex-1 flex flex-col min-h-0">
            <CuerChatMessages
              messages={messages}
              isLoading={isLoading}
              isConnected={isConnected}
            />
            
            <CuerChatInput
              inputValue={inputValue}
              setInputValue={setInputValue}
              isConnected={isConnected}
              isLoading={isLoading}
              onSendMessage={handleSendMessage}
              onKeyDown={handleKeyDown}
            />
          </div>
        )}
      </div>

      {pendingModifications && pendingModifications.length > 0 && (
        <RundownModificationDialog
          isOpen={true}
          modifications={pendingModifications}
          onConfirm={handleConfirmModifications}
          onCancel={handleCancelModifications}
        />
      )}
    </>
  );
};

export default CuerChatPanel;
