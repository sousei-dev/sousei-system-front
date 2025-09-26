<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue'
import { websocketService, type WebSocketMessage } from '@/services/websocket'
import { useChatNotificationStore } from '@/stores/chatNotification'

// 채팅 알림 store
const chatNotificationStore = useChatNotificationStore()

// 브라우저 탭 알림 관련 상태
const originalTitle = ref('')
const isTabFocused = ref(true)
const notificationPermission = ref<NotificationPermission>('default')

// PWA 푸시 알림 관련 상태
const pushSubscription = ref<PushSubscription | null>(null)

// Safari 감지
const isSafari = ref(false)
const isIOS = ref(false)
const isStandalone = ref(false)

// 브라우저 탭 제목 업데이트
const updateTabTitle = (unreadCount: number) => {
  if (unreadCount > 0) {
    document.title = `(${unreadCount}) ${originalTitle.value}`
  } else {
    document.title = originalTitle.value
  }
}

// Safari PWA 알림 지원 확인
const checkSafariPWASupport = () => {
  const userAgent = navigator.userAgent
  isSafari.value = /Safari/.test(userAgent) && !/Chrome/.test(userAgent)
  isIOS.value = /iPad|iPhone|iPod/.test(userAgent)
  
  // PWA 모드 확인 (홈화면에서 실행 중인지)
  isStandalone.value = window.matchMedia('(display-mode: standalone)').matches || 
                      (window.navigator as any).standalone === true
  
  console.log('브라우저 정보:', {
    isSafari: isSafari.value,
    isIOS: isIOS.value,
    isStandalone: isStandalone.value,
    userAgent: userAgent
  })
}

// Safari용 대체 알림 방법
const showSafariNotification = (message: WebSocketMessage) => {
  // 1. 탭 제목 변경 (이미 구현됨)
  updateTabTitle(chatNotificationStore.unreadCount)
  
  // 2. 페이지 내 알림 표시
  showInPageNotification(message)
  
  // 3. 진동 (지원되는 경우)
  if ('vibrate' in navigator) {
    navigator.vibrate([200, 100, 200])
  }
  
  // 4. 사운드 재생 (선택사항)
  playNotificationSound()
}

// 페이지 내 알림 표시
const showInPageNotification = (message: WebSocketMessage) => {
  // 기존 알림 제거
  const existingNotification = document.querySelector('.safari-notification')
  if (existingNotification) {
    existingNotification.remove()
  }
  
  // 새 알림 생성
  const notification = document.createElement('div')
  notification.className = 'safari-notification'
  notification.innerHTML = `
    <div class="notification-content">
      <div class="notification-icon">🔔</div>
      <div class="notification-text">
        <div class="notification-title">새 메시지</div>
        <div class="notification-body">${message.data?.message_body || '새 메시지가 도착했습니다'}</div>
      </div>
      <button class="notification-close" onclick="this.parentElement.parentElement.remove()">×</button>
    </div>
  `
  
  // 스타일 적용
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #fff;
    border: 1px solid #ddd;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    z-index: 10000;
    max-width: 300px;
    animation: slideInRight 0.3s ease-out;
  `
  
  // 애니메이션 스타일 추가
  const style = document.createElement('style')
  style.textContent = `
    @keyframes slideInRight {
      from { transform: translateX(100%); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
    .safari-notification .notification-content {
      display: flex;
      align-items: center;
      padding: 12px;
      gap: 8px;
    }
    .safari-notification .notification-icon {
      font-size: 20px;
    }
    .safari-notification .notification-text {
      flex: 1;
    }
    .safari-notification .notification-title {
      font-weight: bold;
      font-size: 14px;
      color: #333;
      margin-bottom: 2px;
    }
    .safari-notification .notification-body {
      font-size: 12px;
      color: #666;
      line-height: 1.3;
    }
    .safari-notification .notification-close {
      background: none;
      border: none;
      font-size: 18px;
      color: #999;
      cursor: pointer;
      padding: 0;
      width: 20px;
      height: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
  `
  
  if (!document.querySelector('#safari-notification-styles')) {
    style.id = 'safari-notification-styles'
    document.head.appendChild(style)
  }
  
  document.body.appendChild(notification)
  
  // 5초 후 자동 제거
  setTimeout(() => {
    if (notification.parentElement) {
      notification.remove()
    }
  }, 5000)
}

// 알림 사운드 재생
const playNotificationSound = () => {
  try {
    // 간단한 비프음 생성
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    const oscillator = audioContext.createOscillator()
    const gainNode = audioContext.createGain()
    
    oscillator.connect(gainNode)
    gainNode.connect(audioContext.destination)
    
    oscillator.frequency.setValueAtTime(800, audioContext.currentTime)
    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1)
    
    oscillator.start(audioContext.currentTime)
    oscillator.stop(audioContext.currentTime + 0.1)
  } catch (error) {
    console.log('사운드 재생 실패:', error)
  }
}

// 브라우저 알림 표시 (기존 코드 수정)
const showBrowserNotification = (message: WebSocketMessage) => {
  // Safari PWA 모드에서는 대체 방법 사용
  if (isSafari.value && isStandalone.value) {
    showSafariNotification(message)
    return
  }
  
  // 브라우저가 알림을 지원하지 않으면 리턴
  if (!('Notification' in window)) {
    console.log('이 브라우저는 알림을 지원하지 않습니다')
    return
  }

  // 알림 권한이 없으면 요청
  if (Notification.permission === 'default') {
    Notification.requestPermission().then(permission => {
      notificationPermission.value = permission
      if (permission === 'granted') {
        createNotification(message)
      }
    })
  } else if (Notification.permission === 'granted') {
    createNotification(message)
  }
}

// 브라우저 알림 생성 (기존 코드)
const createNotification = (message: WebSocketMessage) => {
  try {
    // 채팅방 제목 찾기 (메시지에서 추출)
    const chatTitle = message.data?.conversation_title || '새 메시지'
    const senderName = message.data?.sender_name || '알 수 없는 사용자'
    const messageBody = message.data?.message_body || '새 메시지가 도착했습니다'
    
    const notification = new Notification(`${chatTitle} - ${senderName}`, {
      body: messageBody,
      icon: '/src/assets/images/logo.png',
      badge: '/src/assets/images/logo.png',
      tag: `chat_${message.data?.conversation_id || 'unknown'}`,
      requireInteraction: false,
      silent: false,
    })
    
    // 알림 클릭 시 해당 채팅방으로 이동
    notification.onclick = () => {
      window.focus()
      // 채팅 페이지로 이동
      if (window.location.pathname !== '/chat') {
        window.location.href = '/chat'
      }
      notification.close()
    }
    
    // 5초 후 자동으로 알림 닫기
    setTimeout(() => {
      notification.close()
    }, 5000)
    
  } catch (error) {
    console.error('브라우저 알림 생성 오류:', error)
  }
}

// 탭 포커스 상태 감지
const handleVisibilityChange = () => {
  isTabFocused.value = !document.hidden
}

// 탭 포커스 상태 감지 (다른 방법)
const handleFocus = () => {
  isTabFocused.value = true
}

const handleBlur = () => {
  isTabFocused.value = false
}

// PWA 푸시 알림 관련 함수들
const urlBase64ToUint8Array = (base64String: string): Uint8Array => {
  const padding = '='.repeat((4 - base64String.length % 4) % 4)
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/')

  const rawData = atob(base64)
  return Uint8Array.from([...rawData].map(char => char.charCodeAt(0)))
}

const subscribeUser = async () => {
  try {
    // Safari PWA에서는 푸시 알림 구독을 시도하지 않음
    if (isSafari.value && isStandalone.value) {
      console.log('Safari PWA 모드에서는 푸시 알림 구독을 건너뜁니다')
      return
    }
    
    const registration = await navigator.serviceWorker.ready

    // VAPID 공개 키 (실제 프로덕션에서는 환경변수로 관리)
    const vapidPublicKey = 'YOUR_PUBLIC_VAPID_KEY'
    const convertedVapidKey = urlBase64ToUint8Array(vapidPublicKey)

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: convertedVapidKey
    })

    pushSubscription.value = subscription

    // 서버에 구독 정보 전송
    await fetch('/api/save-subscription', {
      method: 'POST',
      body: JSON.stringify(subscription),
      headers: { 'Content-Type': 'application/json' }
    })

    console.log('푸시 알림 구독 완료:', subscription)
  } catch (error) {
    console.error('푸시 알림 구독 실패:', error)
  }
}

// 전역 웹소켓 메시지 처리
const handleGlobalWebSocketMessage = (message: WebSocketMessage) => {
  console.log('전역 웹소켓 메시지 수신:', message)

  switch (message.type) {
    case 'new_message':
      // 새 메시지 수신 시 알림 증가
      console.log('전역 웹소켓: 새 메시지 수신:', message)
      chatNotificationStore.incrementUnreadCount()
      chatNotificationStore.setNewMessageNotification(true)
      
      // 탭이 포커스되지 않았을 때만 브라우저 알림 표시
      if (!isTabFocused.value) {
        showBrowserNotification(message)
      }
      break
      
    case 'chat_list_update':
      if (message.update_data && message.update_type === 'conversation_read_all') {
        console.log('conversation_read_all 타입은 나중에 개발할 예정이므로 처리하지 않음:', message)
        return
      }
      
      // 채팅방 리스트 업데이트 (전역으로 처리)
      console.log('전역 웹소켓: 채팅방 리스트 업데이트:', message)

      // 채팅 알림 개수 갱신 (네비게이션용)
      if (message.data && message.data.unread_count !== undefined) {
        // 서버에서 받은 읽지 않은 메시지 개수로 설정
        chatNotificationStore.setUnreadCount(message.data.unread_count)
        chatNotificationStore.setNewMessageNotification(true)
        console.log('전역 웹소켓: 채팅 알림 개수 갱신:', message.data.unread_count)
      } else {
        // unread_count가 없으면 1 증가
        chatNotificationStore.incrementUnreadCount()
        chatNotificationStore.setNewMessageNotification(true)
        console.log('전역 웹소켓: 채팅 알림 개수 1 증가')
      }

      // 탭이 포커스되지 않았을 때만 브라우저 알림 표시
      if (!isTabFocused.value) {
        showBrowserNotification(message)
      }

      // 채팅 페이지가 활성화되어 있으면 해당 페이지에 이벤트 전달
      if (window.location.pathname === '/chat') {
        console.log('채팅 페이지에 chat_list_update 이벤트 전달')

        // 커스텀 이벤트를 통해 채팅 페이지에 알림
        window.dispatchEvent(new CustomEvent('chat_list_update', {
          detail: message,
        }))
      } else {
        console.log('채팅 페이지가 활성화되지 않음, 이벤트 전달 생략')
      }

      break
      
    case 'conversation_created':
      // 새 채팅방 생성 처리
      console.log('전역 웹소켓: 새 채팅방 생성:', message)
      
      // 채팅 페이지가 활성화되어 있으면 해당 페이지에 이벤트 전달
      if (window.location.pathname === '/chat') {
        console.log('채팅 페이지에 conversation_created 이벤트 전달')
        
        // 커스텀 이벤트를 통해 채팅 페이지에 알림
        window.dispatchEvent(new CustomEvent('conversation_created', {
          detail: message,
        }))
      } else {
        console.log('채팅 페이지가 활성화되지 않음, 이벤트 전달 생략')
      }
      
      break
      
    case 'message_read':
      // 메시지 읽음 처리 (필요시)
      console.log('전역 웹소켓: 메시지 읽음:', message)
      break
      
    case 'user_online':
    case 'user_offline':
      // 사용자 온라인 상태 업데이트 (필요시)
      console.log('전역 웹소켓: 사용자 상태 변경:', message.type, message.data)
      break
      
    default:
      console.log('전역 웹소켓: 알 수 없는 메시지 타입:', message.type, message)
  }
}

// 전역 웹소켓 연결
const connectGlobalWebSocket = () => {
  const token = localStorage.getItem('token')
  if (!token) {
    console.log('토큰이 없어 전역 웹소켓 연결 생략')
    return
  }

  console.log('전역 웹소켓 연결 시도...')
  websocketService.connect(token, {
    onOpen: () => {
      console.log('전역 웹소켓 연결됨')
    },
    onMessage: (message: WebSocketMessage) => {
      handleGlobalWebSocketMessage(message)
    },
    onClose: () => {
      console.log('전역 웹소켓 연결 종료')

      // 자동 재연결 시도
      setTimeout(() => {
        console.log('전역 웹소켓 재연결 시도...')
        connectGlobalWebSocket()
      }, 3000)
    },
    onError: error => {
      console.error('전역 웹소켓 오류:', error)
    },
  })
}

// 읽지 않은 메시지 개수 변화 감지하여 탭 제목 업데이트
watch(() => chatNotificationStore.unreadCount, (newCount) => {
  updateTabTitle(newCount)
})

// 앱 마운트 시 초기화
onMounted(() => {
  // 원본 타이틀 저장
  originalTitle.value = document.title
  
  // Safari 감지
  checkSafariPWASupport()
  
  // 브라우저 알림 권한 확인
  if ('Notification' in window) {
    notificationPermission.value = Notification.permission
  }
  
  // 탭 포커스 상태 감지 이벤트 리스너 등록
  document.addEventListener('visibilitychange', handleVisibilityChange)
  window.addEventListener('focus', handleFocus)
  window.addEventListener('blur', handleBlur)
  
  // PWA 푸시 알림 구독 (Safari PWA가 아닌 경우에만)
  if ('serviceWorker' in navigator && 'PushManager' in window) {
    subscribeUser()
  }
  
  // 웹소켓 연결
  connectGlobalWebSocket()
})

// 앱 언마운트 시 정리
onUnmounted(() => {
  // 이벤트 리스너 제거
  document.removeEventListener('visibilitychange', handleVisibilityChange)
  window.removeEventListener('focus', handleFocus)
  window.removeEventListener('blur', handleBlur)
  
  // 웹소켓 연결 해제
  websocketService.disconnect()
  
  // 타이틀 원복
  document.title = originalTitle.value
})
</script>

<template>
  <VApp>
    <RouterView />
  </VApp>
</template>

<style>
/* 모바일 터치 최적화 */
@media (hover: none) and (pointer: coarse) {
  .layout-vertical-nav {
    .nav-link a:hover,
    .nav-link div:hover,
    .nav-group-label:hover {
      background-color: transparent !important;
      color: inherit !important;
      transform: none !important;
      box-shadow: none !important;
    }
  }
  
  /* 모든 링크에 터치 최적화 */
  a {
    touch-action: manipulation;
    -webkit-tap-highlight-color: transparent;
  }
}
</style>
