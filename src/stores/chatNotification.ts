import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useChatNotificationStore = defineStore('chatNotification', () => {
  // 읽지 않은 메시지 개수
  const unreadCount = ref(0)
  
  // 새 메시지 알림 여부
  const hasNewMessage = ref(false)
  
  // 전체 읽지 않은 메시지 개수 계산
  const totalUnreadCount = computed(() => unreadCount.value)
  
  // 알림이 있는지 여부
  const hasNotification = computed(() => unreadCount.value > 0)
  
  // 읽지 않은 메시지 개수 설정
  const setUnreadCount = (count: number) => {
    unreadCount.value = count
  }
  
  // 읽지 않은 메시지 개수 증가
  const incrementUnreadCount = () => {
    unreadCount.value++
  }
  
  // 읽지 않은 메시지 개수 감소
  const decrementUnreadCount = (count: number) => {
    if (unreadCount.value > 0) {
      unreadCount.value = unreadCount.value - count
    }
  }
  
  // 새 메시지 알림 설정
  const setNewMessageNotification = (hasNew: boolean) => {
    hasNewMessage.value = hasNew
  }
  
  // 모든 알림 초기화
  const clearAllNotifications = () => {
    unreadCount.value = 0
    hasNewMessage.value = false
  }
  
  // 특정 대화방의 읽지 않은 메시지 개수 설정
  const setConversationUnreadCount = (conversationId: string, count: number) => {
    // 현재는 전체 개수만 관리하지만, 필요시 개별 대화방별로 확장 가능
    setUnreadCount(count)
  }
  
  return {
    // 상태
    unreadCount,
    hasNewMessage,
    
    // 계산된 속성
    totalUnreadCount,
    hasNotification,
    
    // 액션
    setUnreadCount,
    incrementUnreadCount,
    decrementUnreadCount,
    setNewMessageNotification,
    clearAllNotifications,
    setConversationUnreadCount
  }
}) 