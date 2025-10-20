import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card } from '@/components/ui/card';
import { Clock, Play, Pause, RotateCcw, Maximize2, Settings, ArrowRight } from 'lucide-react';
import {
  formatTimeRemaining,
  getClockColorClass,
  getBackgroundTintClass,
  shouldPulse,
  getQuickPresetTime,
} from '@/utils/countdownUtils';

const CountdownClock = () => {
  const [targetTime, setTargetTime] = useState<Date | null>(null);
  const [showName, setShowName] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  
  const [settings, setSettings] = useState({
    show24Hour: true,
    showMilliseconds: false,
    audioAlerts: false,
  });
  
  const [inputTime, setInputTime] = useState('18:00:00');
  const [inputDate, setInputDate] = useState(new Date().toISOString().split('T')[0]);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const lastBeepSecondRef = useRef<number>(-1);

  // Calculate time remaining
  const timeRemaining = targetTime && isRunning ? Math.max(0, targetTime.getTime() - currentTime) : 0;
  const secondsRemaining = Math.floor(timeRemaining / 1000);
  const { hours, minutes, seconds, milliseconds } = formatTimeRemaining(timeRemaining, settings.showMilliseconds);

  // Update current time
  useEffect(() => {
    if (!isRunning) return;
    
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, settings.showMilliseconds ? 10 : 100);
    
    return () => clearInterval(interval);
  }, [isRunning, settings.showMilliseconds]);

  // Audio alerts
  useEffect(() => {
    if (!settings.audioAlerts || !isRunning || secondsRemaining <= 0) return;
    
    if (lastBeepSecondRef.current === secondsRemaining) return;
    
    if (secondsRemaining === 60 || secondsRemaining === 30 || secondsRemaining === 10) {
      playBeep(800, 200);
      lastBeepSecondRef.current = secondsRemaining;
    } else if (secondsRemaining <= 5 && secondsRemaining > 0) {
      playBeep(1000, 300);
      lastBeepSecondRef.current = secondsRemaining;
    } else if (secondsRemaining === 0) {
      playBeep(600, 500);
      lastBeepSecondRef.current = secondsRemaining;
    }
  }, [secondsRemaining, settings.audioAlerts, isRunning]);

  // Play beep sound
  const playBeep = (frequency: number, duration: number) => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
    }
    
    const audioContext = audioContextRef.current;
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = frequency;
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration / 1000);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + duration / 1000);
  };

  // Fullscreen handling
  const toggleFullscreen = () => {
    if (!isFullscreen) {
      const elem = document.documentElement;
      if (elem.requestFullscreen) {
        elem.requestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Start countdown
  const handleStart = () => {
    const [hoursStr, minutesStr, secondsStr = '0'] = inputTime.split(':');
    const targetDate = new Date(inputDate);
    targetDate.setHours(parseInt(hoursStr), parseInt(minutesStr), parseInt(secondsStr), 0);
    
    // If time is in the past today, assume tomorrow
    if (targetDate.getTime() < Date.now() && inputDate === new Date().toISOString().split('T')[0]) {
      targetDate.setDate(targetDate.getDate() + 1);
    }
    
    setTargetTime(targetDate);
    setIsRunning(true);
    lastBeepSecondRef.current = -1;
  };

  const handleQuickPreset = (preset: string) => {
    const presetTime = getQuickPresetTime(preset);
    setTargetTime(presetTime);
    setIsRunning(true);
    lastBeepSecondRef.current = -1;
  };

  const handleReset = () => {
    setIsRunning(false);
    setTargetTime(null);
    lastBeepSecondRef.current = -1;
  };

  // Format display
  const displayTime = settings.showMilliseconds
    ? `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(2, '0')}`
    : `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

  const colorClass = getClockColorClass(secondsRemaining);
  const bgTintClass = getBackgroundTintClass(secondsRemaining);
  const pulseClass = shouldPulse(secondsRemaining) ? 'animate-pulse' : '';

  // Setup view (before starting)
  if (!isRunning || !targetTime) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        {/* Header */}
        <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <a href="/" className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-lg">C</span>
                  </div>
                  <span className="font-semibold text-xl">Cuer</span>
                </a>
              </div>
              <Button asChild>
                <a href="/login">
                  Try Cuer Free
                  <ArrowRight className="ml-2 h-4 w-4" />
                </a>
              </Button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 flex items-center justify-center p-4">
          <Card className="w-full max-w-2xl p-8 space-y-6">
            <div className="text-center space-y-2">
              <div className="flex items-center justify-center space-x-2 text-4xl mb-2">
                <Clock className="h-10 w-10 text-primary" />
                <h1 className="font-bold">Live Show Countdown Clock</h1>
              </div>
              <p className="text-muted-foreground">
                Count down to showtime with a massive, color-coded display
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="showName">Show Name (optional)</Label>
                <Input
                  id="showName"
                  value={showName}
                  onChange={(e) => setShowName(e.target.value)}
                  placeholder="Evening News"
                  className="mt-1"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="targetTime">Target Time</Label>
                  <Input
                    id="targetTime"
                    type="time"
                    step="1"
                    value={inputTime}
                    onChange={(e) => setInputTime(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="targetDate">Date</Label>
                  <Input
                    id="targetDate"
                    type="date"
                    value={inputDate}
                    onChange={(e) => setInputDate(e.target.value)}
                    className="mt-1"
                  />
                </div>
              </div>

              <div>
                <Label className="mb-2 block">Quick Presets</Label>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={() => handleQuickPreset('15min')}>
                    +15 min
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleQuickPreset('30min')}>
                    +30 min
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleQuickPreset('1hour')}>
                    +1 hour
                  </Button>
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="audioAlerts">Audio Alerts</Label>
                  <Switch
                    id="audioAlerts"
                    checked={settings.audioAlerts}
                    onCheckedChange={(checked) => setSettings({ ...settings, audioAlerts: checked })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="showMilliseconds">Show Milliseconds</Label>
                  <Switch
                    id="showMilliseconds"
                    checked={settings.showMilliseconds}
                    onCheckedChange={(checked) => setSettings({ ...settings, showMilliseconds: checked })}
                  />
                </div>
              </div>

              <Button className="w-full" size="lg" onClick={handleStart}>
                <Play className="mr-2 h-5 w-5" />
                Start Countdown
              </Button>
            </div>
          </Card>
        </main>

        {/* Footer */}
        <footer className="border-t border-border py-4 text-center text-sm text-muted-foreground">
          <p>Free tool by <a href="/" className="text-primary hover:underline">Cuer</a> - Professional broadcast production software</p>
        </footer>
      </div>
    );
  }

  // Active countdown view
  if (isFullscreen) {
    return (
      <div 
        className={`min-h-screen flex items-center justify-center cursor-pointer transition-colors duration-500 ${bgTintClass}`}
        onClick={toggleFullscreen}
      >
        <div className="text-center space-y-4">
          {showName && (
            <h2 className="text-4xl font-semibold text-foreground/80 mb-8">
              {showName}
            </h2>
          )}
          
          {secondsRemaining === 0 ? (
            <div className={`${colorClass} animate-pulse`}>
              <div className="text-[20vw] font-bold leading-none mb-4">🔴</div>
              <div className="text-[8vw] font-bold">LIVE NOW</div>
            </div>
          ) : (
            <div className={`text-[20vw] font-bold font-mono leading-none ${colorClass} ${pulseClass} transition-colors duration-300`}>
              {displayTime}
            </div>
          )}
          
          <p className="text-xl text-muted-foreground mt-8">
            Click anywhere to exit fullscreen
          </p>
        </div>
      </div>
    );
  }

  // Normal active view
  return (
    <div className={`min-h-screen transition-colors duration-500 ${bgTintClass}`}>
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <a href="/" className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-lg">C</span>
                </div>
                <span className="font-semibold text-xl">Cuer</span>
              </a>
            </div>
            <Button asChild variant="outline">
              <a href="/login">
                Try Cuer Free
                <ArrowRight className="ml-2 h-4 w-4" />
              </a>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-4 min-h-[calc(100vh-200px)]">
        <div className="w-full max-w-6xl text-center space-y-8">
          {showName && (
            <h2 className="text-4xl md:text-5xl font-semibold text-foreground/80">
              {showName}
            </h2>
          )}
          
          {secondsRemaining === 0 ? (
            <div className={`${colorClass} animate-pulse`}>
              <div className="text-[15vw] md:text-[20vw] font-bold leading-none mb-4">🔴</div>
              <div className="text-[8vw] md:text-[10vw] font-bold">LIVE NOW</div>
            </div>
          ) : (
            <div className={`text-[15vw] md:text-[20vw] font-bold font-mono leading-none ${colorClass} ${pulseClass} transition-colors duration-300`}>
              {displayTime}
            </div>
          )}
          
          <div className="flex flex-wrap items-center justify-center gap-3 pt-8">
            <Button
              variant="outline"
              size="lg"
              onClick={() => setIsRunning(!isRunning)}
            >
              {isRunning ? <Pause className="mr-2 h-5 w-5" /> : <Play className="mr-2 h-5 w-5" />}
              {isRunning ? 'Pause' : 'Resume'}
            </Button>
            <Button variant="outline" size="lg" onClick={handleReset}>
              <RotateCcw className="mr-2 h-5 w-5" />
              Reset
            </Button>
            <Button variant="outline" size="lg" onClick={() => setShowSettings(!showSettings)}>
              <Settings className="mr-2 h-5 w-5" />
              Settings
            </Button>
            <Button variant="default" size="lg" onClick={toggleFullscreen}>
              <Maximize2 className="mr-2 h-5 w-5" />
              Fullscreen
            </Button>
          </div>

          {showSettings && (
            <Card className="p-6 space-y-4 max-w-md mx-auto">
              <div className="flex items-center justify-between">
                <Label>Audio Alerts</Label>
                <Switch
                  checked={settings.audioAlerts}
                  onCheckedChange={(checked) => setSettings({ ...settings, audioAlerts: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>Show Milliseconds</Label>
                <Switch
                  checked={settings.showMilliseconds}
                  onCheckedChange={(checked) => setSettings({ ...settings, showMilliseconds: checked })}
                />
              </div>
            </Card>
          )}
        </div>
      </main>

      <footer className="border-t border-border py-4 text-center text-sm text-muted-foreground">
        <p>Free tool by <a href="/" className="text-primary hover:underline">Cuer</a> - Professional broadcast production software</p>
      </footer>
    </div>
  );
};

export default CountdownClock;
