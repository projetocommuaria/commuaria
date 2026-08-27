// Commuária - Service Worker para Notificações Nativas e Multiplataforma (PWA / Web Push)
const CACHE_NAME = 'commuaria-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Listener para eventos de Push enviados pelo servidor ou disparos em segundo plano
self.addEventListener('push', (event) => {
  if (!event.data) return;

  try {
    const data = event.data.json();
    const title = data.title || '🔔 Commuária - Notificação do Sistema';
    const options = {
      body: data.body || 'Atualização no seu chamado de zeladoria.',
      icon: data.icon || '/logo_minimalista.png',
      badge: data.badge || '/logo_minimalista.png',
      tag: data.tag || 'commuaria-notification',
      data: data.data || { url: '/' },
      vibrate: [200, 100, 200],
      requireInteraction: data.requireInteraction || false,
      actions: data.actions || [
        { action: 'open', title: 'Ver Ocorrência' },
        { action: 'close', title: 'Fechar' }
      ]
    };

    event.waitUntil(
      self.registration.showNotification(title, options)
    );
  } catch (e) {
    const text = event.data.text();
    event.waitUntil(
      self.registration.showNotification('🔔 Commuária', {
        body: text,
        icon: '/logo_minimalista.png',
        badge: '/logo_minimalista.png',
      })
    );
  }
});

// Ação ao clicar na notificação nativa do sistema operacional
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'close') return;

  const targetUrl = (event.notification.data && event.notification.data.url) || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Se já houver uma janela aberta do Commuária, foca nela
      for (const client of clientList) {
        if ('focus' in client) {
          if (client.url.includes(self.location.origin)) {
            client.focus();
            client.postMessage({
              type: 'COMMUARIA_NOTIFICATION_CLICKED',
              reportId: event.notification.data?.reportId,
              status: event.notification.data?.status
            });
            return;
          }
        }
      }
      // Se nenhuma janela estiver aberta, abre uma nova
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
