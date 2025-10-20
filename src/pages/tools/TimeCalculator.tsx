import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Clock, Calculator, Plus, Minus, Timer, Copy, Check, TimerIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import CuerLogo from '@/components/common/CuerLogo';
import {
  calculateEndTime,
  calculateTimeDifference,
  addDurations,
  subtractDurations,
  calculateTimeUntil,
  formatTimeForDisplay,
  formatDurationHuman
} from '@/utils/timeCalculator';
import { useAuth } from '@/hooks/useAuth';
import { SEO } from '@/components/SEO';

type CalculatorType = 'add-time' | 'subtract-time' | 'add-durations' | 'subtract-durations' | 'time-until';

const TimeCalculator = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [calculatorType, setCalculatorType] = useState<CalculatorType>('add-time');
  const [startTime, setStartTime] = useState('09:00:00');
  const [endTime, setEndTime] = useState('14:29:00');
  const [duration, setDuration] = useState('05:29:00');
  const [duration1, setDuration1] = useState('01:15:30');
  const [duration2, setDuration2] = useState('02:10:45');
  const [targetTime, setTargetTime] = useState('18:00:00');
  const [use24Hour, setUse24Hour] = useState(true);
  const [result, setResult] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [copied, setCopied] = useState(false);

  // Auto-calculate when inputs change
  useEffect(() => {
    calculateResult();
  }, [calculatorType, startTime, endTime, duration, duration1, duration2, targetTime]);

  const calculateResult = () => {
    setError('');
    
    try {
      switch (calculatorType) {
        case 'add-time': {
          if (!startTime || !duration) {
            setResult('');
            return;
          }
          const endTimeResult = calculateEndTime(startTime, duration);
          setResult(endTimeResult);
          break;
        }
        
        case 'subtract-time': {
          if (!startTime || !endTime) {
            setResult('');
            return;
          }
          const diff = calculateTimeDifference(startTime, endTime);
          if (diff.error) {
            setError(diff.error);
            setResult('');
          } else {
            setResult(diff.result);
          }
          break;
        }
        
        case 'add-durations': {
          if (!duration1 || !duration2) {
            setResult('');
            return;
          }
          const total = addDurations(duration1, duration2);
          setResult(total);
          break;
        }
        
        case 'subtract-durations': {
          if (!duration1 || !duration2) {
            setResult('');
            return;
          }
          const diff = subtractDurations(duration1, duration2);
          if (diff.error) {
            setError(diff.error);
            setResult('');
          } else {
            setResult(diff.result);
          }
          break;
        }
        
        case 'time-until': {
          if (!targetTime) {
            setResult('');
            return;
          }
          const remaining = calculateTimeUntil(targetTime);
          if (remaining.error) {
            setError(remaining.error);
            setResult('');
          } else {
            setResult(remaining.result);
          }
          break;
        }
      }
    } catch (err) {
      setError('Invalid input. Please check your time format.');
      setResult('');
    }
  };

  const copyToClipboard = () => {
    if (result) {
      navigator.clipboard.writeText(result);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const loadExample = (example: string) => {
    switch (example) {
      case 'news-show':
        setCalculatorType('add-time');
        setStartTime('06:00:00');
        setDuration('01:00:00');
        break;
      case 'sports':
        setCalculatorType('add-time');
        setStartTime('19:00:00');
        setDuration('03:15:00');
        break;
      case 'time-until':
        setCalculatorType('time-until');
        setTargetTime('17:00:00');
        break;
      case 'add-commercials':
        setCalculatorType('add-durations');
        setDuration1('00:02:30');
        setDuration2('00:01:00');
        break;
      case 'remaining-time':
        setCalculatorType('subtract-durations');
        setDuration1('01:00:00');
        setDuration2('00:42:30');
        break;
    }
  };

  const renderInputs = () => {
    switch (calculatorType) {
      case 'add-time':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="start-time" className="text-foreground">Start Time</Label>
              <Input
                id="start-time"
                type="text"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                placeholder="09:00:00 or 9:00 AM"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="duration" className="text-foreground">Duration</Label>
              <Input
                id="duration"
                type="text"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                placeholder="05:29:00"
                className="mt-1"
              />
            </div>
          </div>
        );

      case 'subtract-time':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="start-time-sub" className="text-foreground">Start Time</Label>
              <Input
                id="start-time-sub"
                type="text"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                placeholder="09:00:00 or 9:00 AM"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="end-time" className="text-foreground">End Time</Label>
              <Input
                id="end-time"
                type="text"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                placeholder="14:29:00 or 2:29 PM"
                className="mt-1"
              />
            </div>
          </div>
        );

      case 'add-durations':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="duration1-add" className="text-foreground">First Duration</Label>
              <Input
                id="duration1-add"
                type="text"
                value={duration1}
                onChange={(e) => setDuration1(e.target.value)}
                placeholder="01:15:30"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="duration2-add" className="text-foreground">Second Duration</Label>
              <Input
                id="duration2-add"
                type="text"
                value={duration2}
                onChange={(e) => setDuration2(e.target.value)}
                placeholder="02:10:45"
                className="mt-1"
              />
            </div>
          </div>
        );

      case 'subtract-durations':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="duration1-sub" className="text-foreground">Total Duration</Label>
              <Input
                id="duration1-sub"
                type="text"
                value={duration1}
                onChange={(e) => setDuration1(e.target.value)}
                placeholder="05:00:00"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="duration2-sub" className="text-foreground">Subtract Duration</Label>
              <Input
                id="duration2-sub"
                type="text"
                value={duration2}
                onChange={(e) => setDuration2(e.target.value)}
                placeholder="02:30:00"
                className="mt-1"
              />
            </div>
          </div>
        );

      case 'time-until':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="target-time" className="text-foreground">Target Time (Today)</Label>
              <Input
                id="target-time"
                type="text"
                value={targetTime}
                onChange={(e) => setTargetTime(e.target.value)}
                placeholder="18:00:00 or 6:00 PM"
                className="mt-1"
              />
            </div>
          </div>
        );
    }
  };

  const getResultLabel = () => {
    switch (calculatorType) {
      case 'add-time':
        return 'End Time';
      case 'subtract-time':
        return 'Duration';
      case 'add-durations':
        return 'Total Duration';
      case 'subtract-durations':
        return 'Remaining Duration';
      case 'time-until':
        return 'Time Until';
    }
  };

  const structuredData = {
    "@context": "https://schema.org",
    "@type": ["SoftwareApplication", "WebApplication"],
    "name": "Free Time Calculator for Broadcast",
    "applicationCategory": "UtilityApplication",
    "operatingSystem": "Web",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD"
    },
    "description": "Professional time calculator for broadcast and production. Add/subtract times and durations, calculate show end times, and plan your rundowns with precision.",
    "featureList": [
      "Add time and duration",
      "Subtract times to find duration",
      "Add multiple durations",
      "Subtract durations",
      "Calculate time until target",
      "24-hour and 12-hour format support"
    ],
    "audience": {
      "@type": "Audience",
      "audienceType": "Production professionals, broadcast engineers, event planners"
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Free Time Calculator | Add & Subtract Times | Broadcast Tool | Cuer"
        description="Professional time calculator for broadcast and production. Add/subtract times and durations, calculate show end times, and plan your rundowns with precision."
        keywords="time calculator, duration calculator, time math, broadcast timing, show timing calculator, production time calculator, time addition, time subtraction"
        canonicalUrl="https://usecuer.com/tools/time-calculator"
        structuredData={structuredData}
      />
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <button onClick={() => navigate('/')} className="hover:opacity-80 transition-opacity">
              <CuerLogo className="h-8 w-auto" />
            </button>
            {!user && (
              <Button onClick={() => navigate('/login?tab=signup')} variant="default">
                Try Cuer Free
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Title */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <Clock className="w-12 h-12 text-primary mr-3" />
            <h1 className="text-4xl font-bold text-foreground">Time Calculator</h1>
          </div>
          <p className="text-muted-foreground text-lg">
            Professional time math made simple. Calculate show times, durations, and time differences.
          </p>
        </div>

        {/* Calculator Type Selector */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
              <Button
                variant={calculatorType === 'add-time' ? 'default' : 'outline'}
                onClick={() => setCalculatorType('add-time')}
                className="flex flex-col h-auto py-3"
              >
                <Plus className="w-5 h-5 mb-1" />
                <span className="text-xs">Add Time</span>
              </Button>
              <Button
                variant={calculatorType === 'subtract-time' ? 'default' : 'outline'}
                onClick={() => setCalculatorType('subtract-time')}
                className="flex flex-col h-auto py-3"
              >
                <Minus className="w-5 h-5 mb-1" />
                <span className="text-xs">Subtract Time</span>
              </Button>
              <Button
                variant={calculatorType === 'add-durations' ? 'default' : 'outline'}
                onClick={() => setCalculatorType('add-durations')}
                className="flex flex-col h-auto py-3"
              >
                <Plus className="w-5 h-5 mb-1" />
                <span className="text-xs">Add Durations</span>
              </Button>
              <Button
                variant={calculatorType === 'subtract-durations' ? 'default' : 'outline'}
                onClick={() => setCalculatorType('subtract-durations')}
                className="flex flex-col h-auto py-3"
              >
                <Minus className="w-5 h-5 mb-1" />
                <span className="text-xs">Subtract Durations</span>
              </Button>
              <Button
                variant={calculatorType === 'time-until' ? 'default' : 'outline'}
                onClick={() => setCalculatorType('time-until')}
                className="flex flex-col h-auto py-3"
              >
                <Timer className="w-5 h-5 mb-1" />
                <span className="text-xs">Time Until</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Input Fields */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            {renderInputs()}
            
            {/* Format Toggle */}
            <div className="mt-4 flex items-center justify-between">
              <Label className="text-sm text-muted-foreground">Display Format</Label>
              <div className="flex gap-2">
                <Button
                  variant={use24Hour ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setUse24Hour(true)}
                >
                  24-hour
                </Button>
                <Button
                  variant={!use24Hour ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setUse24Hour(false)}
                >
                  12-hour
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Result Display */}
        {(result || error) && (
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="text-center">
                <Label className="text-lg text-muted-foreground mb-2 block">{getResultLabel()}</Label>
                {error ? (
                  <div className="text-destructive text-xl font-semibold">{error}</div>
                ) : (
                  <>
                    <div className="text-4xl font-bold text-primary mb-2">
                      {formatTimeForDisplay(result, use24Hour)}
                    </div>
                    {calculatorType !== 'add-time' && calculatorType !== 'time-until' && (
                      <div className="text-sm text-muted-foreground mb-2">
                        ({formatDurationHuman(result)})
                      </div>
                    )}
                    {!use24Hour && calculatorType === 'add-time' && (
                      <div className="text-sm text-muted-foreground">
                        24-hour: {result}
                      </div>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={copyToClipboard}
                      className="mt-3"
                    >
                      {copied ? (
                        <>
                          <Check className="w-4 h-4 mr-2" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4 mr-2" />
                          Copy Result
                        </>
                      )}
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick Examples */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <Label className="text-sm font-semibold text-foreground mb-3 block">💡 Quick Examples</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => loadExample('news-show')}
                className="justify-start"
              >
                News show: 6:00 AM + 1 hour
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => loadExample('sports')}
                className="justify-start"
              >
                Sports: 7:00 PM + 3:15:00
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => loadExample('time-until')}
                className="justify-start"
              >
                How long until 5:00 PM?
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => loadExample('add-commercials')}
                className="justify-start"
              >
                Add breaks: 2:30 + 1:00
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => loadExample('remaining-time')}
                className="justify-start md:col-span-2"
              >
                Remaining: 60:00 - 42:30
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* How it Works */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <h2 className="text-2xl font-bold mb-4">How to Use the Time Calculator</h2>
            <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
              <li>Select the type of calculation you need from the buttons above</li>
              <li>Enter your time values in 24-hour (e.g., 14:30:00) or 12-hour format (e.g., 2:30 PM)</li>
              <li>View the calculated result instantly</li>
              <li>Toggle between 24-hour and 12-hour display formats</li>
              <li>Copy the result to your clipboard with one click</li>
            </ol>
          </CardContent>
        </Card>

        {/* Benefits & Use Cases */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <h2 className="text-2xl font-bold mb-4">Professional Time Math for Broadcast & Production</h2>
            <p className="text-muted-foreground mb-4">
              Our time calculator is designed for broadcast professionals, production teams, and event planners who need accurate time calculations. 
              Eliminate mental math errors and save time with instant, precise calculations for all your timing needs.
            </p>
            <div className="space-y-3">
              <h3 className="font-semibold">Perfect for:</h3>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li><strong>Show Planning:</strong> Calculate when your show will end based on start time and duration</li>
                <li><strong>Rundown Management:</strong> Determine segment durations and show flow</li>
                <li><strong>Commercial Breaks:</strong> Add up multiple break durations</li>
                <li><strong>Remaining Time:</strong> Calculate how much time is left in your show</li>
                <li><strong>Live Events:</strong> Plan precise timing for ceremonies and presentations</li>
                <li><strong>Production Scheduling:</strong> Coordinate complex timing for multi-segment productions</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* More Tools */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <h2 className="text-2xl font-bold mb-4">More Free Broadcast Tools</h2>
            <p className="text-muted-foreground mb-4">Professional timing tools for broadcast and production</p>
            <div className="grid md:grid-cols-2 gap-4">
              <button 
                onClick={() => navigate('/tools/script-timing')}
                className="text-left p-4 border rounded-lg hover:bg-accent transition-colors"
              >
                <div className="flex items-center gap-2 mb-2">
                  <Calculator className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold">Script Timing Calculator</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Calculate how long it takes to read scripts at different speaking speeds
                </p>
              </button>
              <button 
                onClick={() => navigate('/tools/countdown-clock')}
                className="text-left p-4 border rounded-lg hover:bg-accent transition-colors"
              >
                <div className="flex items-center gap-2 mb-2">
                  <TimerIcon className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold">Countdown Clock</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Live countdown with fullscreen display, color alerts, and audio cues
                </p>
              </button>
            </div>
          </CardContent>
        </Card>

        {/* CTA */}
        {!user && (
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="pt-6 text-center">
              <h3 className="text-xl font-bold text-foreground mb-2">
                Need more powerful broadcast tools?
              </h3>
              <p className="text-muted-foreground mb-4">
                Cuer offers complete rundown management, real-time collaboration, AI assistance, and much more.
              </p>
              <Button onClick={() => navigate('/login?tab=signup')} size="lg">
                Try Cuer Free
              </Button>
            </CardContent>
          </Card>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border mt-12 py-6">
        <div className="container mx-auto px-4 text-center text-muted-foreground text-sm">
          <p>&copy; {new Date().getFullYear()} Cuer Live. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default TimeCalculator;
