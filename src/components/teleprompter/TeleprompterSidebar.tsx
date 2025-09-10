import React from 'react';
import { RundownItem } from '@/types/rundown';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { ChevronRight } from 'lucide-react';

interface TeleprompterSidebarProps {
  items: (RundownItem & { originalIndex: number })[];
  getRowNumber: (index: number) => string;
  onNavigateToItem: (itemId: string) => void;
}

export function TeleprompterSidebar({ 
  items, 
  getRowNumber, 
  onNavigateToItem 
}: TeleprompterSidebarProps) {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';

  const handleItemClick = (itemId: string) => {
    onNavigateToItem(itemId);
  };

  return (
    <Sidebar
      className={`${collapsed ? 'w-14' : 'w-80'} bg-gray-900 border-r border-gray-700`}
      collapsible="icon"
    >
      {/* Sidebar Toggle */}
      <div className="p-2 border-b border-gray-700">
        <SidebarTrigger className="text-white hover:bg-gray-800" />
      </div>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => {
                const rowNumber = getRowNumber(item.originalIndex);
                const isHeader = item.type === 'header';
                
                // Create display name
                const displayName = isHeader 
                  ? item.name || 'Header'
                  : `${rowNumber ? `${rowNumber}. ` : ''}${item.name || 'Untitled'}`;

                return (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      onClick={() => handleItemClick(item.id)}
                      className={`
                        text-left justify-start w-full
                        ${isHeader 
                          ? 'text-blue-400 font-semibold hover:bg-blue-900/20' 
                          : 'text-gray-300 hover:bg-gray-800'
                        }
                        ${collapsed ? 'px-2' : 'px-3'}
                      `}
                    >
                      {isHeader ? (
                        <ChevronRight className="mr-2 h-4 w-4 flex-shrink-0" />
                      ) : (
                        <div className="mr-2 h-4 w-4 flex-shrink-0 flex items-center justify-center">
                          <div className="w-2 h-2 bg-gray-500 rounded-full" />
                        </div>
                      )}
                      
                      {!collapsed && (
                        <span className="truncate text-sm">
                          {displayName}
                        </span>
                      )}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}