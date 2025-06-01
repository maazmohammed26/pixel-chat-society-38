
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Palette, Check } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

export function ThemeSwitcher() {
  const { theme, setTheme, themes } = useTheme();

  return (
    <Card className="card-gradient">
      <CardHeader className="pb-3">
        <CardTitle className="font-pixelated text-sm text-foreground flex items-center gap-2">
          <Palette className="h-3 w-3 text-social-green" />
          Theme Settings
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3 pt-0">
        <div className="grid grid-cols-2 gap-2">
          {themes.map((themeOption) => (
            <Button
              key={themeOption.value}
              onClick={() => setTheme(themeOption.value)}
              variant={theme === themeOption.value ? "default" : "outline"}
              className={`
                relative h-auto p-3 flex flex-col items-center gap-2
                ${theme === themeOption.value 
                  ? 'bg-social-green text-white border-social-green' 
                  : 'hover:bg-muted/50 border-muted'
                }
                transition-all duration-200 font-pixelated text-xs
              `}
            >
              {theme === themeOption.value && (
                <Check className="absolute top-1 right-1 h-2 w-2" />
              )}
              
              {/* Theme color preview */}
              <div className="flex gap-1">
                {themeOption.colors.map((color, index) => (
                  <div
                    key={index}
                    className="w-3 h-3 rounded-full border border-white/20"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
              
              <span className="text-xs">{themeOption.label}</span>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
