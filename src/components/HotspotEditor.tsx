import React, { useState, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trash2, Edit3, Save, Plus } from 'lucide-react';

interface Hotspot {
  id: string;
  title: string;
  description: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface HotspotEditorProps {
  src: string;
  alt: string;
  initialHotspots?: Hotspot[];
  onSave: (hotspots: Hotspot[]) => void;
}

const HotspotEditor = ({ src, alt, initialHotspots = [], onSave }: HotspotEditorProps) => {
  const [hotspots, setHotspots] = useState<Hotspot[]>(initialHotspots);
  const [selectedHotspot, setSelectedHotspot] = useState<string | null>(null);
  const [editingHotspot, setEditingHotspot] = useState<string | null>(null);
  const [isPlacingNew, setIsPlacingNew] = useState(false);
  const [dragState, setDragState] = useState<{
    isDragging: boolean;
    dragType: 'move' | 'resize-se' | 'resize-sw' | 'resize-ne' | 'resize-nw' | null;
    startX: number;
    startY: number;
    startHotspot: Hotspot | null;
  }>({
    isDragging: false,
    dragType: null,
    startX: 0,
    startY: 0,
    startHotspot: null
  });

  const containerRef = useRef<HTMLDivElement>(null);

  const getRelativeCoordinates = (e: React.MouseEvent) => {
    if (!containerRef.current) return { x: 0, y: 0 };
    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    return { x, y };
  };

  const handleImageClick = (e: React.MouseEvent) => {
    if (!isPlacingNew) return;
    
    const { x, y } = getRelativeCoordinates(e);
    const newHotspot: Hotspot = {
      id: `hotspot-${Date.now()}`,
      title: 'New Feature',
      description: 'Describe this feature...',
      x: Math.max(0, Math.min(90, x - 5)),
      y: Math.max(0, Math.min(90, y - 5)),
      width: 10,
      height: 10
    };
    
    setHotspots([...hotspots, newHotspot]);
    setSelectedHotspot(newHotspot.id);
    setEditingHotspot(newHotspot.id);
    setIsPlacingNew(false);
  };

  const handleMouseDown = (e: React.MouseEvent, hotspotId: string, dragType: 'move' | 'resize-se' | 'resize-sw' | 'resize-ne' | 'resize-nw') => {
    e.stopPropagation();
    const { x, y } = getRelativeCoordinates(e);
    const hotspot = hotspots.find(h => h.id === hotspotId);
    
    setDragState({
      isDragging: true,
      dragType,
      startX: x,
      startY: y,
      startHotspot: hotspot || null
    });
    setSelectedHotspot(hotspotId);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragState.isDragging || !dragState.startHotspot) return;
    
    const { x, y } = getRelativeCoordinates(e);
    const deltaX = x - dragState.startX;
    const deltaY = y - dragState.startY;
    
    setHotspots(hotspots.map(hotspot => {
      if (hotspot.id !== dragState.startHotspot!.id) return hotspot;
      
      if (dragState.dragType === 'move') {
        return {
          ...hotspot,
          x: Math.max(0, Math.min(100 - hotspot.width, dragState.startHotspot!.x + deltaX)),
          y: Math.max(0, Math.min(100 - hotspot.height, dragState.startHotspot!.y + deltaY))
        };
      }
      
      // Handle resize
      const newHotspot = { ...hotspot };
      if (dragState.dragType === 'resize-se') {
        newHotspot.width = Math.max(5, Math.min(100 - hotspot.x, dragState.startHotspot!.width + deltaX));
        newHotspot.height = Math.max(5, Math.min(100 - hotspot.y, dragState.startHotspot!.height + deltaY));
      }
      
      return newHotspot;
    }));
  };

  const handleMouseUp = () => {
    setDragState({
      isDragging: false,
      dragType: null,
      startX: 0,
      startY: 0,
      startHotspot: null
    });
  };

  const updateHotspot = (id: string, updates: Partial<Hotspot>) => {
    setHotspots(hotspots.map(h => h.id === id ? { ...h, ...updates } : h));
  };

  const deleteHotspot = (id: string) => {
    setHotspots(hotspots.filter(h => h.id !== id));
    setSelectedHotspot(null);
    setEditingHotspot(null);
  };

  const selectedHotspotData = hotspots.find(h => h.id === selectedHotspot);

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        <Button 
          onClick={() => setIsPlacingNew(!isPlacingNew)}
          variant={isPlacingNew ? "default" : "outline"}
          size="sm"
        >
          <Plus className="w-4 h-4 mr-2" />
          {isPlacingNew ? 'Click image to place' : 'Add Hotspot'}
        </Button>
        <Button onClick={() => onSave(hotspots)} size="sm">
          <Save className="w-4 h-4 mr-2" />
          Save Hotspots
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <div 
            ref={containerRef}
            className="relative inline-block w-full cursor-crosshair"
            onClick={handleImageClick}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
          >
            <img 
              src={src} 
              alt={alt}
              className="w-full h-auto rounded-lg shadow-2xl"
              draggable={false}
            />
            
            {/* Hotspot overlays */}
            {hotspots.map((hotspot) => (
              <div
                key={hotspot.id}
                className={`absolute border-2 bg-blue-500/20 cursor-move ${
                  selectedHotspot === hotspot.id 
                    ? 'border-blue-500 shadow-lg' 
                    : 'border-blue-400/50 hover:border-blue-400'
                }`}
                style={{
                  left: `${hotspot.x}%`,
                  top: `${hotspot.y}%`,
                  width: `${hotspot.width}%`,
                  height: `${hotspot.height}%`,
                }}
                onMouseDown={(e) => handleMouseDown(e, hotspot.id, 'move')}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedHotspot(hotspot.id);
                }}
              >
                {/* Resize handle */}
                {selectedHotspot === hotspot.id && (
                  <div
                    className="absolute -bottom-1 -right-1 w-3 h-3 bg-blue-500 border border-white cursor-se-resize"
                    onMouseDown={(e) => handleMouseDown(e, hotspot.id, 'resize-se')}
                  />
                )}
                
                {/* Label */}
                <div className="absolute -top-6 left-0 bg-blue-500 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                  {hotspot.title}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Hotspots ({hotspots.length})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {hotspots.map((hotspot) => (
                <div
                  key={hotspot.id}
                  className={`p-2 border rounded cursor-pointer transition-colors ${
                    selectedHotspot === hotspot.id 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setSelectedHotspot(hotspot.id)}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium truncate">{hotspot.title}</span>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingHotspot(hotspot.id);
                        }}
                      >
                        <Edit3 className="w-3 h-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteHotspot(hotspot.id);
                        }}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {Math.round(hotspot.x)}%, {Math.round(hotspot.y)}% • {Math.round(hotspot.width)}×{Math.round(hotspot.height)}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Edit Panel */}
          {editingHotspot && selectedHotspotData && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Edit Hotspot</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <label className="text-xs font-medium">Title</label>
                  <Input
                    value={selectedHotspotData.title}
                    onChange={(e) => updateHotspot(editingHotspot, { title: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium">Description</label>
                  <Textarea
                    value={selectedHotspotData.description}
                    onChange={(e) => updateHotspot(editingHotspot, { description: e.target.value })}
                    className="mt-1"
                    rows={3}
                  />
                </div>
                <Button 
                  onClick={() => setEditingHotspot(null)} 
                  size="sm" 
                  className="w-full"
                >
                  Done
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default HotspotEditor;