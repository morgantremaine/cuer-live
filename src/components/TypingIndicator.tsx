import React, { useState, useEffect } from 'react';
import { globalFocusTracker } from '@/utils/focusTracker';

interface TypingIndicatorProps {
  fieldKey: string;
  className?: string;
}

const TypingIndicator = ({ fieldKey, className = '' }: TypingIndicatorProps) => {
  const [isOtherUserTyping, setIsOtherUserTyping] = useState(false);

  useEffect(() => {
    const unsubscribe = globalFocusTracker.onActiveFieldChange((activeField) => {
      // Someone is typing this field if it matches our field key
      setIsOtherUserTyping(activeField === fieldKey);
      console.log('📝 Typing indicator update:', { fieldKey, activeField, isTyping: activeField === fieldKey });
    });

    return unsubscribe;
  }, [fieldKey]);

  if (!isOtherUserTyping) {
    return null;
  }

  return (
    <div className={`absolute top-0 right-0 z-50 ${className}`}>
      <div className="bg-blue-500 text-white text-xs px-2 py-1 rounded-bl-md shadow-lg animate-pulse">
        <div className="flex items-center gap-1">
          <div className="flex gap-1">
            <div className="w-1 h-1 bg-white rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
            <div className="w-1 h-1 bg-white rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
            <div className="w-1 h-1 bg-white rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
          </div>
          <span className="ml-1">typing...</span>
        </div>
      </div>
    </div>
  );
};

export default TypingIndicator;