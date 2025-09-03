import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import RundownIndexContent from '@/components/RundownIndexContent';
import Blueprint from '@/pages/Blueprint';
import CameraPlotEditor from '@/pages/CameraPlotEditor';
import Teleprompter from '@/pages/Teleprompter';
import { PerRowMigrationBanner } from '@/components/PerRowMigrationBanner';
import { usePerRowFeatureFlag } from '@/hooks/usePerRowFeatureFlag';
import { usePerRowPersistence } from '@/hooks/usePerRowPersistence';
import { supabase } from '@/integrations/supabase/client';

const RundownWithTabs = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Per-row feature flag and migration state
  const { isEnabled: isPerRowEnabled, userDismissed, dismissMigrationBanner } = usePerRowFeatureFlag();
  const { migrateRundown } = usePerRowPersistence({ 
    rundownId: id || '', 
    onItemsChange: () => {} 
  });
  
  const [showMigrationBanner, setShowMigrationBanner] = useState(false);
  const [isMigrated, setIsMigrated] = useState<boolean | null>(null);

  // Check if rundown has normalized items (migrated)
  useEffect(() => {
    const checkMigration = async () => {
      if (!id || id === 'new') { setIsMigrated(null); return; }
      const { count, error } = await supabase
        .from('rundown_items')
        .select('id', { count: 'exact', head: true })
        .eq('rundown_id', id);
      if (error) {
        console.error('Failed to check migration status:', error);
        setIsMigrated(null);
      } else {
        setIsMigrated((count || 0) > 0);
      }
    };
    checkMigration();
  }, [id]);

  // Show migration banner only if not migrated and not dismissed
  useEffect(() => {
    const shouldShow = Boolean(id && id !== 'new' && isPerRowEnabled && !userDismissed && isMigrated === false);
    setShowMigrationBanner(shouldShow);
  }, [id, isPerRowEnabled, userDismissed, isMigrated]);

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

  const handleMigration = async (): Promise<boolean> => {
    if (!id) return false;
    try {
      const result = await migrateRundown();
      if (result) {
        dismissMigrationBanner();
        setIsMigrated(true);
        setShowMigrationBanner(false);
      }
      return !!result;
    } catch (error) {
      console.error('Migration failed:', error);
      return false;
    }
  };

  const handleDismissBanner = () => {
    dismissMigrationBanner();
    setShowMigrationBanner(false);
  };

  return (
    <div className="min-h-screen">
      {showMigrationBanner && (
        <PerRowMigrationBanner
          rundownId={id!}
          onMigrate={handleMigration}
          onDismiss={handleDismissBanner}
        />
      )}
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