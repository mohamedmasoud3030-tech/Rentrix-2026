import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { Toaster, toast } from 'react-hot-toast';
import { registerSW } from 'virtual:pwa-register';

const APP_VERSION = __APP_VERSION__;
const VERSION_STORAGE_KEY = 'rentrix:app-version';

const resetStaleCaches = async () => {
  if (typeof window === 'undefined') return;

  const previousVersion = window.localStorage.getItem(VERSION_STORAGE_KEY);
  if (previousVersion === APP_VERSION) return;

  window.localStorage.setItem(VERSION_STORAGE_KEY, APP_VERSION);

  if ('caches' in window) {
    const cacheKeys = await window.caches.keys();
    await Promise.all(cacheKeys.map((key) => window.caches.delete(key)));
  }

  if ('serviceWorker' in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map((registration) => registration.unregister()));
  }
};

void resetStaleCaches();

const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    toast('يوجد تحديث جديد للتطبيق. جارٍ تحميل النسخة الأحدث...', {
      icon: '🔄',
      duration: 2500,
    });
    void updateSW(true);
  },
  onOfflineReady() {
    toast.success('التطبيق جاهز للعمل دون اتصال عند الحاجة.');
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
    <Toaster position="top-center" />
  </React.StrictMode>
);
