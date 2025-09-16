import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import RundownIndexContent from '@/components/RundownIndexContent';
import Blueprint from '@/pages/Blueprint';
import CameraPlotEditor from '@/pages/CameraPlotEditor';
import Teleprompter from '@/pages/Teleprompter';
import { CellUpdateProvider } from '@/contexts/CellUpdateContext';
import { useMobileViewport } from '@/hooks/useMobileViewport';
import { useResponsiveLayout } from '@/hooks/use-mobile';

const RundownWithTabs = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Mobile viewport management
  const { isMobileViewport } = useMobileViewport();
  const { isMobileOrTablet } = useResponsiveLayout();
  
  
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
    
    return () => {
      console.log('🧹 RundownWithTabs unmounting');
    };
  }, [id, activeTab]);

  if (!id) {
    return <div>No rundown ID provided</div>;
  }

  return (
    <CellUpdateProvider>
      <div className={`${isMobileOrTablet ? 'mobile-app-height mobile-no-scroll' : 'min-h-screen'}`}>
        <Tabs value={activeTab} onValueChange={handleTabChange} className={`${isMobileOrTablet ? 'h-full' : 'h-full'} flex flex-col`}>
          {/* Hidden tabs list - navigation happens through other UI elements */}
          <TabsList className="hidden">
            <TabsTrigger value="rundown">Rundown</TabsTrigger>
            <TabsTrigger value="blueprint">Blueprint</TabsTrigger>
            <TabsTrigger value="camera-plot-editor">Camera Plot Editor</TabsTrigger>
            <TabsTrigger value="teleprompter">Teleprompter</TabsTrigger>
          </TabsList>
          
          <TabsContent value="rundown" className={`${isMobileOrTablet ? 'mobile-full-height' : 'flex-1'} mt-0`}>
            <RundownIndexContent />
          </TabsContent>
          
          <TabsContent value="blueprint" className={`${isMobileOrTablet ? 'mobile-full-height' : 'flex-1'} mt-0`}>
            <Blueprint />
          </TabsContent>
          
          <TabsContent value="camera-plot-editor" className={`${isMobileOrTablet ? 'mobile-full-height' : 'flex-1'} mt-0`}>
            <CameraPlotEditor />
          </TabsContent>
          
          <TabsContent value="teleprompter" className={`${isMobileOrTablet ? 'mobile-full-height' : 'flex-1'} mt-0`}>
            <Teleprompter />
          </TabsContent>
        </Tabs>
      </div>
    </CellUpdateProvider>
  );
};

export default RundownWithTabs;