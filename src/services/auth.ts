import { api } from '@/utils/api'

interface LoginResponse {
  access_token: string
  refresh_token: string
  role: string
  user_id: string
  name: string
  email: string
  department: string
  position: string
  avatar?: string
}

interface LoginInput {
  email: string
  password: string
  remember: boolean
}

// 사용자 정보 인터페이스
interface UserInfo {
  role: string | null
  name: string | null
  email: string | null
  department: string | null
  position: string | null
  avatar: string | null
}

export const authService = {
  // 로그인
  login: async (data: LoginInput): Promise<LoginResponse> => {
    const response = await api.post<LoginResponse>('auth/login', {
      email: data.email,
      password: data.password,
      remember: data.remember,
    })

    // 로그인 성공 시 토큰 저장
    if (response.data.access_token) {
      localStorage.setItem('token', response.data.access_token)
      localStorage.setItem('refreshToken', response.data.refresh_token)
      localStorage.setItem('user_id', response.data.user_id)

      // 사용자 정보를 하나의 객체로 저장
      const userInfo: UserInfo = {
        role: response.data.role || null,
        name: response.data.name || null,
        email: response.data.email || null,
        department: response.data.department || null,
        position: response.data.position || null,
        avatar: response.data.avatar || null,
      }
      
      localStorage.setItem('userInfo', JSON.stringify(userInfo))
      
      // remember me가 체크되어 있다면 토큰을 더 오래 저장
      if (data.remember) {
        localStorage.setItem('rememberId', data.email)
        localStorage.setItem('isRemember', String(data.remember))
        localStorage.setItem('rememberToken', response.data.access_token)
      } else {
        localStorage.removeItem('rememberId')
        localStorage.removeItem('isRemember')
        localStorage.removeItem('rememberToken')
      }
    }

    return response.data
  },

  // 로그아웃
  logout: () => {
    // 로컬 스토리지의 모든 인증 관련 데이터 제거
    localStorage.removeItem('token')
    localStorage.removeItem('rememberToken')
    localStorage.removeItem('userInfo')
    localStorage.removeItem('rememberId')
    localStorage.removeItem('isRemember')
  },

  // 토큰 가져오기
  getToken: (): string | null => {
    return localStorage.getItem('token')
  },

  // remember me 정보 가져오기
  getRememberInfo: () => {
    return {
      email: localStorage.getItem('rememberId'),
      isRemember: localStorage.getItem('isRemember') === 'true',
      token: localStorage.getItem('rememberToken'),
    }
  },

  // 로그인 상태 확인
  isAuthenticated: (): boolean => {
    return !!localStorage.getItem('token')
  },

  // 사용자 역할 가져오기
  getUserRole: (): string | null => {
    const userInfo = authService.getUserInfo()
    return userInfo.role
  },

  // 사용자 정보 가져오기
  getUserInfo: (): UserInfo => {
    const userInfoStr = localStorage.getItem('userInfo')
    if (userInfoStr) {
      try {
        return JSON.parse(userInfoStr)
      } catch (error) {
        console.error('Failed to parse user info from localStorage:', error)
        return {
          role: null,
          name: null,
          email: null,
          department: null,
          position: null,
          avatar: null,
        }
      }
    }
    
    return {
      role: null,
      name: null,
      email: null,
      department: null,
      position: null,
      avatar: null,
    }
  },

  // 사용자 정보 업데이트
  updateUserInfo: (updates: Partial<UserInfo>): void => {
    const currentUserInfo = authService.getUserInfo()
    const updatedUserInfo = { ...currentUserInfo, ...updates }
    localStorage.setItem('userInfo', JSON.stringify(updatedUserInfo))
  },

  // 특정 사용자 정보 업데이트
  updateUserName: (name: string): void => {
    authService.updateUserInfo({ name })
  },

  updateUserAvatar: (avatar: string): void => {
    authService.updateUserInfo({ avatar })
  }
} 
