
import * as React from "react"
import { cn } from "@/lib/utils"

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, onChange, ...props }, ref) => {
    const textareaRef = React.useRef<HTMLTextAreaElement>(null);
    
    // Improved auto-resize function for better stability
    const autoResize = React.useCallback((textarea: HTMLTextAreaElement) => {
      if (textarea) {
        // Reset height to auto to get the correct scrollHeight
        textarea.style.height = 'auto';
        
        // Calculate new height
        const scrollHeight = textarea.scrollHeight;
        const maxHeight = 120; // max-h-[120px] in pixels
        const minHeight = 48; // min-h-[48px] in pixels
        
        // Set the height within bounds
        const newHeight = Math.max(minHeight, Math.min(scrollHeight, maxHeight));
        textarea.style.height = `${newHeight}px`;
      }
    }, []);

    const handleChange = React.useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
      autoResize(e.target);
      onChange?.(e);
    }, [onChange, autoResize]);

    React.useEffect(() => {
      const textarea = textareaRef.current;
      if (textarea) {
        autoResize(textarea);
      }
    }, [autoResize, props.value]);

    return (
      <textarea
        className={cn(
          "flex min-h-[48px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 overflow-hidden",
          className
        )}
        ref={(node) => {
          textareaRef.current = node;
          if (typeof ref === 'function') {
            ref(node);
          } else if (ref) {
            ref.current = node;
          }
        }}
        onChange={handleChange}
        {...props}
      />
    )
  }
)
Textarea.displayName = "Textarea"

export { Textarea }
