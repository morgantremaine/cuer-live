
import React from 'react';

interface ApiKeySetupSectionProps {
  onClose: () => void;
}

const ApiKeySetupSection = ({ onClose }: ApiKeySetupSectionProps) => {
  return (
    <div className="border-b border-gray-200 bg-white">
      <div className="p-4 text-center">
        <h3 className="font-semibold text-gray-900 mb-2">Configure OpenAI API Key</h3>
        <p className="text-sm text-gray-600 mb-4">
          To use Cuer AI, you need to add your OpenAI API key to Supabase secrets.
        </p>
        <div className="text-xs text-gray-500 space-y-1">
          <p>1. Go to your Supabase dashboard</p>
          <p>2. Navigate to Settings → Edge Functions → Secrets</p>
          <p>3. Add a new secret: OPENAI_API_KEY</p>
          <p>4. Get your API key from <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">OpenAI Platform</a></p>
        </div>
        <button
          onClick={onClose}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Done
        </button>
      </div>
    </div>
  );
};

export default ApiKeySetupSection;
