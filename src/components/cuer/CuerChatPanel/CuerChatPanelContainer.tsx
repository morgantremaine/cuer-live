
import React from 'react';
import CuerChatHeader from '../CuerChatHeader';
import CuerQuickActions from '../CuerQuickActions';
import CuerChatMessages from '../CuerChatMessages';
import CuerChatInput from '../CuerChatInput';

interface CuerChatPanelContainerProps {
  isConnected: boolean | null;
  needsApiKeySetup: boolean;
  messages: any[];
  inputValue: string;
  setInputValue: (value: string) => void;
  isLoading: boolean;
  rundownData?: any;
  onSettingsClick: () => void;
  onClearChat: () => void;
  onClose: () => void;
  onSendMessage: () => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  onAnalyzeRundown: () => void;
  onApplyModifications?: (modifications: any[]) => void;
}

const CuerChatPanelContainer = ({
  isConnected,
  needsApiKeySetup,
  messages,
  inputValue,
  setInputValue,
  isLoading,
  rundownData,
  onSettingsClick,
  onClearChat,
  onClose,
  onSendMessage,
  onKeyDown,
  onAnalyzeRundown,
  onApplyModifications
}: CuerChatPanelContainerProps) => {
  return (
    <div className="fixed right-4 bottom-4 w-96 h-[600px] bg-white border border-gray-200 rounded-lg shadow-xl z-50 flex flex-col">
      <CuerChatHeader
        isConnected={isConnected}
        needsApiKeySetup={needsApiKeySetup}
        messagesLength={messages.length}
        onSettingsClick={onSettingsClick}
        onClearChat={onClearChat}
        onClose={onClose}
      />

      {!needsApiKeySetup && isConnected === false && (
        <div className="p-3 bg-red-50 border-b border-red-200 text-sm text-red-700">
          ⚠️ Connection failed. Please check your Supabase edge function.
        </div>
      )}

      <CuerQuickActions
        rundownData={rundownData}
        isConnected={isConnected}
        isLoading={isLoading}
        onAnalyzeRundown={onAnalyzeRundown}
      />

      <div className="flex-1 flex flex-col min-h-0">
        <CuerChatMessages
          messages={messages}
          isLoading={isLoading}
          isConnected={isConnected}
          onApplyModifications={onApplyModifications}
        />
        
        <CuerChatInput
          inputValue={inputValue}
          setInputValue={setInputValue}
          isConnected={isConnected}
          isLoading={isLoading}
          onSendMessage={onSendMessage}
          onKeyDown={onKeyDown}
        />
      </div>
    </div>
  );
};

export default CuerChatPanelContainer;
