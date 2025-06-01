
import React, { useRef, useEffect } from 'react';
import { Bot, User } from 'lucide-react';
import InlineModificationRequest from './CuerChatMessages/InlineModificationRequest';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  modifications?: any[];
}

interface CuerChatMessagesProps {
  messages: ChatMessage[];
  isLoading: boolean;
  isConnected: boolean | null;
  pendingModifications?: any[] | null;
  onConfirmModifications?: () => void;
  onCancelModifications?: () => void;
}

const CuerChatMessages = ({ 
  messages, 
  isLoading, 
  isConnected,
  pendingModifications,
  onConfirmModifications,
  onCancelModifications
}: CuerChatMessagesProps) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, pendingModifications]);

  if (isConnected === null) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="text-center text-gray-500">
          <Bot className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Connecting to Cuer...</p>
        </div>
      </div>
    );
  }

  if (messages.length === 0 && !isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="text-center text-gray-500">
          <Bot className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Hi! I'm Cuer, your AI rundown assistant.</p>
          <p className="text-xs mt-1">Ask me anything about your rundown!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-3 space-y-3">
      {messages.map((message) => (
        <div key={message.id} className="flex space-x-2">
          <div className="flex-shrink-0">
            {message.role === 'assistant' ? (
              <Bot className="w-6 h-6 text-blue-600" />
            ) : (
              <User className="w-6 h-6 text-gray-600" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className={`p-2 rounded-lg text-sm ${
              message.role === 'assistant' 
                ? 'bg-gray-100 text-gray-800' 
                : 'bg-blue-100 text-blue-800'
            }`}>
              <div className="whitespace-pre-wrap">{message.content}</div>
            </div>
          </div>
        </div>
      ))}

      {/* Show pending modifications inline */}
      {pendingModifications && pendingModifications.length > 0 && onConfirmModifications && onCancelModifications && (
        <div className="flex space-x-2">
          <div className="flex-shrink-0">
            <Bot className="w-6 h-6 text-blue-600" />
          </div>
          <div className="flex-1 min-w-0">
            <InlineModificationRequest
              modifications={pendingModifications}
              onConfirm={onConfirmModifications}
              onCancel={onCancelModifications}
            />
          </div>
        </div>
      )}

      {isLoading && (
        <div className="flex space-x-2">
          <div className="flex-shrink-0">
            <Bot className="w-6 h-6 text-blue-600 animate-pulse" />
          </div>
          <div className="flex-1">
            <div className="bg-gray-100 p-2 rounded-lg text-sm text-gray-600">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      <div ref={messagesEndRef} />
    </div>
  );
};

export default CuerChatMessages;
