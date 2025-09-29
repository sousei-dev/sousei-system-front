self.addEventListener("push", event => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || "새 메시지";
  const options = {
    body: data.body || "메시지가 도착했습니다!",
    icon: "/icon.png",
    badge: "/badge.png"
  };
  event.waitUntil(self.registration.showNotification(title, options));
});