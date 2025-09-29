self.addEventListener("push", event => {
  alert('push')
  const data = event.data ? event.data.json() : {};
  const title = data.title || "새 메시지";
  const options = {
    body: data.body || "메시지가 도착했습니다!",
    icon: "/pwa-192x192.png",
    badge: "/pwa-192x192.png"
  };
  event.waitUntil(self.registration.showNotification(title, options));
});