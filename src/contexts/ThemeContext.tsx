
import React, { createContext, useContext, useState, useEffect } from 'react';

export type Theme = 'light' | 'dark' | 'cyberpunk' | 'forest' | 'ocean' | 'sunset';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  themes: { value: Theme; label: string; colors: string[] }[];
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const themes = [
  {
    value: 'light' as Theme,
    label: 'Light',
    colors: ['#ffffff', '#f8f9fa', '#dee2e6']
  },
  {
    value: 'dark' as Theme,
    label: 'Dark',
    colors: ['#212529', '#343a40', '#495057']
  },
  {
    value: 'cyberpunk' as Theme,
    label: 'Cyberpunk',
    colors: ['#0d1117', '#ff00ff', '#00ffff']
  },
  {
    value: 'forest' as Theme,
    label: 'Forest',
    colors: ['#1a5f1a', '#2d8f2d', '#4caf4c']
  },
  {
    value: 'ocean' as Theme,
    label: 'Ocean',
    colors: ['#001f3f', '#0074d9', '#7fdbff']
  },
  {
    value: 'sunset' as Theme,
    label: 'Sunset',
    colors: ['#ff6b35', '#f7931e', '#ffd23f']
  }
];

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('light');

  useEffect(() => {
    const savedTheme = localStorage.getItem('app-theme') as Theme;
    if (savedTheme && themes.find(t => t.value === savedTheme)) {
      setTheme(savedTheme);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('app-theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
    
    // Remove all theme classes
    document.documentElement.classList.remove('light', 'dark', 'cyberpunk', 'forest', 'ocean', 'sunset');
    // Add current theme class
    document.documentElement.classList.add(theme);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, themes }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
