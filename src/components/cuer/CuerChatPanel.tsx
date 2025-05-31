
import React, { useState, useRef, useEffect } from 'react';
import { X, MessageCircle, Send, Zap, Trash2, Wifi, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useCuerChat } from '@/hooks/useCuerChat';

interface CuerChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
  rundownData?: any;
}

const CuerChatPanel = ({ isOpen, onClose, rundownData }: CuerChatPanelProps) => {
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
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
    if (isOpen && isConnected === null) {
      checkConnection();
    }
  }, [isOpen, isConnected, checkConnection]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;
    
    await sendMessage(inputValue);
    setInputValue('');
    textareaRef.current?.focus();
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

  if (!isOpen) return null;

  return (
    <div className="fixed right-4 bottom-4 w-96 h-[600px] bg-white border border-gray-200 rounded-lg shadow-xl z-50 flex flex-col">
      {/* Header */}
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
          <Button
            variant="ghost"
            size="sm"
            onClick={clearChat}
            disabled={messages.length === 0}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Connection Status */}
      {isConnected === false && (
        <div className="p-3 bg-red-50 border-b border-red-200 text-sm text-red-700">
          ⚠️ Cannot connect to Ollama. Make sure it's running on localhost:11434
        </div>
      )}

      {/* Quick Actions */}
      {rundownData && isConnected && (
        <div className="p-3 border-b border-gray-200 bg-gray-50">
          <Button
            variant="outline"
            size="sm"
            onClick={handleAnalyzeRundown}
            disabled={isLoading}
            className="w-full"
          >
            <Zap className="w-4 h-4 mr-2" />
            Analyze Current Rundown
          </Button>
        </div>
      )}

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.length === 0 && isConnected && (
            <div className="text-center text-gray-500 text-sm">
              <p>👋 Hi! I'm Cuer, your broadcast production assistant.</p>
              <p className="mt-2">Ask me about rundown optimization, timing issues, or script improvements!</p>
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
                    : 'bg-gray-100 text-gray-900'
                }`}
              >
                <div className="whitespace-pre-wrap">{message.content}</div>
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
              <div className="bg-gray-100 rounded-lg p-3 text-sm text-gray-600">
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

      {/* Input */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex space-x-2">
          <Textarea
            ref={textareaRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask Cuer about your rundown..."
            disabled={!isConnected || isLoading}
            className="flex-1 min-h-[40px] max-h-[100px] resize-none"
          />
          <Button
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || !isConnected || isLoading}
            size="sm"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CuerChatPanel;
