import { api } from '@/utils/api'

interface LoginResponse {
  access_token: string
  role: string
  user?: {
    id: string
    email: string
    role: string
    name: string
  }
}

interface LoginInput {
  email: string
  password: string
  remember: boolean
}

export const authService = {
  // 로그인
  login: async (data: LoginInput): Promise<LoginResponse> => {
    const response = await api.post<LoginResponse>('/login', {
      email: data.email,
      password: data.password,
      remember: data.remember,
    })

    // 로그인 성공 시 토큰 저장
    if (response.data.access_token) {
      localStorage.setItem('token', response.data.access_token)

      // 사용자 정보 저장
      if (response.data.role) {
        localStorage.setItem('userRole', response.data.role)
      }
      
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
    return localStorage.getItem('userRole')
  },

  // 사용자 정보 가져오기
  getUserInfo: () => {
    return {
      role: localStorage.getItem('userRole'),
      name: localStorage.getItem('userName'),
      email: localStorage.getItem('userEmail'),
    }
  }
} 
