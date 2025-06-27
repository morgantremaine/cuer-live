
import React from 'react';
import { useParams } from 'react-router-dom';
import RundownIndexContent from '@/components/RundownIndexContent';
import { FindReplaceDialog } from '@/components/FindReplaceDialog';
import { Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useFindReplace } from '@/hooks/useFindReplace';
import { useRundownItems } from '@/hooks/useRundownItems';

const Index = () => {
  const { id } = useParams();
  
  // Get rundown items for find/replace functionality
  const { items, updateItem } = useRundownItems(id);

  // Initialize find/replace functionality
  const findReplace = useFindReplace({
    items,
    onUpdateItem: updateItem,
    onJumpToItem: (itemId: string) => {
      // Scroll to the item
      const element = document.querySelector(`[data-item-id="${itemId}"]`);
      if (element) {
        element.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center' 
        });
      }
    }
  });

  return (
    <div className="h-screen flex flex-col">
      {/* Find & Replace Toolbar */}
      <div className="flex items-center justify-end p-2 border-b border-border bg-background">
        <FindReplaceDialog
          searchTerm={findReplace.searchTerm}
          replaceTerm={findReplace.replaceTerm}
          caseSensitive={findReplace.caseSensitive}
          currentMatchIndex={findReplace.currentMatchIndex}
          matchCount={findReplace.matchCount}
          onSearchTermChange={findReplace.setSearchTerm}
          onReplaceTermChange={findReplace.setReplaceTerm}
          onCaseSensitiveChange={findReplace.setCaseSensitive}
          onNextMatch={findReplace.nextMatch}
          onPreviousMatch={findReplace.previousMatch}
          onReplaceCurrent={findReplace.replaceCurrent}
          onReplaceAll={findReplace.replaceAll}
          onReset={findReplace.reset}
          trigger={
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              title="Find & Replace"
            >
              <Search className="h-4 w-4" />
            </Button>
          }
        />
      </div>

      {/* Main Content */}
      <div className="flex-1">
        <RundownIndexContent 
          rundownId={id}
          searchTerm={findReplace.searchTerm}
          caseSensitive={findReplace.caseSensitive}
          currentMatchIndex={findReplace.currentMatchIndex}
          matchCount={findReplace.matchCount}
          matches={findReplace.matches}
        />
      </div>
    </div>
  );
};

export default Index;
