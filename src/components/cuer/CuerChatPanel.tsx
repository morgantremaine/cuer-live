
import React from 'react';
import RundownModificationDialog from './RundownModificationDialog';
import CuerChatPanelContainer from './CuerChatPanel/CuerChatPanelContainer';
import ApiKeySetupSection from './CuerChatPanel/ApiKeySetupSection';
import { useCuerChatPanelLogic } from './CuerChatPanel/useCuerChatPanelLogic';

interface CuerChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
  rundownData?: any;
}

const CuerChatPanel = ({ isOpen, onClose, rundownData }: CuerChatPanelProps) => {
  const {
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
    handleSettingsClick,
    handleConfirmModifications,
    handleCancelModifications,
    clearChat
  } = useCuerChatPanelLogic(isOpen, rundownData);

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed right-4 bottom-4 w-96 h-[600px] bg-white border border-gray-200 rounded-lg shadow-xl z-50 flex flex-col">
        {showApiKeySetup && needsApiKeySetup ? (
          <ApiKeySetupSection onClose={() => setShowApiKeySetup(false)} />
        ) : (
          <CuerChatPanelContainer
            isConnected={isConnected}
            needsApiKeySetup={needsApiKeySetup}
            messages={messages}
            inputValue={inputValue}
            setInputValue={setInputValue}
            isLoading={isLoading}
            rundownData={rundownData}
            onSettingsClick={handleSettingsClick}
            onClearChat={clearChat}
            onClose={onClose}
            onSendMessage={handleSendMessage}
            onKeyDown={handleKeyDown}
            onAnalyzeRundown={handleAnalyzeRundown}
          />
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
