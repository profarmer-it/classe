/* La Classe: il service worker serve solo a rendere l'app installabile.
   Non tiene copie di niente: dati e pagine arrivano sempre dalla rete. */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', () => {});
