import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import RundownIndexContent from '@/components/RundownIndexContent';
import Blueprint from '@/pages/Blueprint';
import CameraPlotEditor from '@/pages/CameraPlotEditor';
import Teleprompter from '@/pages/Teleprompter';
import { BlueprintProvider } from '@/contexts/BlueprintContext';
import { useRundownStorage } from '@/hooks/useRundownStorage';

const RundownWithTabs = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { savedRundowns, loading } = useRundownStorage();
  
  // Find the rundown data
  const rundown = React.useMemo(() => {
    if (loading || !savedRundowns.length) return null;
    return savedRundowns.find(r => r.id === id) || undefined;
  }, [savedRundowns, id, loading]);
  
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

  // Show loading while rundown data is being fetched
  if (loading) {
    return <div className="min-h-screen">Loading...</div>;
  }

  // If rundown not found, show error
  if (!loading && rundown === undefined) {
    return <div className="min-h-screen">Rundown not found</div>;
  }

  // Wrap everything in BlueprintProvider to prevent context recreation on tab switches
  return (
    <BlueprintProvider 
      rundownId={id} 
      rundownTitle={rundown?.title || 'Unknown Rundown'}
      rundownItems={rundown?.items || []}
    >
      <div className="min-h-screen">
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
    </BlueprintProvider>
  );
};

export default RundownWithTabs;