
import React, { useState, useCallback } from 'react';
import { Search, Replace } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';

interface FindReplaceDialogProps {
  isOpen: boolean;
  onClose: () => void;
  items: any[];
  onUpdateItem: (id: string, field: string, value: string) => void;
}

const FindReplaceDialog = ({ isOpen, onClose, items, onUpdateItem }: FindReplaceDialogProps) => {
  const [findText, setFindText] = useState('');
  const [replaceText, setReplaceText] = useState('');
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [selectedFields, setSelectedFields] = useState({
    name: true,
    script: true,
    notes: true,
    talent: false,
    gfx: false,
    video: false,
    images: false
  });

  const searchableFields = [
    { key: 'name', label: 'Segment Name' },
    { key: 'script', label: 'Script' },
    { key: 'notes', label: 'Notes' },
    { key: 'talent', label: 'Talent' },
    { key: 'gfx', label: 'GFX' },
    { key: 'video', label: 'Video' },
    { key: 'images', label: 'Images' }
  ];

  const handleCaseSensitiveChange = (checked: boolean | "indeterminate") => {
    setCaseSensitive(checked === true);
  };

  const handleFieldToggle = (fieldKey: string, checked: boolean | "indeterminate") => {
    setSelectedFields(prev => ({
      ...prev,
      [fieldKey]: checked === true
    }));
  };

  const performReplace = useCallback(() => {
    if (!findText.trim()) return;

    let replacementCount = 0;
    const searchRegex = new RegExp(
      findText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
      caseSensitive ? 'g' : 'gi'
    );

    items.forEach(item => {
      searchableFields.forEach(field => {
        if (!selectedFields[field.key]) return;
        
        const currentValue = item[field.key] || '';
        if (typeof currentValue === 'string' && searchRegex.test(currentValue)) {
          const newValue = currentValue.replace(searchRegex, replaceText);
          if (newValue !== currentValue) {
            onUpdateItem(item.id, field.key, newValue);
            replacementCount++;
          }
        }
      });
    });

    if (replacementCount > 0) {
      console.log(`Find and Replace: Made ${replacementCount} replacements`);
    }
    
    onClose();
  }, [findText, replaceText, caseSensitive, selectedFields, items, onUpdateItem, onClose]);

  const handleClose = () => {
    setFindText('');
    setReplaceText('');
    setCaseSensitive(false);
    setSelectedFields({
      name: true,
      script: true,
      notes: true,
      talent: false,
      gfx: false,
      video: false,
      images: false
    });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Find and Replace
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="find-text">Find</Label>
            <Input
              id="find-text"
              value={findText}
              onChange={(e) => setFindText(e.target.value)}
              placeholder="Enter text to find..."
              autoFocus
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="replace-text">Replace with</Label>
            <Input
              id="replace-text"
              value={replaceText}
              onChange={(e) => setReplaceText(e.target.value)}
              placeholder="Enter replacement text..."
            />
          </div>
          
          <div className="flex items-center space-x-2">
            <Checkbox
              id="case-sensitive"
              checked={caseSensitive}
              onCheckedChange={handleCaseSensitiveChange}
            />
            <Label htmlFor="case-sensitive">Case sensitive</Label>
          </div>
          
          <div className="space-y-2">
            <Label>Search in fields:</Label>
            <div className="grid grid-cols-2 gap-2">
              {searchableFields.map(field => (
                <div key={field.key} className="flex items-center space-x-2">
                  <Checkbox
                    id={field.key}
                    checked={selectedFields[field.key]}
                    onCheckedChange={(checked) => handleFieldToggle(field.key, checked)}
                  />
                  <Label htmlFor={field.key} className="text-sm">
                    {field.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>
          
          <div className="flex gap-2 pt-4">
            <Button onClick={handleClose} variant="outline" className="flex-1">
              Cancel
            </Button>
            <Button 
              onClick={performReplace} 
              disabled={!findText.trim()}
              className="flex-1 flex items-center gap-2"
            >
              <Replace className="h-4 w-4" />
              Replace All
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FindReplaceDialog;
