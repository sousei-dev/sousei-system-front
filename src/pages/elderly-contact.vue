<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { contactService } from '@/services/contact'
import { elderlyService, type Elderly } from '@/services/elderly'
import { elderlyHospitalizationService, type ElderlyHospitalizationCreate, type ElderlyHospitalizationResponse } from '@/services/elderlyHospitalization'

const router = useRouter()

// 메인 카테고리 상태
const mainCategory = ref<'contact' | 'hospitalization' | null>(null)

// 탭 상태
const contactTab = ref<'create' | 'list'>('create')
const hospitalizationTab = ref<'admission' | 'discharge'>('admission')

// 로딩 및 메시지 상태
const loading = ref(false)
const error = ref<string | null>(null)
const success = ref<string | null>(null)

// 연락 목록
const contactList = ref<any[]>([])
const contactListLoading = ref(false)

// 이미지 input ref
const imageInput = ref<HTMLInputElement>()

// 코멘트 다이얼로그
const showCommentsDialog = ref(false)
const selectedContactForComments = ref<any>(null)

// 입원/퇴원 다이얼로그
const showAdmissionDialog = ref(false)
const showDischargeDialog = ref(false)

// 노인 목록
const elderlyList = ref<Elderly[]>([])
const elderlyListLoading = ref(false)
const selectedElderly = ref<Elderly | null>(null)

// 노인 검색
const elderlySearchQuery = ref('')

// 입원/퇴원 기록
const hospitalizationRecords = ref<ElderlyHospitalizationResponse[]>([])

// 입원 연락표 폼
const admissionForm = ref({
  elderly_id: '',
  elderly_name: '',
  admission_date: '',
  hospital_name: '',
  meal_final_date: '',
  meal_final_type: '', // 'breakfast', 'lunch', 'dinner'
})

// 퇴원 연락표 폼
const dischargeForm = ref({
  record_id: '',
  elderly_id: '',
  elderly_name: '',
  discharge_date: '',
  meal_resume_date: '',
  meal_resume_type: '', // 'breakfast', 'lunch', 'dinner'
})

// 연락 옵션
const contactOptions = [
  { title: '故障', value: 'defect' },
  { title: 'クレーム', value: 'claim' },
  { title: 'その他', value: 'other' },
]

// 연락 폼
const contactForm = ref({
  contact_type: '' as 'defect' | 'claim' | 'other' | '',
  content: '',
  incident_date: new Date().toISOString().split('T')[0],
  images: [] as File[],
})

// 이미지 파일 선택
const handleImageSelect = (event: Event) => {
  const target = event.target as HTMLInputElement
  if (target.files) {
    const newFiles = Array.from(target.files)
    
    // 파일 크기 및 타입 검증
    const validFiles = newFiles.filter(file => {
      // 파일 크기 체크 (5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('ファイルサイズは5MBを超えることはできません。')
        return false
      }
      
      // 파일 타입 체크
      const allowedTypes = ['image/jpg', 'image/jpeg', 'image/png']
      if (!allowedTypes.includes(file.type)) {
        alert('JPG、PNGファイルのみアップロード可能です。')
        return false
      }
      
      return true
    })
    
    // 기존 이미지와 합치기 (최대 5장)
    if (contactForm.value.images.length + validFiles.length > 5) {
      alert('画像は最大5枚までアップロード可能です。')
      return
    }
    
    contactForm.value.images.push(...validFiles)
  }
}

// 이미지 제거
const removeImage = (index: number) => {
  contactForm.value.images.splice(index, 1)
}

// 이미지 미리보기 URL 생성
const getImagePreviewUrl = (file: File) => {
  return URL.createObjectURL(file)
}

// 연락 저장
const saveContact = async () => {
  try {
    loading.value = true
    error.value = null
    success.value = null

    if (contactForm.value.contact_type && ['defect', 'claim', 'other'].includes(contactForm.value.contact_type)) {
      await contactService.createContact({
        occurrence_date: contactForm.value.incident_date,
        contact_type: contactForm.value.contact_type as 'defect' | 'claim' | 'other',
        contact_content: contactForm.value.content,
        photos: contactForm.value.images
      })
    } else {
      throw new Error('連絡種類を選択してください。')
    }

    // 성공 메시지 표시
    success.value = '連絡が正常に送信されました。'
    
    // 폼 초기화
    contactForm.value = {
      contact_type: '',
      content: '',
      incident_date: new Date().toISOString().split('T')[0],
      images: []
    }
    
    // 목록 새로고침
    await fetchContactList()
    
    // 목록 탭으로 이동
    contactTab.value = 'list'
    
    // 3초 후 성공 메시지 숨기기
    setTimeout(() => {
      success.value = null
    }, 3000)
    
  } catch (err: any) {
    error.value = err.response?.data?.detail || '連絡の送信に失敗しました。'
  } finally {
    loading.value = false
  }
}

// 연락 목록 조회
const fetchContactList = async () => {
  try {
    contactListLoading.value = true
    const response = await contactService.getContacts()
    contactList.value = response.items
  } catch (err) {
    console.error('연락 목록 조회 실패:', err)
    error.value = '連絡リストの取得に失敗しました。'
  } finally {
    contactListLoading.value = false
  }
}

// 연락 취소
const cancelContact = async (contactId: string) => {
  try {
    if (confirm('この連絡をキャンセルしますか？')) {
      await contactService.cancelContact(contactId)
      
      success.value = '連絡が正常にキャンセルされました。'
      await fetchContactList()
      
      setTimeout(() => {
        success.value = null
      }, 3000)
    }
  } catch (err) {
    console.error('연락 취소 실패:', err)
    error.value = '連絡のキャンセルに失敗しました。'
  }
}

// 코멘트 다이얼로그 열기
const openCommentsDialog = (contact: any) => {
  selectedContactForComments.value = contact
  showCommentsDialog.value = true
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
    case 'cancelled':
      return 'キャンセル'
    case 'rejected':
      return '却下'
    default:
      return status
  }
}

// 날짜 포맷팅
const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  return date.toLocaleDateString('ja-JP')
}

// 노인 목록 조회
const fetchElderlyList = async () => {
  try {
    elderlyListLoading.value = true
    const response = await elderlyService.getElderlys({ page: 1, page_size: 100 })
    elderlyList.value = response.items
    console.log('노인 목록:', elderlyList.value)
    
    // 입원 기록 수집
    hospitalizationRecords.value = []
    response.items.forEach(elderly => {
      if (elderly.latest_hospitalization) {
        hospitalizationRecords.value.push(elderly.latest_hospitalization)
      }
    })
    console.log('입원 기록:', hospitalizationRecords.value)
  } catch (err) {
    console.error('노인 목록 조회 실패:', err)
  } finally {
    elderlyListLoading.value = false
  }
}

// 입원 연락표 작성
const prepareAdmissionForm = (elderly: Elderly) => {
  console.log('입원 연락표 작성:', elderly)
  selectedElderly.value = elderly
  admissionForm.value = {
    elderly_id: elderly.id,
    elderly_name: elderly.name,
    admission_date: new Date().toISOString().split('T')[0],
    hospital_name: '',
    meal_final_date: new Date().toISOString().split('T')[0],
    meal_final_type: '',
  }
  showAdmissionDialog.value = true
  console.log('selectedElderly 설정 완료:', selectedElderly.value)
}

// 퇴원 연락표 작성
const prepareDischargeForm = (elderly: Elderly) => {
  console.log('퇴원 연락표 작성:', elderly)
  selectedElderly.value = elderly
  const record = hospitalizationRecords.value.find(
    r => r.elderly_id === elderly.id && r.hospitalization_type === 'admission'
  )
  
  if (record) {
    dischargeForm.value = {
      record_id: record.id || '',
      elderly_id: elderly.id,
      elderly_name: elderly.name,
      discharge_date: new Date().toISOString().split('T')[0],
      meal_resume_date: new Date().toISOString().split('T')[0],
      meal_resume_type: '',
    }
    showDischargeDialog.value = true
    console.log('selectedElderly 설정 완료:', selectedElderly.value)
  }
}

// 입원 연락표 저장
const saveAdmissionRecord = async () => {
  try {
    loading.value = true
    error.value = null
    
    const data: ElderlyHospitalizationCreate = {
      elderly_id: admissionForm.value.elderly_id,
      hospitalization_type: 'admission',
      hospital_name: admissionForm.value.hospital_name,
      date: admissionForm.value.admission_date,
      last_meal_date: admissionForm.value.meal_final_date,
      last_meal_type: admissionForm.value.meal_final_type as 'breakfast' | 'lunch' | 'dinner',
    }

    await elderlyHospitalizationService.createElderlyHospitalization(data)
    success.value = '入院連絡票が正常に保存されました。'
    
    // 다이얼로그 닫기
    showAdmissionDialog.value = false
    
    // 폼 초기화
    admissionForm.value = {
      elderly_id: '',
      elderly_name: '',
      admission_date: '',
      hospital_name: '',
      meal_final_date: '',
      meal_final_type: '',
    }
    selectedElderly.value = null
    
    // 노인 목록 다시 조회
    await fetchElderlyList()
    
    setTimeout(() => {
      success.value = null
    }, 3000)
  } catch (err: any) {
    error.value = err.response?.data?.detail || '入院連絡票の保存に失敗しました。'
  } finally {
    loading.value = false
  }
}

// 퇴원 연락표 저장
const saveDischargeRecord = async () => {
  try {
    loading.value = true
    error.value = null
    
    const record = hospitalizationRecords.value.find(
      r => r.elderly_id === dischargeForm.value.elderly_id && r.hospitalization_type === 'admission'
    )
    
    const data: ElderlyHospitalizationCreate = {
      elderly_id: dischargeForm.value.elderly_id,
      hospitalization_type: 'discharge',
      hospital_name: record?.hospital_name || '',
      date: record?.date || '',
      meal_resume_date: dischargeForm.value.meal_resume_date,
      meal_resume_type: dischargeForm.value.meal_resume_type as 'breakfast' | 'lunch' | 'dinner',
    }

    await elderlyHospitalizationService.createElderlyHospitalization(data)
    success.value = '退院連絡票が正常に保存されました。'
    
    // 다이얼로그 닫기
    showDischargeDialog.value = false
    
    // 폼 초기화
    dischargeForm.value = {
      record_id: '',
      elderly_id: '',
      elderly_name: '',
      discharge_date: '',
      meal_resume_date: '',
      meal_resume_type: '',
    }
    selectedElderly.value = null
    
    // 노인 목록 다시 조회
    await fetchElderlyList()
    
    setTimeout(() => {
      success.value = null
    }, 3000)
  } catch (err: any) {
    error.value = err.response?.data?.detail || '退院連絡票の保存に失敗しました。'
  } finally {
    loading.value = false
  }
}

// 입원 기록 확인
const hasAdmissionRecord = (elderlyId: string) => {
  return hospitalizationRecords.value.some(
    r => r.elderly_id === elderlyId && r.hospitalization_type === 'admission'
  )
}

// 건물 이름 가져오기
const getBuildingName = (elderly: Elderly) => {
  return (elderly.current_room as any)?.building?.name || '-'
}

// 검색 필터링된 입원 가능한 노인 목록
const filteredAdmissionElderly = computed(() => {
  const query = elderlySearchQuery.value.toLowerCase()
  return elderlyList.value
    .filter(e => !hasAdmissionRecord(e.id))
    .filter(e => {
      if (!query) return true
      return (
        e.name.toLowerCase().includes(query) ||
        (e.name_katakana && e.name_katakana.toLowerCase().includes(query)) ||
        (e.current_room?.room_number && e.current_room.room_number.toLowerCase().includes(query))
      )
    })
})

// 검색 필터링된 퇴원 가능한 노인 목록
const filteredDischargeElderly = computed(() => {
  const query = elderlySearchQuery.value.toLowerCase()
  return elderlyList.value
    .filter(e => hasAdmissionRecord(e.id))
    .filter(e => {
      if (!query) return true
      return (
        e.name.toLowerCase().includes(query) ||
        (e.name_katakana && e.name_katakana.toLowerCase().includes(query)) ||
        getBuildingName(e).toLowerCase().includes(query) ||
        (e.current_room?.room_number && e.current_room.room_number.toLowerCase().includes(query))
      )
    })
})

// 뒤로 가기
const goBack = () => {
  router.back()
}

// 초기화
onMounted(() => {
  fetchContactList()
  fetchElderlyList()
})
</script>

<template>
  <div class="elderly-contact-page">
    <!-- 헤더 -->
    <div class="page-header">
      <VBtn
        icon
        variant="text"
        @click="goBack"
        class="me-3"
      >
        <VIcon>ri-arrow-left-line</VIcon>
      </VBtn>
      <div>
        <h2 class="page-title">
          <VIcon size="28" class="me-2">ri-file-text-line</VIcon>
          連絡管理
        </h2>
        <p class="page-subtitle">故障・クレーム・その他の連絡を管理します</p>
      </div>
    </div>

    <!-- 카테고리 선택 화면 -->
    <div v-if="mainCategory === null" class="category-selection mt-6">
      <VRow>
        <VCol cols="12" md="6">
          <VCard
            class="category-card"
            hover
            @click="mainCategory = 'contact'"
          >
            <VCardText class="text-center py-12">
              <VAvatar
                size="80"
                color="primary"
                class="mb-4"
              >
                <VIcon size="48">ri-message-3-line</VIcon>
              </VAvatar>
              <h3 class="text-h4 mb-2">連絡管理</h3>
              <p class="text-body-1 text-medium-emphasis mb-0">
                故障・クレーム・その他の連絡を管理します
              </p>
            </VCardText>
          </VCard>
        </VCol>
        
        <VCol cols="12" md="6">
          <VCard
            class="category-card"
            hover
            @click="mainCategory = 'hospitalization'"
          >
            <VCardText class="text-center py-12">
              <VAvatar
                size="80"
                color="success"
                class="mb-4"
              >
                <VIcon size="48">ri-hospital-line</VIcon>
              </VAvatar>
              <h3 class="text-h4 mb-2">入退院管理</h3>
              <p class="text-body-1 text-medium-emphasis mb-0">
                入院・退院連絡票を管理します
              </p>
            </VCardText>
          </VCard>
        </VCol>
      </VRow>
    </div>

    <!-- 連絡管理 섹션 -->
    <VCard v-if="mainCategory === 'contact'" class="mt-6">
      <VCardTitle class="d-flex align-center justify-space-between">
        <div class="d-flex align-center">
          <VIcon class="me-2" size="24">ri-message-3-line</VIcon>
          <span class="text-h5">連絡管理</span>
        </div>
        <VBtn
          icon
          variant="text"
          @click="mainCategory = null"
        >
          <VIcon>ri-arrow-left-line</VIcon>
        </VBtn>
      </VCardTitle>
      
      <VDivider />
      
      <!-- 탭 헤더 -->
      <VTabs v-model="contactTab" class="px-4">
        <VTab value="create">
          <VIcon class="me-2">ri-edit-line</VIcon>
          連絡作成
        </VTab>
        <VTab value="list">
          <VIcon class="me-2">ri-list-check</VIcon>
          送信済み連絡
        </VTab>
      </VTabs>
      
      <VDivider />
      
      <!-- 성공 메시지 -->
      <VAlert
        v-if="success"
        type="success"
        variant="tonal"
        class="ma-4"
        closable
        @click:close="success = null"
      >
        {{ success }}
      </VAlert>
      
      <!-- 에러 메시지 -->
      <VAlert
        v-if="error"
        type="error"
        variant="tonal"
        class="ma-4"
        closable
        @click:close="error = null"
      >
        {{ error }}
      </VAlert>
      
      <!-- 탭 내용 -->
      <VWindow v-model="contactTab">
        <!-- 작성 탭 -->
        <VWindowItem value="create">
          <VCardText>
            <VForm @submit.prevent="saveContact">
              <VRow>
                <VCol cols="12">
                  <VTextField
                    v-model="contactForm.incident_date"
                    label="発生日"
                    type="date"
                    hide-details
                  />
                </VCol>
                <VCol cols="12">
                  <VSelect
                    v-model="contactForm.contact_type"
                    :items="contactOptions"
                    item-title="title"
                    item-value="value"
                    label="連絡種類"
                    placeholder="連絡種類を選択してください"
                    :disabled="loading"
                  />
                </VCol>
                <VCol cols="12">
                  <VTextarea
                    v-model="contactForm.content"
                    label="内容"
                    placeholder="内容を入力してください"
                    rows="5"
                    :disabled="loading"
                  />
                </VCol>
                
                <!-- 이미지 업로드 섹션 -->
                <VCol cols="12">
                  <VDivider class="my-4" />
                  <div class="d-flex align-center justify-space-between mb-3">
                    <h6 class="text-h6 mb-0">画像添付</h6>
                    <span class="text-caption text-medium-emphasis">
                      {{ contactForm.images.length }}/5
                    </span>
                  </div>
                  
                  <!-- 이미지 업로드 버튼 -->
                  <div class="d-flex align-center gap-2 mb-3">
                    <VBtn
                      color="primary"
                      variant="outlined"
                      size="small"
                      @click="imageInput?.click()"
                      :disabled="contactForm.images.length >= 5"
                    >
                      <VIcon class="me-2" size="16">ri-image-add-line</VIcon>
                      画像を選択
                    </VBtn>
                    <span class="text-caption text-medium-emphasis">
                      JPEG、JPG、PNGファイル (最大5MB、最大5枚)
                    </span>
                  </div>
                  
                  <!-- 숨겨진 파일 입력 -->
                  <input
                    ref="imageInput"
                    type="file"
                    multiple
                    accept=".jpg,.jpeg,.png"
                    hidden
                    @change="handleImageSelect"
                  />
                  
                  <!-- 이미지 미리보기 -->
                  <div v-if="contactForm.images.length > 0" class="d-flex flex-wrap gap-2">
                    <div
                      v-for="(image, index) in contactForm.images"
                      :key="index"
                      class="image-preview-container"
                    >
                      <img
                        :src="getImagePreviewUrl(image)"
                        :alt="`画像${index + 1}`"
                        class="image-preview"
                      />
                      <VBtn
                        icon
                        size="x-small"
                        color="error"
                        variant="tonal"
                        class="remove-image-btn"
                        @click="removeImage(index)"
                      >
                        <VIcon size="12">ri-close-line</VIcon>
                      </VBtn>
                      <div class="image-name">{{ image.name }}</div>
                    </div>
                  </div>
                </VCol>
              </VRow>
            </VForm>
          </VCardText>
          <VCardActions>
            <VSpacer />
            <VBtn
              variant="outlined"
              color="grey"
              @click="goBack"
            >
              戻る
            </VBtn>
            <VBtn
              variant="flat"
              color="primary"
              :loading="loading"
              :disabled="contactForm.contact_type === '' || contactForm.content === ''"
              @click="saveContact"
            >
              送信
            </VBtn>
          </VCardActions>
        </VWindowItem>
        
        <!-- 목록 탭 -->
        <VWindowItem value="list">
          <VCardText>
            <div class="d-flex justify-space-between align-center mb-4">
              <h6 class="text-h6 mb-0">送信済み連絡一覧</h6>
              <VBtn
                color="primary"
                variant="outlined"
                size="small"
                @click="fetchContactList"
                :loading="contactListLoading"
              >
                <VIcon class="me-2" size="16">ri-refresh-line</VIcon>
                更新
              </VBtn>
            </div>
            
            <!-- 로딩 상태 -->
            <div v-if="contactListLoading" class="d-flex justify-center py-8">
              <VProgressCircular indeterminate color="primary" />
            </div>
            
            <!-- 연락 목록 -->
            <div 
              v-else-if="contactList.length > 0"
              class="contact-list-container"
            >
              <VList>
                <VListItem
                  v-for="contact in contactList.filter(r => r.status !== 'cancel')"
                  :key="contact.id"
                  class="mb-2 contact-item"
                >
                  <template #prepend>
                    <VAvatar
                      :color="contact.contact_type === 'defect' ? 'error' : contact.contact_type === 'claim' ? 'warning' : 'info'"
                      size="40"
                    >
                      <VIcon>ri-file-text-line</VIcon>
                    </VAvatar>
                  </template>
                  
                  <VListItemTitle class="font-weight-bold">
                    {{ getContactTypeText(contact.contact_type) }}
                  </VListItemTitle>
                  
                  <VListItemSubtitle>
                    <div class="d-flex align-center gap-4 flex-wrap">
                      <span class="text-caption">
                        <VIcon size="small" class="me-1">ri-user-line</VIcon>
                        {{ contact.creator?.name || 'システム' }}
                      </span>
                      <span class="text-caption">
                        <VIcon size="small" class="me-1">ri-calendar-line</VIcon>
                        {{ formatDate(contact.occurrence_date) }}
                      </span>
                      <span class="text-caption">
                        <VIcon size="small" class="me-1">ri-time-line</VIcon>
                        {{ formatDate(contact.created_at) }}
                      </span>
                      <VChip
                        :color="contact.status === 'completed' ? 'success' : contact.status === 'rejected' ? 'error' : 'warning'"
                        size="x-small"
                        variant="tonal"
                      >
                        {{ getContactStatusText(contact.status) }}
                      </VChip>
                      <!-- 코멘트 이력 표시 -->
                      <VChip
                        v-if="contact.comments && contact.comments.length > 0"
                        color="info"
                        size="x-small"
                        variant="tonal"
                        class="comment-indicator"
                      >
                        <VIcon size="12" class="me-1">ri-message-2-line</VIcon>
                        {{ contact.comments.length }}件
                      </VChip>
                    </div>
                    <div class="mt-2 text-body-2">
                      {{ contact.contact_content }}
                    </div>
                  </VListItemSubtitle>
                  
                  <!-- 액션 버튼들 -->
                  <template #append>
                    <div class="d-flex align-center gap-2">
                      <!-- 코멘트보기 버튼 -->
                      <VBtn
                        v-if="contact.comments && contact.comments.length > 0"
                        variant="text"
                        size="small"
                        color="primary"
                        @click.stop="openCommentsDialog(contact)"
                        class="action-btn comment-btn"
                      >
                        コメントを見る
                      </VBtn>
                      
                      <!-- 삭제 버튼 (pending 상태일 때만) -->
                      <VBtn
                        v-if="contact.status === 'pending'"
                        variant="text"
                        size="small"
                        color="error"
                        @click.stop="cancelContact(contact.id)"
                        class="action-btn delete-btn"
                      >
                        削除
                      </VBtn>
                    </div>
                  </template>
                </VListItem>
              </VList>
            </div>
            
            <!-- 빈 목록 -->
            <div v-else class="text-center py-8">
              <VIcon size="64" color="grey-lighten-1">ri-inbox-line</VIcon>
              <p class="text-grey mt-2">送信済みの連絡がありません</p>
            </div>
          </VCardText>
          <VCardActions>
            <VSpacer />
            <VBtn
              variant="outlined"
              color="grey"
              @click="goBack"
            >
              戻る
            </VBtn>
          </VCardActions>
        </VWindowItem>
      </VWindow>
    </VCard>

    <!-- 入退院管理 섹션 -->
    <VCard v-if="mainCategory === 'hospitalization'" class="mt-6">
      <VCardTitle class="d-flex align-center justify-space-between">
        <div class="d-flex align-center">
          <VIcon class="me-2" size="24">ri-hospital-line</VIcon>
          <span class="text-h5">入退院管理</span>
        </div>
        <VBtn
          icon
          variant="text"
          @click="mainCategory = null"
        >
          <VIcon>ri-arrow-left-line</VIcon>
        </VBtn>
      </VCardTitle>
      
      <VDivider />
      
      <!-- 탭 헤더 -->
      <VTabs v-model="hospitalizationTab" class="px-4">
        <VTab value="admission">
          <VIcon class="me-2">ri-hospital-line</VIcon>
          入院連絡票
        </VTab>
        <VTab value="discharge">
          <VIcon class="me-2">ri-home-heart-line</VIcon>
          退院連絡票
        </VTab>
      </VTabs>
      
      <VDivider />
      
      <!-- 성공 메시지 -->
      <VAlert
        v-if="success"
        type="success"
        variant="tonal"
        class="ma-4"
        closable
        @click:close="success = null"
      >
        {{ success }}
      </VAlert>
      
      <!-- 에러 메시지 -->
      <VAlert
        v-if="error"
        type="error"
        variant="tonal"
        class="ma-4"
        closable
        @click:close="error = null"
      >
        {{ error }}
      </VAlert>
      
      <!-- 탭 내용 -->
      <VWindow v-model="hospitalizationTab">
        <!-- 입원 연락표 탭 -->
        <VWindowItem value="admission">
          <VCardText>
            <div v-if="elderlyListLoading" class="d-flex justify-center py-8">
              <VProgressCircular indeterminate color="primary" />
            </div>
            
            <div v-else>
              <div class="mb-4">
                <h6 class="text-h6 mb-3">入院連絡票作成</h6>
                <p class="text-body-2 text-medium-emphasis">
                  入院する利用者を選択して、入院連絡票を作成します
                </p>
              </div>
              
              <!-- 검색 필드 -->
              <VTextField
                v-model="elderlySearchQuery"
                prepend-inner-icon="ri-search-line"
                placeholder="名前、部屋番号で検索..."
                variant="outlined"
                density="compact"
                clearable
                hide-details
                class="mb-3"
              />
              
              <!-- 검색 결과 개수 -->
              <div v-if="elderlySearchQuery" class="search-result-count mb-3">
                <VIcon size="16" class="me-1">ri-search-line</VIcon>
                <span>{{ filteredAdmissionElderly.length }}件の結果</span>
              </div>
              
              <!-- 입원 가능한 노인 목록 -->
              <div v-if="filteredAdmissionElderly.length > 0">
                <VList>
                  <VListItem
                    v-for="elderly in filteredAdmissionElderly"
                    :key="elderly.id"
                    class="mb-2 elderly-item"
                  >
                    <template #prepend>
                      <VAvatar color="primary" size="40">
                        <VIcon>ri-user-3-line</VIcon>
                      </VAvatar>
                    </template>
                    
                    <VListItemTitle class="font-weight-bold">
                      {{ elderly.name }}
                    </VListItemTitle>
                    
                    <VListItemSubtitle>
                      <div class="d-flex align-center gap-3 flex-wrap">
                        <span class="text-caption">
                          <VIcon size="small" class="me-1">ri-home-line</VIcon>
                          {{ getBuildingName(elderly) }} {{ elderly.current_room?.room_number || '-' }}
                        </span>
                        <span class="text-caption">
                          <VIcon size="small" class="me-1">ri-heart-line</VIcon>
                          {{ elderly.care_level }}
                        </span>
                      </div>
                    </VListItemSubtitle>
                    
                    <template #append>
                      <VBtn
                        color="warning"
                        variant="tonal"
                        size="small"
                        @click.stop="prepareAdmissionForm(elderly)"
                      >
                        <VIcon class="me-2" size="16">ri-hospital-line</VIcon>
                        入院連絡票作成
                      </VBtn>
                    </template>
                  </VListItem>
                </VList>
              </div>
              
              <!-- 빈 목록 -->
              <div v-else class="text-center py-8">
                <VIcon size="64" color="grey-lighten-1">ri-user-3-line</VIcon>
                <p class="text-grey mt-2">
                  {{ elderlySearchQuery ? '検索結果がありません' : '入院可能な利用者がいません' }}
                </p>
              </div>
            </div>
          </VCardText>
        </VWindowItem>

        <!-- 퇴원 연락표 탭 -->
        <VWindowItem value="discharge">
          <VCardText>
            <div v-if="elderlyListLoading" class="d-flex justify-center py-8">
              <VProgressCircular indeterminate color="primary" />
            </div>
            
            <div v-else>
              <div class="mb-4">
                <h6 class="text-h6 mb-3">退院連絡票作成</h6>
                <p class="text-body-2 text-medium-emphasis">
                  退院する利用者を選択して、退院連絡票を作成します
                </p>
              </div>
              
              <!-- 검색 필드 -->
              <VTextField
                v-model="elderlySearchQuery"
                prepend-inner-icon="ri-search-line"
                placeholder="名前、建物名、部屋番号で検索..."
                variant="outlined"
                density="compact"
                clearable
                hide-details
                class="mb-3"
              />
              
              <!-- 검색 결과 개수 -->
              <div v-if="elderlySearchQuery" class="search-result-count mb-3">
                <VIcon size="16" class="me-1">ri-search-line</VIcon>
                <span>{{ filteredDischargeElderly.length }}件の結果</span>
              </div>
              
              <!-- 퇴원 가능한 노인 목록 -->
              <div v-if="filteredDischargeElderly.length > 0">
                <VList>
                  <VListItem
                    v-for="elderly in filteredDischargeElderly"
                    :key="elderly.id"
                    class="mb-2 elderly-item"
                  >
                    <template #prepend>
                      <VAvatar color="success" size="40">
                        <VIcon>ri-user-3-line</VIcon>
                      </VAvatar>
                    </template>
                    
                    <VListItemTitle class="font-weight-bold">
                      {{ elderly.name }}
                    </VListItemTitle>
                    
                    <VListItemSubtitle>
                      <div class="d-flex align-center gap-3 flex-wrap">
                        <span class="text-caption">
                          <VIcon size="small" class="me-1">ri-home-line</VIcon>
                          {{ getBuildingName(elderly) }} {{ elderly.current_room?.room_number || '-' }}
                        </span>
                        <span class="text-caption">
                          <VIcon size="small" class="me-1">ri-heart-line</VIcon>
                          {{ elderly.care_level }}
                        </span>
                        <VChip color="error" size="x-small" variant="tonal">
                          入院中
                        </VChip>
                      </div>
                    </VListItemSubtitle>
                    
                    <template #append>
                      <VBtn
                        color="success"
                        variant="tonal"
                        size="small"
                        @click.stop="prepareDischargeForm(elderly)"
                      >
                        <VIcon class="me-2" size="16">ri-home-heart-line</VIcon>
                        退院連絡票作成
                      </VBtn>
                    </template>
                  </VListItem>
                </VList>
              </div>
              
              <!-- 빈 목록 -->
              <div v-else class="text-center py-8">
                <VIcon size="64" color="grey-lighten-1">ri-hospital-line</VIcon>
                <p class="text-grey mt-2">
                  {{ elderlySearchQuery ? '検索結果がありません' : '入院中の利用者がいません' }}
                </p>
              </div>
            </div>
          </VCardText>
        </VWindowItem>
      </VWindow>
    </VCard>
  </div>

  <!-- 코멘트 다이얼로그 -->
  <VDialog v-model="showCommentsDialog" max-width="600px">
    <VCard>
      <VCardTitle class="d-flex align-center justify-space-between">
        <div class="d-flex align-center gap-2">
          <VIcon>ri-message-2-line</VIcon>
          <span>コメント履歴</span>
        </div>
        <VBtn
          icon
          variant="text"
          @click="showCommentsDialog = false"
        >
          <VIcon>ri-close-line</VIcon>
        </VBtn>
      </VCardTitle>
      
      <VCardText v-if="selectedContactForComments">
        <!-- 연락 기본 정보 -->
        <VCard variant="outlined" class="pa-3 mb-4">
          <div class="d-flex align-center mb-2">
            <VAvatar
              :color="selectedContactForComments.contact_type === 'defect' ? 'error' : selectedContactForComments.contact_type === 'claim' ? 'warning' : 'info'"
              size="32"
              class="me-3"
            >
              <VIcon size="20">ri-file-text-line</VIcon>
            </VAvatar>
            <div>
              <h6 class="text-h6 mb-1">{{ getContactTypeText(selectedContactForComments.contact_type) }}</h6>
              <p class="text-caption text-medium-emphasis mb-0">
                {{ formatDate(selectedContactForComments.occurrence_date) }}
              </p>
              <p class="text-caption text-medium-emphasis mb-0">
                <VIcon size="small" class="me-1">ri-user-line</VIcon>
                作成者: {{ selectedContactForComments.creator?.name || 'システム' }}
              </p>
            </div>
          </div>
          <VDivider class="my-2" />
          <div class="text-body-2">
            {{ selectedContactForComments.contact_content }}
          </div>
        </VCard>
        
        <!-- 코멘트 목록 -->
        <div v-if="selectedContactForComments.comments && selectedContactForComments.comments.length > 0">
          <h6 class="text-h6 mb-3">
            <VIcon class="me-2">ri-message-2-line</VIcon>
            コメント履歴 ({{ selectedContactForComments.comments.length }}件)
          </h6>
          <div class="comments-list">
            <div
              v-for="comment in selectedContactForComments.comments"
              :key="comment.id"
              class="comment-item"
            >
              <div class="comment-header">
                <span class="comment-author text-subtitle-2 font-weight-medium">
                  {{ comment.operator?.name || comment.created_by || 'システム' }}
                </span>
                <span class="comment-date text-caption text-medium-emphasis">
                  {{ formatDate(comment.created_at) }}
                </span>
              </div>
              <div class="comment-content text-body-1 mt-2">
                {{ comment.comment }}
              </div>
            </div>
          </div>
        </div>
        
        <!-- 코멘트 없음 -->
        <div v-else class="text-center py-8">
          <VIcon size="64" color="grey-lighten-1">ri-message-2-line</VIcon>
          <p class="text-grey mt-2">コメント履歴がありません</p>
        </div>
      </VCardText>
      
      <VCardActions>
        <VSpacer />
        <VBtn
          color="primary"
          variant="outlined"
          @click="showCommentsDialog = false"
        >
          閉じる
        </VBtn>
      </VCardActions>
    </VCard>
  </VDialog>

  <!-- 입원 연락표 다이얼로그 -->
  <VDialog v-model="showAdmissionDialog" max-width="700px" persistent>
    <VCard>
      <VCardTitle class="d-flex align-center justify-space-between bg-warning-lighten-5">
        <div class="d-flex align-center">
          <VIcon class="me-2">ri-hospital-line</VIcon>
          <span>入院連絡票: {{ admissionForm.elderly_name }}</span>
        </div>
        <VBtn
          icon
          variant="text"
          @click="showAdmissionDialog = false"
        >
          <VIcon>ri-close-line</VIcon>
        </VBtn>
      </VCardTitle>
      
      <VCardText class="pt-4">
        <VForm @submit.prevent="saveAdmissionRecord">
          <VRow>
            <VCol cols="12" md="6">
              <VTextField
                v-model="admissionForm.admission_date"
                label="入院日"
                type="date"
                required
              />
            </VCol>
            <VCol cols="12" md="6">
              <VTextField
                v-model="admissionForm.hospital_name"
                label="病院名"
                required
              />
            </VCol>
            <VCol cols="12">
              <VDivider class="my-2" />
              <h6 class="text-subtitle-1 mb-3">最終食事</h6>
            </VCol>
            <VCol cols="12" md="6">
              <VTextField
                v-model="admissionForm.meal_final_date"
                label="最終食事日"
                type="date"
                required
              />
            </VCol>
            <VCol cols="12">
              <VRadioGroup
                v-model="admissionForm.meal_final_type"
                label="最終食事"
                required
                inline
              >
                <VRadio value="breakfast" label="朝食" />
                <VRadio value="lunch" label="昼食" />
                <VRadio value="dinner" label="夕食" />
              </VRadioGroup>
            </VCol>
          </VRow>
        </VForm>
      </VCardText>
      
      <VCardActions>
        <VSpacer />
        <VBtn
          color="grey"
          variant="text"
          @click="showAdmissionDialog = false"
        >
          キャンセル
        </VBtn>
        <VBtn
          color="warning"
          :loading="loading"
          @click="saveAdmissionRecord"
        >
          保存
        </VBtn>
      </VCardActions>
    </VCard>
  </VDialog>

  <!-- 퇴원 연락표 다이얼로그 -->
  <VDialog v-model="showDischargeDialog" max-width="700px" persistent>
    <VCard>
      <VCardTitle class="d-flex align-center justify-space-between bg-success-lighten-5">
        <div class="d-flex align-center">
          <VIcon class="me-2">ri-home-heart-line</VIcon>
          <span>退院連絡票: {{ dischargeForm.elderly_name }}</span>
        </div>
        <VBtn
          icon
          variant="text"
          @click="showDischargeDialog = false"
        >
          <VIcon>ri-close-line</VIcon>
        </VBtn>
      </VCardTitle>
      
      <VCardText class="pt-4">
        <VForm @submit.prevent="saveDischargeRecord">
          <VRow>
            <VCol cols="12" md="6">
              <VTextField
                v-model="dischargeForm.discharge_date"
                label="退院日"
                type="date"
                required
              />
            </VCol>
            <VCol cols="12">
              <VDivider class="my-2" />
              <h6 class="text-subtitle-1 mb-3">食事再開</h6>
            </VCol>
            <VCol cols="12" md="6">
              <VTextField
                v-model="dischargeForm.meal_resume_date"
                label="食事再開日"
                type="date"
                required
              />
            </VCol>
            <VCol cols="12">
              <VRadioGroup
                v-model="dischargeForm.meal_resume_type"
                label="再開食事"
                required
                inline
              >
                <VRadio value="breakfast" label="朝食" />
                <VRadio value="lunch" label="昼食" />
                <VRadio value="dinner" label="夕食" />
              </VRadioGroup>
            </VCol>
          </VRow>
        </VForm>
      </VCardText>
      
      <VCardActions>
        <VSpacer />
        <VBtn
          color="grey"
          variant="text"
          @click="showDischargeDialog = false"
        >
          キャンセル
        </VBtn>
        <VBtn
          color="success"
          :loading="loading"
          @click="saveDischargeRecord"
        >
          保存
        </VBtn>
      </VCardActions>
    </VCard>
  </VDialog>
</template>

<style scoped>
.elderly-contact-page {
  padding: 24px;
  max-width: 1200px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  align-items: center;
  margin-bottom: 24px;
}

.page-title {
  font-size: 28px;
  font-weight: 700;
  color: #333;
  margin-bottom: 4px;
  display: flex;
  align-items: center;
}

.page-subtitle {
  font-size: 14px;
  color: #666;
  margin: 0;
}

/* 이미지 미리보기 스타일 */
.image-preview-container {
  position: relative;
  display: inline-block;
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 4px;
  background: white;
}

.image-preview {
  width: 120px;
  height: 120px;
  object-fit: cover;
  border-radius: 4px;
  display: block;
}

.remove-image-btn {
  position: absolute;
  top: -8px;
  right: -8px;
  z-index: 10;
}

.image-name {
  font-size: 12px;
  color: #666;
  text-align: center;
  margin-top: 4px;
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.contact-list-container {
  max-height: 600px;
  overflow-y: auto;
}

/* 연락 항목 스타일 */
.contact-item {
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  transition: all 0.3s ease;
}

.contact-item:hover {
  border-color: #7c3aed;
  background-color: rgba(124, 58, 237, 0.02);
}

/* 액션 버튼 공통 스타일 */
.action-btn {
  transition: all 0.3s ease;
  font-weight: 500;
  text-transform: none;
  min-width: auto;
  padding: 4px 12px;
}

.action-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

/* 코멘트보기 버튼 */
.comment-btn {
  color: #1976d2;
}

.comment-btn:hover {
  background-color: rgba(25, 118, 210, 0.1);
  color: #1565c0;
}

/* 삭제 버튼 */
.delete-btn {
  color: #f44336;
}

.delete-btn:hover {
  background-color: rgba(244, 67, 54, 0.1);
  color: #d32f2f;
}

/* 코멘트 다이얼로그 스타일 */
.comments-list {
  max-height: 400px;
  overflow-y: auto;
}

.comment-item {
  padding: 16px;
  background: white;
  border-radius: 8px;
  margin-bottom: 12px;
  border-left: 4px solid #1976d2;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.comment-item:last-child {
  margin-bottom: 0;
}

.comment-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.comment-author {
  color: #1976d2;
  font-weight: 600;
}

.comment-date {
  color: #666;
  font-size: 0.875rem;
}

.comment-content {
  line-height: 1.6;
  color: #333;
  font-size: 0.9375rem;
}

/* 검색 결과 개수 */
.search-result-count {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  background-color: #f3e8ff;
  border-radius: 6px;
  color: #7c3aed;
  font-size: 14px;
  font-weight: 500;
}

/* 노인 항목 스타일 */
.elderly-item {
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  transition: all 0.3s ease;
}

.elderly-item:hover {
  border-color: #7c3aed;
  background-color: rgba(124, 58, 237, 0.02);
}

/* 카테고리 선택 카드 스타일 */
.category-selection {
  min-height: 400px;
}

.category-card {
  cursor: pointer;
  transition: all 0.3s ease;
  border: 2px solid transparent;
}

.category-card:hover {
  transform: translateY(-8px);
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.15);
  border-color: rgb(var(--v-theme-primary));
}

.category-card .v-avatar {
  transition: all 0.3s ease;
}

.category-card:hover .v-avatar {
  transform: scale(1.1);
}

/* 모바일 반응형 */
@media (max-width: 600px) {
  .elderly-contact-page {
    padding: 16px;
  }
  
  .page-title {
    font-size: 22px;
  }
  
  .page-subtitle {
    font-size: 13px;
  }
  
  .contact-list-container {
    max-height: 500px;
  }
  
  .category-card:hover {
    transform: translateY(-4px);
  }
}
</style>

