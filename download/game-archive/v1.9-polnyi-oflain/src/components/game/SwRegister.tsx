'use client';

import { useEffect } from 'react';

/* v1.9: регистрация service worker — после первого визита игра
   работает без интернета и ставится на телефон как приложение */
export default function SwRegister() {
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
    const register = () => {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        /* офлайн-режим недоступен — игра всё равно работает */
      });
    };
    if (document.readyState === 'complete') {
      register();
    } else {
      window.addEventListener('load', register);
      return () => window.removeEventListener('load', register);
    }
  }, []);
  return null;
}
