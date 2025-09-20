
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface ThemeContextType {
  isDark: boolean;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useThemeContext = () => {
  try {
    const context = useContext(ThemeContext);
    if (context === undefined) {
      throw new Error('useThemeContext must be used within a ThemeProvider');
    }
    return context;
  } catch (error) {
    console.warn('Error accessing theme context, falling back to light theme:', error);
    // Return a fallback theme context
    return { isDark: false, toggleTheme: () => {} };
  }
};

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider = ({ children }: ThemeProviderProps) => {
  // Safety check to ensure React is available
  if (!React || typeof React.useState !== 'function') {
    console.warn('React hooks not available, falling back to light theme');
    return (
      <ThemeContext.Provider value={{ isDark: false, toggleTheme: () => {} }}>
        {children}
      </ThemeContext.Provider>
    );
  }

  const [isDark, setIsDark] = useState(() => {
    try {
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('theme');
        
        if (stored) {
          const darkFromStorage = stored === 'dark';
          return darkFromStorage;
        }
        
        const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        return systemPrefersDark;
      }
      return false;
    } catch (error) {
      console.warn('Error accessing localStorage or system preferences:', error);
      return false;
    }
  });

  useEffect(() => {
    try {
      const root = document.documentElement;
      
      if (isDark) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
      
      localStorage.setItem('theme', isDark ? 'dark' : 'light');
    } catch (error) {
      console.warn('Error updating theme:', error);
    }
  }, [isDark]);

  const toggleTheme = () => {
    try {
      setIsDark(prev => !prev);
    } catch (error) {
      console.warn('Error toggling theme:', error);
    }
  };

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};
