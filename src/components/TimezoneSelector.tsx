
import React, { useState } from 'react';
import { Clock, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface TimezoneSelectorProps {
  currentTimezone: string;
  onTimezoneChange: (timezone: string) => void;
}

const timezones = [
  { value: 'America/New_York', label: 'New York (UTC-5)' },
  { value: 'America/Chicago', label: 'Chicago (UTC-6)' },
  { value: 'America/Denver', label: 'Denver (UTC-7)' },
  { value: 'America/Los_Angeles', label: 'Los Angeles (UTC-8)' },
  { value: 'Europe/London', label: 'London (UTC+0)' },
  { value: 'Europe/Paris', label: 'Paris (UTC+1)' },
  { value: 'Europe/Berlin', label: 'Berlin (UTC+1)' },
  { value: 'Asia/Riyadh', label: 'Riyadh (UTC+3)' },
  { value: 'Asia/Dubai', label: 'Dubai (UTC+4)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (UTC+9)' },
  { value: 'Asia/Shanghai', label: 'Shanghai (UTC+8)' },
  { value: 'Australia/Sydney', label: 'Sydney (UTC+10)' },
  { value: 'UTC', label: 'UTC (UTC+0)' }
];

const TimezoneSelector = ({ currentTimezone, onTimezoneChange }: TimezoneSelectorProps) => {
  const [isOpen, setIsOpen] = useState(false);

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
        className="text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 p-1"
      >
        <Clock className="h-4 w-4 text-gray-900 dark:text-white" />
      </Button>
      
      {isOpen && (
        <div className="absolute top-full right-0 mt-1 z-50">
          <Select value={currentTimezone} onValueChange={handleTimezoneChange}>
            <SelectTrigger className="w-48 bg-white dark:bg-gray-800">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {timezones.map((tz) => (
                <SelectItem key={tz.value} value={tz.value}>
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
