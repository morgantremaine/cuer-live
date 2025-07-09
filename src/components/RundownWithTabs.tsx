import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { usePageVisibility } from '@/hooks/usePageVisibility';
import { usePreventTabUnmount } from '@/hooks/usePreventTabUnmount';
import RundownIndexContent from '@/components/RundownIndexContent';
import Blueprint from '@/pages/Blueprint';
import CameraPlotEditor from '@/pages/CameraPlotEditor';
import Teleprompter from '@/pages/Teleprompter';

const RundownWithTabs = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Prevent browser tab unloading
  const { isTabVisible, wasHidden } = usePageVisibility();
  const { uptime, activeComponents } = usePreventTabUnmount(`rundown-${id}`);
  
  // Determine active tab from URL path
  const getActiveTab = () => {
    const path = location.pathname;
    if (path.includes('/blueprint')) return 'blueprint';
    if (path.includes('/camera-plot-editor')) return 'camera-plot-editor';
    if (path.includes('/teleprompter')) return 'teleprompter';
    return 'rundown';
  };

  const [activeTab, setActiveTab] = useState(getActiveTab());

  // Update tab when URL changes
  useEffect(() => {
    setActiveTab(getActiveTab());
  }, [location.pathname]);

  // Handle tab changes by updating URL
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    
    if (value === 'rundown') {
      navigate(`/rundown/${id}`, { replace: true });
    } else {
      navigate(`/rundown/${id}/${value}`, { replace: true });
    }
  };

  useEffect(() => {
    console.log('🔄 RundownWithTabs mounted for rundown:', id, 'active tab:', activeTab);
    console.log('🔍 Tab visibility:', isTabVisible, 'was hidden:', wasHidden, 'uptime:', uptime);
    
    return () => {
      console.log('🧹 RundownWithTabs unmounting - this should NOT happen on browser tab switches');
      console.log('🧹 Final stats - uptime:', uptime, 'active components:', activeComponents);
    };
  }, [id, activeTab, isTabVisible, wasHidden, uptime, activeComponents]);

  if (!id) {
    return <div>No rundown ID provided</div>;
  }

  return (
    <div className="h-screen overflow-hidden">
      <Tabs value={activeTab} onValueChange={handleTabChange} className="h-full flex flex-col">
        {/* Hidden tabs list - navigation happens through other UI elements */}
        <TabsList className="hidden">
          <TabsTrigger value="rundown">Rundown</TabsTrigger>
          <TabsTrigger value="blueprint">Blueprint</TabsTrigger>
          <TabsTrigger value="camera-plot-editor">Camera Plot Editor</TabsTrigger>
          <TabsTrigger value="teleprompter">Teleprompter</TabsTrigger>
        </TabsList>
        
        <TabsContent value="rundown" className="flex-1 mt-0">
          <RundownIndexContent />
        </TabsContent>
        
        <TabsContent value="blueprint" className="flex-1 mt-0">
          <Blueprint />
        </TabsContent>
        
        <TabsContent value="camera-plot-editor" className="flex-1 mt-0">
          <CameraPlotEditor />
        </TabsContent>
        
        <TabsContent value="teleprompter" className="flex-1 mt-0">
          <Teleprompter />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default RundownWithTabs;