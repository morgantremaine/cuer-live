
import { useState, useCallback } from 'react';

interface UndoState<T> {
  past: T[];
  present: T;
  future: T[];
}

export const useUndo = <T>(initialValue: T, setValue: (value: T) => void) => {
  const [state, setState] = useState<UndoState<T>>({
    past: [],
    present: initialValue,
    future: []
  });

  const set = useCallback((newValue: T | ((prev: T) => T)) => {
    setState(currentState => {
      const actualNewValue = typeof newValue === 'function' 
        ? (newValue as (prev: T) => T)(currentState.present)
        : newValue;
      
      setValue(actualNewValue);
      
      return {
        past: [...currentState.past, currentState.present],
        present: actualNewValue,
        future: []
      };
    });
  }, [setValue]);

  const undo = useCallback(() => {
    setState(currentState => {
      if (currentState.past.length === 0) return currentState;
      
      const previous = currentState.past[currentState.past.length - 1];
      const newPast = currentState.past.slice(0, currentState.past.length - 1);
      
      setValue(previous);
      
      return {
        past: newPast,
        present: previous,
        future: [currentState.present, ...currentState.future]
      };
    });
  }, [setValue]);

  const redo = useCallback(() => {
    setState(currentState => {
      if (currentState.future.length === 0) return currentState;
      
      const next = currentState.future[0];
      const newFuture = currentState.future.slice(1);
      
      setValue(next);
      
      return {
        past: [...currentState.past, currentState.present],
        present: next,
        future: newFuture
      };
    });
  }, [setValue]);

  return {
    set,
    undo,
    redo,
    canUndo: state.past.length > 0,
    canRedo: state.future.length > 0,
    lastAction: state.past.length > 0 ? 'set' : null
  };
};
