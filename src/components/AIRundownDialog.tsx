import { useState, useRef, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Sparkles, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { RundownItem } from '@/types/rundown';

interface AIRundownDialogProps {
  onCreateRundown: (title: string, items: RundownItem[], timezone: string, startTime: string) => Promise<void>;
  disabled?: boolean;
  disabledReason?: string;
}

type DialogState = 'input' | 'loading' | 'preview';

const STAGE_MESSAGES = [
  "Analyzing your show description...",
  "Creating show structure...",
  "Generating segment details...",
  "Writing scripts and cues...",
  "Calculating durations...",
  "Polishing final details...",
];

const PROGRESS_DURATION = 70000; // 70 seconds to reach 90%
const PROGRESS_TARGET = 90;
const STAGE_INTERVAL = 10000; // Change message every 10 seconds

export const AIRundownDialog = ({ onCreateRundown, disabled, disabledReason }: AIRundownDialogProps) => {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<DialogState>('input');
  const [prompt, setPrompt] = useState('');
  const [title, setTitle] = useState('');
  const [startTime, setStartTime] = useState('09:00:00');
  const [timezone, setTimezone] = useState('America/New_York');
  const [generatedItems, setGeneratedItems] = useState<RundownItem[]>([]);
  const [progress, setProgress] = useState(0);
  const [stageMessage, setStageMessage] = useState(STAGE_MESSAGES[0]);
  const { toast } = useToast();

  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const stageIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);
  const stageIndexRef = useRef(0);

  const clearProgressTimers = useCallback(() => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
    if (stageIntervalRef.current) {
      clearInterval(stageIntervalRef.current);
      stageIntervalRef.current = null;
    }
  }, []);

  const startProgressAnimation = useCallback(() => {
    // Reset state
    setProgress(0);
    setStageMessage(STAGE_MESSAGES[0]);
    stageIndexRef.current = 0;
    startTimeRef.current = Date.now();

    // Clear any existing timers
    clearProgressTimers();

    // Progress animation with cubic ease-out
    progressIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      const t = Math.min(elapsed / PROGRESS_DURATION, 1);
      // Cubic ease-out: starts fast, slows down toward end
      const easedProgress = PROGRESS_TARGET * (1 - Math.pow(1 - t, 3));
      setProgress(Math.min(easedProgress, PROGRESS_TARGET));
    }, 100);

    // Stage message rotation
    stageIntervalRef.current = setInterval(() => {
      stageIndexRef.current = (stageIndexRef.current + 1) % STAGE_MESSAGES.length;
      setStageMessage(STAGE_MESSAGES[stageIndexRef.current]);
    }, STAGE_INTERVAL);
  }, [clearProgressTimers]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearProgressTimers();
    };
  }, [clearProgressTimers]);

  const examplePrompt = "Cuer, create a rundown template for an esports best-of-three tournament. I need sections for TOP OF SHOW, GAME 1, GAME 2, GAME 3, and BOTTOM OF SHOW. Include key segments like Show Open, Team Intros, Live Gameplay, Post-Game Analysis, Recaps, and Winner Interview. Cast members: Host Alex, Casters Moxie and Rekkz.";

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast({
        title: "Prompt required",
        description: "Please enter a description of your rundown",
        variant: "destructive"
      });
      return;
    }

    setState('loading');
    startProgressAnimation();

    try {
      const { data, error } = await supabase.functions.invoke('generate-rundown', {
        body: { prompt, startTime }
      });

      // Stop progress animation
      clearProgressTimers();

      if (error) {
        console.error('Edge function error:', error);
        throw new Error(error.message || 'Failed to generate rundown');
      }

      if (!data || !data.items || !Array.isArray(data.items)) {
        throw new Error('Invalid response from AI');
      }

      // Complete the progress bar
      setProgress(100);
      setStageMessage("Complete!");

      setGeneratedItems(data.items);
      
      // Set default title if not provided
      if (!title.trim()) {
        const date = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        setTitle(`AI Generated Rundown - ${date}`);
      }

      // Brief delay to show 100% before transitioning
      setTimeout(() => {
        setState('preview');
      }, 300);
      
      toast({
        title: "Rundown generated!",
        description: `Created ${data.items.length} segments. Review and create when ready.`
      });

    } catch (error) {
      console.error('Generation error:', error);
      clearProgressTimers();
      setProgress(0);
      
      let errorMessage = 'Failed to generate rundown. Please try again.';
      
      if (error.message?.includes('Rate limit')) {
        errorMessage = 'Too many requests. Please wait a moment and try again.';
      } else if (error.message?.includes('API key')) {
        errorMessage = 'OpenAI API key not configured. Please contact support.';
      }

      toast({
        title: "Generation failed",
        description: errorMessage,
        variant: "destructive"
      });

      setState('input');
    }
  };

  const handleCreate = async () => {
    try {
      setState('loading');
      await onCreateRundown(title, generatedItems, timezone, startTime);
      
      toast({
        title: "Success!",
        description: "AI rundown created successfully"
      });

      // Reset dialog
      setOpen(false);
      setPrompt('');
      setTitle('');
      setGeneratedItems([]);
      setState('input');

    } catch (error) {
      console.error('Creation error:', error);
      toast({
        title: "Creation failed",
        description: "Failed to create rundown. Please try again.",
        variant: "destructive"
      });
      setState('preview');
    }
  };

  const handleCancel = () => {
    clearProgressTimers();
    setProgress(0);
    setOpen(false);
    setPrompt('');
    setTitle('');
    setGeneratedItems([]);
    setState('input');
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (disabled && newOpen) {
      toast({
        title: "Limit reached",
        description: disabledReason || "Cannot create new rundown",
        variant: "destructive"
      });
      return;
    }
    setOpen(newOpen);
    if (!newOpen) {
      handleCancel();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button 
          size="lg"
          disabled={disabled}
          className={`border-0 flex items-center gap-2 ${
            disabled 
              ? 'bg-green-400 text-white opacity-60 cursor-pointer' 
              : 'bg-green-600 hover:bg-green-700 text-white'
          }`}
        >
          <Sparkles className="h-5 w-5" />
          Create AI Template
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-blue-500" />
            Create AI Template
          </DialogTitle>
        </DialogHeader>

        {state === 'input' && (
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label htmlFor="prompt">Describe your show</Label>
              <Textarea
                id="prompt"
                placeholder="Enter a detailed description of your rundown..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={6}
                className="resize-none"
              />
              <p className="text-sm text-muted-foreground">
                <strong>Example:</strong> {examplePrompt}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title (optional)</Label>
                <Input
                  id="title"
                  placeholder="Auto-generated if empty"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="startTime">Start Time</Label>
                <Input
                  id="startTime"
                  type="time"
                  step="1"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="timezone">Timezone</Label>
                <Select value={timezone} onValueChange={setTimezone}>
                  <SelectTrigger id="timezone">
                    <SelectValue placeholder="Select timezone" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="America/New_York">Eastern (America/New_York)</SelectItem>
                    <SelectItem value="America/Chicago">Central (America/Chicago)</SelectItem>
                    <SelectItem value="America/Denver">Mountain (America/Denver)</SelectItem>
                    <SelectItem value="America/Los_Angeles">Pacific (America/Los_Angeles)</SelectItem>
                    <SelectItem value="America/Phoenix">Arizona (America/Phoenix)</SelectItem>
                    <SelectItem value="Europe/London">London (Europe/London)</SelectItem>
                    <SelectItem value="UTC">UTC</SelectItem>
                    <SelectItem value="Asia/Tokyo">Tokyo (Asia/Tokyo)</SelectItem>
                    <SelectItem value="Australia/Sydney">Sydney (Australia/Sydney)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
              <Button onClick={handleGenerate} className="bg-green-600 hover:bg-green-700 text-white">
                <Sparkles className="h-4 w-4 mr-2" />
                Generate Rundown
              </Button>
            </div>
          </div>
        )}

        {state === 'loading' && (
          <div className="flex flex-col items-center justify-center py-12 space-y-6">
            <div className="flex items-center gap-3">
              <Sparkles className="h-6 w-6 text-green-500 animate-pulse" />
              <p className="text-lg font-medium">Generating your rundown...</p>
            </div>
            
            <div className="w-full max-w-md space-y-3">
              <Progress value={progress} className="h-2" />
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground italic">{stageMessage}</span>
                <span className="text-muted-foreground font-medium">{Math.round(progress)}%</span>
              </div>
            </div>
            
            <p className="text-xs text-muted-foreground">Typically takes about 1 minute</p>
          </div>
        )}

        {state === 'preview' && (
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <h3 className="font-semibold text-lg">Preview</h3>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Title:</span> {title}
                </div>
                <div>
                  <span className="text-muted-foreground">Start Time:</span> {startTime}
                </div>
                <div>
                  <span className="text-muted-foreground">Timezone:</span> {timezone}
                </div>
              </div>
            </div>

            <div className="border rounded-lg overflow-hidden">
              <div className="max-h-96 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted sticky top-0">
                    <tr>
                      <th className="px-4 py-2 text-left font-medium">#</th>
                      <th className="px-4 py-2 text-left font-medium">Segment</th>
                      <th className="px-4 py-2 text-left font-medium">Duration</th>
                      <th className="px-4 py-2 text-left font-medium">Talent</th>
                      <th className="px-4 py-2 text-left font-medium">Script</th>
                    </tr>
                  </thead>
                  <tbody>
                    {generatedItems.map((item, index) => (
                      <tr 
                        key={item.id} 
                        className={`border-t ${item.type === 'header' ? 'bg-muted/50 font-semibold' : ''}`}
                      >
                        <td className="px-4 py-2">{item.type === 'header' ? '—' : item.rowNumber}</td>
                        <td className="px-4 py-2">{item.name}</td>
                        <td className="px-4 py-2">{item.duration || '—'}</td>
                        <td className="px-4 py-2">{item.talent || '—'}</td>
                        <td className="px-4 py-2 max-w-xs truncate">{item.script || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">
                {generatedItems.length} segments generated
              </p>
              <div className="flex gap-3">
                <Button variant="outline" onClick={handleCancel}>
                  Cancel
                </Button>
                <Button onClick={handleCreate} className="bg-green-600 hover:bg-green-700">
                  Create Rundown
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
