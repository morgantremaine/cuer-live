
import { pipeline, env } from '@huggingface/transformers';

// Configure transformers.js
env.allowLocalModels = false;
env.useBrowserCache = true;

interface BrowserAIResponse {
  response: string;
  confidence?: number;
}

class BrowserAIService {
  private textGenerator: any = null;
  private isInitialized = false;

  async initialize(): Promise<boolean> {
    if (this.isInitialized) return true;
    
    try {
      console.log('🤖 Initializing browser AI service...');
      
      // Use a lightweight text generation model that works well in browsers
      this.textGenerator = await pipeline(
        'text-generation',
        'onnx-community/gpt2',
        { 
          device: 'webgpu',
          dtype: 'fp32'
        }
      );
      
      this.isInitialized = true;
      console.log('✅ Browser AI service initialized successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize browser AI:', error);
      // Fallback to CPU if WebGPU fails
      try {
        this.textGenerator = await pipeline(
          'text-generation',
          'onnx-community/gpt2',
          { device: 'cpu' }
        );
        this.isInitialized = true;
        console.log('✅ Browser AI service initialized with CPU fallback');
        return true;
      } catch (fallbackError) {
        console.error('❌ CPU fallback also failed:', fallbackError);
        return false;
      }
    }
  }

  async analyzeRundown(rundownData: any): Promise<string> {
    console.log('🔍 Browser AI analyzing rundown:', rundownData.title);
    
    if (!this.isInitialized) {
      const initialized = await this.initialize();
      if (!initialized) {
        return this.getFallbackAnalysis(rundownData);
      }
    }

    try {
      const items = rundownData.items || [];
      const totalItems = items.length;
      const headers = items.filter((item: any) => item.type === 'header').length;
      const segments = items.filter((item: any) => item.type === 'regular').length;
      
      const prompt = `Analyze this TV rundown: "${rundownData.title}" with ${totalItems} items (${headers} headers, ${segments} segments). Provide insights on timing and structure:`;
      
      const result = await this.textGenerator(prompt, {
        max_new_tokens: 150,
        temperature: 0.7,
        do_sample: true,
        return_full_text: false
      });

      const aiResponse = result[0]?.generated_text || 'Analysis completed.';
      
      return `**AI Rundown Analysis**

**Overview:**
- Title: ${rundownData.title}
- Total Items: ${totalItems}
- Headers: ${headers}
- Segments: ${segments}

**AI Insights:**
${aiResponse}

*Powered by browser-based AI (no API required)*`;
    } catch (error) {
      console.error('❌ Error in browser AI analysis:', error);
      return this.getFallbackAnalysis(rundownData);
    }
  }

  async sendMessage(message: string): Promise<BrowserAIResponse> {
    console.log('💬 Browser AI processing message:', message);
    
    if (!this.isInitialized) {
      const initialized = await this.initialize();
      if (!initialized) {
        return {
          response: "I'm having trouble initializing the AI model. Please try refreshing the page or check your browser's WebGPU support.",
          confidence: 0
        };
      }
    }

    try {
      const prompt = `You are Cuer, a helpful broadcast production assistant. User asks: "${message}" 

Response:`;
      
      const result = await this.textGenerator(prompt, {
        max_new_tokens: 100,
        temperature: 0.8,
        do_sample: true,
        return_full_text: false
      });

      const response = result[0]?.generated_text || "I understand your question about broadcast production. Let me help you with that.";
      
      return {
        response: response.trim(),
        confidence: 0.8
      };
    } catch (error) {
      console.error('❌ Error in browser AI chat:', error);
      return {
        response: `I apologize, but I'm having trouble processing your message right now. The browser AI model may still be loading. Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        confidence: 0
      };
    }
  }

  private getFallbackAnalysis(rundownData: any): string {
    const items = rundownData.items || [];
    const totalItems = items.length;
    const headers = items.filter((item: any) => item.type === 'header').length;
    const segments = items.filter((item: any) => item.type === 'regular').length;
    
    // Calculate total duration
    let totalDuration = 0;
    items.forEach((item: any) => {
      if (item.duration) {
        const [hours, minutes, seconds] = item.duration.split(':').map(Number);
        totalDuration += (hours || 0) * 3600 + (minutes || 0) * 60 + (seconds || 0);
      }
    });
    
    const formatDuration = (seconds: number) => {
      const h = Math.floor(seconds / 3600);
      const m = Math.floor((seconds % 3600) / 60);
      const s = seconds % 60;
      return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    return `**Rundown Analysis (Fallback Mode)**

**Overview:**
- Title: ${rundownData.title}
- Total Items: ${totalItems}
- Headers: ${headers}
- Segments: ${segments}
- Estimated Duration: ${formatDuration(totalDuration)}

**Quick Analysis:**
${totalItems > 20 ? '⚠️ Large rundown - consider breaking into smaller segments' : '✅ Good rundown size'}
${headers < 3 ? '💡 Consider adding more section headers for better organization' : '✅ Well-structured with section headers'}
${segments === 0 ? '⚠️ No regular segments found' : `✅ Contains ${segments} content segments`}

*Note: AI model couldn't load - using basic analysis mode*`;
  }

  isReady(): boolean {
    return this.isInitialized;
  }
}

export const browserAIService = new BrowserAIService();
