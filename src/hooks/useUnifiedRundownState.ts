/**
 * Unified Rundown State Management
 * 
 * This hook consolidates all the overlapping state systems into a single,
 * reliable state management system with:
 * - Single source of truth for rundown data
 * - Consolidated auto-save with simple, reliable triggers
 * - Unified realtime synchronization
 * - Performance optimization for large rundowns
 * - Minimal complexity and maximum reliability
 */
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';
import { RundownItem } from '@/types/rundown';
import { Column } from '@/types/columns';
import { DEMO_RUNDOWN_ID, DEMO_RUNDOWN_DATA } from '@/data/demoRundownData';
import { createDefaultRundownItems } from '@/data/defaultRundownItems';
import { useToast } from '@/hooks/use-toast';
import { getTabId } from '@/utils/tabUtils';
import { normalizeTimestamp } from '@/utils/realtimeUtils';
import { calculateItemsWithTiming, calculateTotalRuntime } from '@/utils/rundownCalculations';

interface UnifiedRundownStateReturn {
  // Core state
  rundownId: string | null;
  items: RundownItem[];
  columns: Column[];
  title: string;
  startTime: string;
  timezone: string;
  showDate: Date | null;
  externalNotes: any;
  hasUnsavedChanges: boolean;
  docVersion: number;
  
  // Status flags
  isLoading: boolean;
  isInitialized: boolean;
  isSaving: boolean;
  isConnected: boolean;
  
  // UI state
  selectedRowId: string | null;
  currentTime: Date;
  
  // Core actions
  updateItem: (id: string, field: string, value: string) => void;
  deleteRow: (id: string) => void;
  addRow: () => void;
  addHeader: () => void;
  setTitle: (title: string) => void;
  setStartTime: (time: string) => void;
  setTimezone: (tz: string) => void;
  setShowDate: (date: Date | null) => void;
  setColumns: (columns: Column[]) => void;
  setItems: (items: RundownItem[]) => void;
  setExternalNotes: (notes: any) => void;
  
  // Selection
  handleRowSelection: (rowId: string | null) => void;
  clearRowSelection: () => void;
  
  // Undo
  undo: () => void;
  canUndo: boolean;
  lastAction: string | null;
  
  // Calculated values
  calculatedItems: RundownItem[];
  totalRuntime: string;
  
  // Auto-save coordination
  markActiveTyping: () => void;
  
  // Legacy compatibility
  addItem: () => void;
  deleteMultipleItems: (ids: string[]) => void;
  toggleFloat: (id: string) => void;
  addColumn: (column: Column) => void;
  updateColumnWidth: (id: string, width: string) => void;
  markSaved: () => void;
}

export const useUnifiedRundownState = (): UnifiedRundownStateReturn => {
  const params = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const rundownId = params.id === 'new' ? null : 
    (location.pathname === '/demo' ? DEMO_RUNDOWN_ID : params.id) || null;
  
  // Core state
  const [items, setItems] = useState<RundownItem[]>([]);
  const [columns, setColumns] = useState<Column[]>([]);
  const [title, setTitle] = useState('Untitled Rundown');
  const [startTime, setStartTime] = useState('09:00:00');
  const [timezone, setTimezone] = useState('America/New_York');
  const [showDate, setShowDate] = useState<Date | null>(null);
  const [externalNotes, setExternalNotes] = useState<any>({});
  
  // Status flags
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  // UI state
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // Undo state
  const [undoHistory, setUndoHistory] = useState<any[]>([]);
  const [lastAction, setLastAction] = useState<string | null>(null);
  
  // Refs for coordination
  const lastSavedStateRef = useRef<string>('');
  const saveTimeoutRef = useRef<NodeJS.Timeout>();
  const lastEditTimeRef = useRef<number>(0);
  const isInitializingRef = useRef(false);
  const realtimeChannelRef = useRef<any>(null);
  const lastSeenVersionRef = useRef<number>(0);
  
  // Create content signature for change detection
  const createStateSignature = useCallback(() => {
    return JSON.stringify({
      items: items.map(item => ({
        id: item.id,
        name: item.name || '',
        talent: item.talent || '',
        script: item.script || '',
        gfx: item.gfx || '',
        video: item.video || '',
        duration: item.duration || '',
        color: item.color || ''
      })),
      title: title || '',
      startTime: startTime || '',
      timezone: timezone || '',
      showDate: showDate?.toISOString() || null,
      externalNotes: externalNotes || {}
    });
  }, [items, title, startTime, timezone, showDate, externalNotes]);
  
  // Performance-optimized calculated items
  const calculatedItems = useMemo(() => {
    return calculateItemsWithTiming(items, startTime);
  }, [items, startTime]);
  
  // Calculate total runtime
  const totalRuntime = useMemo(() => {
    return calculateTotalRuntime(items);
  }, [items]);
  
  // Initialize rundown data
  const initializeRundown = useCallback(async () => {
    if (isInitializingRef.current) return;
    isInitializingRef.current = true;
    
    try {
      setIsLoading(true);
      
      if (location.pathname === '/demo') {
        // Load demo data
        setItems(DEMO_RUNDOWN_DATA.items);
        setTitle(DEMO_RUNDOWN_DATA.title);
        setStartTime(DEMO_RUNDOWN_DATA.start_time);
        setTimezone(DEMO_RUNDOWN_DATA.timezone);
        setIsInitialized(true);
        return;
      }
      
      if (!rundownId) {
        // New rundown
        setItems(createDefaultRundownItems());
        setTitle('Untitled Rundown');
        setStartTime('09:00:00');
        setTimezone('America/New_York');
        setIsInitialized(true);
        return;
      }
      
      // Load existing rundown
      const { data, error } = await supabase
        .from('rundowns')
        .select('*')
        .eq('id', rundownId)
        .single();
      
      if (error) {
        throw error;
      }
      
      if (!data) {
        throw new Error('Rundown not found');
      }
      
      setItems(data.items || []);
      setTitle(data.title || 'Untitled Rundown');
      setStartTime(data.start_time || '09:00:00');
      setTimezone(data.timezone || 'America/New_York');
      setShowDate(data.show_date ? new Date(data.show_date + 'T00:00:00') : null);
      setExternalNotes(data.external_notes || {});
      lastSeenVersionRef.current = data.doc_version || 0;
      
      // Prime the baseline for change detection
      setTimeout(() => {
        const signature = createStateSignature();
        lastSavedStateRef.current = signature;
        setHasUnsavedChanges(false);
        setIsInitialized(true); // Move this inside the timeout to ensure all state is set
      }, 100);
      
    } catch (error) {
      console.error('Failed to initialize rundown:', error);
      toast({
        title: "Error",
        description: "Failed to load rundown",
        variant: "destructive"
      });
      setIsInitialized(true); // Set initialized even on error to prevent infinite loading
    } finally {
      setIsLoading(false);
      isInitializingRef.current = false;
    }
  }, [rundownId, location.pathname, createStateSignature, toast]);
  
  // Auto-save with simple, reliable triggers
  const performSave = useCallback(async () => {
    if (!isInitialized || !rundownId || isSaving) return;
    
    const currentSignature = createStateSignature();
    if (currentSignature === lastSavedStateRef.current) return;
    
    try {
      setIsSaving(true);
      
      const { error } = await supabase
        .from('rundowns')
        .update({
          items,
          title,
          start_time: startTime,
          timezone,
          show_date: showDate?.toISOString().split('T')[0] || null,
          external_notes: externalNotes,
          updated_at: new Date().toISOString(),
          last_updated_by: user?.id,
          tab_id: getTabId()
        })
        .eq('id', rundownId);
      
      if (error) throw error;
      
      lastSavedStateRef.current = currentSignature;
      setHasUnsavedChanges(false);
      
    } catch (error) {
      console.error('Save failed:', error);
      toast({
        title: "Save Error",
        description: "Failed to save changes",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  }, [isInitialized, rundownId, isSaving, createStateSignature, items, title, startTime, timezone, showDate, externalNotes, user?.id, toast]);
  
  // Schedule auto-save
  const scheduleAutoSave = useCallback(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    setHasUnsavedChanges(true);
    
    saveTimeoutRef.current = setTimeout(() => {
      performSave();
    }, 2000); // 2 second delay
  }, [performSave]);
  
  // Mark active typing (for external coordination)
  const markActiveTyping = useCallback(() => {
    lastEditTimeRef.current = Date.now();
    scheduleAutoSave();
  }, [scheduleAutoSave]);
  
  // Core actions
  const updateItem = useCallback((id: string, field: string, value: string) => {
    setItems(prev => prev.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ));
    scheduleAutoSave();
  }, [scheduleAutoSave]);
  
  const deleteRow = useCallback((id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
    scheduleAutoSave();
  }, [scheduleAutoSave]);
  
  const addRow = useCallback(() => {
    const newItem: RundownItem = {
      id: `item_${Date.now()}`,
      type: 'regular',
      name: '',
      duration: '00:30',
      startTime: '00:00:00',
      endTime: '00:00:30',
      talent: '',
      script: '',
      notes: '',
      gfx: '',
      video: '',
      images: '',
      color: '',
      isFloating: false,
      customFields: {},
      rowNumber: '',
      elapsedTime: '00:00:00'
    };
    setItems(prev => [...prev, newItem]);
    scheduleAutoSave();
  }, [scheduleAutoSave]);
  
  const addHeader = useCallback(() => {
    const newItem: RundownItem = {
      id: `header_${Date.now()}`,
      type: 'header',
      name: 'New Header',
      duration: '00:00',
      startTime: '00:00:00',
      endTime: '00:00:00',
      talent: '',
      script: '',
      notes: '',
      gfx: '',
      video: '',
      images: '',
      color: '',
      isFloating: false,
      customFields: {},
      rowNumber: '',
      elapsedTime: '00:00:00'
    };
    setItems(prev => [...prev, newItem]);
    scheduleAutoSave();
  }, [scheduleAutoSave]);
  
  // Selection handlers
  const handleRowSelection = useCallback((rowId: string | null) => {
    setSelectedRowId(rowId);
  }, []);
  
  const clearRowSelection = useCallback(() => {
    setSelectedRowId(null);
  }, []);
  
  // Undo functionality
  const saveUndoState = useCallback(() => {
    const state = {
      items: [...items],
      title,
      startTime,
      timezone,
      showDate,
      timestamp: Date.now()
    };
    setUndoHistory(prev => [...prev.slice(-9), state]); // Keep last 10 states
  }, [items, title, startTime, timezone, showDate]);
  
  const undo = useCallback(() => {
    if (undoHistory.length === 0) return;
    
    const previousState = undoHistory[undoHistory.length - 1];
    setItems(previousState.items);
    setTitle(previousState.title);
    setStartTime(previousState.startTime);
    setTimezone(previousState.timezone);
    setShowDate(previousState.showDate);
    
    setUndoHistory(prev => prev.slice(0, -1));
    setLastAction('Undo');
    scheduleAutoSave();
  }, [undoHistory, scheduleAutoSave]);
  
  // Setup realtime subscription
  useEffect(() => {
    if (!rundownId || !isInitialized) return;
    
    const channel = supabase
      .channel(`rundown-${rundownId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'rundowns',
          filter: `id=eq.${rundownId}`
        },
        (payload) => {
          // Skip our own updates
          if (payload.new?.tab_id === getTabId()) return;
          
          // Skip stale updates
          const incomingVersion = payload.new?.doc_version || 0;
          if (incomingVersion <= lastSeenVersionRef.current) return;
          
          // Apply update
          if (payload.new?.items) setItems(payload.new.items);
          if (payload.new?.title) setTitle(payload.new.title);
          if (payload.new?.start_time) setStartTime(payload.new.start_time);
          if (payload.new?.timezone) setTimezone(payload.new.timezone);
          if (payload.new?.show_date) {
            setShowDate(new Date(payload.new.show_date + 'T00:00:00'));
          }
          if (payload.new?.external_notes) setExternalNotes(payload.new.external_notes);
          
          lastSeenVersionRef.current = incomingVersion;
          
          // Update baseline to prevent false save triggers
          setTimeout(() => {
            const signature = createStateSignature();
            lastSavedStateRef.current = signature;
            setHasUnsavedChanges(false);
          }, 100);
        }
      )
      .subscribe();
    
    realtimeChannelRef.current = channel;
    setIsConnected(true);
    
    return () => {
      channel.unsubscribe();
      setIsConnected(false);
    };
  }, [rundownId, isInitialized, createStateSignature]);
  
  // Initialize on mount
  useEffect(() => {
    initializeRundown();
  }, [initializeRundown]);
  
  // Update current time
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    
    return () => clearInterval(timer);
  }, []);
  
  return {
    // Core state
    rundownId,
    items,
    columns,
    title,
    startTime,
    timezone,
    showDate,
    externalNotes,
    hasUnsavedChanges,
    docVersion: lastSeenVersionRef.current,
    
    // Status flags
    isLoading,
    isInitialized,
    isSaving,
    isConnected,
    
    // UI state
    selectedRowId,
    currentTime,
    
    // Core actions
    updateItem,
    deleteRow,
    addRow,
    addHeader,
    setTitle,
    setStartTime,
    setTimezone,
    setShowDate,
    setColumns,
    setItems,
    
    // Selection
    handleRowSelection,
    clearRowSelection,
    
    // Undo
    undo,
    canUndo: undoHistory.length > 0,
    lastAction,
    
    // Calculated values
    calculatedItems,
    totalRuntime,
    
    // Auto-save coordination
    markActiveTyping,
    
    // Legacy compatibility (for gradual migration)
    setExternalNotes,
    addItem: addRow,
    deleteMultipleItems: (ids: string[]) => {
      setItems(prev => prev.filter(item => !ids.includes(item.id)));
      scheduleAutoSave();
    },
    toggleFloat: (id: string) => {
      setItems(prev => prev.map(item => 
        item.id === id ? { ...item, isFloating: !item.isFloating } : item
      ));
      scheduleAutoSave();
    },
    addColumn: (column: Column) => {
      setColumns(prev => [...prev, column]);
    },
    updateColumnWidth: (id: string, width: string) => {
      setColumns(prev => prev.map(col => 
        col.id === id ? { ...col, width } : col
      ));
    },
    markSaved: () => {
      setHasUnsavedChanges(false);
    }
  };
};