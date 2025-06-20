
import React, { useState, useEffect } from 'react';
import { Search, Replace, Check, X, AlertCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { SearchReplaceService } from '@/services/searchReplaceService';
import { SearchReplaceCriteria, SearchReplaceTarget, SearchMatch, SearchReplaceOptions } from '@/types/searchReplace';
import { RundownItem } from '@/types/rundown';

interface SearchReplaceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: RundownItem[];
  selectedItemIds: Set<string>;
  onApplyReplacements: (matches: SearchMatch[]) => void;
}

const DEFAULT_TARGETS: SearchReplaceTarget[] = [
  { fieldKey: 'name', fieldName: 'Segment Name', enabled: true },
  { fieldKey: 'segmentName', fieldName: 'Segment Name (Alt)', enabled: false },
  { fieldKey: 'script', fieldName: 'Script', enabled: true },
  { fieldKey: 'talent', fieldName: 'Talent', enabled: false },
  { fieldKey: 'gfx', fieldName: 'GFX', enabled: false },
  { fieldKey: 'video', fieldName: 'Video', enabled: false },
  { fieldKey: 'images', fieldName: 'Images', enabled: false },
  { fieldKey: 'notes', fieldName: 'Notes', enabled: false }
];

const DEFAULT_OPTIONS: SearchReplaceOptions = {
  caseSensitive: false,
  wholeWordsOnly: false,
  useRegex: false
};

export const SearchReplaceDialog = ({
  open,
  onOpenChange,
  items,
  selectedItemIds,
  onApplyReplacements
}: SearchReplaceDialogProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [replaceTerm, setReplaceTerm] = useState('');
  const [scope, setScope] = useState<'all' | 'selected'>('all');
  const [targets, setTargets] = useState<SearchReplaceTarget[]>(DEFAULT_TARGETS);
  const [options, setOptions] = useState<SearchReplaceOptions>(DEFAULT_OPTIONS);
  const [matches, setMatches] = useState<SearchMatch[]>([]);
  const [selectedMatches, setSelectedMatches] = useState<Set<number>>(new Set());
  const [showPreview, setShowPreview] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const { toast } = useToast();

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (!open) {
      setSearchTerm('');
      setReplaceTerm('');
      setMatches([]);
      setSelectedMatches(new Set());
      setShowPreview(false);
      setScope('all');
    }
  }, [open]);

  // Auto-search when criteria changes
  useEffect(() => {
    if (searchTerm.trim() && showPreview) {
      handleSearch();
    }
  }, [searchTerm, replaceTerm, scope, targets, options, showPreview]);

  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      setMatches([]);
      return;
    }

    setIsSearching(true);
    
    try {
      const criteria: SearchReplaceCriteria = {
        searchTerm,
        replaceTerm,
        options,
        targets,
        scope
      };

      const result = SearchReplaceService.searchAndReplace(
        items,
        criteria,
        selectedItemIds.size > 0 ? selectedItemIds : undefined
      );

      setMatches(result.matches);
      setSelectedMatches(new Set(result.matches.map((_, index) => index)));
      setShowPreview(true);

      if (result.matches.length === 0) {
        toast({
          title: "No matches found",
          description: `No matches found for "${searchTerm}"`,
        });
      }
    } catch (error) {
      console.error('Search error:', error);
      toast({
        title: "Search Error",
        description: "Invalid search pattern or other error occurred",
        variant: "destructive"
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleApplySelected = () => {
    const selectedMatchObjects = matches.filter((_, index) => selectedMatches.has(index));
    
    if (selectedMatchObjects.length === 0) {
      toast({
        title: "No matches selected",
        description: "Please select at least one match to replace",
        variant: "destructive"
      });
      return;
    }

    onApplyReplacements(selectedMatchObjects);
    
    toast({
      title: "Replacements Applied",
      description: `Applied ${selectedMatchObjects.length} replacement${selectedMatchObjects.length > 1 ? 's' : ''}`,
    });

    onOpenChange(false);
  };

  const toggleTarget = (fieldKey: string) => {
    setTargets(targets.map(target => 
      target.fieldKey === fieldKey 
        ? { ...target, enabled: !target.enabled }
        : target
    ));
  };

  const toggleMatchSelection = (index: number) => {
    const newSelected = new Set(selectedMatches);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedMatches(newSelected);
  };

  const toggleAllMatches = () => {
    if (selectedMatches.size === matches.length) {
      setSelectedMatches(new Set());
    } else {
      setSelectedMatches(new Set(matches.map((_, index) => index)));
    }
  };

  const canSearch = searchTerm.trim().length > 0 && targets.some(t => t.enabled);
  const selectedMatchCount = selectedMatches.size;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Search and Replace
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col gap-4">
          {/* Search and Replace Inputs */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="search-term">Search for:</Label>
              <Input
                id="search-term"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Enter search term..."
                className="font-mono"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="replace-term">Replace with:</Label>
              <Input
                id="replace-term"
                value={replaceTerm}
                onChange={(e) => setReplaceTerm(e.target.value)}
                placeholder="Enter replacement..."
                className="font-mono"
              />
            </div>
          </div>

          {/* Options */}
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="case-sensitive"
                checked={options.caseSensitive}
                onCheckedChange={(checked) => 
                  setOptions(prev => ({ ...prev, caseSensitive: checked as boolean }))
                }
              />
              <Label htmlFor="case-sensitive" className="text-sm">Case sensitive</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="whole-words"
                checked={options.wholeWordsOnly}
                onCheckedChange={(checked) => 
                  setOptions(prev => ({ ...prev, wholeWordsOnly: checked as boolean }))
                }
              />
              <Label htmlFor="whole-words" className="text-sm">Whole words only</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="use-regex"
                checked={options.useRegex}
                onCheckedChange={(checked) => 
                  setOptions(prev => ({ ...prev, useRegex: checked as boolean }))
                }
              />
              <Label htmlFor="use-regex" className="text-sm">Use regex</Label>
            </div>
          </div>

          {/* Scope and Fields */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Search scope:</Label>
              <div className="flex gap-2">
                <Button
                  variant={scope === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setScope('all')}
                >
                  All items
                </Button>
                <Button
                  variant={scope === 'selected' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setScope('selected')}
                  disabled={selectedItemIds.size === 0}
                >
                  Selected items ({selectedItemIds.size})
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Search in fields:</Label>
              <div className="flex flex-wrap gap-2">
                {targets.map(target => (
                  <Badge
                    key={target.fieldKey}
                    variant={target.enabled ? 'default' : 'outline'}
                    className="cursor-pointer"
                    onClick={() => toggleTarget(target.fieldKey)}
                  >
                    {target.fieldName}
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          <Separator />

          {/* Search Button */}
          <div className="flex justify-between items-center">
            <Button
              onClick={handleSearch}
              disabled={!canSearch || isSearching}
              className="flex items-center gap-2"
            >
              <Search className="h-4 w-4" />
              {isSearching ? 'Searching...' : 'Search'}
            </Button>

            {matches.length > 0 && (
              <div className="text-sm text-muted-foreground">
                {matches.length} match{matches.length > 1 ? 'es' : ''} found
              </div>
            )}
          </div>

          {/* Results */}
          {showPreview && matches.length > 0 && (
            <>
              <Separator />
              <div className="flex-1 flex flex-col min-h-0">
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={selectedMatches.size === matches.length}
                      onCheckedChange={toggleAllMatches}
                    />
                    <Label className="text-sm">
                      Select all ({selectedMatchCount} of {matches.length})
                    </Label>
                  </div>
                  <Button
                    onClick={handleApplySelected}
                    disabled={selectedMatchCount === 0}
                    className="flex items-center gap-2"
                  >
                    <Replace className="h-4 w-4" />
                    Apply {selectedMatchCount} replacement{selectedMatchCount > 1 ? 's' : ''}
                  </Button>
                </div>

                <ScrollArea className="flex-1">
                  <div className="space-y-2">
                    {matches.map((match, index) => (
                      <div
                        key={`${match.itemId}-${match.fieldKey}-${index}`}
                        className="border rounded p-3 space-y-2"
                      >
                        <div className="flex items-center gap-2">
                          <Checkbox
                            checked={selectedMatches.has(index)}
                            onCheckedChange={() => toggleMatchSelection(index)}
                          />
                          <Badge variant="outline">{match.fieldName}</Badge>
                          <span className="text-sm font-medium">{match.itemName}</span>
                        </div>
                        <div className="text-xs font-mono bg-muted p-2 rounded">
                          <div className="text-red-600">
                            - {match.originalValue}
                          </div>
                          <div className="text-green-600">
                            + {match.previewValue}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
