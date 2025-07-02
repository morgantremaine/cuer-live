
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
  item: any;
  column: any;
  value: any;
  onChange: (value: any) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  onKeyDown?: (event: React.KeyboardEvent) => void;
  isSelected?: boolean;
  isEditing?: boolean;
  cellKey: string;
  cellRefs: React.MutableRefObject<Record<string, HTMLElement>>;
  onNavigate: (direction: 'up' | 'down' | 'left' | 'right') => void;
  isFloating?: boolean;
  color?: string;
  timezone: string;
  rundownStartTime: string;
}

const CellRenderer = React.forwardRef<HTMLElement, CellRendererProps>(({
  item,
  column,
  value,
  onChange,
  onFocus,
  onBlur,
  onKeyDown,
  isSelected,
  isEditing,
  cellKey,
  cellRefs,
  onNavigate,
  isFloating,
  color,
  timezone,
  rundownStartTime
}, ref) => {
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
  const [date, setDate] = React.useState<Date | undefined>(() => {
    if (column.type === 'date') {
      return value ? new Date(value) : undefined;
    }
    return undefined;
  });
  const [open, setOpen] = React.useState(false)

  useEffect(() => {
    if (ref && typeof ref === 'object' && 'current' in ref) {
      cellRefs.current[cellKey] = ref.current as HTMLElement;
    }
  }, [cellKey, cellRefs, ref]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    onChange(e.target.value);
  };

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange(e.target.value);
  };

  const handleCheckboxChange = (checked: boolean) => {
    onChange(checked);
  };

  const handleDateChange = (date: Date | undefined) => {
    setDate(date);
    if (date) {
      const formattedDate = date.toISOString();
      onChange(formattedDate);
    } else {
      onChange(null);
    }
    setOpen(false);
  };

  const getCellClassName = () => {
    let className = 'px-2 py-1 whitespace-nowrap overflow-hidden text-ellipsis focus:outline-none';
    if (isSelected) {
      className += ' bg-blue-100 dark:bg-blue-900';
    }
    if (isEditing) {
      className += ' editing';
    }
    if (isFloating) {
      className += ' italic';
    }
    if (color) {
      className += ` text-${color}-500 dark:text-${color}-400`;
    }
    return className;
  };

  const commonProps = {
    'data-cell-key': cellKey,
    'data-item-id': item.id,
    'data-field': column.id,
    className: getCellClassName(),
    onFocus,
    onBlur,
    onKeyDown,
    ref: ref as any
  };

  if (isEditing) {
    if (column.type === 'text') {
      return (
        <Input
          {...commonProps}
          type="text"
          value={value || ''}
          onChange={handleChange}
        />
      );
    } else if (column.type === 'textarea') {
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
                format(date, "PPP", { timeZone: timezone })
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
    } else if (column.type === 'time') {
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
              {/* Color picker component */}
              <button onClick={() => {
                onChange('red');
                setIsColorPickerOpen(false);
              }}>Red</button>
              <button onClick={() => {
                onChange('blue');
                setIsColorPickerOpen(false);
              }}>Blue</button>
              {/* Add more color options */}
            </div>
          )}
        </div>
      );
    } else if (column.type === 'duration') {
      return (
        <Input
          {...commonProps}
          type="time"
          value={value || ''}
          onChange={handleChange}
        />
      );
    } else if (column.type === 'start-time') {
      return (
        <Input
          {...commonProps}
          type="time"
          value={value || ''}
          onChange={handleChange}
        />
      );
    } else if (column.type === 'end-time') {
      return (
        <Input
          {...commonProps}
          type="time"
          value={value || ''}
          onChange={handleChange}
        />
      );
    } else if (column.type === 'elapsed-time') {
      return (
        <Input
          {...commonProps}
          type="time"
          value={value || ''}
          onChange={handleChange}
        />
      );
    }
  } else {
    return (
      <div {...commonProps}>
        {column.type === 'checkbox' ? (
          <Checkbox
            checked={!!value}
            disabled
          />
        ) : column.type === 'date' ? (
          value ? format(new Date(value), "PPP", { timeZone: timezone }) : ''
        ) : column.type === 'duration' ? (
          value || '00:00'
        ) : column.type === 'start-time' ? (
          value || rundownStartTime
        ) : column.type === 'end-time' ? (
          value || '00:00'
        ) : column.type === 'elapsed-time' ? (
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

