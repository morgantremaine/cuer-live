
import React, { useState } from 'react';
import { Clock, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useClockFormat } from '@/contexts/ClockFormatContext';

interface TimezoneSelectorProps {
  currentTimezone: string;
  onTimezoneChange: (timezone: string) => void;
  showTime?: boolean;
  timeDisplay?: string;
  large?: boolean;
}

const timezones = [
  { value: 'America/Los_Angeles', label: 'Los Angeles (UTC-8)' },
  { value: 'America/Denver', label: 'Denver (UTC-7)' },
  { value: 'America/Chicago', label: 'Chicago (UTC-6)' },
  { value: 'America/New_York', label: 'New York (UTC-5)' },
  { value: 'America/Detroit', label: 'Columbus (UTC-5)' },
  { value: 'Europe/London', label: 'London (UTC+0)' },
  { value: 'Europe/Paris', label: 'Paris (UTC+1)' },
  { value: 'Europe/Berlin', label: 'Berlin (UTC+1)' },
  { value: 'Asia/Riyadh', label: 'Riyadh (UTC+3)' },
  { value: 'Asia/Dubai', label: 'Dubai (UTC+4)' },
  { value: 'Asia/Shanghai', label: 'Shanghai (UTC+8)' },
  { value: 'Asia/Seoul', label: 'Seoul (UTC+9)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (UTC+9)' },
  { value: 'Australia/Sydney', label: 'Sydney (UTC+10)' }
];

const TimezoneSelector = ({ 
  currentTimezone, 
  onTimezoneChange, 
  showTime = false, 
  timeDisplay = '', 
  large = false 
}: TimezoneSelectorProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const { clockFormat, toggleClockFormat } = useClockFormat();

  const handleTimezoneChange = (value: string) => {
    console.log('TimezoneSelector: Changing timezone from', currentTimezone, 'to', value);
    onTimezoneChange(value);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 p-1 flex items-center gap-2"
      >
        {showTime && (
          <span className={`font-mono ${large ? 'text-lg' : 'text-sm'}`}>
            {timeDisplay}
          </span>
        )}
      </Button>
      
      {isOpen && (
        <div className="absolute top-full right-0 mt-1 z-[60] bg-popover text-popover-foreground border rounded-lg shadow-md p-3 min-w-[200px]">
          {/* Clock Format Selector */}
          <div className="mb-3 pb-3 border-b border-border">
            <Label className="text-xs text-muted-foreground mb-2 block">
              Time Format
            </Label>
            <div className="flex gap-1 p-1 bg-muted rounded-md">
              <button
                onClick={() => clockFormat !== '12' && toggleClockFormat()}
                className={`flex-1 px-3 py-1.5 text-sm font-medium rounded transition-colors ${
                  clockFormat === '12'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                12h
              </button>
              <button
                onClick={() => clockFormat !== '24' && toggleClockFormat()}
                className={`flex-1 px-3 py-1.5 text-sm font-medium rounded transition-colors ${
                  clockFormat === '24'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                24h
              </button>
            </div>
          </div>

          {/* Timezone Selector */}
          <Select value={currentTimezone} onValueChange={handleTimezoneChange}>
            <SelectTrigger className="w-full bg-background border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-popover border z-[60] shadow-md">
              {timezones.map((tz) => (
                <SelectItem 
                  key={tz.value} 
                  value={tz.value}
                  className="hover:bg-accent cursor-pointer"
                >
                  {tz.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
};

export default TimezoneSelector;
