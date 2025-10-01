// pushService.ts
import { api } from '@/utils/api'

export interface PushSubscriptionData {
  endpoint: string
  keys: {
    p256dh: string
    auth: string
  }
}

export interface PushSubscriptionResponse {
  success: boolean
  message?: string
  subscriptionId?: string
}

class PushService {
  private vapidPublicKey: string | undefined
  private isSupported: boolean
  private swRegistration: ServiceWorkerRegistration | null = null

  constructor() {
    this.vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY
    // 아이폰 사파리 PWA 지원 확인 개선
    this.isSupported = this.checkPushSupport()
  }

  // 푸시 지원 여부 확인 (아이폰 사파리 PWA 고려)
  private checkPushSupport(): boolean {
    // 기본 지원 확인
    const basicSupport = 'serviceWorker' in navigator && 'PushManager' in window
    
    // 아이폰 사파리 PWA 감지
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
    const isSafari = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent)
    const isPWA = window.matchMedia('(display-mode: standalone)').matches || 
                  (window.navigator as any).standalone === true
    
    console.log('푸시 지원 확인:', {
      basicSupport,
      isIOS,
      isSafari,
      isPWA,
      userAgent: navigator.userAgent
    })
    
    // 아이폰 사파리 PWA에서는 제한적 지원
    if (isIOS && isSafari && isPWA) {
      console.log('아이폰 사파리 PWA 감지 - 제한적 푸시 지원')
      return basicSupport
    }
    
    return basicSupport
  }

  // 서비스워커 등록 (한 번만)
  async registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
    if (!this.isSupported) {
      console.warn('푸시를 지원하지 않는 브라우저')
      return null
    }

    if (this.swRegistration) return this.swRegistration

    try {
      const registrations = await navigator.serviceWorker.getRegistrations()
      if (registrations.length > 0) {
        this.swRegistration = registrations[0]
        console.log('기존 서비스워커 사용:', this.swRegistration)
        return this.swRegistration
      }

      this.swRegistration = await navigator.serviceWorker.register('/service-worker.js')
      console.log('Service Worker 등록됨:', this.swRegistration)
      return this.swRegistration
    } catch (err) {
      console.error('Service Worker 등록 실패:', err)
      return null
    }
  }

  // 푸시 구독 (아이폰 사파리 PWA 최적화)
  async subscribeToPush(userId: string): Promise<PushSubscriptionResponse> {
    if (!this.isSupported) {
      return { success: false, message: '브라우저가 푸시를 지원하지 않습니다' }
    }

    if (!this.vapidPublicKey) {
      return { success: false, message: 'VAPID 키가 설정되지 않았습니다' }
    }

    try {
      const registration = await this.registerServiceWorker()
      if (!registration) return { success: false, message: 'Service Worker 등록 실패' }

      // 현재 권한 상태 확인
      let permission = Notification.permission
      console.log('현재 알림 권한 상태:', permission)
      
      // 권한이 없으면 요청 (사용자 제스처 컨텍스트에서만 호출되어야 함)
      if (permission === 'default') {
        try {
          permission = await Notification.requestPermission()
          console.log('알림 권한 요청 결과:', permission)
        } catch (error: any) {
          console.error('알림 권한 요청 에러:', error)
          // iOS Safari에서 사용자 제스처 없이 호출된 경우
          if (error.message && error.message.includes('user gesture')) {
            return { 
              success: false, 
              message: '알림 권한은 사용자의 클릭 등의 제스처에서만 요청할 수 있습니다' 
            }
          }
          return { success: false, message: `알림 권한 요청 실패: ${error.message}` }
        }
      }
      
      if (permission !== 'granted') {
        return { success: false, message: '알림 권한이 필요합니다' }
      }

      // 기존 구독 확인
      let subscription = await registration.pushManager.getSubscription()
      console.log('기존 구독 확인:', subscription)
      
      if (!subscription) {
        const applicationServerKey = this.urlBase64ToUint8Array(this.vapidPublicKey)
        console.log('VAPID 키 변환 완료:', applicationServerKey)
        
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey
        })
        console.log('새 푸시 구독 생성됨:', subscription)
      } else {
        console.log('기존 구독 있음')
      }

      // 구독 정보 로깅 (디버깅용)
      console.log('구독 정보:', {
        endpoint: subscription.endpoint,
        keys: subscription.getKey('p256dh') ? '있음' : '없음',
        auth: subscription.getKey('auth') ? '있음' : '없음',
        expirationTime: subscription.expirationTime
      })

      // 서버 전송
      const result = await this.sendSubscriptionToServer(userId, subscription)
      console.log('서버 전송 결과:', result)
      return result

    } catch (error: any) {
      console.error('푸시 구독 실패:', error)
      return { success: false, message: `푸시 구독 실패: ${error.message || '알 수 없는 오류'}` }
    }
  }

  // 구독 해제
  async unsubscribeFromPush(): Promise<boolean> {
    if (!this.isSupported) return false

    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()
      if (subscription) {
        await subscription.unsubscribe()
        await this.removeSubscriptionFromServer(subscription)
        console.log('푸시 구독 해제됨')
        return true
      }
      return false
    } catch (error) {
      console.error('구독 해제 실패:', error)
      return false
    }
  }

  // 서버 전송 (아이폰 사파리 PWA 최적화)
  private async sendSubscriptionToServer(userId: string, subscription: PushSubscription): Promise<PushSubscriptionResponse> {
    try {
      const p256dhKey = subscription.getKey('p256dh')
      const authKey = subscription.getKey('auth')
      
      const subscriptionData = {
        userId,
        subscription: {
          endpoint: subscription.endpoint,
          keys: {
            p256dh: p256dhKey ? this.arrayBufferToBase64(p256dhKey) : null,
            auth: authKey ? this.arrayBufferToBase64(authKey) : null
          },
          expirationTime: subscription.expirationTime
        }
      }
      
      console.log('서버 전송 데이터:', subscriptionData)
      
      const response = await api.post('/push/save-subscription', subscriptionData)
      console.log('서버 응답:', response.data)
      return response.data
    } catch (error: any) {
      console.error('서버 전송 실패:', error)
      return { success: false, message: `서버 전송 실패: ${error.response?.data?.message || error.message || '알 수 없는 오류'}` }
    }
  }

  private async removeSubscriptionFromServer(subscription: PushSubscription): Promise<boolean> {
    try {
      await api.post('/push/remove-subscription', { endpoint: subscription.endpoint })
      return true
    } catch (error) {
      console.error('서버 구독 삭제 실패:', error)
      return false
    }
  }

  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
    const rawData = window.atob(base64)
    return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)))
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer)
    let binary = ''
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i])
    }
    return window.btoa(binary)
  }

  // 현재 구독 상태
  async getSubscriptionStatus(): Promise<boolean> {
    if (!this.isSupported) return false
    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()
      return !!subscription
    } catch (error) {
      console.error('구독 상태 확인 실패:', error)
      return false
    }
  }

  isPushSupported(): boolean {
    return this.isSupported
  }
}

export const pushService = new PushService()
export default pushService
