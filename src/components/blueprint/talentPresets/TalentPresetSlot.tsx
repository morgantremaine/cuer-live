import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { X, Check, Ban } from 'lucide-react';

interface TalentPresetSlotProps {
  slot: number;
  name?: string;
  color?: string;
  onUpdate: (name: string, color?: string) => void;
  onClear: () => void;
}

const DEFAULT_COLORS = [
  '#ffffff', // white (default badge style)
  '#ef4444', // red
  '#f97316', // orange
  '#f59e0b', // amber
  '#84cc16', // lime
  '#22c55e', // green
  '#06b6d4', // cyan
  '#3b82f6', // blue
  '#8b5cf6', // violet
  '#ec4899', // pink
];

export const TalentPresetSlot = ({ slot, name, color, onUpdate, onClear }: TalentPresetSlotProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(name || '');
  const [editColor, setEditColor] = useState<string | undefined>(color);
  const [showColorPicker, setShowColorPicker] = useState(false);
  
  const isMac = typeof navigator !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  const modifierKey = isMac ? '⌃' : 'Alt+';

  // Reset local state when props change (e.g., when slot is cleared)
  useEffect(() => {
    setEditName(name || '');
    setEditColor(color);
  }, [name, color, slot]);

  const handleSave = () => {
    // Don't save if color picker is open - user is still editing
    if (showColorPicker) return;
    
    if (editName.trim()) {
      onUpdate(editName.trim(), editColor);
      setIsEditing(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      setEditName(name || '');
      setEditColor(color);
      setIsEditing(false);
    }
  };

  if (!name && !isEditing) {
    return (
      <div 
        className="group relative h-12 border border-dashed border-border rounded-md flex items-center justify-center cursor-pointer hover:border-primary/50 hover:bg-accent/5 transition-colors"
        onClick={() => {
          // Reset to fresh state when adding new - default to no color
          setEditName('');
          setEditColor(undefined);
          setIsEditing(true);
        }}
      >
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <kbd className="px-1.5 py-0.5 text-xs font-mono bg-muted rounded">{modifierKey}{slot}</kbd>
          <span className="text-xs">Click to add preset</span>
        </div>
      </div>
    );
  }

  if (isEditing) {
    return (
      <div className="h-12 border border-primary rounded-md flex items-center gap-2 px-3 bg-accent/5">
        <kbd className="px-1.5 py-0.5 text-xs font-mono bg-muted rounded shrink-0">{modifierKey}{slot}</kbd>

        <Input
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          placeholder="Text to insert"
          className="h-8 flex-1 text-sm min-w-0"
          autoFocus
        />
        
        {/* Color picker - always visible, no color = plain text */}
        <Popover open={showColorPicker} onOpenChange={setShowColorPicker}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className={`w-7 h-7 rounded-full shrink-0 border-2 hover:scale-110 transition-transform flex items-center justify-center ${
                editColor ? 'border-border' : 'border-muted-foreground/40 bg-background'
              }`}
              style={editColor ? { backgroundColor: editColor } : undefined}
              onMouseDown={(e) => e.preventDefault()}
              title={editColor ? 'Change color (styled badge)' : 'Add color (plain text)'}
            >
              {!editColor && (
                <Ban className="h-4 w-4 text-muted-foreground/60" />
              )}
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-3" align="end">
            <div className="grid grid-cols-5 gap-2">
              {/* No color option */}
              <button
                type="button"
                className={`w-6 h-6 rounded-full transition-transform hover:scale-110 border-2 flex items-center justify-center ${
                  !editColor ? 'ring-2 ring-primary ring-offset-2 border-primary' : 'border-muted-foreground/40'
                }`}
                onClick={() => {
                  setEditColor(undefined);
                  setShowColorPicker(false);
                }}
                title="No color (plain text)"
              >
                <Ban className="h-3.5 w-3.5 text-muted-foreground/60" />
              </button>
              {DEFAULT_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`w-6 h-6 rounded-full transition-transform hover:scale-110 ${
                    editColor === c ? 'ring-2 ring-primary ring-offset-2' : ''
                  } ${c === '#ffffff' ? 'border border-border' : ''}`}
                  style={{ backgroundColor: c }}
                  onClick={() => {
                    setEditColor(c);
                    setShowColorPicker(false);
                  }}
                />
              ))}
            </div>
          </PopoverContent>
        </Popover>
        
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0 shrink-0 text-green-500 hover:text-green-600 hover:bg-green-500/10"
          onClick={handleSave}
          disabled={!editName.trim()}
        >
          <Check className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div 
      className="group relative h-12 border border-border rounded-md flex items-center gap-2 px-3 hover:border-primary/50 transition-colors cursor-pointer"
      onClick={() => setIsEditing(true)}
    >
      <kbd className="px-1.5 py-0.5 text-xs font-mono bg-muted rounded shrink-0">{modifierKey}{slot}</kbd>
      
      {/* Display indicator - colored dot or no-color icon */}
      {color ? (
        <div 
          className="w-3 h-3 rounded-full shrink-0"
          style={{ backgroundColor: color }}
        />
      ) : (
        <Ban className="w-3.5 h-3.5 text-muted-foreground/60 shrink-0" />
      )}
      
      <span className="text-sm font-medium flex-1 truncate">{name}</span>
      <Button
        variant="ghost"
        size="sm"
        className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={(e) => {
          e.stopPropagation();
          onClear();
        }}
      >
        <X className="h-3 w-3" />
      </Button>
    </div>
  );
};
