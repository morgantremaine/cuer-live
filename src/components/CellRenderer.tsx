
import React, { useState, useEffect, useRef } from 'react';
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { format } from 'date-fns-tz';
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command"

interface CellRendererProps {
  column: any;
  item: any;
  cellRefs: React.MutableRefObject<{ [key: string]: HTMLInputElement | HTMLTextAreaElement }>;
  textColor?: string;
  backgroundColor?: string;
  currentSegmentId?: string | null;
  onUpdateItem: (id: string, field: string, value: string) => void;
  onCellClick: (itemId: string, field: string) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  width: string;
}

const CellRenderer = React.forwardRef<HTMLElement, CellRendererProps>(({
  item,
  column,
  cellRefs,
  textColor,
  backgroundColor,
  currentSegmentId,
  onUpdateItem,
  onCellClick,
  onKeyDown,
  width
}, ref) => {
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
  const [date, setDate] = React.useState<Date | undefined>(() => {
    if (column.type === 'date') {
      const value = item[column.key];
      return value ? new Date(value) : undefined;
    }
    return undefined;
  });
  const [open, setOpen] = React.useState(false)

  const cellKey = `${item.id}-${column.key}`;
  const value = item[column.key];

  useEffect(() => {
    if (ref && typeof ref === 'object' && 'current' in ref && ref.current) {
      // Only assign if the ref is actually an input or textarea element
      const element = ref.current;
      if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
        cellRefs.current[cellKey] = element;
      }
    }
  }, [cellKey, cellRefs, ref]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    onUpdateItem(item.id, column.key, e.target.value);
  };

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onUpdateItem(item.id, column.key, e.target.value);
  };

  const handleCheckboxChange = (checked: boolean) => {
    onUpdateItem(item.id, column.key, checked.toString());
  };

  const handleDateChange = (date: Date | undefined) => {
    setDate(date);
    if (date) {
      const formattedDate = date.toISOString();
      onUpdateItem(item.id, column.key, formattedDate);
    } else {
      onUpdateItem(item.id, column.key, '');
    }
    setOpen(false);
  };

  const handleCellClick = () => {
    onCellClick(item.id, column.key);
  };

  const commonProps = {
    'data-cell-key': cellKey,
    'data-item-id': item.id,
    'data-field': column.key,
    className: 'px-2 py-1 whitespace-nowrap overflow-hidden text-ellipsis focus:outline-none',
    onClick: handleCellClick,
    onKeyDown,
    ref: ref as any,
    style: { color: textColor }
  };

  // For editing mode - show input controls
  if (column.type === 'text' || column.type === 'segmentName' || column.type === 'name') {
    return (
      <Input
        {...commonProps}
        type="text"
        value={value || ''}
        onChange={handleChange}
      />
    );
  } else if (column.type === 'textarea' || column.type === 'script' || column.type === 'notes') {
    return (
      <Textarea
        {...commonProps}
        value={value || ''}
        onChange={handleChange}
      />
    );
  } else if (column.type === 'number') {
    return (
      <Input
        {...commonProps}
        type="number"
        value={value || ''}
        onChange={handleChange}
      />
    );
  } else if (column.type === 'checkbox') {
    return (
      <Checkbox
        checked={!!value}
        onCheckedChange={handleCheckboxChange}
      />
    );
  } else if (column.type === 'date') {
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant={"ghost"}
            className={cn(
              "pl-3.5 pr-2 text-left font-normal text-black dark:text-white",
              !date && "text-muted-foreground",
            )}
          >
            {date ? (
              format(date, "PPP", { timeZone: 'UTC' })
            ) : (
              <span>Pick a date</span>
            )}
            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start" side="bottom">
          <Calendar
            mode="single"
            selected={date}
            onSelect={handleDateChange}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    )
  } else if (column.type === 'time' || column.type === 'duration' || column.type === 'startTime' || column.type === 'endTime' || column.type === 'elapsedTime') {
    return (
      <Input
        {...commonProps}
        type="time"
        value={value || ''}
        onChange={handleChange}
      />
    );
  } else if (column.type === 'select') {
    return (
      <select
        {...commonProps}
        value={value || ''}
        onChange={handleSelectChange}
      >
        {column.options && column.options.map((option: any) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
    );
  } else if (column.type === 'color') {
    return (
      <div>
        <button onClick={() => setIsColorPickerOpen(!isColorPickerOpen)}>
          {value || 'Pick a color'}
        </button>
        {isColorPickerOpen && (
          <div>
            <button onClick={() => {
              onUpdateItem(item.id, column.key, 'red');
              setIsColorPickerOpen(false);
            }}>Red</button>
            <button onClick={() => {
              onUpdateItem(item.id, column.key, 'blue');
              setIsColorPickerOpen(false);
            }}>Blue</button>
          </div>
        )}
      </div>
    );
  } else {
    // Display mode - show formatted values
    return (
      <div {...commonProps}>
        {column.type === 'checkbox' ? (
          <Checkbox
            checked={!!value}
            disabled
          />
        ) : column.type === 'date' ? (
          value ? format(new Date(value), "PPP", { timeZone: 'UTC' }) : ''
        ) : column.type === 'duration' ? (
          value || '00:00'
        ) : column.type === 'startTime' ? (
          value || '00:00'
        ) : column.type === 'endTime' ? (
          value || '00:00'
        ) : column.type === 'elapsedTime' ? (
          value || '00:00'
        ) : (
          value
        )}
      </div>
    );
  }
});

CellRenderer.displayName = 'CellRenderer';
export default CellRenderer;
