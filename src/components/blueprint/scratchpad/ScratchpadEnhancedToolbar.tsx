
import React from 'react';
import { Button } from '@/components/ui/button';
import { 
  Bold, 
  Italic, 
  Underline,
  Strikethrough,
  List, 
  ListOrdered,
  CheckSquare,
  Link,
  Code,
  Table,
  Heading1,
  Heading2,
  Heading3,
  TableProperties
} from 'lucide-react';

interface ScratchpadEnhancedToolbarProps {
  isEditing: boolean;
  mode: 'text' | 'table' | 'hybrid';
  onToggleEdit: () => void;
  onToggleMode: () => void;
  onFormatAction: (action: string, data?: any) => void;
}

const ScratchpadEnhancedToolbar = ({
  isEditing,
  mode,
  onToggleEdit,
  onToggleMode,
  onFormatAction
}: ScratchpadEnhancedToolbarProps) => {
  const buttonClass = "p-2 bg-gray-700 border-gray-600 text-white hover:bg-gray-600";

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {isEditing && mode === 'text' && (
        <>
          {/* Text formatting */}
          <div className="flex items-center gap-1 border-r border-gray-600 pr-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onFormatAction('bold')}
              className={buttonClass}
              title="Bold"
            >
              <Bold className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onFormatAction('italic')}
              className={buttonClass}
              title="Italic"
            >
              <Italic className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onFormatAction('underline')}
              className={buttonClass}
              title="Underline"
            >
              <Underline className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onFormatAction('strikethrough')}
              className={buttonClass}
              title="Strikethrough"
            >
              <Strikethrough className="h-4 w-4" />
            </Button>
          </div>

          {/* Headers */}
          <div className="flex items-center gap-1 border-r border-gray-600 pr-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onFormatAction('header', 1)}
              className={buttonClass}
              title="Header 1"
            >
              <Heading1 className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onFormatAction('header', 2)}
              className={buttonClass}
              title="Header 2"
            >
              <Heading2 className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onFormatAction('header', 3)}
              className={buttonClass}
              title="Header 3"
            >
              <Heading3 className="h-4 w-4" />
            </Button>
          </div>

          {/* Lists and elements */}
          <div className="flex items-center gap-1 border-r border-gray-600 pr-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onFormatAction('bulletList')}
              className={buttonClass}
              title="Bullet List"
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onFormatAction('numberedList')}
              className={buttonClass}
              title="Numbered List"
            >
              <ListOrdered className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onFormatAction('checkbox')}
              className={buttonClass}
              title="Checkbox"
            >
              <CheckSquare className="h-4 w-4" />
            </Button>
          </div>

          {/* Special elements */}
          <div className="flex items-center gap-1 border-r border-gray-600 pr-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onFormatAction('link')}
              className={buttonClass}
              title="Insert Link"
            >
              <Link className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onFormatAction('codeBlock')}
              className={buttonClass}
              title="Code Block"
            >
              <Code className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onFormatAction('table')}
              className={buttonClass}
              title="Insert Table"
            >
              <Table className="h-4 w-4" />
            </Button>
          </div>
        </>
      )}

      {/* Mode toggle */}
      <Button
        variant="outline"
        size="sm"
        onClick={onToggleMode}
        className={buttonClass}
        title="Toggle Table Mode"
      >
        <TableProperties className="h-4 w-4" />
        <span className="ml-1 text-xs">{mode === 'text' ? 'Table' : 'Text'}</span>
      </Button>

      <Button
        variant={isEditing ? "default" : "outline"}
        size="sm"
        onClick={onToggleEdit}
        className={isEditing ? "" : buttonClass}
      >
        {isEditing ? 'Done' : 'Edit'}
      </Button>
    </div>
  );
};

export default ScratchpadEnhancedToolbar;
