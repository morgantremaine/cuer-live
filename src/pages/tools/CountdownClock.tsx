import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card } from '@/components/ui/card';
import { Clock, Play, Square, Maximize2, Settings, ArrowLeft } from 'lucide-react';
import CuerLogo from '@/components/common/CuerLogo';
import {
  formatTimeRemaining,
  getClockColorClass,
  getBackgroundTintClass,
  shouldPulse,
  getQuickPresetTime,
} from '@/utils/countdownUtils';
import { useAuth } from '@/hooks/useAuth';

const CountdownClock = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
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

  const handleStop = () => {
    setIsRunning(false);
    setTargetTime(null);
    setShowSettings(false);
    lastBeepSecondRef.current = -1;
  };

  // Format display
  const displayTime = settings.showMilliseconds
    ? `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(2, '0')}`
    : `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

  const colorClass = getClockColorClass(secondsRemaining);
  const bgTintClass = getBackgroundTintClass(secondsRemaining);
  const pulseClass = shouldPulse(secondsRemaining) ? 'animate-pulse' : '';
  
  // Adjust font size for milliseconds
  const clockFontSize = settings.showMilliseconds ? 'text-[12vw] md:text-[15vw]' : 'text-[15vw] md:text-[20vw]';
  const clockFontSizeFullscreen = settings.showMilliseconds ? 'text-[15vw]' : 'text-[20vw]';

  // Setup view (before starting)
  if (!isRunning || !targetTime) {
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
            {!user && (
              <Button onClick={() => navigate('/login?tab=signup')} variant="default">
                Try Cuer Free
              </Button>
            )}
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl space-y-8">
            <Card className="p-8 space-y-6">
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

            {/* CTA */}
            {!user && (
              <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
                <div className="pt-6 text-center p-6">
                  <h3 className="text-xl font-semibold mb-2">Need more powerful broadcast tools?</h3>
                  <p className="text-muted-foreground mb-4">
                    Cuer offers complete rundown management, real-time collaboration, AI assistance, and much more.
                  </p>
                  <Button onClick={() => navigate('/login?tab=signup')} size="lg">
                    Try Cuer Free
                  </Button>
                </div>
              </Card>
            )}
          </div>
        </main>

        {/* Footer */}
        <footer className="mt-16 py-8 border-t text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} Cuer Live. All rights reserved.</p>
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
              <div className={`${clockFontSizeFullscreen} font-bold leading-none mb-4`}>🔴</div>
              <div className="text-[8vw] font-bold">LIVE NOW</div>
            </div>
          ) : (
            <div className={`${clockFontSizeFullscreen} font-bold font-mono leading-none ${colorClass} ${pulseClass} transition-colors duration-300`}>
              {displayTime}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Normal active view
  return (
    <div className={`min-h-screen bg-gradient-to-br from-background to-muted transition-colors duration-500 ${bgTintClass}`}>
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
          {!user && (
            <Button onClick={() => navigate('/login?tab=signup')} variant="default">
              Try Cuer Free
            </Button>
          )}
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
              <div className={`${clockFontSize} font-bold leading-none mb-4`}>🔴</div>
              <div className="text-[8vw] md:text-[10vw] font-bold">LIVE NOW</div>
            </div>
          ) : (
            <div className={`${clockFontSize} font-bold font-mono leading-none ${colorClass} ${pulseClass} transition-colors duration-300`}>
              {displayTime}
            </div>
          )}
          
          <div className="flex flex-wrap items-center justify-center gap-3 pt-8">
            <Button variant="outline" size="lg" onClick={handleStop}>
              <Square className="mr-2 h-5 w-5" />
              Stop
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

      {/* CTA */}
      {!user && (
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
            <div className="pt-6 text-center p-6">
              <h3 className="text-xl font-semibold mb-2">Need more powerful broadcast tools?</h3>
              <p className="text-muted-foreground mb-4">
                Cuer offers complete rundown management, real-time collaboration, AI assistance, and much more.
              </p>
              <Button onClick={() => navigate('/login?tab=signup')} size="lg">
                Try Cuer Free
              </Button>
            </div>
          </Card>
        </div>
      )}

      <footer className="mt-16 py-8 border-t text-center text-sm text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} Cuer Live. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default CountdownClock;
