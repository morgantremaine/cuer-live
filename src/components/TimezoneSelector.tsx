
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
        <div className="absolute top-full right-0 mt-1 z-[60] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3 min-w-[200px]">
          {/* Clock Format Selector */}
          <div className="mb-3 pb-3 border-b border-gray-200 dark:border-gray-700">
            <Label className="text-xs text-gray-600 dark:text-gray-400 mb-2 block">
              Time Format
            </Label>
            <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-700 rounded-md">
              <button
                onClick={() => clockFormat !== '12' && toggleClockFormat()}
                className={`flex-1 px-3 py-1.5 text-sm font-medium rounded transition-colors ${
                  clockFormat === '12'
                    ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                12h
              </button>
              <button
                onClick={() => clockFormat !== '24' && toggleClockFormat()}
                className={`flex-1 px-3 py-1.5 text-sm font-medium rounded transition-colors ${
                  clockFormat === '24'
                    ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                24h
              </button>
            </div>
          </div>

          {/* Timezone Selector */}
          <Select value={currentTimezone} onValueChange={handleTimezoneChange}>
            <SelectTrigger className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 z-[60] shadow-lg">
              {timezones.map((tz) => (
                <SelectItem 
                  key={tz.value} 
                  value={tz.value}
                  className="hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer bg-white dark:bg-gray-800"
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
