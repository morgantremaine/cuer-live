
import React, { useState } from 'react';
import { Key, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface ApiKeySetupProps {
  onApiKeySet: (apiKey: string) => void;
  onCancel?: () => void;
}

const ApiKeySetup = ({ onApiKeySet, onCancel }: ApiKeySetupProps) => {
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (apiKey.trim()) {
      onApiKeySet(apiKey.trim());
    }
  };

  return (
    <div className="p-4 space-y-4">
      <div className="text-center">
        <Key className="w-8 h-8 mx-auto text-blue-600 mb-2" />
        <h3 className="font-semibold text-gray-900 mb-1">Set up OpenAI API Key</h3>
        <p className="text-sm text-gray-600">
          To use Cuer AI assistant, you need to provide your OpenAI API key.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="apiKey">OpenAI API Key</Label>
          <div className="relative">
            <Input
              id="apiKey"
              type={showKey ? 'text' : 'password'}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-..."
              className="pr-10"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-1 top-1 h-8 w-8 p-0"
              onClick={() => setShowKey(!showKey)}
            >
              {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        <div className="text-xs text-gray-500 space-y-1">
          <p>• Your API key is stored locally in your browser</p>
          <p>• Get your API key from <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">OpenAI Platform</a></p>
          <p>• Costs approximately $0.001-0.003 per message</p>
        </div>

        <div className="flex space-x-2">
          <Button type="submit" className="flex-1" disabled={!apiKey.trim()}>
            Save API Key
          </Button>
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          )}
        </div>
      </form>
    </div>
  );
};

export default ApiKeySetup;
