
import React from 'react';
import { Button } from '@/components/ui/button';
import { FileText, Menu, Save, Download, Upload, Settings } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';
import { TimezoneSelector } from './TimezoneSelector';

interface RundownHeaderProps {
  onSave: () => void;
  onExport: () => void;
  onImport: () => void;
  onToggleSidebar: () => void;
  onOpenSettings: () => void;
  title: string;
  onTitleChange: (title: string) => void;
  isModified: boolean;
}

const RundownHeader: React.FC<RundownHeaderProps> = ({
  onSave,
  onExport,
  onImport,
  onToggleSidebar,
  onOpenSettings,
  title,
  onTitleChange,
  isModified
}) => {
  return (
    <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="sm" onClick={onToggleSidebar}>
            <Menu className="h-4 w-4" />
          </Button>
          
          <div className="flex items-center space-x-3">
            <FileText className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            <div className="flex flex-col">
              <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Cuer</h1>
              <input
                type="text"
                value={title}
                onChange={(e) => onTitleChange(e.target.value)}
                className="text-sm text-gray-600 dark:text-gray-300 bg-transparent border-none outline-none focus:ring-0 p-0 w-full"
                placeholder="Untitled Rundown"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <TimezoneSelector />
          <ThemeToggle />
          
          <div className="h-6 w-px bg-gray-200 dark:bg-gray-600" />
          
          <Button variant="ghost" size="sm" onClick={onImport}>
            <Upload className="h-4 w-4" />
          </Button>
          
          <Button variant="ghost" size="sm" onClick={onExport}>
            <Download className="h-4 w-4" />
          </Button>
          
          <Button variant="ghost" size="sm" onClick={onOpenSettings}>
            <Settings className="h-4 w-4" />
          </Button>
          
          <Button 
            onClick={onSave} 
            size="sm"
            className={isModified ? 'bg-blue-600 hover:bg-blue-700' : ''}
          >
            <Save className="h-4 w-4 mr-2" />
            Save
          </Button>
        </div>
      </div>
    </div>
  );
};

export default RundownHeader;
