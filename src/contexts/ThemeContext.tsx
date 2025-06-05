
import React, { createContext, useContext, useEffect, useState } from 'react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

export type Theme = 'light' | 'dark' | 'windows-classic' | 'modern-minimal' | 'elegant-serif' | 'cyberpunk';

interface ThemeOption {
  value: Theme;
  label: string;
  colors: string[];
  font: string;
  description: string;
}

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  themes: ThemeOption[];
  requestThemeChange: (theme: Theme) => void;
}

const themes: ThemeOption[] = [
  {
    value: 'light',
    label: 'Light',
    colors: ['#ffffff', '#f8f9fa', '#e9ecef'],
    font: 'Pixelated',
    description: 'Clean light theme with pixelated fonts'
  },
  {
    value: 'dark',
    label: 'Dark',
    colors: ['#1a1a1a', '#2d2d2d', '#404040'],
    font: 'Pixelated',
    description: 'Dark theme with pixelated fonts'
  },
  {
    value: 'windows-classic',
    label: 'Classic',
    colors: ['#c0c0c0', '#808080', '#000080'],
    font: 'Pixelated',
    description: 'Retro Windows 95 style'
  },
  {
    value: 'modern-minimal',
    label: 'Modern Minimal',
    colors: ['#fafafa', '#f5f5f5', '#6366f1'],
    font: 'Inter',
    description: 'Clean modern design with Inter font'
  },
  {
    value: 'elegant-serif',
    label: 'Elegant Serif',
    colors: ['#fefefe', '#f8f7f4', '#8b5a3c'],
    font: 'Playfair Display',
    description: 'Elegant design with serif typography'
  },
  {
    value: 'cyberpunk',
    label: 'Cyberpunk',
    colors: ['#0d0d0d', '#1a0a1a', '#ff00ff'],
    font: 'JetBrains Mono',
    description: 'Futuristic theme with monospace font'
  }
];

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>(() => {
    const savedTheme = localStorage.getItem('app-theme') as Theme;
    return savedTheme || 'light';
  });
  
  const [pendingTheme, setPendingTheme] = useState<Theme | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem('app-theme', newTheme);
    applyThemeStyles(newTheme);
  };

  const requestThemeChange = (newTheme: Theme) => {
    if (newTheme === theme) return;
    setPendingTheme(newTheme);
    setShowConfirmDialog(true);
  };

  const confirmThemeChange = () => {
    if (pendingTheme) {
      setTheme(pendingTheme);
    }
    setShowConfirmDialog(false);
    setPendingTheme(null);
  };

  const cancelThemeChange = () => {
    setShowConfirmDialog(false);
    setPendingTheme(null);
  };

  const applyThemeStyles = (currentTheme: Theme) => {
    const root = window.document.documentElement;
    
    // Remove all theme classes
    themes.forEach(t => root.classList.remove(t.value));
    root.classList.add(currentTheme);

    // Apply font based on theme
    const themeConfig = themes.find(t => t.value === currentTheme);
    if (themeConfig) {
      switch (themeConfig.font) {
        case 'Inter':
          root.style.fontFamily = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
          break;
        case 'Playfair Display':
          root.style.fontFamily = "'Playfair Display', Georgia, serif";
          break;
        case 'JetBrains Mono':
          root.style.fontFamily = "'JetBrains Mono', 'Fira Code', monospace";
          break;
        default:
          root.style.fontFamily = "'Press Start 2P', monospace"; // Pixelated default
      }
    }
  };

  useEffect(() => {
    applyThemeStyles(theme);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, themes, requestThemeChange }}>
      {children}
      
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Change Theme</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingTheme && (
                <>
                  Do you want to change to <strong>{themes.find(t => t.value === pendingTheme)?.label}</strong> theme?
                  <br />
                  <span className="text-sm text-muted-foreground mt-2 block">
                    {themes.find(t => t.value === pendingTheme)?.description}
                  </span>
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelThemeChange}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmThemeChange}>Apply Theme</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
