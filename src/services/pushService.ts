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
    this.isSupported = 'serviceWorker' in navigator && 'PushManager' in window
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

  // 푸시 구독
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

      // ⚡ 권한 요청은 버튼 클릭 등 사용자 액션 안에서만
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        return { success: false, message: '알림 권한이 필요합니다' }
      }

      // 기존 구독 확인
      let subscription = await registration.pushManager.getSubscription()
      if (!subscription) {
        const applicationServerKey = this.urlBase64ToUint8Array(this.vapidPublicKey)
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey
        })
        console.log('새 푸시 구독 생성됨:', subscription)
      } else {
        console.log('기존 구독 있음')
      }

      // 서버 전송
      const result = await this.sendSubscriptionToServer(userId, subscription)
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

  // 서버 전송
  private async sendSubscriptionToServer(userId: string, subscription: PushSubscription): Promise<PushSubscriptionResponse> {
    try {
      const response = await api.post('/push/save-subscription', { userId, subscription })
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
