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

// 앱 내 알림 (웹사이트를 보고 있을 때 표시)
const showInAppNotification = ref(false)
const inAppNotificationTitle = ref('')
const inAppNotificationBody = ref('')
const inAppNotificationColor = ref('primary')

// 브라우저 탭 제목 업데이트
const updateTabTitle = (unreadCount: number) => {
  if (unreadCount > 0) {
    document.title = `(${unreadCount}) ${originalTitle.value}`
  } else {
    document.title = originalTitle.value
  }
}

// 브라우저 알림 표시
const showBrowserNotification = (message: WebSocketMessage) => {
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

// 브라우저 알림 생성
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
      
    case 'conversation_invited':
      // 그룹 채팅방 초대 알림
      console.log('전역 웹소켓: 그룹 채팅방 초대:', message)
      
      // 알림 카운트 업데이트
      chatNotificationStore.setNewMessageNotification(true)
      
      // 탭이 포커스되지 않았을 때만 브라우저 알림 표시
      if (!isTabFocused.value) {
        showBrowserNotification(message)
      }
      
      // 채팅 페이지가 활성화되어 있으면 해당 페이지에 이벤트 전달
      if (window.location.pathname === '/chat') {
        console.log('채팅 페이지에 conversation_invited 이벤트 전달')
        
        // 커스텀 이벤트를 통해 채팅 페이지에 알림
        window.dispatchEvent(new CustomEvent('chat_list_update', {
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

// 서비스 워커 푸시 메시지 처리 (사용자가 웹사이트를 보고 있을 때)
const handleServiceWorkerPushMessage = (event: MessageEvent) => {
  console.log('서비스 워커로부터 푸시 메시지 수신:', event.data)
  
  if (event.data && event.data.type === 'PUSH_RECEIVED') {
    const pushData = event.data.data
    console.log('푸시 데이터:', pushData)
    
    // 사용자가 웹사이트를 보고 있을 때는 시스템 알림 대신 앱 내 알림 표시
    inAppNotificationTitle.value = pushData.title || 'SOUSEI 시스템'
    inAppNotificationBody.value = pushData.body || '새 메시지가 도착했습니다'
    inAppNotificationColor.value = 'info'
    showInAppNotification.value = true
    console.log('앱 내 알림 표시:', inAppNotificationTitle.value)
    
    // 채팅 관련 푸시인 경우
    if (pushData.data && pushData.data.type === 'chat') {
      chatNotificationStore.incrementUnreadCount()
      chatNotificationStore.setNewMessageNotification(true)
      console.log('채팅 푸시 수신: 알림 카운트 업데이트')
      
      // 채팅 페이지에 이벤트 전달
      if (window.location.pathname === '/chat') {
        window.dispatchEvent(new CustomEvent('chat_list_update', {
          detail: pushData.data
        }))
      }
    }
    
    // 다른 타입의 푸시 처리 (비자 갱신, 연락 등)
    console.log('사용자가 웹사이트를 보고 있어 앱 내 알림으로 표시합니다.')
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
  
  // 브라우저 알림 권한 확인
  if ('Notification' in window) {
    notificationPermission.value = Notification.permission
  }
  
  // 탭 포커스 상태 감지 이벤트 리스너 등록
  document.addEventListener('visibilitychange', handleVisibilityChange)
  window.addEventListener('focus', handleFocus)
  window.addEventListener('blur', handleBlur)
  
  // 서비스 워커 메시지 리스너 등록 (푸시 알림용)
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', handleServiceWorkerPushMessage)
    console.log('서비스 워커 메시지 리스너 등록 완료')
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
  
  // 서비스 워커 메시지 리스너 제거
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.removeEventListener('message', handleServiceWorkerPushMessage)
  }
  
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
