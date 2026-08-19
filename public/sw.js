const CACHE_NAME = 'pcs-advocacia-v2';
const APP_SHELL = [
  '/',
  '/manifest.webmanifest',
  '/favicon.png',
  '/apple-touch-icon.png',
  '/iconePS-192.png',
  '/iconePS-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)),
    )),
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return response;
      })
      .catch(() => caches.match(event.request).then((cached) => cached || caches.match('/'))),
  );
});

/* ============================================================
 * ALERTAS PUSH — notificações sonoras e visuais
 * mesmo com o aplicativo fechado.
 *
 * O servidor (scripts/monitor-alertas.mjs) envia o push via FCM;
 * este arquivo exibe a notificação do sistema operacional e,
 * ao clicar, abre o app na página certa.
 * ============================================================ */

function lerDados(event) {
  try {
    return event.data ? event.data.json() : {};
  } catch {
    return {};
  }
}

self.addEventListener('push', (event) => {
  const { data, notification } = lerDados(event);
  const id = (data && data.notificationId) || `push-${Date.now()}`;
  const titulo = (data && data.titulo) || (notification && notification.title) || 'Nova notificação';
  const corpo = (data && data.mensagem) || (notification && notification.body) || '';
  const url = (data && data.url) || '/';

  event.waitUntil(
    self.registration
      .showNotification(titulo, {
        body: corpo,
        icon: '/iconePS-192.png',
        badge: '/favicon.png',
        tag: id,
        renotify: true,
        vibrate: [200, 100, 200, 100, 300],
        data: { url, notificationId: id },
        actions: [{ action: 'abrir', title: 'Abrir' }],
      })
      .then(() => {
        // Avisa as abas/janelas abertas para não repetir o alerta dentro do app.
        return self.clients
          .matchAll({ type: 'window', includeUncontrolled: true })
          .then((clients) =>
            Promise.all(
              clients.map((c) =>
                c.postMessage({ type: 'push-recebido', notificationId: id }),
              ),
            ),
          );
      }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const destino = (event.notification.data && event.notification.data.url) || '/';

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clients) => {
        for (const client of clients) {
          if ('navigate' in client) {
            return client.navigate(destino).then(() => client.focus());
          }
        }
        return self.clients.openWindow(destino);
      }),
  );
});
