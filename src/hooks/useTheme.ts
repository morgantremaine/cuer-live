
import { useState, useEffect } from 'react';

export const useTheme = () => {
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('theme');
      console.log('🎨 Theme initialization - stored theme:', stored);
      
      if (stored) {
        const darkFromStorage = stored === 'dark';
        console.log('🎨 Theme from localStorage:', darkFromStorage);
        return darkFromStorage;
      }
      
      const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      console.log('🎨 System prefers dark:', systemPrefersDark);
      return systemPrefersDark;
    }
    return false;
  });

  useEffect(() => {
    const root = document.documentElement;
    console.log('🎨 Theme effect - setting theme to:', isDark ? 'dark' : 'light');
    
    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    console.log('🎨 Theme saved to localStorage:', isDark ? 'dark' : 'light');
    
    // Force a re-render by dispatching a custom event
    window.dispatchEvent(new CustomEvent('theme-changed', { detail: { isDark } }));
  }, [isDark]);

  const toggleTheme = () => {
    console.log('🎨 Theme toggle triggered - current:', isDark, 'new:', !isDark);
    setIsDark(prev => !prev);
  };

  return { isDark, toggleTheme };
};
