
import React, { createContext, useContext, useEffect, useState } from 'react';

export type Theme = 'light' | 'dark' | 'windows-classic';

interface ThemeOption {
  value: Theme;
  label: string;
  colors: string[];
  primary: string;
  secondary: string;
  accent: string;
}

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  themes: ThemeOption[];
}

const themes: ThemeOption[] = [
  {
    value: 'light',
    label: 'Light',
    colors: ['#ffffff', '#f8f9fa', '#e9ecef'],
    primary: '#16a34a',
    secondary: '#f1f5f9',
    accent: '#0f766e'
  },
  {
    value: 'dark',
    label: 'Dark',
    colors: ['#1a1a1a', '#2d2d2d', '#404040'],
    primary: '#22c55e',
    secondary: '#374151',
    accent: '#14b8a6'
  },
  {
    value: 'windows-classic',
    label: 'Classic',
    colors: ['#c0c0c0', '#808080', '#000080'],
    primary: '#000080',
    secondary: '#c0c0c0',
    accent: '#800080'
  }
];

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>(() => {
    try {
      const savedTheme = localStorage.getItem('socialchat-theme') as Theme;
      return savedTheme && themes.find(t => t.value === savedTheme) ? savedTheme : 'light';
    } catch {
      return 'light';
    }
  });

  const setTheme = (newTheme: Theme) => {
    try {
      setThemeState(newTheme);
      localStorage.setItem('socialchat-theme', newTheme);
      
      // Apply theme colors to CSS variables
      const themeConfig = themes.find(t => t.value === newTheme);
      if (themeConfig) {
        const root = document.documentElement;
        root.style.setProperty('--theme-primary', themeConfig.primary);
        root.style.setProperty('--theme-secondary', themeConfig.secondary);
        root.style.setProperty('--theme-accent', themeConfig.accent);
      }
    } catch (error) {
      console.error('Error saving theme:', error);
    }
  };

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark', 'windows-classic');
    root.classList.add(theme);
    
    // Apply theme colors
    const themeConfig = themes.find(t => t.value === theme);
    if (themeConfig) {
      root.style.setProperty('--theme-primary', themeConfig.primary);
      root.style.setProperty('--theme-secondary', themeConfig.secondary);
      root.style.setProperty('--theme-accent', themeConfig.accent);
    }
  }, [theme]);

  // Listen for storage changes from other tabs
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'socialchat-theme' && e.newValue) {
        const newTheme = e.newValue as Theme;
        if (themes.find(t => t.value === newTheme)) {
          setThemeState(newTheme);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, themes }}>
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
