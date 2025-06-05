
import { useState, useEffect } from 'react';

export const useTheme = () => {
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== 'undefined') {
      // First check localStorage
      const stored = localStorage.getItem('theme');
      if (stored) {
        const storedIsDark = stored === 'dark';
        console.log('Theme from localStorage:', stored, 'isDark:', storedIsDark);
        return storedIsDark;
      }
      // Then check system preference
      const systemPreference = window.matchMedia('(prefers-color-scheme: dark)').matches;
      console.log('Theme from system:', systemPreference ? 'dark' : 'light');
      return systemPreference;
    }
    return false;
  });

  useEffect(() => {
    const root = document.documentElement;
    console.log('Setting theme:', isDark ? 'dark' : 'light');
    
    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  // Listen for system theme changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      // Only update if no explicit theme is stored
      const stored = localStorage.getItem('theme');
      if (!stored) {
        console.log('System theme changed:', e.matches ? 'dark' : 'light');
        setIsDark(e.matches);
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const toggleTheme = () => {
    console.log('Toggling theme from:', isDark ? 'dark' : 'light', 'to:', !isDark ? 'dark' : 'light');
    setIsDark(!isDark);
  };

  return { isDark, toggleTheme };
};
