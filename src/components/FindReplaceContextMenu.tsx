
import React from 'react';
import { Search, ChevronUp, ChevronDown, Replace, ReplaceAll, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';

interface FindReplaceContextMenuProps {
  children: React.ReactNode;
  isOpen: boolean;
  searchTerm: string;
  replaceTerm: string;
  caseSensitive: boolean;
  totalMatches: number;
  currentMatchIndex: number;
  hasMatches: boolean;
  onSearchChange: (value: string) => void;
  onReplaceChange: (value: string) => void;
  onCaseSensitiveChange: (checked: boolean) => void;
  onNext: () => void;
  onPrevious: () => void;
  onReplaceCurrent: () => void;
  onReplaceAll: () => void;
  onClose: () => void;
}

const FindReplaceContextMenu = ({
  children,
  isOpen,
  searchTerm,
  replaceTerm,
  caseSensitive,
  totalMatches,
  currentMatchIndex,
  hasMatches,
  onSearchChange,
  onReplaceChange,
  onCaseSensitiveChange,
  onNext,
  onPrevious,
  onReplaceCurrent,
  onReplaceAll,
  onClose
}: FindReplaceContextMenuProps) => {
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        {children}
      </ContextMenuTrigger>
      {isOpen && (
        <ContextMenuContent 
          className="w-80 p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg z-50"
          onEscapeKeyDown={onClose}
        >
          <div className="space-y-3">
            {/* Header */}
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-gray-900 dark:text-white">Find & Replace</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="h-6 w-6 p-0 text-gray-400 hover:text-gray-600"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>

            {/* Search Input */}
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <div className="flex-1 relative">
                  <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-gray-400" />
                  <Input
                    placeholder="Find..."
                    value={searchTerm}
                    onChange={(e) => onSearchChange(e.target.value)}
                    className="pl-7 h-8 text-sm"
                    autoFocus
                  />
                </div>
                <div className="flex items-center space-x-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onPrevious}
                    disabled={!hasMatches}
                    className="h-6 w-6 p-0"
                  >
                    <ChevronUp className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onNext}
                    disabled={!hasMatches}
                    className="h-6 w-6 p-0"
                  >
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                </div>
              </div>

              {/* Match Counter */}
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {searchTerm && (
                  totalMatches > 0 
                    ? `${currentMatchIndex} of ${totalMatches} matches`
                    : 'No matches found'
                )}
              </div>
            </div>

            {/* Replace Input */}
            <div className="flex items-center space-x-2">
              <Input
                placeholder="Replace with..."
                value={replaceTerm}
                onChange={(e) => onReplaceChange(e.target.value)}
                className="flex-1 h-8 text-sm"
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={onReplaceCurrent}
                disabled={!hasMatches || !replaceTerm}
                className="h-6 w-6 p-0"
                title="Replace current"
              >
                <Replace className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onReplaceAll}
                disabled={!hasMatches || !replaceTerm}
                className="h-6 w-6 p-0"
                title="Replace all"
              >
                <ReplaceAll className="h-3 w-3" />
              </Button>
            </div>

            {/* Options */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="case-sensitive"
                checked={caseSensitive}
                onCheckedChange={onCaseSensitiveChange}
                className="h-3 w-3"
              />
              <label 
                htmlFor="case-sensitive" 
                className="text-xs text-gray-600 dark:text-gray-300 cursor-pointer"
              >
                Case sensitive
              </label>
            </div>
          </div>
        </ContextMenuContent>
      )}
    </ContextMenu>
  );
};

export default FindReplaceContextMenu;
