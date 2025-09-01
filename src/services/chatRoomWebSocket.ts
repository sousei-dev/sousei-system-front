import { ref } from 'vue'

export interface ChatRoomMessage {
  type: string
  data?: any
  conversation_id?: string
  sender_id?: string
  message?: any
  update_type?: string
  update_data?: {
    last_message?: {
      id: string
      body: string
      sender_id: string
      sender_name: string
      created_at: string
    }
    unread_count: number
    timestamp: string
  }
  timestamp?: string
}

export interface ChatRoomWebSocketCallbacks {
  onMessage?: (message: ChatRoomMessage) => void
  onOpen?: () => void
  onClose?: () => void
  onError?: (error: Event) => void
}

class ChatRoomWebSocketService {
  private ws: WebSocket | null = null
  private currentConversationId: string | null = null
  private callbacks: ChatRoomWebSocketCallbacks = {}
  private isConnecting = ref(false)
  private isConnected = ref(false)

  // 채팅방 웹소켓 연결
  connectToChatRoom(conversationId: string, token: string, callbacks: ChatRoomWebSocketCallbacks = {}) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN && this.currentConversationId === conversationId) {
      console.log('이미 해당 채팅방에 연결되어 있습니다.')
      return
    }

    // 기존 연결이 있으면 해제
    this.disconnect()

    this.currentConversationId = conversationId
    this.callbacks = callbacks
    this.isConnecting.value = true

    try {
      const wsUrl = `${import.meta.env.VITE_WEB_SOCKET}/ws/chat/${conversationId}?token=${token}`
      console.log('채팅방 웹소켓 연결 시도:', wsUrl)
      
      this.ws = new WebSocket(wsUrl)

      this.ws.onopen = () => {
        console.log(`채팅방 ${conversationId} 웹소켓 연결 성공`)
        this.isConnected.value = true
        this.isConnecting.value = false
        
        if (this.callbacks.onOpen) {
          this.callbacks.onOpen()
        }
      }

      this.ws.onmessage = (event) => {
        try {
          const message: ChatRoomMessage = JSON.parse(event.data)
          console.log('채팅방 웹소켓 메시지 수신:', message)
          
          if (this.callbacks.onMessage) {
            this.callbacks.onMessage(message)
          }
        } catch (error) {
          console.error('채팅방 웹소켓 메시지 파싱 오류:', error)
        }
      }

      this.ws.onclose = (event) => {
        console.log(`채팅방 ${conversationId} 웹소켓 연결 종료:`, event.code, event.reason)
        this.isConnected.value = false
        this.isConnecting.value = false
        this.currentConversationId = null
        
        if (this.callbacks.onClose) {
          this.callbacks.onClose()
        }
      }

      this.ws.onerror = (error) => {
        console.error(`채팅방 ${conversationId} 웹소켓 오류:`, error)
        this.isConnecting.value = false
        
        if (this.callbacks.onError) {
          this.callbacks.onError(error)
        }
      }
    } catch (error) {
      console.error('채팅방 웹소켓 연결 오류:', error)
      this.isConnecting.value = false
    }
  }

  // 메시지 전송
  send(message: ChatRoomMessage) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message))
    } else {
      console.error('채팅방 웹소켓이 연결되지 않았습니다.')
    }
  }

  // 연결 종료
  disconnect() {
    if (this.ws) {
      console.log(`채팅방 ${this.currentConversationId} 웹소켓 연결 해제`)
      this.ws.close()
      this.ws = null
    }
    this.isConnected.value = false
    this.isConnecting.value = false
    this.currentConversationId = null
  }

  // 연결 상태 확인
  getConnectionStatus() {
    return {
      isConnected: this.isConnected.value,
      isConnecting: this.isConnecting.value,
      readyState: this.ws?.readyState,
      currentConversationId: this.currentConversationId
    }
  }

  // 현재 연결된 채팅방 ID 반환
  getCurrentConversationId(): string | null {
    return this.currentConversationId
  }
}

export const chatRoomWebSocketService = new ChatRoomWebSocketService() 