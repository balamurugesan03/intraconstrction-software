import { useEffect, useState } from 'react';

/* Install-as-app support. Chrome/Edge/Android fire `beforeinstallprompt`, which we keep so an
   "Install app" button can show the native prompt later. iPhone/iPad Safari has no prompt: users
   add the app via Share → Add to Home Screen, so we show those steps instead. */
let deferred = null;
const listeners = new Set();
const emit = () => listeners.forEach((fn) => fn());

const standalone = () => window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

export function registerPWA() {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferred = e;
    emit();
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    emit();
  });
  if ('serviceWorker' in navigator && import.meta.env.PROD) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`, { scope: import.meta.env.BASE_URL }).catch(() => {});
    });
  }
}

/** { canInstall, ios, install() } — canInstall is false once the app is installed / opened as an app. */
export function useInstallApp() {
  const [, force] = useState(0);
  useEffect(() => {
    const fn = () => force((n) => n + 1);
    listeners.add(fn);
    return () => listeners.delete(fn);
  }, []);
  const installed = standalone();
  const ios = !installed && isIOS();
  return {
    canInstall: !installed && (!!deferred || ios),
    ios,
    install: async () => {
      if (!deferred) return false;
      deferred.prompt();
      const { outcome } = await deferred.userChoice;
      deferred = null;
      emit();
      return outcome === 'accepted';
    },
  };
}
