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
  const [appliedMessageIds, setAppliedMessageIds] = useState<Set<string>>(new Set());
  
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
    console.log('🎯 RENDER: Processing message', { role, messageId, contentLength: content.length });
    
    if (role === 'assistant') {
      const { cleanContent, modifications } = extractModifications(content);
      console.log('🎯 RENDER: Extracted modifications:', modifications);
      
      // Auto-apply modifications when detected (but only once per message)
      if (modifications && modifications.length > 0 && !appliedMessageIds.has(messageId)) {
        console.log('🔄 AUTO-APPLYING: Detected modifications in AI response');
        console.log('🔄 AUTO-APPLYING: Modifications:', JSON.stringify(modifications, null, 2));
        console.log('🔄 AUTO-APPLYING: Message ID:', messageId);
        console.log('🔄 AUTO-APPLYING: Already applied IDs:', Array.from(appliedMessageIds));
        
        // Mark this message as processed immediately to prevent infinite loops
        setAppliedMessageIds(prev => new Set([...prev, messageId]));
        
        // Apply modifications asynchronously to avoid blocking render
        setTimeout(() => {
          console.log('🔄 AUTO-APPLYING: Starting timeout execution');
          try {
            console.log('🔄 AUTO-APPLYING: About to call applyModifications');
            const success = applyModifications(modifications);
            console.log('🔄 AUTO-APPLYING: applyModifications returned:', success);
          } catch (error) {
            console.error('💥 AUTO-APPLYING: Error applying modifications:', error);
          }
        }, 100);
      } else {
        console.log('🔄 AUTO-APPLYING: Skipping because:', {
          hasModifications: !!(modifications && modifications.length > 0),
          alreadyApplied: appliedMessageIds.has(messageId),
          messageId
        });
      }
      
      return (
        <div>
          <div 
            className="prose prose-sm max-w-none [&>p]:mb-4 [&>p:last-child]:mb-0 [&>ul]:mb-4 [&>ol]:mb-4 [&>h1]:mb-3 [&>h2]:mb-3 [&>h3]:mb-3 [&>blockquote]:mb-4"
            dangerouslySetInnerHTML={{ __html: marked(cleanContent) }}
          />
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
