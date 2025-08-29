import * as React from "react";
import { format, parse, isValid } from "date-fns";
import { CalendarIcon, Clock } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface DateTimePickerProps {
  value?: string; // HH:MM:SS format
  onValueChange?: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function DateTimePicker({
  value,
  onValueChange,
  placeholder = "Select date & time",
  className
}: DateTimePickerProps) {
  const [open, setOpen] = React.useState(false);
  const [selectedDate, setSelectedDate] = React.useState<Date>();
  const [timeValue, setTimeValue] = React.useState("00:00");

  // Initialize from existing value
  React.useEffect(() => {
    if (value && value !== "00:00:00") {
      // If we have a time value, use today's date with that time
      const today = new Date();
      const [hours, minutes] = value.split(':').map(Number);
      const dateWithTime = new Date(today);
      dateWithTime.setHours(hours || 0, minutes || 0, 0, 0);
      setSelectedDate(dateWithTime);
      setTimeValue(`${String(hours || 0).padStart(2, '0')}:${String(minutes || 0).padStart(2, '0')}`);
    } else {
      // Default to current date and time
      const now = new Date();
      setSelectedDate(now);
      const currentTime = format(now, 'HH:mm');
      setTimeValue(currentTime);
    }
  }, [value]);

  const handleDateSelect = (date: Date | undefined) => {
    if (!date) return;
    
    // Preserve the current time when date changes
    const [hours, minutes] = timeValue.split(':').map(Number);
    const newDateTime = new Date(date);
    newDateTime.setHours(hours || 0, minutes || 0, 0, 0);
    
    setSelectedDate(newDateTime);
  };

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTimeValue = e.target.value;
    setTimeValue(newTimeValue);
    
    if (selectedDate) {
      // Update the selected date with new time
      const [hours, minutes] = newTimeValue.split(':').map(Number);
      const newDateTime = new Date(selectedDate);
      newDateTime.setHours(hours || 0, minutes || 0, 0, 0);
      setSelectedDate(newDateTime);
    }
  };

  const handleTimeBlur = () => {
    // Format and validate time on blur
    let formattedTime = timeValue.replace(/[^0-9:]/g, '');
    const parts = formattedTime.split(':');
    
    if (parts.length >= 1) {
      let hours = parts[0] || '00';
      if (hours.length === 1) hours = '0' + hours;
      if (parseInt(hours) > 23) hours = '23';
      
      let minutes = parts[1] || '00';
      if (minutes.length === 1) minutes = '0' + minutes;
      if (parseInt(minutes) > 59) minutes = '59';
      
      formattedTime = `${hours}:${minutes}`;
    } else {
      formattedTime = '00:00';
    }
    
    setTimeValue(formattedTime);
    // Convert to HH:MM:SS format for the callback (add :00 seconds)
    onValueChange?.(`${formattedTime}:00`);
  };

  const handleApply = () => {
    // Convert to HH:MM:SS format for the callback (add :00 seconds)
    onValueChange?.(`${timeValue}:00`);
    setOpen(false);
  };

  const displayText = React.useMemo(() => {
    if (!selectedDate) return placeholder;
    
    const dateStr = format(selectedDate, "MMM d");
    return `${dateStr} at ${timeValue}`;
  }, [selectedDate, timeValue, placeholder]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "justify-start text-left font-normal",
            !selectedDate && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {displayText}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="p-3 space-y-3">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={handleDateSelect}
            initialFocus
            className="pointer-events-auto"
          />
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4" />
              <span className="text-sm font-medium">Time</span>
            </div>
            <input
              type="text"
              value={timeValue}
              onChange={handleTimeChange}
              onBlur={handleTimeBlur}
              placeholder="HH:MM"
              className="w-full px-3 py-2 border border-input rounded-md text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="flex justify-end space-x-2 pt-2 border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleApply}
            >
              Apply
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}