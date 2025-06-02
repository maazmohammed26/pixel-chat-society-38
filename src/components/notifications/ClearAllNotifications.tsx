
import React from 'react';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ClearAllNotificationsProps {
  onClearAll: () => void;
  disabled?: boolean;
}

export function ClearAllNotifications({ onClearAll, disabled = false }: ClearAllNotificationsProps) {
  const { toast } = useToast();

  const handleClearAll = () => {
    onClearAll();
    toast({
      title: "Notifications cleared",
      description: "All notifications have been cleared successfully.",
    });
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleClearAll}
      disabled={disabled}
      className="font-pixelated text-xs flex items-center gap-2 hover:bg-destructive hover:text-destructive-foreground"
    >
      <Trash2 className="h-3 w-3" />
      Clear All
    </Button>
  );
}
