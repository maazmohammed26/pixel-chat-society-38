
import React, { useState, useEffect } from 'react';
import { ArrowUp } from 'lucide-react';

interface ScrollToTopProps {
  targetElementId?: string;
  scrollThreshold?: number;
}

export function ScrollToTop({ targetElementId = 'post-creator', scrollThreshold = 200 }: ScrollToTopProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const toggleVisibility = () => {
      if (window.pageYOffset > scrollThreshold) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener('scroll', toggleVisibility);
    return () => window.removeEventListener('scroll', toggleVisibility);
  }, [scrollThreshold]);

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
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
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
