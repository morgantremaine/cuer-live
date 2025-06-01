import { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export const useCuerChatPanelLogic = (isOpen: boolean, rundownData?: any) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [showApiKeySetup, setShowApiKeySetup] = useState(false);
  const [needsApiKeySetup, setNeedsApiKeySetup] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsConnected(true); // Simulate connection established
    }
  }, [isOpen]);

  const addMessage = (role: 'user' | 'assistant', content: string) => {
    setMessages(prev => [
      ...prev,
      {
        id: uuidv4(),
        role,
        content,
        timestamp: new Date(),
      },
    ]);
  };

  const sendMessage = async (userMessage: string) => {
    addMessage('user', userMessage);
    setIsLoading(true);

    try {
      const res = await fetch('/functions/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          rundownData,
        }),
      });

      const data = await res.json();

      if (data?.message) {
        addMessage('assistant', data.message);
      } else if (data?.error) {
        addMessage('assistant', `Error: ${data.error}`);
      } else {
        addMessage('assistant', 'Sorry, I couldn’t generate a response.');
      }
    } catch (err) {
      console.error(err);
      addMessage('assistant', 'Something went wrong.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = () => {
    if (!inputValue.trim()) return;
    sendMessage(inputValue.trim());
    setInputValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleAnalyzeRundown = () => {
    sendMessage(
      "Can you review the current rundown and suggest any improvements to spelling, grammar, timing, or structure in plain English? Please do not use JSON, code blocks, or formatting instructions."
    );
  };

  const handleSettingsClick = () => {
    setShowApiKeySetup(true);
  };

  const clearChat = () => {
    setMessages([]);
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