
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface ThemeContextType {
  isDark: boolean;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider = ({ children }: ThemeProviderProps) => {
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('theme');
      console.log('🌓 ThemeProvider initialization, stored theme:', stored);
      if (stored) {
        return stored === 'dark';
      }
      const systemPreference = window.matchMedia('(prefers-color-scheme: dark)').matches;
      console.log('🌓 ThemeProvider initialization, system preference:', systemPreference);
      return systemPreference;
    }
    return false;
  });

  useEffect(() => {
    console.log('🌓 ThemeProvider effect, isDark:', isDark);
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
    console.log('🌓 ThemeProvider toggleTheme called, current isDark:', isDark);
    setIsDark(!isDark);
    console.log('🌓 ThemeProvider toggleTheme setIsDark called with:', !isDark);
  };

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
