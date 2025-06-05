
import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useRundownStorage } from './useRundownStorage';
import { defaultRundownItems } from '@/data/defaultRundownItems';

export const useNewRundownCreation = () => {
  const navigate = useNavigate();
  const params = useParams<{ id: string }>();
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const { savedRundowns, loading, saveRundown } = useRundownStorage();

  // Handle new rundown creation when on /rundown without ID
  useEffect(() => {
    const createNewRundown = async () => {
      if (!params.id && window.location.pathname === '/rundown' && !isCreatingNew && !loading) {
        console.log('New rundown creation: Creating new rundown with default items');
        setIsCreatingNew(true);
        
        try {
          // Create a new rundown with default items
          const newRundown = await saveRundown(
            'Untitled Rundown',
            defaultRundownItems, // Use default items instead of empty array
            undefined, // No custom columns
            'America/New_York', // Default timezone
            '10:00:00' // Default start time
          );
          
          if (newRundown && newRundown.id) {
            console.log('New rundown creation: New rundown created with', defaultRundownItems.length, 'default items, redirecting to:', newRundown.id);
            navigate(`/rundown/${newRundown.id}`);
          }
        } catch (error) {
          console.error('New rundown creation: Failed to create new rundown:', error);
          setIsCreatingNew(false);
        }
      }
    };

    createNewRundown();
  }, [params.id, isCreatingNew, loading, saveRundown, navigate]);

  return {
    isCreatingNew,
    savedRundowns,
    loading
  };
};
