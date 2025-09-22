import { config } from '@/config/env'
import axios from 'axios'

// axios 인스턴스 생성
const api = axios.create({
  baseURL: config.apiBaseUrl,
  timeout: config.apiTimeout,
  headers: {
    'Content-Type': 'application/json',
  },
})

// 토큰 갱신 중인지 확인하는 플래그
let isRefreshing = false
// 토큰 갱신 대기 중인 요청들을 저장하는 배열
let failedQueue: Array<{
  resolve: (value?: any) => void
  reject: (error?: any) => void
}> = []

// 대기 중인 요청들을 처리하는 함수
const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error)
    } else {
      resolve(token)
    }
  })
  
  failedQueue = []
}

// 리프레시 토큰을 사용하여 액세스 토큰 갱신
const refreshAccessToken = async (): Promise<string | null> => {
  try {
    const refreshToken = localStorage.getItem('refreshToken')
    if (!refreshToken) {
      throw new Error('리프레시 토큰이 없습니다.')
    }

    // query parameter로 refresh_token 전달
    const response = await axios.post(`${config.apiBaseUrl}/auth/refresh-token?refresh_token=${refreshToken}`)

    const { access_token, refresh_token: newRefreshToken } = response.data
    
    // 새로운 토큰들을 로컬 스토리지에 저장
    localStorage.setItem('token', access_token)
    if (newRefreshToken) {
      localStorage.setItem('refreshToken', newRefreshToken)
    }

    return access_token
  } catch (error) {
    // 리프레시 토큰도 만료된 경우 로그아웃
    localStorage.removeItem('token')
    localStorage.removeItem('refreshToken')
    throw error
  }
}

// 요청 인터셉터
api.interceptors.request.use(
  (config) => {
    // 로컬 스토리지에서 토큰 가져오기
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  },
)

// 응답 인터셉터
api.interceptors.response.use(
  (response) => {
    return response
  },
  async (error) => {
    const originalRequest = error.config

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // 이미 토큰 갱신 중이면 대기열에 추가
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        }).then(token => {
          originalRequest.headers.Authorization = `Bearer ${token}`
          return api(originalRequest)
        }).catch(err => {
          return Promise.reject(err)
        })
      }

      originalRequest._retry = true
      isRefreshing = true

      try {
        const newToken = await refreshAccessToken()
        processQueue(null, newToken)
        
        // 원래 요청을 새로운 토큰으로 재시도
        originalRequest.headers.Authorization = `Bearer ${newToken}`
        return api(originalRequest)
      } catch (refreshError) {
        processQueue(refreshError, null)
        // 리프레시 토큰도 만료된 경우 로그아웃
        localStorage.removeItem('token')
        localStorage.removeItem('rememberToken')
        localStorage.removeItem('userInfo')
        window.location.href = '/login'
        return Promise.reject(refreshError)
      } finally {
        isRefreshing = false
      }
    }

    if (error.response?.status === 403) {
      // 403은 권한 문제이므로 토큰 갱신으로 해결되지 않음
      localStorage.removeItem('token')
      localStorage.removeItem('rememberToken')
      localStorage.removeItem('userInfo')
      window.location.href = '/login'
    }

    return Promise.reject(error)
  },
)

export { api }
