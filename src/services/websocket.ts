import { ref } from 'vue'

export interface WebSocketMessage {
  type: string
  data: any
  conversation_id?: string
  sender_id?: string
  message?: any
}

export interface WebSocketCallbacks {
  onMessage?: (message: WebSocketMessage) => void
  onOpen?: () => void
  onClose?: () => void
  onError?: (error: Event) => void
}

class WebSocketService {
  private ws: WebSocket | null = null
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 1000
  private callbacks: WebSocketCallbacks = {}
  private isConnecting = ref(false)
  private isConnected = ref(false)
  
  // 메시지 리스너들을 저장하는 맵
  private messageListeners = new Map<string, (message: WebSocketMessage) => void>()

  // 웹소켓 연결
  connect(token: string, callbacks: WebSocketCallbacks = {}) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      console.log('웹소켓이 이미 연결되어 있습니다.')
      return
    }

    this.callbacks = callbacks
    this.isConnecting.value = true

    try {
      const wsUrl = `ws://localhost:8000/ws/chat?token=${token}`
      this.ws = new WebSocket(wsUrl)

      this.ws.onopen = () => {
        console.log('웹소켓 연결 성공')
        this.isConnected.value = true
        this.isConnecting.value = false
        this.reconnectAttempts = 0
        
        if (this.callbacks.onOpen) {
          this.callbacks.onOpen()
        }
      }

      this.ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data)
          console.log('웹소켓 메시지 수신:', message)
          
          // 콜백 함수 호출
          if (this.callbacks.onMessage) {
            this.callbacks.onMessage(message)
          }
          
          // 모든 리스너에게 메시지 전달
          this.notifyAllListeners(message)
        } catch (error) {
          console.error('웹소켓 메시지 파싱 오류:', error)
        }
      }

      this.ws.onclose = (event) => {
        console.log('웹소켓 연결 종료:', event.code, event.reason)
        this.isConnected.value = false
        this.isConnecting.value = false
        
        if (this.callbacks.onClose) {
          this.callbacks.onClose()
        }

        // 자동 재연결 시도
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.scheduleReconnect(token)
        }
      }

      this.ws.onerror = (error) => {
        console.error('웹소켓 오류:', error)
        this.isConnecting.value = false
        
        if (this.callbacks.onError) {
          this.callbacks.onError(error)
        }
      }
    } catch (error) {
      console.error('웹소켓 연결 오류:', error)
      this.isConnecting.value = false
    }
  }

  // 메시지 전송
  send(message: WebSocketMessage) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message))
    } else {
      console.error('웹소켓이 연결되지 않았습니다.')
    }
  }

  // 연결 종료
  disconnect() {
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
    this.isConnected.value = false
    this.isConnecting.value = false
  }

  // 재연결 스케줄링
  private scheduleReconnect(token: string) {
    this.reconnectAttempts++
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1)
    
    console.log(`${delay}ms 후 재연결 시도 (${this.reconnectAttempts}/${this.maxReconnectAttempts})`)
    
    setTimeout(() => {
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        this.connect(token, this.callbacks)
      }
    }, delay)
  }

  // 연결 상태 확인
  getConnectionStatus() {
    return {
      isConnected: this.isConnected.value,
      isConnecting: this.isConnecting.value,
      readyState: this.ws?.readyState
    }
  }

  // 특정 대화방 구독
  subscribeToConversation(conversationId: string) {
    const message: WebSocketMessage = {
      type: 'subscribe',
      data: { conversation_id: conversationId }
    }
    this.send(message)
  }

  // 특정 대화방 구독 해제
  unsubscribeFromConversation(conversationId: string) {
    const message: WebSocketMessage = {
      type: 'unsubscribe',
      data: { conversation_id: conversationId }
    }
    this.send(message)
  }
  
  // 메시지 리스너 추가
  addMessageListener(id: string, listener: (message: WebSocketMessage) => void) {
    this.messageListeners.set(id, listener)
  }
  
  // 메시지 리스너 제거
  removeMessageListener(id: string) {
    this.messageListeners.delete(id)
  }
  
  // 모든 리스너에게 메시지 전달
  private notifyAllListeners(message: WebSocketMessage) {
    this.messageListeners.forEach(listener => {
      try {
        listener(message)
      } catch (error) {
        console.error('메시지 리스너 오류:', error)
      }
    })
  }
}

export const websocketService = new WebSocketService() 