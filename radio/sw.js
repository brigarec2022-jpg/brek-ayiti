// Radio BREK — service worker minimal : permet l'installation sur l'écran d'accueil.
// Aucune mise en cache : le direct et les fichiers audio passent toujours par le réseau.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', () => {});
