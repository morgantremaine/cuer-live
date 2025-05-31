
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Column } from '@/hooks/useColumnsManager';

export const useColumnLayoutStorage = () => {
  const [savedLayouts, setSavedLayouts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const loadLayouts = async () => {
    if (!user) return;

    setLoading(true);
    const { data, error } = await supabase
      .from('column_layouts')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Error loading column layouts:', error);
    } else {
      setSavedLayouts(data || []);
    }
    setLoading(false);
  };

  const saveLayout = async (name: string, columns: Column[], isDefault = false) => {
    if (!user) return;

    const { data, error } = await supabase
      .from('column_layouts')
      .insert({
        user_id: user.id,
        name,
        columns,
        is_default: isDefault
      })
      .select()
      .single();

    if (error) {
      console.error('Error saving column layout:', error);
      toast({
        title: 'Error',
        description: 'Failed to save column layout',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Success',
        description: 'Column layout saved successfully!',
      });
      loadLayouts();
      return data;
    }
  };

  const updateLayout = async (id: string, name: string, columns: Column[], isDefault = false) => {
    if (!user) return;

    const { error } = await supabase
      .from('column_layouts')
      .update({
        name,
        columns,
        is_default: isDefault,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error updating column layout:', error);
      toast({
        title: 'Error',
        description: 'Failed to update column layout',
        variant: 'destructive',
      });
    } else {
      loadLayouts();
    }
  };

  const deleteLayout = async (id: string) => {
    if (!user) return;

    const { error } = await supabase
      .from('column_layouts')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error deleting column layout:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete column layout',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Success',
        description: 'Column layout deleted successfully!',
      });
      loadLayouts();
    }
  };

  useEffect(() => {
    if (user) {
      loadLayouts();
    }
  }, [user]);

  return {
    savedLayouts,
    loading,
    saveLayout,
    updateLayout,
    deleteLayout,
    loadLayouts,
  };
};
