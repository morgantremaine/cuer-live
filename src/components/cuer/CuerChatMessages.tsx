import React, { useRef, useEffect, useState } from 'react';
import { Bot, User } from 'lucide-react';
import { marked } from 'marked';
import InlineModificationRequest from './CuerChatMessages/InlineModificationRequest';
import { useCuerModifications } from '@/hooks/useCuerModifications';
import { RundownModification } from '@/hooks/useCuerModifications/types';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface CuerChatMessagesProps {
  messages: ChatMessage[];
  isLoading: boolean;
  isConnected: boolean | null;
}

const CuerChatMessages = ({ 
  messages, 
  isLoading, 
  isConnected
}: CuerChatMessagesProps) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [pendingModifications, setPendingModifications] = useState<{
    messageId: string;
    modifications: RundownModification[];
  } | null>(null);
  
  const { applyModifications } = useCuerModifications();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // Configure marked for better paragraph handling
  useEffect(() => {
    marked.setOptions({
      breaks: true, // Convert line breaks to <br>
      gfm: true // GitHub Flavored Markdown
    });
  }, []);

  const extractModifications = (content: string): { cleanContent: string; modifications: RundownModification[] | null } => {
    console.log('🔍 EXTRACTION: Raw content:', content);
    
    // Look for the __CUER_MODIFICATIONS__ format (created by the parser)
    const modificationMatch = content.match(/__CUER_MODIFICATIONS__:(.*)/);
    
    if (modificationMatch) {
      console.log('🔍 EXTRACTION: Found modification data:', modificationMatch[1]);
      try {
        const modificationData = JSON.parse(modificationMatch[1]);
        console.log('🔍 EXTRACTION: Parsed modification data:', modificationData);
        
        const cleanContent = content.replace(/__CUER_MODIFICATIONS__:.*/, '').trim();
        
        return {
          cleanContent,
          modifications: modificationData.modifications || []
        };
      } catch (error) {
        console.error('🔍 EXTRACTION: Failed to parse modifications:', error);
      }
    }
    
    console.log('🔍 EXTRACTION: No modifications found');
    return { cleanContent: content, modifications: null };
  };

  const handleConfirmModifications = () => {
    if (pendingModifications) {
      const success = applyModifications(pendingModifications.modifications);
      if (success) {
        setPendingModifications(null);
      }
    }
  };

  const handleCancelModifications = () => {
    setPendingModifications(null);
  };

  const renderMessageContent = (content: string, role: 'user' | 'assistant', messageId: string) => {
    if (role === 'assistant') {
      const { cleanContent, modifications } = extractModifications(content);
      
      return (
        <div>
          <div 
            className="prose prose-sm max-w-none [&>p]:mb-4 [&>p:last-child]:mb-0 [&>ul]:mb-4 [&>ol]:mb-4 [&>h1]:mb-3 [&>h2]:mb-3 [&>h3]:mb-3 [&>blockquote]:mb-4"
            dangerouslySetInnerHTML={{ __html: marked(cleanContent) }}
          />
          
          {modifications && modifications.length > 0 && (
            <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800 mb-2">
                Apply this change to your rundown?
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    console.log('🎯 CUER: Applying modifications directly');
                    console.log('🎯 CUER: Modifications:', JSON.stringify(modifications, null, 2));
                    
                    try {
                      const success = applyModifications(modifications);
                      console.log('🎯 CUER: applyModifications returned:', success);
                      if (success) {
                        console.log('✅ CUER: Modifications applied successfully');
                      } else {
                        console.log('❌ CUER: Failed to apply modifications');
                      }
                    } catch (error) {
                      console.error('💥 CUER: Error applying modifications:', error);
                    }
                  }}
                  className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                >
                  Apply
                </button>
                <button
                  onClick={() => {}}
                  className="px-3 py-1 bg-gray-300 text-gray-700 text-sm rounded hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      );
    } else {
      // Plain text for user messages
      return <div className="whitespace-pre-wrap">{content}</div>;
    }
  };

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
          <p className="text-xs mt-1">I can analyze your rundown and provide suggestions!</p>
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
              {renderMessageContent(message.content, message.role, message.id)}
            </div>
          </div>
        </div>
      ))}

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
