
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface ThemeContextType {
  isDark: boolean;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useThemeContext = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useThemeContext must be used within a ThemeProvider');
  }
  return context;
};

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider = ({ children }: ThemeProviderProps) => {
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('theme');
      console.log('🎨 Theme Provider initialization - stored theme:', stored);
      
      if (stored) {
        const darkFromStorage = stored === 'dark';
        console.log('🎨 Theme Provider from localStorage:', darkFromStorage);
        return darkFromStorage;
      }
      
      const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      console.log('🎨 Theme Provider system prefers dark:', systemPrefersDark);
      return systemPrefersDark;
    }
    return false;
  });

  useEffect(() => {
    const root = document.documentElement;
    console.log('🎨 Theme Provider effect - setting theme to:', isDark ? 'dark' : 'light');
    
    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    console.log('🎨 Theme Provider saved to localStorage:', isDark ? 'dark' : 'light');
  }, [isDark]);

  const toggleTheme = () => {
    console.log('🎨 Theme Provider toggle triggered - current:', isDark, 'new:', !isDark);
    setIsDark(prev => !prev);
  };

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};
