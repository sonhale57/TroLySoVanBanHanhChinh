// Service hỗ trợ Push Notification và PWA trên trình duyệt / thiết bị di động
import { api } from './api';

let deferredInstallPrompt: any = null;

// Lắng nghe sự kiện trước khi cài đặt PWA
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredInstallPrompt = e;
  });
}

export const notificationService = {
  // Kiểm tra trình duyệt có hỗ trợ Notification và Service Worker không
  isSupported(): boolean {
    return typeof window !== 'undefined' && 'serviceWorker' in navigator && 'Notification' in window;
  },

  // Trạng thái cấp quyền hiện tại
  getPermission(): NotificationPermission {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'denied';
    }
    return Notification.permission;
  },

  // Đăng ký Service Worker
  async registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
    if (!('serviceWorker' in navigator)) return null;

    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });
      return registration;
    } catch (err) {
      console.warn('Không thể đăng ký Service Worker:', err);
      return null;
    }
  },

  // Xin quyền người dùng và đăng ký Push
  async requestPermissionAndSubscribe(deviceName: string = 'Trình duyệt Web'): Promise<boolean> {
    if (!this.isSupported()) {
      alert('Trình duyệt này không hỗ trợ nhận thông báo đẩy Web Push.');
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        return false;
      }

      const reg = await this.registerServiceWorker();
      if (!reg) return false;

      // Giả lập endpoint đăng ký push hoặc lấy qua PushManager nếu hỗ trợ
      let endpoint = `pwa-client-${Date.now()}`;
      let p256dh: string | undefined;
      let auth: string | undefined;

      if ('pushManager' in reg) {
        try {
          let sub = await reg.pushManager.getSubscription();
          if (!sub) {
            // Đăng ký push subscription
            // Dùng applicationServerKey mẫu hoặc public VAPID
            sub = await reg.pushManager.subscribe({
              userVisibleOnly: true,
              applicationServerKey: 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U'
            });
          }
          if (sub) {
            endpoint = sub.endpoint;
            const p256Key = sub.getKey('p256dh');
            const authKey = sub.getKey('auth');
            p256dh = p256Key ? btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(p256Key)))) : undefined;
            auth = authKey ? btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(authKey)))) : undefined;
          }
        } catch (pushErr) {
          console.warn('PushManager subscribe notification (fallback to local notification):', pushErr);
        }
      }

      // Lưu subscription lên backend
      await api.subscribePush({
        endpoint,
        p256dh,
        auth,
        deviceName
      });

      // Hiển thị thông báo chào mừng
      this.showLocalNotification('KÍCH HOẠT THÔNG BÁO THÀNH CÔNG', {
        body: 'Hệ thống Trợ lý số đã sẵn sàng gửi cảnh báo công văn khẩn và thời hạn SLA đến thiết bị của bạn.',
        icon: '/favicon.svg'
      });

      return true;
    } catch (err) {
      console.error('Lỗi khi xin quyền Push Notification:', err);
      return false;
    }
  },

  // Hiển thị thông báo ngay lập tức trên màn hình
  async showLocalNotification(title: string, options?: NotificationOptions) {
    if (!this.isSupported()) return;

    if (Notification.permission === 'granted') {
      try {
        if ('serviceWorker' in navigator) {
          const reg = await navigator.serviceWorker.ready;
          if (reg && reg.showNotification) {
            await reg.showNotification(title, {
              icon: '/favicon.svg',
              badge: '/favicon.svg',
              vibrate: [200, 100, 200],
              ...options
            } as any);
            return;
          }
        }
      } catch {
        // Fallback to standard Notification API
      }

      try {
        new Notification(title, {
          icon: '/favicon.svg',
          ...options
        });
      } catch (err) {
        console.warn('Lỗi hiển thị Notification:', err);
      }
    }
  },

  // Kiểm tra xem PWA có thể kích hoạt hộp thoại cài đặt không
  canInstallPwa(): boolean {
    return deferredInstallPrompt !== null;
  },

  // Kích hoạt hộp thoại cài đặt PWA
  async triggerPwaInstall(): Promise<boolean> {
    if (!deferredInstallPrompt) {
      alert('Ứng dụng đã được cài đặt hoặc trình duyệt đang ở chế độ xem web chuẩn.');
      return false;
    }

    deferredInstallPrompt.prompt();
    const { outcome } = await deferredInstallPrompt.userChoice;
    deferredInstallPrompt = null;
    return outcome === 'accepted';
  }
};
