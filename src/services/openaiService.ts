

import { RundownItem } from '@/types/rundown';

// Note: Direct OpenAI API calls from frontend are blocked by CORS policy
// This would need to be implemented via a backend service or Supabase Edge Function
const API_KEY = ''; // Disabled for now due to CORS restrictions

export interface OpenAIMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface RundownModification {
  type: 'add' | 'edit' | 'delete' | 'reorder';
  itemId?: string;
  newData?: Partial<RundownItem>;
  data?: Partial<RundownItem>; // Added for compatibility
  targetIndex?: number;
  description: string;
}

export interface OpenAIResponse {
  response: string;
  modifications?: RundownModification[];
}

class OpenAIService {
  private apiKey: string;

  constructor() {
    this.apiKey = API_KEY;
  }

  hasApiKey(): boolean {
    return !!this.apiKey && this.apiKey.length > 0;
  }

  async checkConnection(): Promise<boolean> {
    // Since we can't make direct API calls due to CORS, return false
    console.log('🤖 openaiService - Connection check: CORS restrictions prevent direct API calls');
    return false;
  }

  async analyzeRundown(rundownData: any): Promise<string> {
    console.log('🤖 openaiService - analyzeRundown called with:', rundownData);
    
    // Return a helpful error message about CORS
    throw new Error('OpenAI API calls are blocked by CORS policy. Please implement a backend proxy or use Supabase Edge Functions to enable AI features.');
  }

  async sendMessage(messages: OpenAIMessage[]): Promise<string> {
    console.log('🤖 openaiService - sendMessage called');
    
    // Return a helpful error message about CORS
    throw new Error('OpenAI API calls are blocked by CORS policy. Please implement a backend proxy or use Supabase Edge Functions to enable AI features.');
  }

  async sendMessageWithModifications(messages: OpenAIMessage[]): Promise<OpenAIResponse> {
    console.log('🤖 openaiService - sendMessageWithModifications called');
    
    // Return a helpful error message about CORS
    throw new Error('OpenAI API calls are blocked by CORS policy. Please implement a backend proxy or use Supabase Edge Functions to enable AI features.');
  }

  // Mock implementation for development/testing
  async mockAnalyzeRundown(rundownData: any): Promise<string> {
    console.log('🤖 openaiService - Mock analysis for:', rundownData.title);
    
    const items = rundownData.items || [];
    const totalItems = items.length;
    const headers = items.filter((item: any) => item.type === 'header').length;
    const segments = items.filter((item: any) => item.type === 'regular').length;
    
    return `**Mock Rundown Analysis**

**Overview:**
- Title: ${rundownData.title}
- Total Items: ${totalItems}
- Headers: ${headers}
- Segments: ${segments}

**Note:** This is a mock analysis. To enable full AI features, you would need to:
1. Create a Supabase Edge Function to proxy OpenAI API calls
2. Or implement a backend service to handle API requests
3. This avoids CORS restrictions that prevent direct frontend-to-OpenAI communication

The AI chat feature is currently disabled due to browser security restrictions.`;
  }
}

export const openaiService = new OpenAIService();

