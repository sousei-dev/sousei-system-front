<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { websocketService, type WebSocketMessage } from '@/services/websocket'
import { useChatNotificationStore } from '@/stores/chatNotification'

// 채팅 알림 store
const chatNotificationStore = useChatNotificationStore()

// 전역 웹소켓 메시지 처리
const handleGlobalWebSocketMessage = (message: WebSocketMessage) => {
  console.log('전역 웹소켓 메시지 수신:', message)

  switch (message.type) {
    case 'new_message':
      // 새 메시지 수신 시 알림 증가
      console.log('전역 웹소켓: 새 메시지 수신:', message)
      chatNotificationStore.incrementUnreadCount()
      chatNotificationStore.setNewMessageNotification(true)
      break
    case 'chat_list_update':
    
    if (message.update_data && message.update_type === 'conversation_read_all') {
      console.log('conversation_read_all 타입은 나중에 개발할 예정이므로 처리하지 않음:', message)
      return;
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

// 앱 마운트 시 웹소켓 연결
onMounted(() => {
  connectGlobalWebSocket()
})

// 앱 언마운트 시 웹소켓 연결 해제
onUnmounted(() => {
  websocketService.disconnect()
})
</script>

<template>
  <VApp>
    <RouterView />
  </VApp>
</template>
