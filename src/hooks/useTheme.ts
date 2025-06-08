
import { useState, useEffect } from 'react';

export const useTheme = () => {
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('theme');
      console.log('🌓 useTheme initialization, stored theme:', stored);
      if (stored) {
        return stored === 'dark';
      }
      const systemPreference = window.matchMedia('(prefers-color-scheme: dark)').matches;
      console.log('🌓 useTheme initialization, system preference:', systemPreference);
      return systemPreference;
    }
    return false;
  });

  useEffect(() => {
    console.log('🌓 useTheme effect, isDark:', isDark);
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
      console.log('🌓 Added dark class to root');
    } else {
      root.classList.remove('dark');
      console.log('🌓 Removed dark class from root');
    }
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    console.log('🌓 Set localStorage theme to:', isDark ? 'dark' : 'light');
  }, [isDark]);

  const toggleTheme = () => {
    console.log('🌓 toggleTheme called, current isDark:', isDark);
    setIsDark(!isDark);
    console.log('🌓 toggleTheme setIsDark called with:', !isDark);
  };

  return { isDark, toggleTheme };
};
