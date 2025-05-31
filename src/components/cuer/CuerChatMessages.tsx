
import React, { useRef, useEffect } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';

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
}

const CuerChatMessages = ({ messages, isLoading, isConnected }: CuerChatMessagesProps) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex-1 bg-white">
      <ScrollArea className="h-full p-4">
        <div className="space-y-4">
          {messages.length === 0 && isConnected && (
            <div className="text-center text-gray-500 text-sm">
              <p>👋 Hi! I'm Cuer, your broadcast production assistant.</p>
              <p className="mt-2">Ask me about rundown optimization, timing issues, or script improvements!</p>
              <p className="mt-2 text-xs bg-blue-50 p-2 rounded border border-blue-200 text-blue-800">
                💡 I can now modify your rundown! Try saying "Add a 2-minute weather segment" or "Fix the timing issues"
              </p>
            </div>
          )}
          
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-lg p-3 text-sm ${
                  message.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-900 border border-gray-200'
                }`}
              >
                <div className="whitespace-pre-wrap">{message.content}</div>
                {message.modifications && message.modifications.length > 0 && (
                  <div className="mt-2 p-2 bg-blue-50 rounded border border-blue-200 text-xs text-blue-800">
                    💡 I have {message.modifications.length} modification(s) ready to apply
                  </div>
                )}
                <div
                  className={`text-xs mt-1 ${
                    message.role === 'user' ? 'text-blue-100' : 'text-gray-500'
                  }`}
                >
                  {message.timestamp.toLocaleTimeString()}
                </div>
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-gray-100 border border-gray-200 rounded-lg p-3 text-sm text-gray-600">
                <div className="flex items-center space-x-2">
                  <div className="animate-pulse">Cuer is thinking...</div>
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
      </ScrollArea>
    </div>
  );
};

export default CuerChatMessages;
