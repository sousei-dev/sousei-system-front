<script setup lang="ts">
import { onMounted, ref, watch, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { elderlyService, type Elderly } from '@/services/elderly'
import { elderlyHospitalizationService, type ElderlyHospitalizationCreate, type ElderlyHospitalizationResponse } from '@/services/elderlyHospitalization'
import { contactService } from '@/services/contact'

const router = useRouter()
const route = useRoute()

// 고령자 데이터
const elderlys = ref<Elderly[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
const success = ref<string | null>(null)

// 입원/퇴원 기록
const hospitalizationRecords = ref<ElderlyHospitalizationResponse[]>([])

// 팝업 상태
const showAdmissionDialog = ref(false)
const showDischargeDialog = ref(false)
const selectedElderly = ref<Elderly | null>(null)
const selectedRecord = ref<ElderlyHospitalizationResponse | null>(null)

const showContactDialog = ref(false)
const imageInput = ref<HTMLInputElement>()
const contactTab = ref<'create' | 'list'>('create')
const showCommentsDialog = ref(false)
const selectedContactForComments = ref<any>(null)

// 보고서 목록 데이터
const contactList = ref<any[]>([])
const contactListLoading = ref(false)

// 입원 연락표 폼
const admissionForm = ref({
  elderly_id: '',
  elderly_name: '',
  admission_date: '',
  hospital_name: '',
  meal_final_date: '',
  meal_final_type: '', // 'breakfast', 'lunch', 'dinner' 중 하나만 선택
})

// 퇴원 연락표 폼
const dischargeForm = ref({
  record_id: '',
  discharge_date: '',
  meal_resume_date: '',
  meal_resume_type: '', // 'breakfast', 'lunch', 'dinner' 중 하나만 선택
})

// URL 파라미터에서 건물 ID 가져오기
const buildingId = computed(() => route.query.building_id as string)

// 검색 필터 상태
const filters = ref({
  name: '',
  name_katakana: '',
  building_name: '',
  room_number: '',
  care_level: '',
  gender: '',
})

// 정렬 상태 (별도 관리)
const sortBy = ref('')
const sortDesc = ref(false)

// 페이지네이션 상태
const page = ref(1)
const itemsPerPage = ref(10)
const totalItems = ref(0)
const totalPages = ref(0)

// 입원 연락표 작성
const openAdmissionDialog = (elderly: Elderly) => {
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
}

// 퇴원 연락표 작성
const openDischargeDialog = (elderly: Elderly) => {
  selectedElderly.value = elderly
  const record = hospitalizationRecords.value.find(r => r.elderly_id === elderly.id && r.hospitalization_type === 'admission')
  if (record) {
    selectedRecord.value = record
    dischargeForm.value = {
      record_id: record.id || '',
      discharge_date: new Date().toISOString().split('T')[0],
      meal_resume_date: new Date().toISOString().split('T')[0],
      meal_resume_type: '',
    }
    showDischargeDialog.value = true
  }
}

// 입원 연락표 저장
const saveAdmissionRecord = async () => {
  try {
    const data: ElderlyHospitalizationCreate = {
      elderly_id: admissionForm.value.elderly_id,
      hospitalization_type: 'admission',
      hospital_name: admissionForm.value.hospital_name,
      date: admissionForm.value.admission_date,
      last_meal_date: admissionForm.value.meal_final_date,
      last_meal_type: admissionForm.value.meal_final_type as 'breakfast' | 'lunch' | 'dinner',
    }

    const response = await elderlyHospitalizationService.createElderlyHospitalization(data)
    alert(response.message)
    fetchElderlys()
    showAdmissionDialog.value = false
    selectedElderly.value = null
  } catch (error) {
    console.error('입원 기록 저장 실패:', error)
  }
}

// 퇴원 연락표 저장
const saveDischargeRecord = async () => {
  try {
    const data: ElderlyHospitalizationCreate = {
      elderly_id: selectedElderly.value?.id || '',
      hospitalization_type: 'discharge',
      hospital_name: selectedRecord.value?.hospital_name || '',
      date: selectedRecord.value?.date || '',
      meal_resume_date: dischargeForm.value.meal_resume_date,
      meal_resume_type: dischargeForm.value.meal_resume_type as 'breakfast' | 'lunch' | 'dinner',
    }

    const response = await elderlyHospitalizationService.createElderlyHospitalization(data)
    alert(response.message)
    fetchElderlys()
    showDischargeDialog.value = false
    selectedElderly.value = null
    selectedRecord.value = null
  } catch (error) {
    console.error('퇴원 기록 저장 실패:', error)
  }
}

// 입원 기록 확인
const hasAdmissionRecord = (elderlyId: string) => {
  return hospitalizationRecords.value.some(r => r.elderly_id === elderlyId && r.hospitalization_type === 'admission')
}

// 퇴원 기록 확인
const hasDischargeRecord = (elderlyId: string) => {
  return hospitalizationRecords.value.some(r => r.elderly_id === elderlyId && r.hospitalization_type === 'discharge')
}

// 고령자 목록 조회
const fetchElderlys = async () => {
  try {
    loading.value = true
    error.value = null

    const params = {
      page: page.value,
      page_size: itemsPerPage.value,
      ...filters.value,
      sort_by: sortBy.value,
      sort_desc: sortDesc.value,
      // 건물 ID가 있으면 필터에 추가
      ...(buildingId.value && { building_id: buildingId.value }),
    }

    const response = await elderlyService.getElderlys(params)
    
    // lates  t_hospitalization 기록이 있는 경우 hospitalizationRecords에 추가
    response.items.forEach(elderly => {
      if (elderly.latest_hospitalization) {
        hospitalizationRecords.value.push(elderly.latest_hospitalization)
      }
    })
    console.log(hospitalizationRecords.value)
    elderlys.value = response.items
    totalItems.value = response.total
    totalPages.value = response.total_pages
  } catch (err: any) {
    error.value = err.response?.data?.message || '入居者の取得に失敗しました。'
  } finally {
    loading.value = false
  }
}

// 필터 변경 시 검색 실행
watch(filters, () => {
  page.value = 1
  fetchElderlys()
}, { deep: true })

// 건물 ID 변경 시 검색 실행
watch(buildingId, () => {
  page.value = 1
  fetchElderlys()
})

// 필터 리셋
const resetFilters = () => {
  filters.value = {
    name: '',
    name_katakana: '',
    building_name: '',
    room_number: '',
    care_level: '',
    gender: '',
  }
}

// 거주자 상세 페이지로 이동
const handleEdit = (id: string) => {
  router.push(`/elderly-detail/${id}`)
}

// 連絡作成
const handleContact = async () => {
  showContactDialog.value = true
  // 목록 탭으로 이동하고 데이터 로드
  contactTab.value = 'create'
  await fetchContactList()
}



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
    
    // 기존 이미지와 합치기 (최대 10장)
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

// 코멘트 다이얼로그 열기
const openCommentsDialog = (contact: any) => {
  selectedContactForComments.value = contact
  showCommentsDialog.value = true
}

// 보고서 취소
const cancelContact = async (contactId: string) => {
  try {
    if (confirm('この連絡をキャンセルしますか？')) {
      // TODO: 실제 API 호출로 변경
      await contactService.cancelContact(contactId)
      
      // 성공 메시지 표시
      success.value = '連絡が正常にキャンセルされました。'
      
      // 목록 새로고침
      await fetchContactList()
      
      // 3초 후 성공 메시지 숨기기
      setTimeout(() => {
        success.value = null
      }, 3000)
    }
  } catch (error) {
    console.error('보고서 취소 실패:', error)
    error.value = '連絡のキャンセルに失敗しました。'
  }
}

// 보고서 목록 조회
const fetchContactList = async () => {
  try {
    contactListLoading.value = true
    // TODO: 실제 API 호출로 변경
    const response = await contactService.getContacts()
    contactList.value = response.items

  } catch (error) {
    console.error('보고서 목록 조회 실패:', error)
  } finally {
    contactListLoading.value = false
  }
}

const contactOptions = [
  { title: '故障', value: 'defect' },
  { title: 'クレーム', value: 'claim' },
  { title: 'その他', value: 'other' },
]

const contactForm = ref({
  contact_type: '' as 'defect' | 'claim' | 'other' | '',
  content: '',
  incident_date: new Date().toISOString().split('T')[0],
  images: [] as File[],
})

// 보고서 저장
const saveContact = async () => {
  try {
    loading.value = true
    error.value = null
    success.value = null

    // FormData 생성
    const formData = new FormData()
    formData.append('contact_type', contactForm.value.contact_type)
    formData.append('content', contactForm.value.content)
    formData.append('incident_date', contactForm.value.incident_date)
    contactForm.value.images.forEach((image, index) => {
      formData.append(`images[${index}]`, image)
    })
    
    // contactService.createContact 호출 (올바른 타입으로 변환)
    if (contactForm.value.contact_type && ['defect', 'claim', 'other'].includes(contactForm.value.contact_type)) {
      await contactService.createContact({
        occurrence_date: contactForm.value.incident_date,
        contact_type: contactForm.value.contact_type as 'defect' | 'claim' | 'other',
        contact_content: contactForm.value.content,
        photos: contactForm.value.images
      })
    } else {
      throw new Error('리포트 타입을 선택해주세요.')
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
    
    // 작성 탭으로 이동
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

// 거주자 추가 페이지로 이동 (건물 ID 포함)
const handleAdd = () => {
  const params = buildingId.value ? { building_id: buildingId.value } : {}
  router.push({
    path: '/elderly-create',
    query: params,
  })
}

// 페이지 변경 이벤트 핸들러
const handlePageChange = (newPage: number) => {
  page.value = newPage
  fetchElderlys()
}

// 아이템 페이지 변경 이벤트 핸들러
const handleItemsPerPageChange = (newItemsPerPage: number) => {
  itemsPerPage.value = newItemsPerPage
  page.value = 1
  fetchElderlys()
}

// 정렬 변경 이벤트 핸들러
const handleSortChange = (sortByData: any) => {
  let sortByValue = ''
  let sortDescValue = false
  
  if (Array.isArray(sortByData) && sortByData.length > 0) {
    sortByValue = sortByData[0].key
    sortDescValue = sortByData[0].order === 'desc'
  }
  
  // 정렬 상태 직접 업데이트
  sortBy.value = sortByValue
  sortDesc.value = sortDescValue
  
  // 페이지 리셋
  page.value = 1
  
  // 직접 API 호출
  fetchElderlys()
}

// 옵션들
const careLevelOptions = [
  { title: '要介護1', value: '要介護1' },
  { title: '要介護2', value: '要介護2' },
  { title: '要介護3', value: '要介護3' },
  { title: '要介護4', value: '要介護4' },
  { title: '要介護5', value: '要介護5' },
]

const genderOptions = [
  { title: '男性', value: '男' },
  { title: '女性', value: '女' },
]

// 테이블 헤더
const tableHeaders = [
  { title: '名前', key: 'name', sortable: true, filterable: true },
  { title: '建物名', key: 'current_room.building.name', sortable: true, filterable: true },
  { title: '部屋番号', key: 'current_room.room_number', sortable: true, filterable: true },
  { title: '生年月日', key: 'birth_date', sortable: false, filterable: true },
  { title: '性別', key: 'gender', sortable: false, filterable: true },
  { title: '介護度', key: 'care_level' },
  { title: '入居日', key: 'admission_date' },
  { title: '入院状態', key: 'hospitalization_status' },
  { title: '操作', key: 'actions', sortable: false },
]

// 요양 등급별 색상
const getCareLevelColor = (careLevel: string) => {
  switch (careLevel) {
    case '介護1':
      return 'success'
    case '介護2':
      return 'info'
    case '介護3':
      return 'warning'
    case '介護4':
      return 'error'
    case '介護5':
      return 'error'
    default:
      return 'default'
  }
}

// 입원 상태별 색상
const getHospitalizationStatusColor = (status: string) => {
  switch (status) {
    case '入院中':
      return 'error'
    case '正常':
      return 'success'
    default:
      return 'default'
  }
}

// 입원 상태별 텍스트
const getHospitalizationStatusText = (status: string) => {
  return status // 이미 일본어로 오므로 그대로 반환
}

// 날짜 포맷팅
const formatDate = (dateString: string) => {
  const date = new Date(dateString)

  return date.toLocaleDateString('ja-JP')
}

// 건물별 제목 계산
const pageTitle = computed(() => {
  return '介護施設入居者リスト'
})

// 보고서 타입을 일본어로 변환
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

// 보고서 상태를 일본어로 변환
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

// 초기화
onMounted(() => {
  fetchElderlys()
})
</script>

<template>
  <VRow>
    <VCol cols="12">
      <VCard>
        <VCardText>
          <!-- 헤더 -->
          <div class="d-flex justify-space-between align-center mb-6">
            <h3 class="text-h3">{{ pageTitle }}</h3>
            <div class="d-flex gap-2">
              <VBtn
                color="error"
                prepend-icon="ri-file-text-line"
                @click="handleContact"
              >
                連絡作成
              </VBtn>
              <VBtn
                color="primary"
                prepend-icon="ri-add-line"
                @click="handleAdd"
              >
                入居者追加
              </VBtn>
            </div>
          </div>

          <!-- 검색 필터 -->
          <VRow class="mb-6">
            <VCol cols="12" md="3">
              <VTextField
                v-model="filters.name"
                label="名前"
                placeholder="名前で検索"
                hide-details
                density="compact"
                prepend-inner-icon="ri-user-line"
                clearable
              />
            </VCol>
            <VCol cols="12" md="3">
              <VTextField
                v-model="filters.room_number"
                label="部屋番号"
                placeholder="部屋番号で検索"
                hide-details
                density="compact"
                clearable
                prepend-inner-icon="ri-home-line"
              />
            </VCol>
            <VCol cols="12" md="3">
              <VSelect
                v-model="filters.care_level"
                :items="careLevelOptions"
                item-title="title"
                item-value="value"
                label="介護度"
                hide-details
                density="compact"
                clearable
                prepend-inner-icon="ri-heart-line"
              />
            </VCol>
            <VCol cols="12" md="3">
              <VSelect
                v-model="filters.gender"
                :items="genderOptions"
                item-title="title"
                item-value="value"
                label="性別"
                hide-details
                density="compact"
                clearable
                prepend-inner-icon="ri-user-line"
              />
            </VCol>
            <VCol cols="12" md="3">
              <VBtn
                color="error"
                variant="tonal"
                block
                @click="resetFilters"
              >
                フィルターリセット
              </VBtn>
            </VCol>
          </VRow>

          <!-- 에러 메시지 -->
          <VAlert
            v-if="error"
            type="error"
            class="mb-6"
          >
            {{ error }}
          </VAlert>

          <!-- 거주자 목록 테이블 -->
          <VDataTableServer
            v-model:page="page"
            v-model:items-per-page="itemsPerPage"
            :headers="tableHeaders"
            :items="elderlys"
            :loading="loading"
            :items-length="totalItems"
            :server-items-length="totalItems"
            :items-per-page-options="[5, 10, 25, 50]"
            show-current-page
            show-items-per-page
            @update:page="handlePageChange"
            @update:items-per-page="handleItemsPerPageChange"
            @update:sort-by="handleSortChange"
            class="elevation-1"
          >
            <!-- 이름 컬럼 템플릿 -->
            <template #item.name="{ item }">
              <div>
                <div>{{ item.name }}</div>
                <div class="text-caption text-medium-emphasis">{{ item.name_katakana }}</div>
              </div>
            </template>

            <!-- 건물명 컬럼 템플릿 -->
            <template #item.current_room.building.name="{ item }">
              <div>
                <div>{{ item.current_room?.building?.name || '-' }}</div>
              </div>
            </template>

            <template #item.current_room="{ item }">
              <div>
                <div>{{ item.current_room?.room_number || '-' }}</div>
              </div>
            </template>

            <!-- 요양 등급 컬럼 템플릿 -->
            <template #item.care_level="{ item }">
              <VChip
                :color="getCareLevelColor(item.care_level)"
                size="small"
                variant="tonal"
              >
                {{ item.care_level }}
              </VChip>
            </template>

            <!-- 입원 상태 컬럼 템플릿 -->
            <template #item.hospitalization_status="{ item }">
              <VChip
                v-if="item.hospitalization_status"
                :color="getHospitalizationStatusColor(item.hospitalization_status)"
                :variant="item.hospitalization_status === '入院中' ? 'elevated' : 'tonal'"
                class="hospitalization-status-chip"
              >
                {{ getHospitalizationStatusText(item.hospitalization_status) }}
              </VChip>
              <span v-else class="text-medium-emphasis">-</span>
            </template>

            <!-- 작업 컬럼 템플릿 -->
            <template #item.actions="{ item }">
              <VBtn
                icon
                variant="text"
                size="small"
                color="primary"
                @click="handleEdit(item.id)"
                class="me-2"
              >
                <VIcon>ri-edit-line</VIcon>
              </VBtn>
              <!-- 입원 연락표 버튼 -->
              <VBtn
                v-if="!hasAdmissionRecord(item.id)"
                icon
                variant="text"
                size="small"
                color="warning"
                @click="openAdmissionDialog(item)"
                class="me-2"
                title="入院連絡票作成"
              >
                <VIcon>ri-hospital-line</VIcon>
              </VBtn>
              <!-- 퇴원 연락표 버튼 -->
              <VBtn
                v-if="hasAdmissionRecord(item.id) && !hasDischargeRecord(item.id)"
                icon
                variant="text"
                size="small"
                color="success"
                @click="openDischargeDialog(item)"
                class="me-2"
                title="退院連絡票作成"
              >
                <VIcon>ri-home-line</VIcon>
              </VBtn>
            </template>
          </VDataTableServer>
        </VCardText>
      </VCard>
    </VCol>
  </VRow>

  <!-- 입원 연락표 다이얼로그 -->
  <VDialog v-model="showAdmissionDialog" max-width="600px">
    <VCard>
      <VCardTitle class="d-flex align-center gap-2">
        <VIcon>ri-hospital-line</VIcon>
        <span>入院連絡票作成</span>
      </VCardTitle>
      <VCardText>
        <VForm @submit.prevent="saveAdmissionRecord">
          <VRow>
            <VCol cols="12">
              <VTextField
                v-model="admissionForm.elderly_name"
                label="入居者名"
                readonly
                hide-details
              />
            </VCol>
            <VCol cols="12" md="6">
              <VTextField
                v-model="admissionForm.admission_date"
                label="入院日"
                type="date"
                required
                hide-details
              />
            </VCol>
            <VCol cols="12" md="6">
              <VTextField
                v-model="admissionForm.hospital_name"
                label="病院名"
                required
                hide-details
              />
            </VCol>
            <VCol cols="12">
              <VDivider class="my-4" />
              <h6 class="text-h6 mb-3">最終食事</h6>
            </VCol>
            <VCol cols="12" md="6">
              <VTextField
                v-model="admissionForm.meal_final_date"
                label="最終食事日"
                type="date"
                required
                hide-details
              />
            </VCol>
            <VCol cols="12">
              <VRadioGroup
                v-model="admissionForm.meal_final_type"
                label="最終食事"
                required
                hide-details
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
          color="primary"
          @click="saveAdmissionRecord"
        >
          保存
        </VBtn>
      </VCardActions>
    </VCard>
  </VDialog>

  <VDialog v-model="showContactDialog" max-width="800px">
    <VCard>
      <VCardTitle class="d-flex align-center justify-space-between">
        <div class="d-flex align-center gap-2">
          <VIcon>ri-file-text-line</VIcon>
          <span>連絡管理</span>
        </div>
        <VBtn
          icon
          variant="text"
          @click="showContactDialog = false"
        >
          <VIcon>ri-close-line</VIcon>
        </VBtn>
      </VCardTitle>
      
      <!-- 탭 헤더 -->
      <VTabs v-model="contactTab" class="px-4">
        <VTab value="create">
          <VIcon class="me-2">ri-edit-line</VIcon>
          作成
        </VTab>
        <VTab value="list">
          <VIcon class="me-2">ri-list-check</VIcon>
          送信済み
        </VTab>
      </VTabs>
      
      <VDivider />
      
      <!-- 성공 메시지 -->
      <VAlert
        v-if="success"
        type="success"
        variant="tonal"
        class="ma-4"
      >
        {{ success }}
      </VAlert>
      
      <!-- 에러 메시지 -->
      <VAlert
        v-if="error"
        type="error"
        variant="tonal"
        class="ma-4"
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
                      @click="$refs.imageInput?.click()"
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
            
            <!-- 보고서 목록 -->
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
                      :color="contact.contact_type === '故障' ? 'error' : contact.contact_type === 'クレーム' ? 'warning' : 'info'"
                      size="40"
                    >
                      <VIcon>ri-file-text-line</VIcon>
                    </VAvatar>
                  </template>
                  
                  <VListItemTitle class="font-weight-bold">
                    {{ getContactTypeText(contact.contact_type) }}
                  </VListItemTitle>
                  
                  <VListItemSubtitle>
                    <div class="d-flex align-center gap-4">
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
        </VWindowItem>
      </VWindow>
    </VCard>
  </VDialog>

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
        <!-- 보고서 기본 정보 -->
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
          戻る
        </VBtn>
      </VCardActions>
    </VCard>
  </VDialog>

  <!-- 입원 연락표 다이얼로그 -->
  <VDialog v-model="showAdmissionDialog" max-width="600px">
    <VCard>
      <VCardTitle class="d-flex align-center gap-2">
        <VIcon>ri-file-text-line</VIcon>
        <span>連絡作成</span>
      </VCardTitle>
      <VCardText>
        <VForm @submit.prevent="saveAdmissionRecord">
          <VRow>
            <VCol cols="12">
              <VTextField
                v-model="admissionForm.elderly_name"
                label="入居者名"
                readonly
                hide-details
              />
            </VCol>
            <VCol cols="12" md="6">
              <VTextField
                v-model="admissionForm.admission_date"
                label="入院日"
                type="date"
                required
                hide-details
              />
            </VCol>
            <VCol cols="12" md="6">
              <VTextField
                v-model="admissionForm.hospital_name"
                label="病院名"
                required
                hide-details
              />
            </VCol>
            <VCol cols="12">
              <VDivider class="my-4" />
              <h6 class="text-h6 mb-3">最終食事</h6>
            </VCol>
            <VCol cols="12" md="6">
              <VTextField
                v-model="admissionForm.meal_final_date"
                label="最終食事日"
                type="date"
                required
                hide-details
              />
            </VCol>
            <VCol cols="12">
              <VRadioGroup
                v-model="admissionForm.meal_final_type"
                label="最終食事"
                required
                hide-details
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
          color="primary"
          @click="saveAdmissionRecord"
        >
          保存
        </VBtn>
      </VCardActions>
    </VCard>
  </VDialog>
</template>

<style lang="scss" scoped>
.v-data-table {
  .v-data-table-header {
    background-color: rgb(var(--v-theme-surface));
  }
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
  height: 400px;
  overflow-y: auto;
}

/* 보고서 항목 스타일 */
.contact-item {
  margin-bottom: 12px;
  transition: all 0.3s ease;
}

/* 확장/축소 아이콘 애니메이션 */
.rotate {
  transform: rotate(180deg);
  transition: transform 0.3s ease;
}

/* 코멘트 섹션 스타일 */
.comments-section {
  padding: 16px;
  background-color: #f8f9fa;
  border-radius: 0 0 8px 8px;
  margin-top: 8px;
}

.comments-list {
  max-height: 300px;
  overflow-y: auto;
}

.comment-item {
  padding: 12px;
  background: white;
  border-radius: 6px;
  margin-bottom: 8px;
  border-left: 3px solid #1976d2;
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
}

.comment-date {
  color: #666;
}

.comment-content {
  line-height: 1.5;
  color: #333;
}

/* 코멘트 없음 섹션 */
.no-comments-section {
  padding: 24px;
  background-color: #f8f9fa;
  border-radius: 0 0 8px 8px;
  margin-top: 8px;
  text-align: center;
}

/* 커서 포인터 */
.contact-item {
  cursor: pointer;
}

.contact-item:hover .v-list-item-title,
.contact-item:hover .v-list-item-subtitle {
  color: #1976d2;
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
</style> 