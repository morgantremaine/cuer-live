
import { useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { ChatMessage } from './types';

export const useChatOperations = (
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>,
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>,
  saveMessageToDb: (message: ChatMessage) => Promise<void>
) => {
  const sendMessage = useCallback(async (content: string, rundownData?: any, rundownId?: string) => {
    console.log('🚀 useCuerChat - Sending message:', content);
    console.log('🚀 useCuerChat - With rundown data:', rundownData);
    
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: new Date(),
      rundown_id: rundownId
    };

    setMessages(prev => [...prev, userMessage]);
    saveMessageToDb(userMessage);
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('chat', {
        body: {
          message: content,
          rundownData: rundownData || null
        }
      });

      if (error) {
        throw new Error(error.message || 'Failed to send message');
      }

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.message || 'Sorry, I could not generate a response.',
        timestamp: new Date(),
        rundown_id: rundownId
      };

      setMessages(prev => [...prev, assistantMessage]);
      saveMessageToDb(assistantMessage);

    } catch (error) {
      console.error('❌ useCuerChat - Error sending message:', error);
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `Sorry, I encountered an error: ${error instanceof Error ? error.message : 'Unknown error'}. Please make sure your OpenAI API key is configured in Supabase secrets.`,
        timestamp: new Date(),
        rundown_id: rundownId
      };
      setMessages(prev => [...prev, errorMessage]);
      saveMessageToDb(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [setMessages, saveMessageToDb, setIsLoading]);

  const analyzeRundown = useCallback(async (rundownData: any, rundownId?: string) => {
    console.log('🔍 useCuerChat - Analyzing rundown:', rundownData);
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('chat', {
        body: {
          message: `Can you review the current rundown and suggest any improvements to spelling, grammar, timing, or structure in plain English?`,
          rundownData
        }
      });

      if (error) {
        throw new Error(error.message || 'Failed to analyze rundown');
      }

      const analysisMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: data.message || 'Analysis completed.',
        timestamp: new Date(),
        rundown_id: rundownId
      };

      setMessages(prev => [...prev, analysisMessage]);
      saveMessageToDb(analysisMessage);

    } catch (error) {
      console.error('❌ useCuerChat - Error analyzing rundown:', error);
      const errorMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `I couldn't analyze the rundown: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date(),
        rundown_id: rundownId
      };
      setMessages(prev => [...prev, errorMessage]);
      saveMessageToDb(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [setMessages, saveMessageToDb, setIsLoading]);

  return { sendMessage, analyzeRundown };
};
