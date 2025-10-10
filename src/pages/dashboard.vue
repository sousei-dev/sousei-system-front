<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { studentService, type VisaRenewalStudent } from '@/services/student'
import { contactService, type ContactResponse } from '@/services/contact'
import { getCurrentUserPermission } from '@/utils/permissions';
import { pushService } from '@/services/pushService'

const router = useRouter()

// 비자갱신 임박 학생 상태
const visaRenewalStudents = ref<VisaRenewalStudent[]>([])
const loadingVisaStudents = ref(false)
const errorVisaStudents = ref<string | null>(null)
const isVisaCardExpanded = ref(true) // 카드 확장/축소 상태

// 연락 관련 상태
const contact = ref<ContactResponse[]>([])
const loadingContact = ref(false)
const errorContact = ref<string | null>(null)
const isContactCardExpanded = ref(true)
const showContactDetailDialog = ref(false)
const selectedContact = ref<ContactResponse | null>(null)
const showCommentInput = ref(false)
const commentType = ref<'completed' | 'rejected' | 'pending' | 'cancel' | null>(null)
const commentText = ref('')
const processingContact = ref(false)

// PWA 알림 관련 상태
const notificationPermission = ref<NotificationPermission>('default')
const isPushSubscribed = ref(false)
const pushSupported = ref(false)
const isInitializingPush = ref(false)
const hasRequestedPermission = ref(false)
const isPWA = ref(false)
const isIOS = ref(false)
const showNotificationPrompt = ref(false)

// 비자갱신 임박 학생 조회
const fetchVisaRenewalStudents = async () => {
  try {
    loadingVisaStudents.value = true
    errorVisaStudents.value = null

    // ビザ更新が迫っている技能生を取得
    const studentType = getCurrentUserPermission()
    let response: { data: VisaRenewalStudent[] }
    if (studentType === 'manager_specified') {
      response = await studentService.getVisaRenewalStudents('SPECIFIED')
    } else if (studentType === 'manager_general') {
      response = await studentService.getVisaRenewalStudents('GENERAL')
    } else {
      response = await studentService.getVisaRenewalStudents()
    }
    visaRenewalStudents.value = response.items || []
  } catch (error) {
    console.error('ビザ更新が迫っている技能生の取得中にエラーが発生しました:', error)
    errorVisaStudents.value = 'ビザ更新が迫っている技能生の取得に失敗しました。'
  } finally {
    loadingVisaStudents.value = false
  }
}

// 연락목록 조회
const fetchContact = async () => {
  try {
    loadingContact.value = true
    errorContact.value = null

    const response = await contactService.getContacts()
    contact.value = response.items || []
  } catch (error) {
    console.error('연락목록 조회 실패:', error)
    errorContact.value = '連絡リストの取得に失敗しました。'
  } finally {
    loadingContact.value = false
  }
}

// PWA 감지 함수
const detectPWA = () => {
  try {
    // iOS 감지
    isIOS.value = /iPad|iPhone|iPod/.test(navigator.userAgent)
    
    // PWA 감지 방법들
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
    const isIOSStandalone = (window.navigator as any).standalone === true
    const isAndroidApp = document.referrer.includes('android-app://')
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    const isHTTPS = window.location.protocol === 'https:'
    
    // PWA로 간주하는 조건들
    const pwaConditions = [
      isStandalone,
      isIOSStandalone,
      isAndroidApp,
      (isMobile && isHTTPS && window.innerWidth <= 1024)
    ]
    
    isPWA.value = pwaConditions.some(condition => condition)
    
    console.log('PWA 감지 결과:', {
      isIOS: isIOS.value,
      isStandalone,
      isIOSStandalone,
      isAndroidApp,
      isMobile,
      isHTTPS,
      isPWA: isPWA.value
    })
    
    return isPWA.value
  } catch (error) {
    console.error('PWA 감지 실패:', error)
    return false
  }
}

// 푸시 알림 구독
const subscribeToPushNotifications = async () => {
  try {
    console.log('subscribeToPushNotifications 함수 시작')
    
    const userId = localStorage.getItem('user_id')
    if (!userId) {
      console.error('사용자 ID를 찾을 수 없습니다')
      return false
    }

    console.log('푸시 구독을 시작합니다. 사용자 ID:', userId)
    
    console.log('pushService.subscribeToPush 호출 전')
    const result = await pushService.subscribeToPush(userId)
    console.log('pushService.subscribeToPush 호출 완료, 결과:', result)
    
    if (result.success) {
      isPushSubscribed.value = true
      console.log('푸시 알림 구독 성공:', result.message)
      return true
    } else {
      console.error('푸시 알림 구독 실패:', result.message)
      return false
    }
  } catch (error) {
    console.error('푸시 알림 구독 중 오류:', error)
    return false
  }
}

// 안전한 알림 권한 요청 및 구독
const requestNotificationPermissionAndSubscribe = async () => {
  try {
    console.log('requestNotificationPermissionAndSubscribe 함수 시작')
    console.log('현재 hasRequestedPermission:', hasRequestedPermission.value)
    
    // 이미 권한을 요청했으면 중단
    if (hasRequestedPermission.value) {
      console.log('이미 권한을 요청했으므로 중단')
      return
    }
    
    hasRequestedPermission.value = true
    console.log('hasRequestedPermission을 true로 설정')
    
    // 현재 권한 상태 확인
    const currentPermission = Notification.permission
    console.log('현재 알림 권한 상태:', currentPermission)
    
    if (currentPermission === 'granted') {
      console.log('이미 권한이 허용되어 있음')
      // 이미 권한이 있으면 바로 구독
      const success = await subscribeToPushNotifications()
      if (success) {
        // 구독 성공 후 localStorage에 완료 상태 저장
        localStorage.setItem('push_subscription_completed', 'true')
        console.log('구독 성공 후 localStorage에 완료 상태를 저장했습니다.')
        // 새로고침하지 않음
      }
      return
    }
    
    if (currentPermission === 'denied') {
      console.log('알림 권한이 거부되었습니다')
      return
    }
    
    // 권한 요청
    console.log('알림 권한을 요청합니다 - Notification.requestPermission() 호출 전')
    
    try {
      const permission = await Notification.requestPermission()
      console.log('Notification.requestPermission() 완료, 결과:', permission)
      notificationPermission.value = permission
      
      console.log('알림 권한 요청 결과:', permission)
      
      if (permission === 'granted') {
        console.log('권한이 허용됨, 구독을 시도합니다')
        // 권한이 허용되면 구독 시도
        const success = await subscribeToPushNotifications()
        console.log('구독 시도 결과:', success)
        if (success) {
          // 구독 성공 후 localStorage에 완료 상태 저장
          localStorage.setItem('push_subscription_completed', 'true')
          console.log('구독 성공 후 localStorage에 완료 상태를 저장했습니다.')
          // 새로고침하지 않음
        }
      } else {
        console.log('권한이 거부됨:', permission)
      }
    } catch (permissionError) {
      console.error('Notification.requestPermission() 에러:', permissionError)
      throw permissionError
    }
    
  } catch (error) {
    console.error('알림 권한 요청 중 오류:', error)
    hasRequestedPermission.value = false
  }
}

// PWA 알림 초기화 (PWA 확인 후에만 등록)
const initializePushNotifications = async () => {
  try {
    // 중복 실행 방지
    if (isInitializingPush.value) {
      return
    }
    
    isInitializingPush.value = true
    
    // 푸시 알림 지원 여부 확인
    pushSupported.value = pushService.isPushSupported()
    
    if (!pushSupported.value) {
      console.log('이 브라우저는 푸시 알림을 지원하지 않습니다')
      return
    }

    // PWA 감지 먼저 실행
    const pwaDetected = detectPWA()
    
    // PWA가 아니면 구독하지 않음
    if (!pwaDetected) {
      console.log('PWA가 아니므로 푸시 알림 구독을 하지 않습니다')
      return
    }
    
    console.log('PWA로 감지되었으므로 푸시 알림 구독을 진행합니다')

    // 현재 알림 권한 상태 확인
    notificationPermission.value = Notification.permission
    console.log('현재 알림 권한:', notificationPermission.value)

    // localStorage에서 구독 완료 상태 확인
    const subscriptionCompleted = localStorage.getItem('push_subscription_completed')
    if (subscriptionCompleted === 'true') {
      console.log('이미 구독이 완료되었습니다. 새로고침하지 않습니다.')
      return
    }

    // 현재 푸시 구독 상태 확인
    isPushSubscribed.value = await pushService.getSubscriptionStatus()
    console.log('현재 푸시 구독 상태:', isPushSubscribed.value)

    // 이미 구독되어 있으면 localStorage에 완료 상태 저장
    if (isPushSubscribed.value) {
      console.log('이미 푸시 구독이 되어 있습니다. localStorage에 완료 상태를 저장합니다.')
      localStorage.setItem('push_subscription_completed', 'true')
      return
    }

    // iOS Safari PWA인 경우 자동으로 권한 요청하지 않음
    if (isIOS.value && notificationPermission.value === 'default') {
      console.log('iOS Safari PWA - 사용자 제스처가 필요합니다. 알림 프롬프트를 표시합니다.')
      showNotificationPrompt.value = true
      return
    }

    // 구독이 안되어 있으면 권한 요청 및 구독 (Android PWA 또는 이미 권한이 있는 경우)
    if (notificationPermission.value === 'default') {
      console.log('PWA에서 구독이 안되어 있으므로 알림 권한을 요청합니다')
      
      // hasRequestedPermission 초기화
      hasRequestedPermission.value = false
      console.log('hasRequestedPermission을 false로 초기화')
      
      // isInitializingPush를 false로 설정하여 권한 요청이 가능하도록 함
      isInitializingPush.value = false
      console.log('isInitializingPush를 false로 설정하여 권한 요청 허용')
      
      // 바로 권한 요청 (Android PWA에서만 자동 실행)
      await requestNotificationPermissionAndSubscribe()
      
    } else if (notificationPermission.value === 'granted') {
      // 권한이 있지만 구독이 안되어 있으면 바로 구독
      console.log('PWA에서 권한이 있지만 구독이 안되어 있으므로 바로 구독합니다')
      const success = await subscribeToPushNotifications()
      if (success) {
        // 구독 성공 후 localStorage에 완료 상태 저장
        localStorage.setItem('push_subscription_completed', 'true')
        console.log('구독 성공 후 localStorage에 완료 상태를 저장했습니다.')
        // 새로고침하지 않음
      }
    }

  } catch (error) {
    console.error('푸시 알림 초기화 실패:', error)
  } finally {
    isInitializingPush.value = false
  }
}

// 학생 상세 페이지로 이동
const goToStudentDetail = (studentId: string) => {
  router.push(`/student-detail/${studentId}`)
}

// 연락 상세 팝업 열기
const openContactDetail = (contact: ContactResponse) => {
  selectedContact.value = contact
  showContactDetailDialog.value = true
  showCommentInput.value = false
  commentType.value = null
  commentText.value = ''
}

// 처리/철회 버튼 클릭
const handleActionClick = async (type: 'completed' | 'rejected' | 'pending' | 'comment' | 'cancel') => {
  commentType.value = type
  if (type === 'pending') {
    // 되돌릴 것인지 확인
    const confirmed = confirm('この連絡を再処理状態に戻しますか？')
    if (confirmed) {
      showCommentInput.value = false
      commentText.value = ''
      await submitAction()
    }
  } else if (type === 'comment') {
    commentType.value = 'pending'
    showCommentInput.value = true
    commentText.value = ''
  } else {
    showCommentInput.value = true
    commentText.value = ''
  }
}

// 처리/철회 등록
const submitAction = async () => {
  if (!selectedContact.value) {
    return
  }

  try {
    processingContact.value = true
    
    // 실제 API 호출로 변경
    await contactService.updateContactStatus(
      selectedContact.value.id, 
      commentType.value, 
      commentText.value
    )
    
    // 성공 메시지 표시
    alert('処理しました。')
    
    // 팝업 닫기
    showContactDetailDialog.value = false
    selectedContact.value = null
    
    // 목록 새로고침
    await fetchContact()
    
  } catch (error) {
    console.error('처리/철회 실패:', error)
    alert('処理に失敗しました。')
  } finally {
    processingContact.value = false
  }
}

// 비자 상태에 따른 색상 반환
const getVisaStatusColor = (daysUntilExpiry: number) => {
  if (daysUntilExpiry <= 30) {
    return 'error'
  }
  if (daysUntilExpiry <= 60) {
    return 'warning'
  }
  return 'info'
}

// 연락 타입을 일본어로 변환
const getContactTypeText = (type: string) => {
  switch (type) {
    case 'defect':
      return '故障'
    case 'claim':
      return 'クレーム'
    case 'other':
      return 'その他'
    default:
      return type
  }
}

// 연락 상태를 일본어로 변환
const getContactStatusText = (status: string) => {
  switch (status) {
    case 'completed':
      return '完了'
    case 'pending':
      return '処理中'
    case 'in_progress':
      return '処理中'
    case 'rejected':
      return '却下'
    case 'cancel':
      return 'キャンセル'
    default:
      return status
  }
}

// 연락 상태 색상
const getContactStatusColor = (status: string) => {
  switch (status) {
    case 'completed':
      return 'success'
    case 'pending':
      return 'warning'
    case 'in_progress':
      return 'info'
    case 'rejected':
      return 'error'
    default:
      return 'default'
  }
}

// 사진 클릭 시 새 창에서 열기
const openPhotoInNewTab = (url: string) => {
  window.open(url, '_blank')
}

// iOS에서 사용자 클릭으로 알림 권한 요청
const handleEnableNotifications = async () => {
  try {
    console.log('사용자가 알림 활성화 버튼을 클릭했습니다')
    showNotificationPrompt.value = false
    
    // hasRequestedPermission 초기화
    hasRequestedPermission.value = false
    
    // 권한 요청
    await requestNotificationPermissionAndSubscribe()
    
  } catch (error) {
    console.error('알림 활성화 실패:', error)
  }
}

// 알림 프롬프트 닫기
const handleDismissNotificationPrompt = () => {
  showNotificationPrompt.value = false
  console.log('사용자가 알림 프롬프트를 닫았습니다')
}

onMounted(() => {
  fetchVisaRenewalStudents()
  fetchContact()
  
  initializePushNotifications()
})
</script>

<template>
  <!-- 기존 대시보드 내용만 유지 -->
  <VRow class="match-height">
    <!-- 비자갱신 임박 학생 리스트 -->
    <VCol cols="12" md="6">
      <PermissionGuard :permission="[ 'manager_general', 'manager_specified' ]">
        <VCard :class="isVisaCardExpanded ? 'h-400' : 'h-auto'">
          <VCardTitle class="d-flex align-center justify-space-between">
            <div class="d-flex align-center">
              <VIcon class="me-2" color="warning">ri-passport-line</VIcon>
              <span>ビザ更新対象</span>
            </div>
            <div class="d-flex align-center">
              <VBtn
                icon
                variant="text"
                size="small"
                @click="isVisaCardExpanded = !isVisaCardExpanded"
                class="me-2"
              >
                <VIcon>{{ isVisaCardExpanded ? 'ri-arrow-up-s-line' : 'ri-arrow-down-s-line' }}</VIcon>
              </VBtn>
              <VBtn
                icon
                variant="text"
                size="small"
                @click="fetchVisaRenewalStudents"
                :loading="loadingVisaStudents"
              >
                <VIcon>ri-refresh-line</VIcon>
              </VBtn>
            </div>
          </VCardTitle>
          
          <VCardText v-if="isVisaCardExpanded" class="visa-card-content">
            <!-- 에러 메시지 -->
            <VAlert
              v-if="errorVisaStudents"
              type="error"
              variant="tonal"
              class="mb-4"
            >
              {{ errorVisaStudents }}
            </VAlert>
            
            <!-- 로딩 상태 -->
            <div v-if="loadingVisaStudents" class="d-flex justify-center align-center py-8">
              <VProgressCircular
                indeterminate
                color="primary"
                size="32"
              />
              <span class="ms-3">データを読み込み中...</span>
            </div>
            
            <!-- 학생 리스트 -->
            <div v-else-if="visaRenewalStudents.length > 0" class="visa-list-container">
              <VList>
                <VListItem
                  v-for="student in visaRenewalStudents"
                  :key="student.id"
                  @click="goToStudentDetail(student.id)"
                  class="mb-2 cursor-pointer"
                  :class="`border-${getVisaStatusColor(student.days_until_expiry)}`"
                  style="border-left: 4px solid; border-radius: 4px;"
                >
                  <template #prepend>
                    <VAvatar
                      :color="getVisaStatusColor(student.days_until_expiry)"
                      size="40"
                    >
                      <VIcon>ri-user-line</VIcon>
                    </VAvatar>
                  </template>
                  <VListItemTitle class="font-weight-bold">
                    {{ student.name }}
                  </VListItemTitle>
                  <VListItemSubtitle>
                    <div class="d-flex align-center">
                      <VIcon size="small" class="me-1">ri-calendar-line</VIcon>
                      在留カード有効期限: {{ student.residence_card_expiry ? new Date(student.residence_card_expiry).toLocaleDateString('ja-JP') : '-' }}
                    </div>
                    <div class="d-flex align-center mt-1">
                      <VIcon size="small" class="me-1">ri-time-line</VIcon>
                      <span :class="`text-${getVisaStatusColor(student.days_until_expiry)}`">
                        {{ student.expiry_status }}
                      </span>
                    </div>
                    <div class="d-flex align-center mt-1" v-if="student.company">
                      <VIcon size="small" class="me-1">ri-building-line</VIcon>
                      {{ student.company.name }}
                    </div>
                    <div class="d-flex align-center mt-1" v-if="student.current_room">
                      <VIcon size="small" class="me-1">ri-home-line</VIcon>
                      {{ student.current_room.building?.name }} {{ student.current_room.room_number }}号室
                    </div>
                  </VListItemSubtitle>
                  <template #append>
                    <VBtn
                      icon
                      variant="text"
                      size="small"
                      @click.stop="goToStudentDetail(student.id)"
                    >
                      <VIcon>ri-arrow-right-line</VIcon>
                    </VBtn>
                  </template>
                </VListItem>
              </VList>
            </div>
            
            <!-- 데이터 없음 -->
            <div v-else class="text-center py-8">
              <VIcon size="64" color="grey-lighten-1">ri-check-line</VIcon>
              <p class="text-grey mt-2">ビザ更新が迫っている技能生はいません。</p>
            </div>
          </VCardText>
        </VCard>
      </PermissionGuard>
    </VCol>

    <!-- 연락 리스트 (Admin만 접근 가능) -->
    <VCol cols="12" md="6">
      <PermissionGuard :permission="['mishima_user', 'admin']">
        <VCard :class="isContactCardExpanded ? 'h-400' : 'h-auto'">
          <VCardTitle class="d-flex align-center justify-space-between">
            <div class="d-flex align-center">
              <VIcon class="me-2" color="info">ri-file-text-line</VIcon>
              <span>連絡一覧</span>
            </div>
            <div class="d-flex align-center">
              <VBtn
                icon
                variant="text"
                size="small"
                @click="isContactCardExpanded = !isContactCardExpanded"
                class="me-2"
              >
                <VIcon>{{ isContactCardExpanded ? 'ri-arrow-up-s-line' : 'ri-arrow-down-s-line' }}</VIcon>
              </VBtn>
              <VBtn
                icon
                variant="text"
                size="small"
                @click="fetchContact"
                :loading="loadingContact"
              >
                <VIcon>ri-refresh-line</VIcon>
              </VBtn>
            </div>
          </VCardTitle>
          
          <VCardText v-if="isContactCardExpanded" class="contact-card-content">
            <!-- 에러 메시지 -->
            <VAlert
              v-if="errorContact"
              type="error"
              variant="tonal"
              class="mb-4"
            >
              {{ errorContact }}
            </VAlert>
            
            <!-- 로딩 상태 -->
            <div v-if="loadingContact" class="d-flex justify-center align-center py-8">
              <VProgressCircular
                indeterminate
                color="primary"
                size="32"
              />
              <span class="ms-3">データを読み込み中...</span>
            </div>
            
            <!-- 연락 리스트 -->
            <div v-else-if="contact.length > 0" class="contact-list-container">
              <VList>
                <VListItem
                  v-for="contact in contact"
                  :key="contact.id"
                  @click="openContactDetail(contact)"
                  class="mb-2 cursor-pointer"
                  style="border-left: 4px solid rgb(var(--v-theme-primary)); border-radius: 4px;"
                >
                  <template #prepend>
                    <VAvatar
                      :color="getContactStatusColor(contact.status || 'pending')"
                      size="40"
                    >
                      <VIcon>ri-file-text-line</VIcon>
                    </VAvatar>
                  </template>
                  <VListItemTitle class="font-weight-bold">
                    {{ getContactTypeText(contact.contact_type) }}
                  </VListItemTitle>
                  <VListItemSubtitle>
                    <div class="d-flex align-center">
                      <VIcon size="small" class="me-1">ri-user-line</VIcon>
                      {{ contact.creator?.name || 'システム' }}
                    </div>
                    <div class="d-flex align-center mt-1">
                      <VIcon size="small" class="me-1">ri-calendar-line</VIcon>
                      発生日: {{ new Date(contact.occurrence_date).toLocaleDateString('ja-JP') }}
                      <VIcon size="small" class="me-2 ms-4">ri-time-line</VIcon>
                      <VChip
                        :color="getContactStatusColor(contact.status || 'pending')"
                        size="x-small"
                        variant="tonal"
                      >
                        {{ getContactStatusText(contact.status || 'pending') }}
                      </VChip>
                    </div>
                    <div class="d-flex align-center mt-1">
                      <VIcon size="small" class="me-1">ri-file-text-line</VIcon>
                      <span class="text-truncate" style="max-width: 200px;">
                        {{ contact.contact_content }}
                      </span>
                    </div>
                  </VListItemSubtitle>
                  <template #append>
                    <VBtn
                      icon
                      variant="text"
                      size="small"
                      @click.stop="openContactDetail(contact)"
                    >
                      <VIcon>ri-arrow-right-line</VIcon>
                    </VBtn>
                  </template>
                </VListItem>
              </VList>
            </div>
            
            <!-- 데이터 없음 -->
            <div v-else class="text-center py-8">
              <VIcon size="64" color="grey-lighten-1">ri-inbox-line</VIcon>
              <p class="text-grey mt-2">連絡がありません</p>
            </div>
          </VCardText>
        </VCard>
      </PermissionGuard>
    </VCol>
  </VRow>

  <!-- iOS 알림 권한 프롬프트 -->
  <VDialog v-model="showNotificationPrompt" max-width="500px" persistent>
    <VCard>
      <VCardTitle class="d-flex align-center justify-space-between bg-primary text-white">
        <div class="d-flex align-center">
          <VIcon class="me-2" color="white">ri-notification-line</VIcon>
          <span>プッシュ通知を有効にする</span>
        </div>
      </VCardTitle>
      
      <VCardText class="pt-6 mx-2">
        <div class="text-center mb-4">
          <VIcon size="64" color="primary">ri-notification-badge-line</VIcon>
        </div>
        <p class="text-body-1 text-center mb-4">
          重要な情報をリアルタイムで受け取るために、プッシュ通知を有効にしてください。
        </p>
        <ul class="text-body-2 mb-4">
          <li>ビザ更新のリマインダー</li>
          <li>新しい連絡の通知</li>
          <li>システムからの重要なお知らせ</li>
        </ul>
      </VCardText>
      
      <VCardActions class="pa-4">
        <VBtn
          color="grey"
          variant="outlined"
          @click="handleDismissNotificationPrompt"
        >
          後で
        </VBtn>
        <VBtn
          color="primary"
          @click="handleEnableNotifications"
        >
          通知を有効にする
        </VBtn>
      </VCardActions>
    </VCard>
  </VDialog>

  <!-- 연락 상세 팝업 (Admin만 접근 가능) -->
  <PermissionGuard permission="admin">
    <VDialog v-model="showContactDetailDialog" max-width="800px">
    <VCard>
      <VCardTitle class="d-flex align-center justify-space-between">
        <div class="d-flex align-center gap-2">
          <VIcon>ri-file-text-line</VIcon>
          <span>連絡詳細</span>
        </div>
        <VBtn
          icon
          variant="text"
          @click="showContactDetailDialog = false"
        >
          <VIcon>ri-close-line</VIcon>
        </VBtn>
      </VCardTitle>
      
      <VCardText v-if="selectedContact">
          <!-- 연락 내용 -->
          <div class="mb-4">            
            <!-- 상세 정보 그리드 -->
            <VRow>
              <VCol cols="12" md="6">
                <VCard variant="outlined" class="pa-3 info-card">
                  <div class="d-flex align-center mb-2">
                    <VIcon color="info" size="20" class="me-2">ri-information-line</VIcon>
                    <span class="text-subtitle-2 font-weight-bold">基本情報</span>
                  </div>
                  <div class="info-item">
                    <span class="info-label">作成者:</span>
                    <span class="info-value">{{ selectedContact.creator?.name || 'システム' }}</span>
                  </div>
                  <div class="info-item">
                    <span class="info-label">連絡種類:</span>
                    <VChip
                      :color="getContactStatusColor(selectedContact.status || 'pending')"
                      size="small"
                      variant="tonal"
                      class="ms-2"
                    >
                      {{ getContactTypeText(selectedContact.contact_type) }}
                    </VChip>
                  </div>
                  <div class="info-item">
                    <span class="info-label">発生日:</span>
                    <span class="info-value">{{ new Date(selectedContact.occurrence_date).toLocaleDateString('ja-JP') }}</span>
                  </div>
                  <div class="info-item">
                    <span class="info-label">状態:</span>
                    <VChip
                      :color="getContactStatusColor(selectedContact.status || 'pending')"
                      size="small"
                      variant="tonal"
                      class="ms-2"
                    >
                      {{ getContactStatusText(selectedContact.status || 'pending') }}
                    </VChip>
                  </div>
                </VCard>
              </VCol>
              <VCol cols="12" md="6">
                <VCard variant="outlined" class="pa-3 info-card">
                  <div class="d-flex align-center mb-2">
                    <VIcon color="success" size="20" class="me-2">ri-time-line</VIcon>
                    <span class="text-subtitle-2 font-weight-bold">時間情報</span>
                  </div>
                  <div class="info-item">
                    <span class="info-label">作成日:</span>
                    <span class="info-value">{{ new Date(selectedContact.created_at).toLocaleDateString('ja-JP') }}</span>
                  </div>
                  <div class="info-item">
                    <span class="info-label">経過時間:</span>
                    <span class="info-value">
                      {{ Math.floor((new Date().getTime() - new Date(selectedContact.created_at).getTime()) / (1000 * 60 * 60 * 24)) }}日
                    </span>
                  </div>
                </VCard>
              </VCol>
            </VRow>
            <!-- 메인 정보 카드 -->
            <VCard 
              variant="outlined" 
              class="pa-4 mt-4 contact-content-card"
              :color="getContactStatusColor(selectedContact.status || 'pending')"
            >
              <div class="d-flex align-center mb-3">
                <VAvatar
                  :color="getContactStatusColor(selectedContact.status || 'pending')"
                  size="32"
                  class="me-3"
                >
                  <VIcon size="20">ri-file-text-line</VIcon>
                </VAvatar>
                <div>
                  <h6 class="text-h6 mb-1">{{ getContactTypeText(selectedContact.contact_type) }}</h6>
                  <p class="text-caption text-medium-emphasis mb-0">
                    {{ new Date(selectedContact.occurrence_date).toLocaleDateString('ja-JP', { 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric',
                      weekday: 'long'
                    }) }}
                  </p>
                </div>
              </div>
              
              <VDivider class="my-3" />
              
              <div class="contact-content-text">
                {{ selectedContact.contact_content }}
              </div>
            </VCard>
          </div>

          <!-- 사진 -->
          <div v-if="selectedContact.photos && selectedContact.photos.length > 0" class="mb-4">
            <h6 class="text-h6 mb-3">添付写真</h6>
            <div class="d-flex flex-wrap gap-2">
              <div
                v-for="(photo, index) in selectedContact.photos"
                :key="index"
                class="photo-container"
              >
                <img
                  :src="photo.photo_url"
                  :alt="`写真${index + 1}`"
                  class="photo-preview"
                  @click="openPhotoInNewTab(photo.photo_url)"
                />
              </div>
            </div>
          </div>

          <!-- 기존 코멘트 목록 -->
          <div v-if="selectedContact.comments && selectedContact.comments.length > 0" class="mb-4">
            <h6 class="text-h6 mb-3">コメント履歴</h6>
            <div class="comments-container">
              <div
                v-for="comment in selectedContact.comments"
                :key="comment.id"
                class="comment-item"
              >
                <div class="comment-line">
                  <span class="comment-author">{{ comment.operator?.name || comment.created_by }}</span>
                  <span class="comment-date">
                    {{ new Date(comment.created_at).toLocaleString('ja-JP', {
                      month: '2-digit',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit'
                    }) }}
                  </span>
                  <span class="comment-content">{{ comment.comment }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- 코멘트 입력 영역 -->
          <div v-if="showCommentInput" class="mb-4">
            <VDivider class="my-3" />
            <VCard variant="outlined" class="pa-3 comment-input-card">
              <div class="d-flex align-center mb-3">
                <VIcon 
                  :color="commentType === 'completed' ? 'success' : commentType === 'rejected' ? 'error' : commentType === 'cancel' ? 'error' : 'primary'" 
                  size="20" 
                  class="me-2"
                >
                  {{ commentType === 'completed' ? 'ri-check-line' : commentType === 'rejected' ? 'ri-close-line' : 'ri-message-line' }}
                </VIcon>
                <h6 class="text-h6 mb-0">
                  {{ commentType === 'completed' ? '処理' : commentType === 'rejected' ? '却下' : '' }}コメント
                </h6>
              </div>
              <VTextarea
                v-model="commentText"
                :label="commentType === 'completed' ? '処理内容を入力してください' : commentType === 'rejected' ? '却下理由を入力してください' : 'コメントを入力してください'"
                rows="3"
                variant="outlined"
                class="mb-3"
                placeholder="コメントを入力してください..."
              />
              <div class="d-flex gap-2 justify-end">
                <VBtn
                  color="primary"
                  @click="submitAction"
                  :loading="processingContact"
                  :disabled="!commentText.trim()"
                >
                  {{ commentType === 'completed' ? '処理完了' : commentType === 'rejected' ? '却下完了' : 'コメント完了' }}
                </VBtn>
                <VBtn
                  variant="outlined"
                  @click="showCommentInput = false"
                >
                  キャンセル
                </VBtn>
              </div>
            </VCard>
          </div>

          <!-- 하단 액션 버튼 -->
          <div 
            v-if="selectedContact.status === 'pending'"
            class="d-flex justify-end gap-2 mt-4 pt-4" 
            style="border-top: 1px solid rgba(var(--v-theme-outline), 0.2);"
          >
            <VBtn
              color="primary"
              variant="outlined"
              prepend-icon="ri-check-line"
              @click="handleActionClick('comment')"
              :disabled="selectedContact.status === 'completed'"
            >
              コメント入力
            </VBtn>
            <VBtn
              color="success"
              variant="outlined"
              prepend-icon="ri-check-line"
              @click="handleActionClick('completed')"
              :disabled="selectedContact.status === 'completed'"
            >
              完了
            </VBtn>
            <VBtn
              color="error"
              variant="outlined"
              prepend-icon="ri-close-line"
              @click="handleActionClick('rejected')"
              :disabled="selectedContact.status === 'rejected'"
            >
              却下
            </VBtn>
          </div>
          <div 
            v-else-if="selectedContact.status === 'rejected' || selectedContact.status === 'completed'"
            class="d-flex justify-end gap-2 mt-4 pt-4" 
            style="border-top: 1px solid rgba(var(--v-theme-outline), 0.2);"
          >
            <VBtn
              color="success"
              variant="outlined"
              prepend-icon="ri-check-line"
              @click="handleActionClick('pending')"
            >
              再処理
            </VBtn>
          </div>
        </VCardText>
    </VCard>
  </VDialog>
  </PermissionGuard>
</template>

<style scoped>
.cursor-pointer {
  width: 99%;
  cursor: pointer;
  transition: all 0.2s ease;
}

.cursor-pointer:hover {
  transform: translateX(4px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.border-error {
  border-left-color: rgb(var(--v-theme-error)) !important;
}

.border-warning {
  border-left-color: rgb(var(--v-theme-warning)) !important;
}

.border-info {
  border-left-color: rgb(var(--v-theme-info)) !important;
}

.border-success {
  border-left-color: rgb(var(--v-theme-success)) !important;
}

/* 사진 미리보기 스타일 */
.photo-container {
  position: relative;
  display: inline-block;
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 4px;
  background: white;
  cursor: pointer;
  transition: all 0.2s ease;
}

.photo-container:hover {
  transform: scale(1.05);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.photo-preview {
  width: 120px;
  height: 120px;
  object-fit: cover;
  border-radius: 4px;
  display: block;
}

.text-truncate {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 연락 내용 카드 스타일 */
.contact-content-card {
  border-radius: 12px;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.contact-content-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: linear-gradient(90deg, var(--v-theme-primary), var(--v-theme-secondary));
}

.contact-content-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
}

.contact-content-text {
  font-size: 1rem;
  line-height: 1.6;
  color: var(--v-theme-on-surface);
  padding: 16px;
  border-radius: 8px;
  border-left: 4px solid var(--v-theme-primary);
}

/* 정보 카드 스타일 */
.info-card {
  border-radius: 12px;
  transition: all 0.3s ease;
  height: 100%;
}

.info-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.08);
}

.info-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px solid rgba(var(--v-theme-outline), 0.2);
}

.info-item:last-child {
  border-bottom: none;
}

.info-label {
  font-weight: 500;
  color: var(--v-theme-on-surface-variant);
  font-size: 0.875rem;
}

.info-value {
  font-weight: 600;
  color: var(--v-theme-on-surface);
  font-size: 0.875rem;
}

/* 코멘트 입력 카드 스타일 */
.comment-input-card {
  border-radius: 12px;
  border-left: 4px solid var(--v-theme-primary);
  background: rgba(var(--v-theme-surface-variant), 0.05);
  transition: all 0.3s ease;
}

.comment-input-card:hover {
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.08);
}

/* 카드 높이 및 스크롤 스타일 */
.h-400 {
  height: 400px !important;
}

.h-600 {
  height: 600px !important;
}

.h-auto {
  height: auto !important;
}

.visa-card-content {
  height: calc(400px - 80px); /* 카드 제목 높이 제외 */
  overflow-y: auto;
  padding-right: 8px;
}

.contact-card-content {
  height: calc(400px - 80px); /* 카드 제목 높이 제외 */
  overflow-y: auto;
  padding-right: 8px;
}

.visa-list-container,
.contact-list-container {
  max-height: 100%;
  overflow-y: auto;
}

/* 스크롤바 스타일링 */
.visa-card-content::-webkit-scrollbar,
.contact-card-content::-webkit-scrollbar {
  width: 6px;
}

.visa-card-content::-webkit-scrollbar-track,
.contact-card-content::-webkit-scrollbar-track {
  background: rgba(var(--v-theme-outline), 0.1);
  border-radius: 3px;
}

.visa-card-content::-webkit-scrollbar-thumb,
.contact-card-content::-webkit-scrollbar-thumb {
  background: rgba(var(--v-theme-outline), 0.3);
  border-radius: 3px;
}

.visa-card-content::-webkit-scrollbar-thumb:hover,
.contact-card-content::-webkit-scrollbar-thumb:hover {
  background: rgba(var(--v-theme-outline), 0.5);
}

/* 코멘트 목록 스타일 */
.comments-container {
  max-height: 300px;
  overflow-y: auto;
}

.comment-item {
  background: rgba(var(--v-theme-surface-variant), 0.03);
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 8px;
  border-left: 3px solid rgb(var(--v-theme-primary));
  transition: all 0.2s ease;
}

.comment-item:hover {
  background: rgba(var(--v-theme-surface-variant), 0.08);
}

.comment-line {
  display: flex;
  align-items: center;
  gap: 12px; /* 작성자, 날짜, 내용 사이 간격 */
  flex-wrap: wrap; /* 긴 내용일 때 줄바꿈 */
}

.comment-author {
  font-weight: 600;
  font-size: 0.875rem;
  color: var(--v-theme-primary);
  min-width: fit-content; /* 작성자 이름이 줄바꿈되지 않도록 */
}

.comment-date {
  font-size: 0.75rem;
  color: var(--v-theme-on-surface-variant);
  min-width: fit-content; /* 날짜가 줄바꿈되지 않도록 */
}

.comment-content {
  font-size: 0.875rem;
  line-height: 1.4;
  color: var(--v-theme-on-surface);
  word-break: break-word;
  flex: 1; /* 남은 공간을 모두 차지 */
}
</style>
