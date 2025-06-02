
import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Settings, Save, Archive, Trash2 } from 'lucide-react';
import TimezoneSelector from './TimezoneSelector';
import IconPicker from './IconPicker';
import IconDisplay from './IconDisplay';

interface RundownHeaderProps {
  rundownTitle: string;
  setRundownTitle: (title: string) => void;
  rundownStartTime: string;
  setRundownStartTime: (time: string) => void;
  rundownIcon: string;
  setRundownIcon: (icon: string) => void;
  timezone: string;
  setTimezone: (timezone: string) => void;
  onTimezoneChange: (timezone: string) => void;
  currentTime: Date;
  onShowColumnManager: () => void;
  hasUnsavedChanges: boolean;
  isSaving: boolean;
  onSave?: () => void;
  onArchive?: () => void;
  onDelete?: () => void;
  isExistingRundown?: boolean;
}

const RundownHeader = ({
  rundownTitle,
  setRundownTitle,
  rundownStartTime,
  setRundownStartTime,
  rundownIcon,
  setRundownIcon,
  timezone,
  setTimezone,
  onTimezoneChange,
  currentTime,
  onShowColumnManager,
  hasUnsavedChanges,
  isSaving,
  onSave,
  onArchive,
  onDelete,
  isExistingRundown = false
}: RundownHeaderProps) => {
  const formatTime = (time: Date, tz: string) => {
    try {
      return time.toLocaleTimeString('en-US', { 
        hour12: false,
        timeZone: tz
      });
    } catch {
      return time.toLocaleTimeString('en-US', { hour12: false });
    }
  };

  return (
    <Card className="mb-6 bg-gray-800 border-gray-700">
      <CardContent className="p-6">
        {/* Top Row - Title and Icon */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex items-center gap-2">
            <IconPicker
              selectedIcon={rundownIcon}
              onIconSelect={setRundownIcon}
            />
            <IconDisplay 
              iconName={rundownIcon} 
              size="md" 
              className="text-gray-300" 
            />
          </div>
          <div className="flex-1">
            <Input
              value={rundownTitle}
              onChange={(e) => setRundownTitle(e.target.value)}
              className="text-xl font-bold bg-transparent border-none text-white p-0 h-auto focus-visible:ring-0"
              placeholder="Rundown Title"
            />
          </div>
          <div className="flex items-center gap-2">
            {hasUnsavedChanges && (
              <span className="text-sm text-yellow-400">
                {isSaving ? 'Saving...' : 'Unsaved changes'}
              </span>
            )}
            {onSave && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={onSave}
                className="border-gray-600 text-gray-300 hover:bg-gray-700"
                disabled={isSaving}
              >
                <Save className="h-4 w-4 mr-1" />
                Save
              </Button>
            )}
            {isExistingRundown && onArchive && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={onArchive}
                className="border-gray-600 text-gray-300 hover:bg-gray-700"
              >
                <Archive className="h-4 w-4 mr-1" />
                Archive
              </Button>
            )}
            {isExistingRundown && onDelete && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={onDelete}
                className="border-red-600 text-red-400 hover:bg-red-900/50"
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Delete
              </Button>
            )}
          </div>
        </div>

        {/* Bottom Row - Time and Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Label htmlFor="start-time" className="text-sm text-gray-400">
                Start Time:
              </Label>
              <Input
                id="start-time"
                type="time"
                value={rundownStartTime}
                onChange={(e) => setRundownStartTime(e.target.value)}
                className="w-auto bg-gray-700 border-gray-600 text-white"
              />
            </div>
            
            <TimezoneSelector
              currentTimezone={timezone}
              onTimezoneChange={onTimezoneChange}
            />
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right text-sm text-gray-400">
              <div className="font-mono">
                {formatTime(currentTime, timezone)} {timezone.replace('_', ' ')}
              </div>
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={onShowColumnManager}
              className="border-gray-600 text-gray-300 hover:bg-gray-700"
            >
              <Settings className="h-4 w-4 mr-1" />
              Columns
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default RundownHeader;
