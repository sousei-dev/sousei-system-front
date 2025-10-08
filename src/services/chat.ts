import { api } from '@/utils/api'

// 타입 정의
export interface ConversationCreate {
  name?: string
  title?: string
  is_group: boolean
  member_ids?: number[]
  participants?: string[]
}



export interface UserListResponse {
  users: User[]
  total: number
  page: number
  page_size: number
  total_pages: number
}

export interface ConversationListResponse {
  conversations: Conversation[]
  total: number
  page: number
  page_size: number
  total_pages: number
}

export interface MessageListResponse {
  messages: Message[]
  total: number
  page: number
  page_size: number
  total_pages: number
  conversation_info: {
    id: string
    title: string
    is_group: boolean
  }
}

export interface UserListParams {
  page?: number
  page_size?: number
  search?: string
}

export interface Conversation {
  id: string
  title: string
  is_group: boolean
  created_by: string
  created_at: string
  member_count: number
  last_message?: Message
  unread_count: number
  messages?: Message[]
  participants?: User[] // 참여자 목록 추가
}

export interface User {
  id: number
  name: string
  email: string
  avatar?: string
  online: boolean
  status: string
  role: string
  department?: string // 부서 정보 추가
  position?: string   // 직책 정보 추가
  is_admin?: boolean  // 관리자 여부 추가
  created_at: string
  updated_at: string
}

export interface Message {
  id: string
  conversation_id: string
  sender_id: string
  body: string
  parent_id?: string
  created_at: string
  edited_at?: string
  deleted_at?: string
  is_own_message: boolean
  message_type: string
  alignment: string
  sender_info?: {
    id: string
    name: string
    avatar: string
    role: string
    department?: string
  }
  sender_name: string
  sender_avatar: string
  sender_role: string
  attachments: any[]
  reactions: any[]
  is_read: boolean
  show_avatar: boolean
  show_name: boolean
  css_class: string
}

export interface MessageCreate {
  body?: string
  parent_id?: string
  attachments?: File[]
}

export interface ChatListItem {
  id: number
  name: string
  avatar?: string
  lastMessage: string
  date: string
  unread: boolean
  title: string
  participants: number[]
  messages: Message[]
}

// 채팅 서비스
export const chatService = {
  // 대화방 생성
  createConversation: async (data: ConversationCreate): Promise<Conversation> => {
    try {
      const response = await api.post<Conversation>('/chat/conversations', data)
      return response.data
    } catch (error) {
      console.error('대화방 생성 오류:', error)
      throw new Error('대화방을 생성할 수 없습니다.')
    }
  },

  // 대화방 목록 조회
  getConversations: async (): Promise<ConversationListResponse> => {
    try {
      const response = await api.get<ConversationListResponse>('/chat/conversations')
      return response.data
    } catch (error) {
      console.error('대화방 목록 조회 오류:', error)
      throw new Error('대화방 목록을 가져올 수 없습니다.')
    }
  },

  // 특정 대화방 조회
  getConversation: async (conversationId: string): Promise<Conversation> => {
    try {
      const response = await api.get<Conversation>(`/chat/conversations/${conversationId}`)
      return response.data
    } catch (error) {
      console.error('대화방 조회 오류:', error)
      throw new Error('대화방을 가져올 수 없습니다.')
    }
  },

  // 메시지 전송
  sendMessage: async (
    conversationId: string, 
    body: string, 
    parentId?: string,
    mentions?: Array<{ user_id: string; user_name: string }>
  ): Promise<Message> => {
    try {
      const formData = new FormData()
      
      // 메시지 본문 추가
      formData.append('body', body)
      
      // 답변인 경우 parent_id 추가
      if (parentId) {
        formData.append('parent_id', parentId)
      }
      
      // 멘션 정보 추가 (user_id 배열만 전송)
      if (mentions && mentions.length > 0) {
        const mentionedUserIds = mentions.map(m => m.user_id)
        formData.append('mentioned_user_ids', JSON.stringify(mentionedUserIds))
      }
      
      const response = await api.post<Message>(`/chat/conversations/${conversationId}/messages`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })
      return response.data
    } catch (error) {
      console.error('메시지 전송 오류:', error)
      throw new Error('메시지를 전송할 수 없습니다.')
    }
  },

  // 파일과 함께 메시지 전송 (FormData 사용)
  sendMessageWithFiles: async (
    conversationId: string, 
    body: string, 
    attachments: string[],
    parentId?: string,
    mentions?: Array<{ user_id: string; user_name: string }>
  ): Promise<Message> => {
    try {
      const formData = new FormData()
      
      // 메시지 본문 추가
      formData.append('body', body || 'ファイルを添付しました。')
      formData.append('parent_id', parentId || '')
      
      // 멘션 정보 추가 (user_id 배열만 전송)
      if (mentions && mentions.length > 0) {
        const mentionedUserIds = mentions.map(m => m.user_id)
        formData.append('mentioned_user_ids', JSON.stringify(mentionedUserIds))
      }
      
      // 각 파일을 'attachments' 키로 추가ㅋ
      attachments.forEach((file) => {
        formData.append('attachments', file)
      })
      
      const response = await api.post(`/chat/conversations/${conversationId}/messages`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })
      return response.data
    } catch (error) {
      console.error('파일과 함께 메시지 전송 오류:', error)
      throw new Error('파일과 함께 메시지를 전송할 수 없습니다.')
    }
  },

  // 대화방의 메시지 목록 조회
  getMessages: async (conversationId: string, page: number = 1, pageSize: number = 50): Promise<MessageListResponse> => {
    try {
      const response = await api.get<MessageListResponse>(`/chat/conversations/${conversationId}/messages`, {
        params: { page, page_size: pageSize }
      })
      return response.data
    } catch (error) {
      console.error('메시지 목록 조회 오류:', error)
      throw new Error('메시지를 가져올 수 없습니다.')
    }
  },

  // 메시지 읽음 처리
  markMessageAsRead: async (messageId: number): Promise<void> => {
    try {
      await api.patch(`/chat/messages/${messageId}/read`)
    } catch (error) {
      console.error('메시지 읽음 처리 오류:', error)
      throw new Error('메시지 읽음 처리를 할 수 없습니다.')
    }
  },

  // 대화방의 모든 메시지를 읽음 처리
  markConversationAsRead: async (conversationId: string): Promise<void> => {
    try {
      await api.post(`/chat/conversations/${conversationId}/read-all`)
    } catch (error) {
      console.error('대화방 읽음 처리 오류:', error)
      throw new Error('대화방 읽음 처리를 할 수 없습니다.')
    }
  },

  // 대화방 참여자 목록 조회
  getParticipants: async (conversationId: string): Promise<User[]> => {
    try {
      const response = await api.get<User[]>(`/chat/conversations/${conversationId}/participants`)
      return response.data
    } catch (error) {
      console.error('참여자 목록 조회 오류:', error)
      throw new Error('참여자 목록을 가져올 수 없습니다.')
    }
  },

  // 대화방 나가기
  leaveConversation: async (conversationId: string): Promise<void> => {
    try {
      await api.post(`/chat/conversations/${conversationId}/leave`)
    } catch (error) {
      console.error('대화방 나가기 오류:', error)
      throw new Error('대화방을 나갈 수 없습니다.')
    }
  },

  // 그룹 채팅에 멤버 초대
  inviteMembers: async (conversationId: string, memberIds: number[]): Promise<void> => {
    try {
      await api.post(`/chat/conversations/${conversationId}/invite`, {
        member_ids: memberIds
      })
    } catch (error) {
      console.error('멤버 초대 오류:', error)
      throw new Error('멤버를 초대할 수 없습니다.')
    }
  },

  // 메시지에 리액션 추가/제거
  toggleReaction: async (messageId: string, emoji: string): Promise<any> => {
    try {
      const response = await api.post(`/chat/messages/${messageId}/reactions`, {
        emoji: emoji
      })
      return response.data
    } catch (error) {
      console.error('리액션 토글 오류:', error)
      throw new Error('リアクションの追加に失敗しました。')
    }
  },

  // 메시지의 리액션 목록 조회
  getMessageReactions: async (messageId: string): Promise<any[]> => {
    try {
      const response = await api.get(`/chat/messages/${messageId}/reactions`)
      return response.data
    } catch (error) {
      console.error('리액션 목록 조회 오류:', error)
      throw new Error('リアクション目録の取得に失敗しました。')
    }
  },

  // 사용자와의 기존 대화방 검색
  findExistingConversation: async (userId: number): Promise<Conversation | null> => {
    try {
      const response = await api.get<Conversation[]>(`/chat/conversations`, {
        params: { participantId: userId, type: 'direct' }
      })
      return response.data.length > 0 ? response.data[0] : null
    } catch (error) {
      console.error('기존 대화방 검색 오류:', error)
      return null
    }
  },

  // 실시간 메시지 구독 (WebSocket 또는 Server-Sent Events 사용 시)
  subscribeToMessages: (conversationId: string, callback: (message: Message) => void) => {
    // WebSocket 연결 또는 EventSource 구현
    // 실제 구현은 백엔드의 실시간 통신 방식에 따라 달라짐
    console.log(`메시지 구독 시작: 대화방 ${conversationId}`)
    
    // 임시로 콜백을 저장 (실제 구현에서는 WebSocket 이벤트 리스너 등록)
    return {
      unsubscribe: () => {
        console.log(`메시지 구독 해제: 대화방 ${conversationId}`)
      }
    }
  },

  // 사용자 관련 함수들
  // 모든 사용자 목록 조회
  getAllUsers: async (params: UserListParams = {}): Promise<UserListResponse> => {
    try {
      const response = await api.get<UserListResponse>('/chat/users', {
        params: {
          page: params.page || 1,
          page_size: params.page_size || 50,
          search: params.search || undefined
        }
      })
      return response.data
    } catch (error) {
      console.error('사용자 목록 조회 오류:', error)
      throw new Error('사용자 목록을 가져올 수 없습니다.')
    }
  },

  // 특정 사용자 조회
  getUser: async (userId: number): Promise<ChatUser> => {
    try {
      const response = await api.get<ChatUser>(`/users/${userId}`)
      return response.data
    } catch (error) {
      console.error('사용자 조회 오류:', error)
      throw new Error('사용자 정보를 가져올 수 없습니다.')
    }
  },

  // 사용자 검색
  searchUsers: async (searchTerm: string, page: number = 1, pageSize: number = 50): Promise<UserListResponse> => {
    try {
      const response = await api.get<UserListResponse>('/users', {
        params: {
          search: searchTerm,
          page,
          page_size: pageSize
        }
      })
      return response.data
    } catch (error) {
      console.error('사용자 검색 오류:', error)
      throw new Error('사용자 검색을 할 수 없습니다.')
    }
  },

  // 온라인 사용자 목록 조회
  getOnlineUsers: async (): Promise<ChatUser[]> => {
    try {
      const response = await api.get<ChatUser[]>('/users/online')
      return response.data
    } catch (error) {
      console.error('온라인 사용자 조회 오류:', error)
      throw new Error('온라인 사용자 목록을 가져올 수 없습니다.')
    }
  },

  // 사용자 상태 업데이트
  updateUserStatus: async (userId: number, status: string): Promise<ChatUser> => {
    try {
      const response = await api.patch<ChatUser>(`/users/${userId}/status`, {
        status
      })
      return response.data
    } catch (error) {
      console.error('사용자 상태 업데이트 오류:', error)
      throw new Error('사용자 상태를 업데이트할 수 없습니다.')
    }
  }
} 