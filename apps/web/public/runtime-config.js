// edit window.__VITE_API_URL or localStorage VITE_API_URL to change backend without rebuild. Example: localStorage.setItem('VITE_API_URL','https://xxx.ngrok-free.app'); location.reload();
// This file is loaded at runtime (no rebuild needed). Edit or override to point the frontend to a different backend, e.g. an ngrok URL.
// Usage in browser console:
//   localStorage.setItem('VITE_API_URL','https://xxx.ngrok-free.app'); location.reload();
// Or via query param: https://your-frontend/?api=https://xxx.ngrok-free.app
// Or edit this file directly if serving statically: window.__VITE_API_URL = 'https://xxx.ngrok-free.app';
window.__VITE_API_URL = window.__VITE_API_URL || (window.localStorage ? localStorage.getItem('VITE_API_URL') || '' : '');
window.__ENV__ = window.__ENV__ || {};
if (window.__VITE_API_URL) window.__ENV__.VITE_API_URL = window.__VITE_API_URL;
