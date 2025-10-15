<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { elderlyService, type Elderly, type ElderlyCreateRequestV2 } from '@/services/elderly'
import { roomService, type Room } from '@/services/room'
import { buildingService, type Building } from '@/services/building'
import { residentService, type Resident } from '@/services/resident'

const router = useRouter()
const route = useRoute()

// URL 파라미터에서 노인 ID 가져오기
const elderlyId = computed(() => route.params.id as string)

// URL 쿼리에서 건물 ID 가져오기
const buildingId = computed(() => route.query.building_id as string)

// 노인 상세 데이터
const elderlyData = ref<Elderly | null>(null)

// 탭 설정
const tabs = [
  { title: '基本情報', icon: 'ri-user-line', tab: 'basic' },
  { title: '入居情報', icon: 'ri-home-4-line', tab: 'room' },
]

const activeTab = ref('basic')

// 폼 데이터
const form = ref<ElderlyCreateRequestV2>({
  name: '',
  name_katakana: '',
  email: '',
  phone: '',
  gender: '',
  birth_date: '',
  care_level: '',
  current_room_id: null,
  note: '',
  status: 'ACTIVE',
})

// 로딩 상태
const loading = ref(false)
const submitting = ref(false)
const error = ref<string | null>(null)
const success = ref<string | null>(null)

// 옵션 데이터
const buildings = ref<Building[]>([])
const rooms = ref<Room[]>([])

// 다이얼로그 상태
const showRoomChangeDialog = ref(false)
const showCheckoutDialog = ref(false)
const showNewResidenceDialog = ref(false)

// 다이얼로그 폼 데이터
const roomChangeForm = ref({
  new_room_id: '',
  change_date: '',
  note: ''
})

// 빌딩 옵션
const buildingOptions = ref<{ value: string; title: string }[]>([])
const emptyRoomOptions = ref<{ value: string; title: string; rent: number }[]>([])
const selectedBuildingId = ref('')

// 입주 이력
const roomHistory = ref<Resident[]>([])

// 방 목록에 display_name 추가 (건물명 포함)
const roomsWithDisplayName = computed(() => {
  return rooms.value.map(room => {
    const buildingName = (room as any).building?.name || ''
    const displayName = buildingName 
      ? `${buildingName} - ${room.room_number}` 
      : room.room_number
    
    return {
      ...room,
      display_name: displayName,
    }
  })
})

// 성별 옵션
const genderOptions = [
  { title: '男性', value: '男' },
  { title: '女性', value: '女' },
]

// 요양 등급 옵션
const careLevelOptions = [
  { title: '介護1', value: '介護1' },
  { title: '介護2', value: '介護2' },
  { title: '介護3', value: '介護3' },
  { title: '介護4', value: '介護4' },
  { title: '介護5', value: '介護5' },
  { title: '要支援1', value: '要支援1' },
  { title: '要支援2', value: '要支援2' },
]

// 상태 옵션
const statusOptions = [
  { title: 'アクティブ', value: 'ACTIVE' },
  { title: '退居予定', value: 'PENDING_RESIGNATION' },
  { title: '退居済み', value: 'RESIGNED' },
]

// 필수항목 검증
const isFormValid = computed(() => {
  return !!(
    form.value.name
    && form.value.name_katakana
    && form.value.gender
    && form.value.birth_date
    && form.value.care_level
  )
})

// 건물명 가져오기 computed
const currentBuildingName = computed(() => {
  return elderlyData.value ? (elderlyData.value.current_room as any)?.building?.name || '-' : '-'
})

// 상태 정보 computed
const currentStatus = computed(() => {
  return (elderlyData.value as any)?.status || 'ACTIVE'
})

const currentStatusLabel = computed(() => {
  const status = currentStatus.value
  if (status === 'ACTIVE') return 'アクティブ'
  if (status === 'PENDING_RESIGNATION') return '退居予定'
  if (status === 'RESIGNED') return '退居済み'
  return '-'
})

const currentStatusColor = computed(() => {
  const status = currentStatus.value
  if (status === 'ACTIVE') return 'success'
  if (status === 'PENDING_RESIGNATION') return 'warning'
  if (status === 'RESIGNED') return 'error'
  return 'default'
})

// 노인 상세 정보 조회
const fetchElderlyDetail = async () => {
  try {
    loading.value = true
    error.value = null
    
    const data = await elderlyService.getElderly(elderlyId.value)
    elderlyData.value = data
    
    // 폼에 데이터 설정
    form.value = {
      name: data.name || '',
      name_katakana: data.name_katakana || '',
      email: (data as any).email || '',
      phone: (data as any).phone || '',
      gender: data.gender || '',
      birth_date: (data as any).birth_date || '',
      care_level: data.care_level || '',
      current_room_id: (data.current_room as any)?.id || null,
      note: (data as any).note || '',
      status: (data as any).status || 'ACTIVE',
    }
  } catch (err: any) {
    error.value = err.response?.data?.message || '入居者情報の取得に失敗しました。'
  } finally {
    loading.value = false
  }
}

// 빌딩 목록 조회
const fetchBuildings = async () => {
  try {
    const response = await buildingService.getBuildings()
    buildings.value = response.items
    
    // 빌딩 옵션 설정
    buildingOptions.value = response.items.map(building => ({
      value: building.id,
      title: building.name
    }))
  } catch (err: any) {
    console.error('빌딩 목록 조회 실패:', err)
  }
}

// 빈 방 옵션 조회
const fetchEmptyRoomOptions = async (buildingId: string) => {
  try {
    const response = await buildingService.getEmptyRoomsByBuilding(buildingId)
    emptyRoomOptions.value = response.options.map(option => ({
      value: option.value,
      title: `${option.room_number} (¥${option.rent?.toLocaleString() || 0})`,
      rent: option.rent || 0
    }))
  } catch (err: any) {
    console.error('빈 방 옵션 조회 실패:', err)
    emptyRoomOptions.value = []
  }
}

// 빌딩 선택 시 호실 옵션 업데이트
const handleBuildingChange = () => {
  roomChangeForm.value.new_room_id = ''
  if (selectedBuildingId.value) {
    fetchEmptyRoomOptions(selectedBuildingId.value)
  } else {
    emptyRoomOptions.value = []
  }
}

// 입주 이력 조회
const fetchResidentHistory = async () => {
  try {
    const response = await residentService.getResidentHistoryByElderly(elderlyId.value)
    roomHistory.value = response.items || []
  } catch (err: any) {
    console.error('입주 이력 조회 실패:', err)
    roomHistory.value = []
  }
}

// 방 목록 조회 (빈 방만)
const fetchRooms = async () => {
  try {
    const allRooms: any[] = []
    
    if (buildingId.value) {
      // 특정 건물의 빈 방만 조회
      try {
        const response = await buildingService.getEmptyRoomsByBuilding(buildingId.value)
        // EmptyRoomOption을 Room 형식으로 변환
        allRooms.push(...response.options.map((option: any) => ({
          id: option.value,
          room_number: option.room_number,
          building: { name: option.building_name || '' },
          building_id: buildingId.value,
          rent: option.rent,
          is_available: true
        })))
      } catch (err) {
        console.error(`건물 ${buildingId.value}의 빈 방 목록 조회 실패:`, err)
      }
    } else {
      // 모든 건물의 빈 방 조회
      for (const building of buildings.value) {
        try {
          const response = await buildingService.getEmptyRoomsByBuilding(building.id)
          // EmptyRoomOption을 Room 형식으로 변환
          allRooms.push(...response.options.map((option: any) => ({
            id: option.value,
            room_number: option.room_number,
            building: { name: building.name || '' },
            building_id: building.id,
            rent: option.rent,
            is_available: true
          })))
        } catch (err) {
          console.error(`건물 ${building.id}의 빈 방 목록 조회 실패:`, err)
        }
      }
    }
    
    // 현재 입주자의 방도 목록에 추가 (이미 입주 중인 방도 선택 가능하도록)
    if (elderlyData.value?.current_room) {
      const currentRoom = elderlyData.value.current_room as any
      // 이미 목록에 없는 경우에만 추가
      if (!allRooms.find(room => room.id === currentRoom.id)) {
        allRooms.push({
          id: currentRoom.id,
          room_number: currentRoom.room_number,
          building: { name: currentRoom.building?.name || '' },
          building_id: currentRoom.building_id,
          rent: currentRoom.rent,
          is_available: false // 현재 입주 중
        })
      }
    }
    
    rooms.value = allRooms
  } catch (err: any) {
    console.error('빈 방 목록 조회 실패:', err)
  }
}

// 폼 제출 (수정)
const handleSubmit = async () => {
  if (!isFormValid.value) return

  try {
    submitting.value = true
    error.value = null
    success.value = null

    const updateData: any = {
      name: form.value.name,
      name_katakana: form.value.name_katakana,
      gender: form.value.gender,
      care_level: form.value.care_level,
      room_id: form.value.current_room_id,
      note: form.value.note,
    }

    await elderlyService.updateElderly(elderlyId.value, updateData)

    success.value = '入居者情報が正常に更新されました。'
    
    // 화면 맨 위로 스크롤
    window.scrollTo({ top: 0, behavior: 'smooth' })
    
    // 데이터 다시 로드
    await fetchElderlyDetail()
  } catch (err: any) {
    error.value = err.response?.data?.message || '入居者の更新に失敗しました。'
    window.scrollTo({ top: 0, behavior: 'smooth' })
  } finally {
    submitting.value = false
  }
}

// 삭제
const handleDelete = async () => {
  if (!confirm('この入居者を削除しますか？この操作は元に戻すことができません。')) {
    return
  }

  try {
    submitting.value = true
    error.value = null
    
    await elderlyService.deleteElderly(elderlyId.value)
    
    // 목록 페이지로 이동 (building_id 포함)
    const params = buildingId.value ? { building_id: buildingId.value } : {}
    router.push({
      path: '/elderly-list',
      query: params,
    })
  } catch (err: any) {
    error.value = err.response?.data?.message || '入居者の削除に失敗しました。'
    window.scrollTo({ top: 0, behavior: 'smooth' })
  } finally {
    submitting.value = false
  }
}

// 취소
const handleCancel = () => {
  const params = buildingId.value ? { building_id: buildingId.value } : {}
  router.push({
    path: '/elderly-list',
    query: params,
  })
}

// 날짜 포맷팅
const formatDate = (dateString: string) => {
  if (!dateString) return '-'
  return new Date(dateString).toLocaleDateString('ja-JP')
}

// 건물명 가져오기 (히스토리용)
const getBuildingName = (item: Resident) => {
  return item.building?.name || '-'
}

// 방번호 가져오기 (히스토리용)
const getRoomNumber = (item: Resident) => {
  return item.room?.room_number || '-'
}

// 방 변경 다이얼로그 열기
const openRoomChangeDialog = () => {
  roomChangeForm.value = {
    new_room_id: '',
    change_date: '',
    note: ''
  }
  selectedBuildingId.value = ''
  emptyRoomOptions.value = []
  showRoomChangeDialog.value = true
}

// 방 변경 처리
const handleRoomChange = async () => {
  try {
    submitting.value = true
    error.value = null
    success.value = null

    await elderlyService.updateElderly(elderlyId.value, {
      room_id: roomChangeForm.value.new_room_id,
      note: roomChangeForm.value.note,
    })

    success.value = '入居情報が正常に変更されました。'
    showRoomChangeDialog.value = false
    
    // 데이터 다시 로드
    await fetchElderlyDetail()
    await fetchRooms()
    await fetchResidentHistory()
    
    window.scrollTo({ top: 0, behavior: 'smooth' })
  } catch (err: any) {
    error.value = err.response?.data?.message || '入居情報の変更に失敗しました。'
  } finally {
    submitting.value = false
  }
}

// 퇴거 다이얼로그 열기
const openCheckoutDialog = () => {
  roomChangeForm.value = {
    new_room_id: '',
    change_date: '',
    note: ''
  }
  showCheckoutDialog.value = true
}

// 퇴거 처리
const handleCheckout = async () => {
  try {
    submitting.value = true
    error.value = null
    success.value = null

    await elderlyService.updateElderly(elderlyId.value, {
      note: roomChangeForm.value.note,
    })

    success.value = '退去処理が完了しました。'
    showCheckoutDialog.value = false
    
    // 데이터 다시 로드
    await fetchElderlyDetail()
    await fetchRooms()
    await fetchResidentHistory()
    
    window.scrollTo({ top: 0, behavior: 'smooth' })
  } catch (err: any) {
    error.value = err.response?.data?.message || '退去処理に失敗しました。'
  } finally {
    submitting.value = false
  }
}

// 초기화
onMounted(async () => {
  loading.value = true
  try {
    await Promise.all([
      fetchBuildings(),
      fetchElderlyDetail(),
    ])
    await fetchRooms()
    await fetchResidentHistory()
    
    // URL 쿼리에서 탭 설정
    if (route.query.tab && typeof route.query.tab === 'string') {
      activeTab.value = route.query.tab
    }
  } catch (err) {
    console.error('초기 데이터 로드 실패:', err)
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="elderly-detail-page">
    <!-- 로딩 -->
    <div v-if="loading" class="text-center py-8">
      <VProgressCircular indeterminate color="primary" />
      <p class="mt-4">読み込み中...</p>
    </div>

    <!-- 에러 메시지 -->
    <VAlert
      v-if="error"
      type="error"
      variant="tonal"
      class="mb-4"
      closable
      @click:close="error = null"
    >
      {{ error }}
    </VAlert>

    <!-- 성공 메시지 -->
    <VAlert
      v-if="success"
      type="success"
      variant="tonal"
      class="mb-4"
      closable
      @click:close="success = null"
    >
      {{ success }}
    </VAlert>

    <!-- 노인 정보가 있을 때만 표시 -->
    <template v-if="elderlyData && !loading">
      <!-- 탭 -->
      <VTabs
        v-model="activeTab"
        show-arrows
        class="v-tabs-pill mb-4"
      >
        <VTab
          v-for="item in tabs"
          :key="item.tab"
          :value="item.tab"
        >
          <VIcon
            size="20"
            start
            :icon="item.icon"
          />
          {{ item.title }}
        </VTab>
      </VTabs>

      <!-- 탭 내용 -->
      <VWindow
        v-model="activeTab"
        class="disable-tab-transition"
        :touch="false"
      >
        <!-- 기본 정보 탭 -->
        <VWindowItem value="basic">
          <VCard class="mb-6">
        <VCardText>
          <VForm @submit.prevent="handleSubmit">
                <!-- 필수항목 섹션 -->
                <VCard variant="outlined" class="pa-4 mb-6">
                  <VCardTitle class="text-h6 text-primary">
                    <VIcon class="me-2">ri-asterisk</VIcon>
                    必須項目
                  </VCardTitle>
                  <VRow>
                    <VCol cols="12" md="6">
                      <VTextField
                        v-model="form.name"
                        label="名前 *"
                        placeholder="名前を入力してください"
                        :disabled="submitting"
                        required
                      />
                    </VCol>

                    <VCol cols="12" md="6">
                      <VTextField
                        v-model="form.name_katakana"
                        label="カタカナ *"
                        placeholder="カタカナを入力してください"
                        :disabled="submitting"
                        required
                      />
                    </VCol>

                    <VCol cols="12" md="6">
                      <VSelect
                        v-model="form.gender"
                        :items="genderOptions"
                        item-title="title"
                        item-value="value"
                        label="性別 *"
                        placeholder="性別を選択してください"
                        :disabled="submitting"
                        required
                      />
                    </VCol>

                    <VCol cols="12" md="6">
                      <VTextField
                        v-model="form.birth_date"
                        label="生年月日 *"
                        type="date"
                        :disabled="submitting"
                        required
                      />
                    </VCol>

                    <VCol cols="12" md="6">
                      <VSelect
                        v-model="form.care_level"
                        :items="careLevelOptions"
                        item-title="title"
                        item-value="value"
                        label="介護度 *"
                        placeholder="介護度を選択してください"
                        :disabled="submitting"
                        required
                      />
                    </VCol>
                  </VRow>
                </VCard>

                <!-- 연락처 정보 섹션 -->
                <VCard variant="outlined" class="pa-4 mb-6">
                  <VCardTitle class="text-h6 text-info">
                    <VIcon class="me-2">ri-contacts-line</VIcon>
                    連絡先情報
                  </VCardTitle>
                  <VRow>
                    <VCol cols="12" md="6">
                      <VTextField
                        v-model="form.email"
                        label="メールアドレス"
                        placeholder="メールアドレスを入力してください"
                        type="email"
                        :disabled="submitting"
                      />
                    </VCol>

                    <VCol cols="12" md="6">
                      <VTextField
                        v-model="form.phone"
                        label="電話番号"
                        placeholder="電話番号を入力してください"
                        :disabled="submitting"
                      />
                    </VCol>
                  </VRow>
                </VCard>

                <!-- 추가 정보 섹션 -->
                <VCard variant="outlined" class="pa-4 mb-6">
                  <VCardTitle class="text-h6">
                    <VIcon class="me-2">ri-file-text-line</VIcon>
                    追加情報
                  </VCardTitle>
                  <VRow>
                    <VCol cols="12">
                      <VTextarea
                        v-model="form.note"
                        label="メモ"
                        placeholder="メモを入力してください"
                        rows="3"
                        :disabled="submitting"
                      />
                    </VCol>
                  </VRow>
                </VCard>

                <!-- 액션 버튼 -->
                <div class="d-flex justify-end gap-2">
                  <VBtn
                    variant="outlined"
                    @click="handleCancel"
                    :disabled="submitting"
                  >
                    キャンセル
                  </VBtn>
                  <VBtn
                    color="primary"
                    type="submit"
                    :loading="submitting"
                    :disabled="!isFormValid"
                    prepend-icon="ri-save-line"
                  >
                    保存
                  </VBtn>
                </div>
              </VForm>
            </VCardText>
          </VCard>
        </VWindowItem>

        <!-- 입주 정보 탭 -->
        <VWindowItem value="room">
          <VCard>
            <VCardText>
              <!-- 현재 입주 정보 -->
              <div class="mb-6">
                <div class="d-flex justify-space-between align-center mb-4">
                  <h4 class="text-h6">
                    <VIcon class="me-2">ri-map-pin-line</VIcon>
                    現在の入居情報
                  </h4>
                  
                  <div class="d-flex gap-2">
                    <VBtn
                      color="warning"
                      variant="outlined"
                      size="small"
                      prepend-icon="ri-exchange-line"
                      @click="openRoomChangeDialog"
                    >
                      入居情報変更
                    </VBtn>
                    <VBtn
                      color="error"
                      variant="outlined"
                      size="small"
                      prepend-icon="ri-logout-box-line"
                      @click="openCheckoutDialog"
                    >
                      退去処理
                    </VBtn>
                  </div>
                </div>

                <VCard variant="outlined" class="pa-4">
                  <VRow>
                    <VCol cols="12" md="6">
                      <div class="d-flex align-center mb-3">
                        <VIcon class="me-2" color="primary">ri-building-line</VIcon>
                        <strong>建物:</strong>
                        <span class="ml-2">{{ currentBuildingName }}</span>
                      </div>

                      <div class="d-flex align-center mb-3">
                        <VIcon class="me-2" color="primary">ri-home-line</VIcon>
                        <strong>部屋番号:</strong>
                        <span class="ml-2">{{ elderlyData?.current_room?.room_number || '-' }}</span>
                      </div>

                      <div class="d-flex align-center mb-3">
                        <VIcon class="me-2" color="primary">ri-user-3-line</VIcon>
                        <strong>介護度:</strong>
                        <VChip size="small" color="warning" class="ml-2">
                          {{ elderlyData?.care_level || '-' }}
                        </VChip>
                      </div>
                    </VCol>

                    <VCol cols="12" md="6">
                      <div class="d-flex align-center mb-3">
                        <VIcon class="me-2" color="primary">ri-calendar-line</VIcon>
                        <strong>入居日:</strong>
                        <span class="ml-2">{{ elderlyData?.admission_date ? new Date(elderlyData.admission_date).toLocaleDateString('ja-JP') : '-' }}</span>
                      </div>

                      <div class="d-flex align-center mb-3">
                        <VIcon class="me-2" color="primary">ri-hospital-line</VIcon>
                        <strong>入院状態:</strong>
                        <VChip 
                          size="small" 
                          :color="elderlyData?.hospitalization_status === '入院中' ? 'error' : 'success'"
                          class="ml-2"
                          v-if="elderlyData?.hospitalization_status"
                        >
                          {{ elderlyData.hospitalization_status }}
                        </VChip>
                        <span v-else class="ml-2 text-medium-emphasis">正常</span>
                      </div>

                      <div class="d-flex align-center">
                        <VIcon class="me-2" color="primary">ri-check-line</VIcon>
                        <strong>ステータス:</strong>
                        <VChip
                          :color="currentStatusColor"
                          size="small"
                          class="ml-2"
                        >
                          {{ currentStatusLabel }}
                        </VChip>
                      </div>
                    </VCol>
                  </VRow>
                </VCard>
              </div>

              <!-- 입주 변경 이력 -->
              <div class="mb-6">
                <h4 class="text-h6 mb-4">
                  <VIcon class="me-2">ri-history-line</VIcon>
                  入居変更履歴
                </h4>

                <VDataTable
                  :headers="[
                    { title: '建物', key: 'building' },
                    { title: '部屋番号', key: 'room' },
                    { title: '入居日', key: 'check_in' },
                    { title: '退去日', key: 'check_out' },
                    { title: 'ステータス', key: 'status' },
                    { title: '備考', key: 'note' }
                  ]"
                  :items="roomHistory"
                  :loading="loading"
                  class="elevation-1"
                >
                  <!-- 건물 컬럼 -->
                  <template #[`item.building`]="{ item }">
                    {{ getBuildingName(item) }}
                  </template>

                  <!-- 방번호 컬럼 -->
                  <template #[`item.room`]="{ item }">
                    {{ getRoomNumber(item) }}
                  </template>

                  <!-- 입주일 컬럼 -->
                  <template #[`item.check_in`]="{ item }">
                    {{ formatDate(item.check_in_date) }}
                  </template>

                  <!-- 퇴거일 컬럼 -->
                  <template #[`item.check_out`]="{ item }">
                    {{ formatDate(item.check_out_date || '') }}
                  </template>

                  <!-- 상태 컬럼 -->
                  <template #[`item.status`]="{ item }">
                    <VChip
                      :color="item.is_active ? 'success' : 'error'"
                      size="small"
                    >
                      {{ item.is_active ? '在住中' : '退去' }}
                    </VChip>
                  </template>

                  <!-- 비고 컬럼 -->
                  <template #[`item.note`]="{ item }">
                    {{ item.note || '-' }}
                  </template>
                </VDataTable>

                <!-- 기록이 없을 때 -->
                <VAlert
                  v-if="roomHistory.length === 0"
                  type="info"
                  class="mt-4"
                >
                  入居変更履歴がありません。
                </VAlert>
              </div>

            </VCardText>
          </VCard>
        </VWindowItem>
      </VWindow>
    </template>

    <!-- 방 변경 다이얼로그 -->
    <VDialog
      v-model="showRoomChangeDialog"
      max-width="600px"
      persistent
    >
      <VCard>
        <VCardTitle class="text-h5 pa-4">
          <VIcon class="me-2">ri-exchange-line</VIcon>
          入居情報変更
        </VCardTitle>

        <VCardText class="pa-4">
          <VForm @submit.prevent="handleRoomChange">
            <VRow>
              <!-- 변경일 -->
              <VCol cols="12" md="6">
                <VTextField
                  v-model="roomChangeForm.change_date"
                  label="変更日"
                  type="date"
                  required
                />
              </VCol>

              <!-- 새 빌딩 -->
              <VCol cols="12" md="6">
                <VSelect
                  v-model="selectedBuildingId"
                  :items="buildingOptions"
                  item-title="title"
                  item-value="value"
                  label="建物"
                  required
                  @update:model-value="handleBuildingChange"
                />
              </VCol>

              <!-- 새 호실 -->
              <VCol cols="12" md="6">
                <VSelect
                  v-model="roomChangeForm.new_room_id"
                  :items="emptyRoomOptions"
                  item-title="title"
                  item-value="value"
                  label="新部屋"
                  required
                  :disabled="!selectedBuildingId"
                />
              </VCol>

              <!-- 비고 -->
              <VCol cols="12">
                <VTextarea
                  v-model="roomChangeForm.note"
                  label="備考"
                  rows="3"
                  placeholder="変更理由やその他の注意事項を入力してください"
                />
              </VCol>
            </VRow>
          </VForm>
        </VCardText>

        <VCardActions class="pa-4">
          <VSpacer />
          <VBtn
            color="error"
            variant="text"
            @click="showRoomChangeDialog = false"
            :disabled="submitting"
          >
            キャンセル
          </VBtn>
          <VBtn
            color="warning"
            :loading="submitting"
            @click="handleRoomChange"
          >
            変更
          </VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <!-- 퇴거 다이얼로그 -->
    <VDialog
      v-model="showCheckoutDialog"
      max-width="600px"
      persistent
    >
      <VCard>
        <VCardTitle class="text-h5 pa-4">
          <VIcon class="me-2">ri-logout-box-line</VIcon>
          退去処理
        </VCardTitle>

        <VCardText class="pa-4">
          <VForm @submit.prevent="handleCheckout">
            <VRow>
              <!-- 퇴거일 -->
              <VCol cols="12" md="6">
                <VTextField
                  v-model="roomChangeForm.change_date"
                  label="退去日"
                  type="date"
                  required
                />
              </VCol>

              <!-- 비고 -->
              <VCol cols="12">
                <VTextarea
                  v-model="roomChangeForm.note"
                  label="備考"
                  rows="3"
                  placeholder="退去理由やその他の注意事項を入力してください"
                />
              </VCol>
            </VRow>
          </VForm>
        </VCardText>

        <VCardActions class="pa-4">
          <VSpacer />
          <VBtn
            color="grey"
            variant="text"
            @click="showCheckoutDialog = false"
            :disabled="submitting"
          >
            キャンセル
          </VBtn>
          <VBtn
            color="error"
            :loading="submitting"
            @click="handleCheckout"
          >
            退去
          </VBtn>
        </VCardActions>
      </VCard>
    </VDialog>
  </div>
</template>

<style scoped>
.elderly-detail-page {
  padding: 24px;
}

/* 모바일 반응형 */
@media (max-width: 600px) {
  .elderly-detail-page {
    padding: 16px;
  }
}
</style>

