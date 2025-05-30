
import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useRundownStorage } from './useRundownStorage';
import { useAuth } from './useAuth';
import { RundownItem } from './useRundownItems';
import { useToast } from './use-toast';

export const useAutoSaveOperations = () => {
  const [isSaving, setIsSaving] = useState(false);
  const { id: rundownId } = useParams<{ id: string }>();
  const { updateRundown, saveRundown } = useRundownStorage();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const isNewRundown = !rundownId;

  const performSave = async (items: RundownItem[], rundownTitle: string) => {
    if (isSaving) {
      console.log('Save already in progress, skipping...');
      return;
    }

    if (!user) {
      console.error('Cannot save: user not authenticated');
      toast({
        title: 'Save Failed',
        description: 'You must be logged in to save changes',
        variant: 'destructive',
      });
      return false;
    }

    try {
      console.log('Starting save operation...');
      setIsSaving(true);
      
      if (isNewRundown) {
        console.log('Saving new rundown...');
        const result = await saveRundown(rundownTitle, items);
        
        if (result?.id) {
          console.log('New rundown saved with ID:', result.id);
          navigate(`/rundown/${result.id}`, { replace: true });
          return true;
        } else {
          throw new Error('Failed to save new rundown - no ID returned');
        }
      } else if (rundownId) {
        console.log('Updating existing rundown:', rundownId);
        await updateRundown(rundownId, rundownTitle, items, true);
        console.log('Rundown updated successfully');
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Save failed:', error);
      
      // Check if it's an authentication error
      if (error instanceof Error && error.message.includes('JWT')) {
        toast({
          title: 'Session Expired',
          description: 'Please log in again to save your changes',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Save Failed',
          description: 'Unable to save changes. Please try again.',
          variant: 'destructive',
        });
      }
      
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  return {
    isSaving,
    performSave,
    isNewRundown
  };
};
