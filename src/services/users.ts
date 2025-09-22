import { api } from '@/utils/api'

// 사용자 프로필 업데이트 인터페이스
export interface UserProfileUpdate {
  name?: string
  avatar?: string
}

// 사용자 정보 인터페이스
export interface User {
  id: string
  name: string
  email: string
  department: string
  position: string
  avatar?: string
  role: string
}

export const userService = {
  // 사용자 프로필 조회
  getProfile: async (): Promise<User> => {
    const response = await api.get<User>('/users/profile')
    return response.data
  },

  // 사용자 프로필 업데이트
  updateProfile: async (data: UserProfileUpdate): Promise<User> => {
    const response = await api.put<User>('/users/profile', data)
    return response.data
  },

  // 아바타 업로드
  uploadAvatar: async (file: File): Promise<{ avatar: string }> => {
    const formData = new FormData()
    formData.append('file', file)
    const response = await api.post<{ avatar: string }>('/users/changeAvatar', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data
  },

  // 사용자 목록 조회 (관리자용)
  getUsers: async (params?: {
    page?: number
    size?: number
    search?: string
    department?: string
    position?: string
  }): Promise<{
    items: User[]
    total: number
    total_pages: number
    current_page: number
  }> => {
    const response = await api.get('/users', { params })
    return response.data
  },

  // 사용자 상세 조회
  getUser: async (id: string): Promise<User> => {
    const response = await api.get<User>(`/users/${id}`)
    return response.data
  },

  // 사용자 생성 (관리자용)
  createUser: async (data: Omit<User, 'id'>): Promise<User> => {
    const response = await api.post<User>('/users', data)
    return response.data
  },

  // 사용자 수정 (관리자용)
  updateUser: async (id: string, data: Partial<User>): Promise<User> => {
    const response = await api.put<User>(`/users/${id}`, data)
    return response.data
  },

  // 사용자 삭제 (관리자용)
  deleteUser: async (id: string): Promise<void> => {
    await api.delete(`/users/${id}`)
  },
} 