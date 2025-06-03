
import React, { createContext, useContext, useEffect, useState } from 'react';

export type Theme = 'light' | 'dark' | 'windows-classic';

interface ThemeOption {
  value: Theme;
  label: string;
  colors: string[];
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
    colors: ['#ffffff', '#f8f9fa', '#e9ecef']
  },
  {
    value: 'dark',
    label: 'Dark',
    colors: ['#1a1a1a', '#2d2d2d', '#404040']
  },
  {
    value: 'windows-classic',
    label: 'Classic',
    colors: ['#c0c0c0', '#808080', '#000080']
  }
];

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>(() => {
    const savedTheme = localStorage.getItem('app-theme') as Theme;
    return savedTheme || 'light';
  });

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem('app-theme', newTheme);
  };

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark', 'windows-classic');
    root.classList.add(theme);
  }, [theme]);

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
