// Push event - 백엔드에서 푸시 전송 시 여기서 수신!
self.addEventListener('push', event => {
  console.log('🔔 PUSH EVENT RECEIVED!', event)
  console.log('Push event type:', typeof event.data)
  console.log('Has data:', !!event.data)
  
  // 아이폰 사파리 PWA에서의 푸시 데이터 처리 개선
  let data = {}
  if (event.data) {
    try {
      data = event.data.json()
      console.log('✅ Parsed push data:', JSON.stringify(data, null, 2))
    } catch (e) {
      console.error('❌ Push data parsing error:', e)
      try {
        const textData = event.data.text()
        console.log('Raw text data:', textData)
        data = JSON.parse(textData)
        console.log('✅ Text parsed push data:', JSON.stringify(data, null, 2))
      } catch (e2) {
        console.error('❌ Text parsing also failed:', e2)
        data = { 
          title: '새 메시지', 
          body: event.data.text() || '새 메시지가 도착했습니다'
        }
      }
    }
  } else {
    console.log('⚠️ No push data received')
    data = {
      title: 'SOUSEI 시스템',
      body: '새 메시지가 도착했습니다'
    }
  }

  // 모든 클라이언트에게 푸시 수신 알림
  self.clients.matchAll().then(clients => {
    console.log('📱 Notifying clients:', clients.length)
    clients.forEach(client => {
      client.postMessage({
        type: 'PUSH_RECEIVED',
        data: data
      })
    })
  })
  
  // 백엔드에서 보낸 데이터 구조에 맞게 처리
  const notificationData = {
    title: data.title || data.notification?.title || 'SOUSEI 시스템',
    body: data.body || data.notification?.body || '새 메시지가 도착했습니다',
    icon: data.icon || data.notification?.icon || '/pwa-192x192.png',
    badge: data.badge || data.notification?.badge || '/pwa-192x192.png',
    tag: data.tag || data.data?.type || 'general-notification',
    data: data.data || {},
    vibrate: data.vibrate || data.notification?.vibrate || [200, 100, 200],
    requireInteraction: data.requireInteraction || data.notification?.requireInteraction || false
  }

  console.log('🔔 Showing notification with data:', JSON.stringify(notificationData, null, 2))

  // 아이폰 사파리 PWA에서의 알림 표시 최적화
  const notificationOptions = {
    body: notificationData.body,
    icon: notificationData.icon,
    badge: notificationData.badge,
    tag: notificationData.tag,
    requireInteraction: notificationData.requireInteraction,
    silent: false,
    vibrate: notificationData.vibrate,
    data: notificationData.data,
    actions: [
      {
        action: 'open',
        title: '열기',
        icon: '/pwa-192x192.png'
      },
      {
        action: 'close',
        title: '닫기',
        icon: '/pwa-192x192.png'
      }
    ]
  }

  event.waitUntil(
    self.registration.showNotification(notificationData.title, notificationOptions)
      .then(() => {
        console.log('✅ Notification shown successfully')
        console.log('Notification title:', notificationData.title)
        console.log('Notification body:', notificationData.body)
      })
      .catch(error => {
        console.error('❌ Failed to show notification:', error)
        console.error('Error details:', error.message)
        console.error('Error stack:', error.stack)
      })
  )
})