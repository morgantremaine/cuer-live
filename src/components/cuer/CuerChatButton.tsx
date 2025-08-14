
import React, { useState } from 'react';
import { MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import CuerChatPanel from './CuerChatPanel';

interface CuerChatButtonProps {
  rundownData?: any;
}

const CuerChatButton = ({ rundownData }: CuerChatButtonProps) => {
  const [isChatOpen, setIsChatOpen] = useState(false);

  return (
    <>
      {/* Floating Chat Button */}
      <Button
        onClick={() => setIsChatOpen(true)}
        className="fixed bottom-4 right-4 h-12 px-4 rounded-full shadow-lg bg-blue-600 hover:bg-blue-700 z-40 flex items-center gap-2 text-white"
      >
        <MessageCircle className="w-5 h-5 text-white" />
        <span className="text-sm font-medium text-white">Cuer AI</span>
      </Button>

      {/* Chat Panel */}
      <CuerChatPanel
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        rundownData={rundownData}
      />
    </>
  );
};

export default CuerChatButton;
