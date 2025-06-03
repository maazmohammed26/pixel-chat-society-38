
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Palette, Check } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

export function ThemeSwitcher() {
  const { theme, themes, requestThemeChange } = useTheme();

  return (
    <Card className="card-gradient">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm text-foreground flex items-center gap-2">
          <Palette className="h-3 w-3 text-primary" />
          Theme Settings
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3 pt-0">
        <div className="grid grid-cols-1 gap-3">
          {themes.map((themeOption) => (
            <Button
              key={themeOption.value}
              onClick={() => requestThemeChange(themeOption.value)}
              variant={theme === themeOption.value ? "default" : "outline"}
              className={`
                relative h-auto p-4 flex items-center gap-3 justify-start
                ${theme === themeOption.value 
                  ? 'bg-primary text-primary-foreground border-primary' 
                  : 'hover:bg-muted/50 border-border'
                }
                transition-all duration-200 text-sm
              `}
            >
              {theme === themeOption.value && (
                <Check className="absolute top-2 right-2 h-3 w-3" />
              )}
              
              {/* Theme color preview */}
              <div className="flex gap-1">
                {themeOption.colors.map((color, index) => (
                  <div
                    key={index}
                    className="w-4 h-4 rounded-full border border-white/20"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
              
              <div className="text-left">
                <div className="font-semibold">{themeOption.label}</div>
                <div className="text-xs opacity-70">{themeOption.font} font</div>
              </div>
            </Button>
          ))}
        </div>
        
        <div className="mt-4 p-3 bg-muted/50 rounded-lg">
          <p className="text-xs text-muted-foreground">
            Click on any theme to preview it. You'll be asked to confirm before applying the changes.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
