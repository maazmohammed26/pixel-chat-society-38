
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Disable zoom on mobile by setting viewport meta tag
const viewportMeta = document.querySelector('meta[name="viewport"]');
if (viewportMeta) {
  viewportMeta.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover');
} else {
  const meta = document.createElement('meta');
  meta.name = 'viewport';
  meta.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover';
  document.head.appendChild(meta);
}

// Add performance optimizations
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Service worker registration failed, but app should still work
    });
  });
}

// Improve real-time refresh by clearing cache periodically
const clearOldCache = () => {
  try {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith('temp-') || key.startsWith('cache-')) {
        const timestamp = localStorage.getItem(key + '-timestamp');
        if (timestamp) {
          const age = Date.now() - parseInt(timestamp);
          if (age > 24 * 60 * 60 * 1000) { // 24 hours
            localStorage.removeItem(key);
            localStorage.removeItem(key + '-timestamp');
          }
        }
      }
    });
  } catch (error) {
    console.warn('Cache cleanup failed:', error);
  }
};

clearOldCache();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
