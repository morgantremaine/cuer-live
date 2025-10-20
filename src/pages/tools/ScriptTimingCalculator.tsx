import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Clock, Calculator, ArrowLeft } from 'lucide-react';
import CuerLogo from '@/components/common/CuerLogo';
import { countWords, calculateReadingTimeSeconds, secondsToMMSS } from '@/utils/scriptTiming';

const ScriptTimingCalculator = () => {
  const navigate = useNavigate();
  const [scriptText, setScriptText] = useState('');
  const [selectedSpeed, setSelectedSpeed] = useState<'slow' | 'normal' | 'fast' | 'custom'>('normal');
  const [customWPM, setCustomWPM] = useState(150);

  const speedPresets = {
    slow: 120,
    normal: 150,
    fast: 180,
  };

  const currentWPM = selectedSpeed === 'custom' ? customWPM : speedPresets[selectedSpeed];

  const { wordCount, readingTimeSeconds, readingTimeFormatted, readingTimeHuman } = useMemo(() => {
    const words = countWords(scriptText);
    const seconds = calculateReadingTimeSeconds(words, currentWPM);
    const formatted = secondsToMMSS(seconds);
    
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    let human = '';
    if (minutes > 0) {
      human += `${minutes} minute${minutes !== 1 ? 's' : ''}`;
    }
    if (secs > 0) {
      if (human) human += ', ';
      human += `${secs} second${secs !== 1 ? 's' : ''}`;
    }
    if (!human) human = '0 seconds';

    return {
      wordCount: words,
      readingTimeSeconds: seconds,
      readingTimeFormatted: formatted,
      readingTimeHuman: human,
    };
  }, [scriptText, currentWPM]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/')}
              aria-label="Back to home"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <CuerLogo className="h-8 w-auto" />
          </div>
          <Button onClick={() => navigate('/login?tab=signup')} variant="default">
            Try Cuer Free
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Calculator className="h-8 w-8 text-primary" />
            <h1 className="text-4xl font-bold">Script Timing Calculator</h1>
          </div>
          <p className="text-muted-foreground text-lg">
            Calculate how long it takes to read your script at different speaking speeds
          </p>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Your Script</CardTitle>
            <CardDescription>
              Paste or type your script below. Word count and timing updates automatically.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Textarea
                placeholder="Type or paste your script here..."
                value={scriptText}
                onChange={(e) => setScriptText(e.target.value)}
                className="min-h-[300px] text-base resize-y"
                aria-label="Script text input"
              />
              <div className="mt-2 text-sm text-muted-foreground">
                Word count: <span className="font-semibold">{wordCount}</span> words
              </div>
            </div>

            <div className="space-y-4">
              <Label>Speaking Speed</Label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <Button
                  variant={selectedSpeed === 'slow' ? 'default' : 'outline'}
                  onClick={() => setSelectedSpeed('slow')}
                  className="w-full"
                >
                  Slow
                  <br />
                  <span className="text-xs opacity-80">120 WPM</span>
                </Button>
                <Button
                  variant={selectedSpeed === 'normal' ? 'default' : 'outline'}
                  onClick={() => setSelectedSpeed('normal')}
                  className="w-full"
                >
                  Normal
                  <br />
                  <span className="text-xs opacity-80">150 WPM</span>
                </Button>
                <Button
                  variant={selectedSpeed === 'fast' ? 'default' : 'outline'}
                  onClick={() => setSelectedSpeed('fast')}
                  className="w-full"
                >
                  Fast
                  <br />
                  <span className="text-xs opacity-80">180 WPM</span>
                </Button>
                <Button
                  variant={selectedSpeed === 'custom' ? 'default' : 'outline'}
                  onClick={() => setSelectedSpeed('custom')}
                  className="w-full"
                >
                  Custom
                </Button>
              </div>

              {selectedSpeed === 'custom' && (
                <div className="space-y-2">
                  <Label htmlFor="custom-wpm">Custom Words Per Minute</Label>
                  <Input
                    id="custom-wpm"
                    type="number"
                    min="50"
                    max="300"
                    value={customWPM}
                    onChange={(e) => setCustomWPM(Math.max(50, Math.min(300, parseInt(e.target.value) || 150)))}
                    className="max-w-xs"
                  />
                  <p className="text-xs text-muted-foreground">Range: 50-300 WPM</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        {wordCount > 0 && (
          <Card className="bg-primary/5 border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Reading Time
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center">
                <div className="text-5xl font-bold text-primary mb-2">
                  {readingTimeFormatted}
                </div>
                <div className="text-lg text-muted-foreground">
                  {readingTimeHuman}
                </div>
              </div>
              <div className="text-sm text-muted-foreground text-center border-t pt-4">
                <p>
                  <strong>{wordCount}</strong> words at <strong>{currentWPM}</strong> words per minute
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* CTA */}
        <Card className="mt-8 bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="pt-6 text-center">
            <h3 className="text-xl font-semibold mb-2">Need more powerful rundown tools?</h3>
            <p className="text-muted-foreground mb-4">
              Cuer offers complete broadcast rundown management with real-time collaboration, timing automation, and AI-powered features.
            </p>
            <Button onClick={() => navigate('/login?tab=signup')} size="lg">
              Try Cuer for Free
            </Button>
          </CardContent>
        </Card>
      </main>

      {/* Footer */}
      <footer className="mt-16 py-8 border-t text-center text-sm text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} Cuer Live. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default ScriptTimingCalculator;
