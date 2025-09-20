import React, { useState } from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import HotspotEditor from './HotspotEditor';
import { Edit3 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useIsMobile } from '@/hooks/use-mobile';

interface Hotspot {
  id: string;
  title: string;
  description: string;
  x: number; // percentage from left
  y: number; // percentage from top
  width: number; // percentage width
  height: number; // percentage height
}

const initialHotspots: Hotspot[] = [
  {
    id: 'showcaller-indicator', // #1 - Current row indicator (left side)
    title: 'Showcaller Visual Indicator',
    description: 'Real-time visual feedback shows exactly where you are in your show with precision timing',
    x: 11.589045516933519,
    y: 35.314568402085634,
    width: 11.44863379284887,
    height: 7.3258273608342535
  },
  {
    id: 'showcaller-controls', // #2 - Play/pause controls (top toolbar)
    title: 'Showcaller Controls',
    description: 'Professional playback controls for seamless show execution - play, pause, skip ahead or back',
    x: 65.48286965566383,
    y: 20.988741041251384,
    width: 10.054797241189846,
    height: 5
  },
  {
    id: 'zoom-controls', // #3 - Zoom controls (top right)
    title: 'Zoom Controls',
    description: 'Adjust your view from overview to detail - perfect for different screen sizes and preferences',
    x: 82.00341862111001,
    y: 21.20971226805709,
    width: 5,
    height: 5
  },
  {
    id: 'saved-layouts', // #5 - Layouts button (top toolbar)
    title: 'Saved Layouts',
    description: 'Create and save custom column layouts for different show types - news, sports, variety, and more',
    x: 29.81849034502296,
    y: 20.988741041251377,
    width: 6.126712413787182,
    height: 5
  },
  {
    id: 'share-links', // #6 - Share button (top toolbar)
    title: 'Read-Only Share Links',
    description: 'Share view-only rundowns with talent, directors, and stakeholders - no login required',
    x: 39.66437931064084,
    y: 20.98874104125138,
    width: 5.493150344851266,
    height: 5
  },
  {
    id: 'resize-columns', // #7 - Column border (between columns)
    title: 'Resizable Columns',
    description: 'Drag column borders to customize your workspace - see more of what matters most',
    x: 49.48631310263128,
    y: 24.674172639165743,
    width: 13.856169654805342,
    height: 5
  },
  {
    id: 'script-areas', // #8 - Script content area (expandable)
    title: 'Collapsible Script Areas',
    description: 'Expand scripts that sync perfectly with the teleprompter - seamless talent experience',
    x: 29.94520275881014,
    y: 35.453201412360045,
    width: 14.99658137889,
    height: 12.850108030976976
  },
  {
    id: 'cuer-ai', // #9 - AI chat button (bottom right)
    title: 'Cuer AI',
    description: 'AI-powered suggestions for timing, content optimization, and show flow improvements',
    x: 80.83218965532042,
    y: 83.77902877319428,
    width: 7.746575172425636,
    height: 6.209712268057103
  },
  {
    id: 'custom-colors', // #10 - Colored row (green segment)
    title: 'Custom Row Colors',
    description: 'Color-code segments by type, talent, or any system that works for your team',
    x: 11.705477241533242,
    y: 48.18719435055985,
    width: 76.45210206567376,
    height: 7.767769814445664
  },
  {
    id: 'collapsible-headers', // #11 - Section header with collapse arrow
    title: 'Collapsible Show Blocks',
    description: 'Organize your rundown into logical blocks - collapse sections for easy reordering and overview',
    x: 11.73117639291768,
    y: 62.49243540664217,
    width: 76.45210206567376,
    height: 7.430683494862791
  },
  {
    id: 'autoscroll', // #12 - Timeline/progress area (top)
    title: 'Auto-scroll Following',
    description: 'Automatically follows along with the showcaller so you never lose your place',
    x: 77.29110413735677,
    y: 21.187194350559842,
    width: 5,
    height: 5
  }
];

interface InteractiveRundownImageProps {
  src: string;
  alt: string;
  className?: string;
}

const InteractiveRundownImage = ({ src, alt, className = '' }: InteractiveRundownImageProps) => {
  const [activeHotspot, setActiveHotspot] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [hotspots, setHotspots] = useState<Hotspot[]>(initialHotspots);
  const { user } = useAuth();
  const isMobile = useIsMobile();
  
  const isAuthorizedEditor = user?.email === 'morgan@cuer.live';

  const handleSaveHotspots = (newHotspots: Hotspot[]) => {
    setHotspots(newHotspots);
    setIsEditing(false);
    
    // Show the updated coordinates in console for manual code update
    console.log('=== HOTSPOT COORDINATES TO UPDATE IN CODE ===');
    console.log('Copy and paste these coordinates into the initialHotspots array:');
    newHotspots.forEach((hotspot, index) => {
      console.log(`${hotspot.id}: { x: ${hotspot.x}, y: ${hotspot.y}, width: ${hotspot.width}, height: ${hotspot.height} }`);
    });
    console.log('===============================================');
  };

  if (isEditing) {
    return (
      <div className={className}>
        <div className="mb-4 flex justify-between items-center">
          <h3 className="text-lg font-semibold">Edit Interactive Areas</h3>
          <Button onClick={() => setIsEditing(false)} variant="outline" size="sm">
            Cancel
          </Button>
        </div>
        <HotspotEditor 
          src={src} 
          alt={alt} 
          initialHotspots={hotspots}
          onSave={handleSaveHotspots}
        />
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      {isAuthorizedEditor && (
        <div className="mb-4 flex justify-end">
          <Button onClick={() => setIsEditing(true)} variant="outline" size="sm">
            <Edit3 className="w-4 h-4 mr-2" />
            Edit Hotspots
          </Button>
        </div>
      )}
      
      <div className="relative inline-block">
        <img 
          src={src} 
          alt={alt}
          className="w-full h-auto rounded-lg shadow-2xl"
          draggable={false}
        />
        
        {/* Interactive hotspots - desktop only */}
        {!isMobile && (
          <TooltipProvider delayDuration={300}>
            {hotspots.map((hotspot) => (
              <Tooltip key={hotspot.id}>
                <TooltipTrigger asChild>
                  <button
                    className="absolute group"
                    style={{
                      left: `${hotspot.x}%`,
                      top: `${hotspot.y}%`,
                      width: `${hotspot.width}%`,
                      height: `${hotspot.height}%`,
                    }}
                    onMouseEnter={() => setActiveHotspot(hotspot.id)}
                    onMouseLeave={() => setActiveHotspot(null)}
                    onFocus={() => setActiveHotspot(hotspot.id)}
                    onBlur={() => setActiveHotspot(null)}
                    aria-label={`Learn about ${hotspot.title}`}
                  >
                    {/* Transparent blue overlay on hover */}
                    <div className="absolute inset-0 bg-blue-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 border border-blue-400/50" />
                    
                    {/* Subtle pulse border on active */}
                    <div 
                      className={`absolute inset-0 border-2 border-blue-400 ${
                        activeHotspot === hotspot.id ? 'opacity-40 animate-pulse' : 'opacity-0'
                      } transition-opacity duration-200`}
                    />
                  </button>
                </TooltipTrigger>
                <TooltipContent 
                  side="top" 
                  className="max-w-xs p-3 bg-background/95 backdrop-blur-sm border shadow-lg"
                  sideOffset={8}
                >
                  <div className="space-y-1">
                    <h4 className="font-semibold text-sm text-foreground">{hotspot.title}</h4>
                    <p className="text-xs text-muted-foreground leading-relaxed">{hotspot.description}</p>
                  </div>
                </TooltipContent>
              </Tooltip>
            ))}
          </TooltipProvider>
        )}
        
        {/* Legend - mobile only */}
        {isMobile && (
          <div className="mt-4 p-3 bg-background/50 backdrop-blur-sm rounded-lg border">
            <h4 className="font-semibold text-sm mb-2 text-foreground">Tap the numbered areas above to explore features:</h4>
            <div className="grid grid-cols-1 gap-1 text-xs">
              {hotspots.slice(0, 6).map((hotspot, index) => (
                <div key={hotspot.id} className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-blue-500 text-white text-xs font-bold rounded-full flex items-center justify-center flex-shrink-0">
                    {index + 1}
                  </div>
                  <span className="text-muted-foreground">{hotspot.title}</span>
                </div>
              ))}
              <div className="text-muted-foreground mt-1">+ {hotspots.length - 6} more features...</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default InteractiveRundownImage;