
import React, { useRef } from 'react';
import { Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

interface CuerChatInputProps {
  inputValue: string;
  setInputValue: (value: string) => void;
  isConnected: boolean | null;
  isLoading: boolean;
  onSendMessage: () => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
}

const CuerChatInput = ({
  inputValue,
  setInputValue,
  isConnected,
  isLoading,
  onSendMessage,
  onKeyDown
}: CuerChatInputProps) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  return (
    <div className="p-4 border-t border-gray-200">
      <div className="flex space-x-2">
        <Textarea
          ref={textareaRef}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Ask Cuer about your rundown..."
          disabled={!isConnected || isLoading}
          className="flex-1 min-h-[40px] max-h-[100px] resize-none"
        />
        <Button
          onClick={onSendMessage}
          disabled={!inputValue.trim() || !isConnected || isLoading}
          size="sm"
        >
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};

export default CuerChatInput;
