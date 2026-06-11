import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { hydrateCacheFromLocalStorageSync, loadTranslationsCache } from "./hooks/useTranslations";

// Hydrate translations synchronously from localStorage BEFORE React renders.
// This eliminates the flash of raw keys (e.g. "auth.signIn") on every page load.
hydrateCacheFromLocalStorageSync();
// Kick off a background refresh so stale entries get updated.
try {
  const savedLang = localStorage.getItem('pure-life-language') || 'pl';
  loadTranslationsCache(savedLang).catch(() => {});
} catch {}

// Register Service Worker early for caching benefits
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw-push.js').then((reg) => {
      console.log('[App] Service Worker registered, scope:', reg.scope);
      window.__swRegistration = reg;
      // When a new SW is waiting, show update banner instead of auto-activating
      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('[App] New SW installed, showing update banner');
              window.dispatchEvent(new CustomEvent('swUpdateAvailable'));
            }
          });
        }
      });
    }).catch((err) => {
      console.log('[App] SW registration failed:', err);
    });
  });
}

const root = createRoot(document.getElementById("root")!);

if (import.meta.env.DEV) {
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
} else {
  root.render(<App />);
}
