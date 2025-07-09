import React from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export interface FurnitureItem {
  id: string;
  name: string;
  category: string;
  width: number;
  height: number;
  icon: string;
  defaultColor: string;
  rotatable: boolean;
  scalable: boolean;
}

export const FURNITURE_LIBRARY: FurnitureItem[] = [
  // Seating
  {
    id: 'chair-office',
    name: 'Office Chair',
    category: 'seating',
    width: 24,
    height: 24,
    icon: '🪑',
    defaultColor: '#8B4513',
    rotatable: true,
    scalable: true
  },
  {
    id: 'chair-dining',
    name: 'Dining Chair',
    category: 'seating',
    width: 18,
    height: 20,
    icon: '🪑',
    defaultColor: '#D2691E',
    rotatable: true,
    scalable: true
  },
  {
    id: 'sofa-2seat',
    name: '2-Seat Sofa',
    category: 'seating',
    width: 72,
    height: 36,
    icon: '🛋️',
    defaultColor: '#696969',
    rotatable: true,
    scalable: true
  },
  {
    id: 'sofa-3seat',
    name: '3-Seat Sofa',
    category: 'seating',
    width: 84,
    height: 36,
    icon: '🛋️',
    defaultColor: '#696969',
    rotatable: true,
    scalable: true
  },
  {
    id: 'armchair',
    name: 'Armchair',
    category: 'seating',
    width: 36,
    height: 36,
    icon: '🛋️',
    defaultColor: '#8B4513',
    rotatable: true,
    scalable: true
  },
  {
    id: 'bench',
    name: 'Bench',
    category: 'seating',
    width: 48,
    height: 16,
    icon: '🪑',
    defaultColor: '#8B4513',
    rotatable: true,
    scalable: true
  },

  // Tables
  {
    id: 'table-round',
    name: 'Round Table',
    category: 'tables',
    width: 48,
    height: 48,
    icon: '⭕',
    defaultColor: '#8B4513',
    rotatable: false,
    scalable: true
  },
  {
    id: 'table-square',
    name: 'Square Table',
    category: 'tables',
    width: 36,
    height: 36,
    icon: '⬜',
    defaultColor: '#8B4513',
    rotatable: true,
    scalable: true
  },
  {
    id: 'table-rectangular',
    name: 'Rectangular Table',
    category: 'tables',
    width: 72,
    height: 36,
    icon: '▬',
    defaultColor: '#8B4513',
    rotatable: true,
    scalable: true
  },
  {
    id: 'coffee-table',
    name: 'Coffee Table',
    category: 'tables',
    width: 48,
    height: 24,
    icon: '▬',
    defaultColor: '#8B4513',
    rotatable: true,
    scalable: true
  },
  {
    id: 'side-table',
    name: 'Side Table',
    category: 'tables',
    width: 20,
    height: 20,
    icon: '⬜',
    defaultColor: '#8B4513',
    rotatable: false,
    scalable: true
  },
  {
    id: 'desk',
    name: 'Desk',
    category: 'tables',
    width: 60,
    height: 30,
    icon: '▬',
    defaultColor: '#8B4513',
    rotatable: true,
    scalable: true
  },

  // Storage
  {
    id: 'bookshelf',
    name: 'Bookshelf',
    category: 'storage',
    width: 12,
    height: 36,
    icon: '📚',
    defaultColor: '#8B4513',
    rotatable: true,
    scalable: true
  },
  {
    id: 'cabinet',
    name: 'Cabinet',
    category: 'storage',
    width: 24,
    height: 18,
    icon: '🗄️',
    defaultColor: '#8B4513',
    rotatable: true,
    scalable: true
  },
  {
    id: 'dresser',
    name: 'Dresser',
    category: 'storage',
    width: 48,
    height: 20,
    icon: '🗄️',
    defaultColor: '#8B4513',
    rotatable: true,
    scalable: true
  },
  {
    id: 'wardrobe',
    name: 'Wardrobe',
    category: 'storage',
    width: 24,
    height: 48,
    icon: '🚪',
    defaultColor: '#8B4513',
    rotatable: true,
    scalable: true
  },

  // Beds
  {
    id: 'bed-single',
    name: 'Single Bed',
    category: 'beds',
    width: 36,
    height: 75,
    icon: '🛏️',
    defaultColor: '#4169E1',
    rotatable: true,
    scalable: true
  },
  {
    id: 'bed-double',
    name: 'Double Bed',
    category: 'beds',
    width: 54,
    height: 75,
    icon: '🛏️',
    defaultColor: '#4169E1',
    rotatable: true,
    scalable: true
  },
  {
    id: 'bed-king',
    name: 'King Bed',
    category: 'beds',
    width: 72,
    height: 80,
    icon: '🛏️',
    defaultColor: '#4169E1',
    rotatable: true,
    scalable: true
  },

  // Appliances
  {
    id: 'tv',
    name: 'TV',
    category: 'electronics',
    width: 48,
    height: 6,
    icon: '📺',
    defaultColor: '#000000',
    rotatable: true,
    scalable: true
  },
  {
    id: 'refrigerator',
    name: 'Refrigerator',
    category: 'appliances',
    width: 24,
    height: 24,
    icon: '❄️',
    defaultColor: '#FFFFFF',
    rotatable: true,
    scalable: true
  },
  {
    id: 'stove',
    name: 'Stove',
    category: 'appliances',
    width: 30,
    height: 24,
    icon: '🔥',
    defaultColor: '#C0C0C0',
    rotatable: true,
    scalable: true
  },
  {
    id: 'washing-machine',
    name: 'Washing Machine',
    category: 'appliances',
    width: 24,
    height: 24,
    icon: '🌊',
    defaultColor: '#FFFFFF',
    rotatable: true,
    scalable: true
  },

  // Plants & Decor
  {
    id: 'plant',
    name: 'Plant',
    category: 'decor',
    width: 18,
    height: 18,
    icon: '🪴',
    defaultColor: '#228B22',
    rotatable: false,
    scalable: true
  },
  {
    id: 'rug-round',
    name: 'Round Rug',
    category: 'decor',
    width: 60,
    height: 60,
    icon: '🟤',
    defaultColor: '#8B4513',
    rotatable: false,
    scalable: true
  },
  {
    id: 'rug-rectangular',
    name: 'Rectangular Rug',
    category: 'decor',
    width: 72,
    height: 48,
    icon: '🟫',
    defaultColor: '#8B4513',
    rotatable: true,
    scalable: true
  }
];

interface FurnitureLibraryProps {
  onSelectFurniture: (furniture: FurnitureItem) => void;
  selectedTool: string;
}

const FurnitureLibrary: React.FC<FurnitureLibraryProps> = ({ onSelectFurniture, selectedTool }) => {
  const categories = [
    { id: 'seating', name: 'Seating', icon: '🪑' },
    { id: 'tables', name: 'Tables', icon: '🪑' },
    { id: 'storage', name: 'Storage', icon: '🗄️' },
    { id: 'beds', name: 'Beds', icon: '🛏️' },
    { id: 'appliances', name: 'Appliances', icon: '🔌' },
    { id: 'electronics', name: 'Electronics', icon: '📺' },
    { id: 'decor', name: 'Decor', icon: '🪴' }
  ];

  const getFurnitureByCategory = (category: string) => {
    return FURNITURE_LIBRARY.filter(item => item.category === category);
  };

  return (
    <div className="w-full">
      <h3 className="text-sm font-medium text-gray-300 mb-2">Furniture Library</h3>
      <Tabs defaultValue="seating" className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-gray-800 mb-2">
          {categories.slice(0, 3).map(category => (
            <TabsTrigger 
              key={category.id} 
              value={category.id}
              className="text-xs data-[state=active]:bg-blue-600 data-[state=active]:text-white"
            >
              {category.icon}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsList className="grid w-full grid-cols-4 bg-gray-800 mb-2">
          {categories.slice(3).map(category => (
            <TabsTrigger 
              key={category.id} 
              value={category.id}
              className="text-xs data-[state=active]:bg-blue-600 data-[state=active]:text-white"
            >
              {category.icon}
            </TabsTrigger>
          ))}
        </TabsList>

        {categories.map(category => (
          <TabsContent key={category.id} value={category.id} className="mt-2">
            <ScrollArea className="h-32">
              <div className="grid grid-cols-2 gap-1">
                {getFurnitureByCategory(category.id).map(furniture => (
                  <Button
                    key={furniture.id}
                    variant="outline"
                    size="sm"
                    onClick={() => onSelectFurniture(furniture)}
                    className={`flex flex-col items-center gap-1 h-auto py-2 text-xs ${
                      selectedTool === furniture.id 
                        ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                        : 'bg-gray-700 hover:bg-gray-600 text-gray-300 border-gray-600'
                    }`}
                  >
                    <span className="text-lg">{furniture.icon}</span>
                    <span className="text-xs leading-tight text-center">{furniture.name}</span>
                  </Button>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};

export default FurnitureLibrary;