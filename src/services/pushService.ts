// 푸시 알림 구독 서비스
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

  constructor() {
    this.vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY
    this.isSupported = 'serviceWorker' in navigator && 'PushManager' in window
  }

  // 푸시 구독
  async subscribeToPush(userId: string): Promise<PushSubscriptionResponse> {
    console.log('this.vapidPublicKey', this.vapidPublicKey)
    if (!this.isSupported) {
      console.warn('이 브라우저는 푸시 알림을 지원하지 않습니다')
      return { success: false, message: '브라우저가 푸시 알림을 지원하지 않습니다' }
    }

    if (!this.vapidPublicKey) {
      console.error('VAPID 공개 키가 설정되지 않았습니다')
      return { success: false, message: 'VAPID 키가 설정되지 않았습니다' }
    }

    try {
      // Service Worker 등록
      const registration = await navigator.serviceWorker.register('/service-worker.js')
      console.log('Service Worker 등록됨:', registration)

      // 알림 권한 요청
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        console.warn('알림 권한이 거부되었습니다')
        return { success: false, message: '알림 권한이 필요합니다' }
      }

      // 기존 구독 확인
      const existingSubscription = await registration.pushManager.getSubscription()
      if (existingSubscription) {
        console.log('이미 푸시 구독이 있습니다')
        // 서버에 기존 구독 정보 전송
        await this.sendSubscriptionToServer(userId, existingSubscription)
        return { success: true, message: '기존 구독이 활성화되었습니다' }
      }

      // VAPID 키를 Uint8Array로 변환
      const applicationServerKey = this.urlBase64ToUint8Array(this.vapidPublicKey)

      // 푸시 구독 생성
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey
      })

      console.log('푸시 구독 생성됨:', subscription)

      // 서버에 구독 정보 전송
      const result = await this.sendSubscriptionToServer(userId, subscription)
      
      if (result.success) {
        console.log('푸시 구독이 서버에 저장되었습니다')
      }

      return result

    } catch (error) {
      console.error('푸시 구독 실패:', error)
      return { 
        success: false, 
        message: `푸시 구독 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}` 
      }
    }
  }

  // 구독 해제
  async unsubscribeFromPush(): Promise<boolean> {
    if (!this.isSupported) {
      return false
    }

    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()
      
      if (subscription) {
        await subscription.unsubscribe()
        console.log('푸시 구독이 해제되었습니다')
        
        // 서버에서도 구독 정보 삭제
        await this.removeSubscriptionFromServer(subscription)
        return true
      }
      
      return false
    } catch (error) {
      console.error('푸시 구독 해제 실패:', error)
      return false
    }
  }

  // 서버에 구독 정보 전송
  private async sendSubscriptionToServer(userId: string, subscription: PushSubscription): Promise<PushSubscriptionResponse> {
    try {
      const response = await api.post('/push/save-subscription', {
        userId,
        subscription
      })

      return response.data

    } catch (error: any) {
      console.error('서버에 구독 정보 전송 실패:', error)
      return { 
        success: false, 
        message: `서버 전송 실패: ${error.response?.data?.message || error.message || '알 수 없는 오류'}` 
      }
    }
  }

  // 서버에서 구독 정보 삭제
  private async removeSubscriptionFromServer(subscription: PushSubscription): Promise<boolean> {
    try {
      await api.post('/push/remove-subscription', {
        endpoint: subscription.endpoint
      })

      return true

    } catch (error) {
      console.error('서버에서 구독 정보 삭제 실패:', error)
      return false
    }
  }

  // VAPID 키를 Uint8Array로 변환
  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4)
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/')

    const rawData = window.atob(base64)
    const outputArray = new Uint8Array(rawData.length)

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i)
    }
    return outputArray
  }

  // 현재 구독 상태 확인
  async getSubscriptionStatus(): Promise<boolean> {
    if (!this.isSupported) {
      return false
    }

    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()
      console.log('getSubscriptionStatus', subscription)
      return !!subscription
    } catch (error) {
      console.error('구독 상태 확인 실패:', error)
      return false
    }
  }

  // 푸시 알림 지원 여부 확인
  isPushSupported(): boolean {
    return this.isSupported
  }
}

export const pushService = new PushService()
export default pushService
