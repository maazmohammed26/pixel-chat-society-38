
import React, { useState, useEffect } from 'react';
import { ArrowUp } from 'lucide-react';

interface ScrollToTopProps {
  targetElementId?: string;
  scrollThreshold?: number;
  containerSelector?: string;
}

export function ScrollToTop({ 
  targetElementId = 'post-creator', 
  scrollThreshold = 200,
  containerSelector = '.scroll-container'
}: ScrollToTopProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const toggleVisibility = () => {
      // Check for scroll position in the specific container or window
      const container = document.querySelector(containerSelector);
      const scrollTop = container ? container.scrollTop : window.pageYOffset;
      
      if (scrollTop > scrollThreshold) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    // Add listeners for both window and container scroll
    window.addEventListener('scroll', toggleVisibility);
    
    const container = document.querySelector(containerSelector);
    if (container) {
      container.addEventListener('scroll', toggleVisibility);
    }
    
    return () => {
      window.removeEventListener('scroll', toggleVisibility);
      if (container) {
        container.removeEventListener('scroll', toggleVisibility);
      }
    };
  }, [scrollThreshold, containerSelector]);

  const scrollToTop = () => {
    const targetElement = document.getElementById(targetElementId);
    if (targetElement) {
      targetElement.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
      // Focus on the post creator if it's a textarea or input
      const postInput = targetElement.querySelector('textarea, input');
      if (postInput) {
        (postInput as HTMLElement).focus();
      }
    } else {
      // Scroll the container or window to top
      const container = document.querySelector(containerSelector);
      if (container) {
        container.scrollTo({
          top: 0,
          behavior: 'smooth'
        });
      } else {
        window.scrollTo({
          top: 0,
          behavior: 'smooth'
        });
      }
    }
  };

  return (
    <button
      className={`scroll-to-top ${isVisible ? 'visible' : ''}`}
      onClick={scrollToTop}
      aria-label="Scroll to top and focus post creator"
    >
      <ArrowUp className="h-5 w-5" />
    </button>
  );
}
