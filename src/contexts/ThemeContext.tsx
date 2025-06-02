
import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type Theme = 'light' | 'dark' | 'cyberpunk' | 'forest' | 'ocean' | 'sunset' | 'windows-classic' | 'modern-pro';

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
  },
  {
    value: 'windows-classic' as Theme,
    label: 'Windows Classic',
    colors: ['#c0c0c0', '#000080', '#008000']
  },
  {
    value: 'modern-pro' as Theme,
    label: 'Modern Pro',
    colors: ['#1e1e1e', '#007acc', '#00d4aa']
  }
];

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('light');

  useEffect(() => {
    loadTheme();
  }, []);

  const loadTheme = async () => {
    try {
      // First try to get from database
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('theme')
          .eq('id', user.id)
          .single();
        
        if (profile?.theme && themes.find(t => t.value === profile.theme)) {
          setTheme(profile.theme as Theme);
          return;
        }
      }
      
      // Fallback to localStorage
      const savedTheme = localStorage.getItem('app-theme') as Theme;
      if (savedTheme && themes.find(t => t.value === savedTheme)) {
        setTheme(savedTheme);
      }
    } catch (error) {
      console.error('Error loading theme:', error);
      // Fallback to localStorage
      const savedTheme = localStorage.getItem('app-theme') as Theme;
      if (savedTheme && themes.find(t => t.value === savedTheme)) {
        setTheme(savedTheme);
      }
    }
  };

  const saveTheme = async (newTheme: Theme) => {
    try {
      // Save to localStorage first (immediate)
      localStorage.setItem('app-theme', newTheme);
      
      // Save to database (backup)
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('profiles')
          .update({ theme: newTheme })
          .eq('id', user.id);
      }
    } catch (error) {
      console.error('Error saving theme:', error);
    }
  };

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    
    // Remove all theme classes
    document.documentElement.classList.remove('light', 'dark', 'cyberpunk', 'forest', 'ocean', 'sunset', 'windows-classic', 'modern-pro');
    // Add current theme class
    document.documentElement.classList.add(theme);
    
    // Save theme when it changes
    saveTheme(theme);
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
