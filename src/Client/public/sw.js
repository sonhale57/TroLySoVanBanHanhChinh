// Service Worker cho Trợ lý số Văn bản Công vụ
// Hỗ trợ PWA Cài đặt màn hình chính & Push Notification thời gian thực

const CACHE_NAME = 'govdoc-pwa-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Xử lý sự kiện Push Notification từ máy chủ
self.addEventListener('push', (event) => {
  let data = {
    title: 'THÔNG BÁO CÔNG VỤ MỚI',
    body: 'Có cập nhật quan trọng về tiến độ công văn và thời hạn SLA.',
    urgencyLevel: 'HỎA TỐC',
    targetUrl: '/',
    tag: 'govdoc-notification'
  };

  if (event.data) {
    try {
      const parsed = event.data.json();
      data = { ...data, ...parsed };
    } catch {
      data.body = event.data.text() || data.body;
    }
  }

  const options = {
    body: data.body,
    icon: '/favicon.svg',
    badge: '/favicon.svg',
    vibrate: [200, 100, 200],
    data: {
      url: data.targetUrl || '/'
    },
    tag: data.tag || 'govdoc-alert',
    renotify: true,
    requireInteraction: data.urgencyLevel === 'HỎA TỐC' || data.urgencyLevel === 'THƯỢNG KHẨN'
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Xử lý khi cán bộ click vào thông báo đẩy
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = (event.notification.data && event.notification.data.url) ? event.notification.data.url : '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          if (client.url.includes(self.location.origin)) {
            client.navigate(targetUrl);
            return client.focus();
          }
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
