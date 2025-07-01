
import React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface TimezonePickerProps {
  value: string;
  onChange: (timezone: string) => void;
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

export const TimezonePicker = ({ value, onChange }: TimezonePickerProps) => {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-48">
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
  );
};
