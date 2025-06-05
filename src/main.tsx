
import React, { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Disable zoom on mobile by setting viewport meta tag with user-scalable=no
const viewportMeta = document.querySelector('meta[name="viewport"]');
if (viewportMeta) {
  viewportMeta.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover');
} else {
  const meta = document.createElement('meta');
  meta.name = 'viewport';
  meta.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover';
  document.head.appendChild(meta);
}

// Additional touch and zoom prevention
document.addEventListener('touchmove', function(event) {
  if (event.scale !== 1) {
    event.preventDefault();
  }
}, { passive: false });

document.addEventListener('gesturestart', function(event) {
  event.preventDefault();
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
