<script setup lang="ts">
import { residentService, type Resident, isStudentResident, isElderlyResident } from '@/services/resident'
import { roomService, type Room, type RoomUpdateRequest, type RoomUtility, type RoomUtilityCreateRequest } from '@/services/room'
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const router = useRouter()
const route = useRoute()

// 방 데이터
const room = ref<Room | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)

// 입주자 데이터
const activeResidents = ref<Resident[]>([])
const residentHistory = ref<Resident[]>([])
const residentLoading = ref(false)
const residentError = ref<string | null>(null)

const residentType = ref<string | null>(null)

// 편집 모드
const isEditing = ref(false)

// 폼 데이터
const form = ref<RoomUpdateRequest>({
  room_number: '',
  rent: 0,
  floor: 1,
  capacity: 1,
  is_available: true,
  note: '',
  maintenance: 0,
  service: 0,
})

// 날짜 포맷팅
const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('ja-JP')
}

// 현재 월을 기본값으로 설정
const getCurrentMonth = () => {
  const now = new Date()

  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

const selectedMonth = ref(getCurrentMonth())
const utilities = ref<RoomUtility[]>([])
const isUtilityModalOpen = ref(false)
const editingUtility = ref<RoomUtility | null>(null)

// 유틸리티 폼 데이터
const utilityForm = ref({
  room_id: route.params.id as string,
  charge_month: selectedMonth.value,
  utilities: {
    electricity: {
      period_start: '',
      period_end: '',
      total_amount: 0,
      memo: '',
    },
    water: {
      period_start: '',
      period_end: '',
      total_amount: 0,
      memo: '',
    },
    gas: {
      period_start: '',
      period_end: '',
      total_amount: 0,
      memo: '',
    },
  },
})

// 메시지 표시 함수들
const showSuccessMessage = (message: string) => {
  // TODO: 실제 메시지 표시 로직 구현
  console.log('Success:', message)
}

const showErrorMessage = (message: string) => {
  // TODO: 실제 메시지 표시 로직 구현
  console.log('Error:', message)
}

// 유틸리티 타입별 헬퍼 함수들
const getUtilityIcon = (type: string) => {
  switch (type) {
    case 'electricity':
      return 'ri-flashlight-line'
    case 'water':
      return 'ri-water-flash-line'
    case 'gas':
      return 'ri-fire-line'
    default:
      return 'ri-flashlight-line'
  }
}

const getUtilityColor = (type: string) => {
  switch (type) {
    case 'electricity':
      return 'warning'
    case 'water':
      return 'info'
    case 'gas':
      return 'error'
    default:
      return 'primary'
  }
}

const getUtilityTypeLabel = (type: string) => {
  switch (type) {
    case 'electricity':
      return '電気代'
    case 'water':
      return '水道代'
    case 'gas':
      return 'ガス代'
    default:
      return type
  }
}

// 유틸리티 비용 관리 함수들
const loadUtilitiesForMonth = async (month: string) => {
  try {
    const roomId = route.params.id as string
    const response = await roomService.getUtilitiesByMonth(roomId, month)
    utilities.value = response.items || []

    // utilityForm에 기존 데이터 설정
    utilityForm.value.utilities = {
      electricity: {
        period_start: '',
        period_end: '',
        total_amount: 0,
        memo: '',
      },
      water: {
        period_start: '',
        period_end: '',
        total_amount: 0,
        memo: '',
      },
      gas: {
        period_start: '',
        period_end: '',
        total_amount: 0,
        memo: '',
      },
    }

    // 기존 데이터를 폼에 설정
    utilities.value.forEach((utility: RoomUtility) => {
      if (utility.utility_type in utilityForm.value.utilities) {
        utilityForm.value.utilities[utility.utility_type] = {
          period_start: utility.period_start,
          period_end: utility.period_end,
          total_amount: utility.total_amount || 0,
          memo: utility.memo || '',
        }
      }
    })
  } catch (err: any) {
    console.error('유틸리티 비용 로드 실패:', err)
    utilities.value = []
  }
}

const onMonthChange = async () => {
  await loadUtilitiesForMonth(selectedMonth.value)
}

const openAddUtilityModal = () => {
  editingUtility.value = null

  // 추가 모드: 빈 폼으로 초기화
  utilityForm.value = {
    room_id: route.params.id as string,
    charge_month: selectedMonth.value,
    utilities: {
      electricity: {
        period_start: '',
        period_end: '',
        total_amount: 0,
        memo: '',
      },
      water: {
        period_start: '',
        period_end: '',
        total_amount: 0,
        memo: '',
      },
      gas: {
        period_start: '',
        period_end: '',
        total_amount: 0,
        memo: '',
      },
    },
  }

  isUtilityModalOpen.value = true
}

const openUtilityModal = async (utility?: RoomUtility) => {
  editingUtility.value = utility || null

  if (utility) {
    // 개별 편집 모드: 특정 유틸리티만 편집
    utilityForm.value.charge_month = utility.charge_month

    // 해당 유틸리티 타입의 데이터만 설정
    if (utility.utility_type in utilityForm.value.utilities) {
      utilityForm.value.utilities[utility.utility_type] = {
        period_start: utility.period_start,
        period_end: utility.period_end,
        total_amount: utility.total_amount || 0,
        memo: utility.memo || '',
      }
    }
  } else {
    // 전체 편집 모드: 현재 월의 모든 유틸리티 데이터를 폼에 설정
    utilityForm.value.charge_month = selectedMonth.value

    // 현재 월의 유틸리티 데이터를 다시 설정
    utilityForm.value.utilities = {
      electricity: {
        period_start: '',
        period_end: '',
        total_amount: 0,
        memo: '',
      },
      water: {
        period_start: '',
        period_end: '',
        total_amount: 0,
        memo: '',
      },
      gas: {
        period_start: '',
        period_end: '',
        total_amount: 0,
        memo: '',
      },
    }

    // 기존 데이터를 폼에 설정
    utilities.value.forEach((utilityItem: RoomUtility) => {
      if (utilityItem.utility_type in utilityForm.value.utilities) {
        utilityForm.value.utilities[utilityItem.utility_type] = {
          period_start: utilityItem.period_start,
          period_end: utilityItem.period_end,
          total_amount: utilityItem.total_amount || 0,
          memo: utilityItem.memo || '',
        }
      }
    })
  }

  isUtilityModalOpen.value = true
}

const closeUtilityModal = () => {
  editingUtility.value = null
  isUtilityModalOpen.value = false
  // 폼 초기화
  utilityForm.value = {
    room_id: route.params.id as string,
    charge_month: selectedMonth.value,
    utilities: {
      electricity: {
        period_start: '',
        period_end: '',
        total_amount: 0,
        memo: '',
      },
      water: {
        period_start: '',
        period_end: '',
        total_amount: 0,
        memo: '',
      },
      gas: {
        period_start: '',
        period_end: '',
        total_amount: 0,
        memo: '',
      },
    },
  }
}

const saveUtility = async () => {
  try {
    const roomId = route.params.id as string
    const promises = []

    // charge_month를 YYYY-MM-01 형태로 변환
    const chargeMonthWithDay = `${utilityForm.value.charge_month}-01`

    // 각 유틸리티 타입별로 입력된 데이터만 저장
    for (const [type, data] of Object.entries(utilityForm.value.utilities)) {
      // 필수 필드가 모두 입력된 경우에만 저장
      if (data.period_start && data.period_end && data.total_amount > 0) {
        const utilityData: RoomUtilityCreateRequest = {
          room_id: roomId,
          utility_type: type as 'electricity' | 'water' | 'gas',
          period_start: data.period_start,
          period_end: data.period_end,
          total_amount: data.total_amount,
          charge_month: chargeMonthWithDay,
          memo: data.memo || '',
        }

        if (editingUtility.value && editingUtility.value.utility_type === type) {
          // 편집 모드
          promises.push(roomService.updateUtility(roomId, editingUtility.value.id, utilityData))
        } else {
          // 추가 모드
          promises.push(roomService.createUtility(utilityData))
        }
      }
    }

    if (promises.length > 0) {
      await Promise.all(promises)
      await loadUtilitiesForMonth(selectedMonth.value)
      closeUtilityModal()
      showSuccessMessage('光熱費が保存されました。')
    } else {
      showErrorMessage('保存するデータがありません。必須項目を入力してください。')
    }
  } catch (err: any) {
    console.error('유틸리티 비용 저장 실패:', err)
    showErrorMessage('光熱費の保存に失敗しました。')
  }
}

const deleteUtility = async (utilityId: string) => {
  if (!confirm('この光熱費を削除しますか？')) return

  try {
    const roomId = route.params.id as string
    await roomService.deleteUtility(roomId, utilityId)
    await loadUtilitiesForMonth(selectedMonth.value)
    showSuccessMessage('光熱費が削除されました。')
  } catch (err: any) {
    console.error('유틸리티 비용 삭제 실패:', err)
    showErrorMessage('光熱費の削除に失敗しました。')
  }
}

// 방 데이터 로드
const fetchRoom = async () => {
  try {
    loading.value = true
    error.value = null

    const roomId = route.params.id as string
    const response = await roomService.getRoom(roomId)

    room.value = response
    residentType.value = (response.building.resident_type as string) || null
    if (room.value) {
      form.value = {
        room_number: room.value.room_number,
        rent: room.value.rent,
        floor: room.value.floor,
        capacity: room.value.capacity,
        is_available: room.value.is_available,
        note: room.value.note,
        maintenance: room.value.maintenance || 0,
        service: room.value.service || 0,
      }

      // 현재 월의 유틸리티 비용 로드
      await loadUtilitiesForMonth(selectedMonth.value)
    }
  } catch (err: any) {
    console.error('방 정보 로드 실패:', err)
    error.value = '部屋情報の取得に失敗しました。'
  } finally {
    loading.value = false
  }
}

// 입주자 데이터 로드
const fetchResidents = async () => {
  try {
    residentLoading.value = true
    residentError.value = null

    const roomId = route.params.id as string

    // 활성 입주자 조회
    const params = residentType.value ? { residentType: residentType.value as 'student' | 'elderly' } : undefined
    const resident = await residentService.getResidentsByRoom(roomId, params)
    activeResidents.value = resident.residents

    // 입주 기록 조회
    const history = await residentService.getResidentHistory(roomId, residentType.value as 'student' | 'elderly')
    residentHistory.value = history.items
  } catch (err: any) {
    residentError.value = err.response?.data?.message || '入居者の取得に失敗しました。'
  } finally {
    residentLoading.value = false
  }
}

// 방 수정
const handleUpdate = async () => {
  try {
    loading.value = true
    error.value = null

    const roomId = route.params.id as string
    await roomService.updateRoom(roomId, {
      room_number: form.value.room_number,
      rent: form.value.rent,
      floor: form.value.floor,
      capacity: form.value.capacity,
      is_available: form.value.is_available,
      note: form.value.note || undefined,
      maintenance: form.value.maintenance,
      service: form.value.service,
    })

    // 성공 시 편집 모드 해제
    isEditing.value = false
    await fetchRoom() // 데이터 다시 로드
  } catch (err: any) {
    error.value = err.response?.data?.message || '部屋の更新に失敗しました。'
  } finally {
    loading.value = false
  }
}

// 방 삭제
const _handleDelete = async () => {
  if (confirm('本当にこの部屋を削除しますか？')) {
    try {
      loading.value = true
      error.value = null

      const roomId = route.params.id as string
      await roomService.deleteRoom(roomId)

      // 성공 시 빌딩 상세 페이지로 이동
      if (room.value) {
        router.push(`/building-detail/${room.value.building_id}`)
      } else {
        router.push('/building-list')
      }
    } catch (err: any) {
      error.value = err.response?.data?.message || '部屋の削除に失敗しました。'
    } finally {
      loading.value = false
    }
  }
}

// 편집 모드 토글
const toggleEdit = () => {
  isEditing.value = !isEditing.value
}

// 취소
const handleCancel = () => {
  isEditing.value = false
  // 폼 데이터를 원래 데이터로 복원
  if (room.value) {
    form.value = {
      room_number: room.value.room_number,
      rent: room.value.rent,
      floor: room.value.floor,
      capacity: room.value.capacity,
      is_available: room.value.is_available,
      note: room.value.note || '',
    }
  }
}

// 빌딩 상세로 돌아가기
const goToBuildingDetail = () => {
  if (room.value) {
    router.push(`/building-detail/${room.value.building_id}`)
  } else {
    router.push('/building-list')
  }
}

// 입주자 상세로 이동
const goToResidentDetail = (residentId: string, residentType: string) => {
  router.push(`/resident-detail/${residentId}?resident_type=${residentType}`)
}

// 학생 상세로 이동
const goToStudentDetail = (studentId: string) => {
  router.push(`/student-detail/${studentId}`)
}

// 입주자 추가로 이동
const _goToResidentCreate = () => {
  const roomId = route.params.id as string
  router.push(`/resident-create?room_id=${roomId}`)
}

// 입주자 이름 가져오기
const getResidentName = (resident: Resident) => {
  if (resident.name) {
    return resident.name
  }
  
  return '不明な入居者'
}

// 입주자 전화번호 가져오기
const getResidentPhone = (resident: Resident) => {
  if (resident.phone) {
    return resident.phone
  }
  
  return '電話番号なし'
}

// 입주자 아바타 가져오기
const getResidentAvatar = (resident: Resident) => {
  if (resident.avatar) {
    return resident.avatar
  }
  
  return null
}

// 입주자 이니셜 가져오기
const getResidentInitial = (resident: Resident) => {
  const name = getResidentName(resident)
  
  return name.charAt(0) || '?'
}

onMounted(async () => {
  await fetchRoom()
  await fetchResidents()
})
</script>

<template>
  <VRow>
    <!-- 왼쪽: 방 정보 -->
    <VCol cols="12" lg="6">
      <VCard>
        <VCardTitle class="text-h5 pa-4 d-flex justify-space-between align-center">
          <span>部屋詳細</span>
          <div class="d-flex gap-2">
            <VBtn
              v-if="!isEditing"
              color="primary"
              variant="outlined"
              @click="toggleEdit"
            >
              編集
            </VBtn>
            <VBtn
              color="secondary"
              variant="text"
              @click="goToBuildingDetail"
            >
              建物詳細に戻る
            </VBtn>
          </div>
        </VCardTitle>

        <VCardText>
          <!-- 에러 메시지 -->
          <VAlert
            v-if="error"
            type="error"
            class="mb-6"
          >
            {{ error }}
          </VAlert>

          <!-- 로딩 중 -->
          <div v-if="loading" class="d-flex justify-center pa-8">
            <VProgressCircular indeterminate />
          </div>

          <!-- 방 정보 -->
          <div v-else-if="room">
            <VRow>
              <VCol cols="12" md="6">
                <VTextField
                  v-model="form.room_number"
                  label="部屋番号"
                  :readonly="!isEditing"
                  hide-details="auto"
                  prepend-inner-icon="ri-home-line"
                />
              </VCol>

              <VCol cols="12" md="6">
                <VTextField
                  v-model="form.floor"
                  label="階数"
                  :readonly="!isEditing"
                  type="number"
                  min="0"
                  hide-details="auto"
                  prepend-inner-icon="ri-building-line"
                />
              </VCol>

              <VCol cols="12" md="6">
                <VTextField
                  v-model="form.rent"
                  label="家賃"
                  :readonly="!isEditing"
                  type="number"
                  min="0"
                  hide-details="auto"
                  prepend-inner-icon="ri-money-dollar-circle-line"
                />
              </VCol>

              <VCol cols="12" md="6">
                <VTextField
                  v-model="form.capacity"
                  label="定員"
                  :readonly="!isEditing"
                  type="number"
                  min="1"
                  hide-details="auto"
                  prepend-inner-icon="ri-user-line"
                />
              </VCol>

              <!-- 관리비용 (노인 거주자만) -->
              <VCol v-if="residentType === 'elderly'" cols="12" md="6">
                <VTextField
                  v-model="form.maintenance"
                  label="管理費"
                  :readonly="!isEditing"
                  type="number"
                  min="0"
                  hide-details="auto"
                  prepend-inner-icon="ri-money-dollar-circle-line"
                />
              </VCol>

              <!-- 서비스비용 (노인 거주자만) -->
              <VCol v-if="residentType === 'elderly'" cols="12" md="6">
                <VTextField
                  v-model="form.service"
                  label="サービス費"
                  :readonly="!isEditing"
                  type="number"
                  min="0"
                  hide-details="auto"
                  prepend-inner-icon="ri-service-line"
                />
              </VCol>

              <VCol cols="12" md="6">
                <VSelect
                  v-model="form.is_available"
                  label="利用可能"
                  :readonly="!isEditing"
                  :items="[
                    { title: '利用可能', value: true },
                    { title: '利用中', value: false }
                  ]"
                  hide-details="auto"
                  prepend-inner-icon="ri-checkbox-circle-line"
                />
              </VCol>

              <VCol cols="12">
                <VTextarea
                  v-model="form.note"
                  label="メモ"
                  :readonly="!isEditing"
                  rows="3"
                  hide-details="auto"
                  prepend-inner-icon="ri-file-text-line"
                />
              </VCol>

              <!-- 월별 유틸리티 비용 섹션 (학생 거주자만 표시) -->
              <VCol v-if="residentType !== 'elderly'" cols="12">
                <VCard variant="outlined" class="pa-4">
                  <VCardTitle class="text-h6 mb-4 d-flex justify-space-between align-center">
                    <div class="d-flex align-center">
                      <VIcon class="me-2">ri-flashlight-line</VIcon>
                      月別光熱費管理
                    </div>
                    <VBtn
                      color="primary"
                      size="small"
                      prepend-icon="ri-add-line"
                      :disabled="utilities.length > 0"
                      @click="openAddUtilityModal()"
                    >
                      光熱費追加
                    </VBtn>
                  </VCardTitle>

                  <!-- 월 선택 -->
                  <VRow class="mb-4">
                    <VCol cols="12" md="4">
                      <VTextField
                        v-model="selectedMonth"
                        label="請求月"
                        type="month"
                        @update:model-value="onMonthChange"
                        hide-details="auto"
                      />
                    </VCol>
                  </VRow>

                  <!-- 유틸리티 비용 목록 -->
                  <div v-if="utilities.length > 0">
                    <div class="d-flex justify-end mb-3">
                      <VBtn
                        color="primary"
                        size="small"
                        variant="outlined"
                        prepend-icon="ri-edit-line"
                        @click="openUtilityModal()"
                      >
                        編集
                      </VBtn>
                    </div>
                    <VList>
                      <VListItem
                        v-for="utility in utilities"
                        :key="utility.id"
                        class="mb-2"
                        variant="outlined"
                      >
                        <template #prepend>
                          <VIcon
                            :icon="getUtilityIcon(utility.utility_type)"
                            :color="getUtilityColor(utility.utility_type)"
                            size="24"
                          />
                        </template>

                        <VListItemTitle>
                          {{ getUtilityTypeLabel(utility.utility_type) }}
                        </VListItemTitle>

                        <VListItemSubtitle>
                          {{ formatDate(utility.period_start) }} - {{ formatDate(utility.period_end) }}
                          <span v-if="utility.total_amount" class="ml-2">
                            ¥{{ utility.total_amount.toLocaleString() }}
                          </span>
                        </VListItemSubtitle>

                        <template #append>
                          <VBtn
                            size="small"
                            color="error"
                            variant="text"
                            @click="deleteUtility(utility.id)"
                          >
                            削除
                          </VBtn>
                        </template>
                      </VListItem>
                    </VList>
                  </div>

                  <!-- 유틸리티 비용이 없을 때 -->
                  <div v-else class="text-center pa-8">
                    <VIcon size="48" color="grey" class="mb-4">ri-inbox-line</VIcon>
                    <div class="text-body-2 text-grey">
                      この月の光熱費データがありません
                    </div>
                  </div>
                </VCard>
              </VCol>
            </VRow>
          </div>
        </VCardText>

        <!-- 편집 모드일 때만 액션 버튼 표시 -->
        <VCardActions v-if="isEditing" class="pa-4">
          <VSpacer />
          <VBtn
            color="error"
            variant="text"
            @click="handleCancel"
          >
            キャンセル
          </VBtn>
          <VBtn
            color="primary"
            :loading="loading"
            @click="handleUpdate"
          >
            更新
          </VBtn>
        </VCardActions>
      </VCard>
    </VCol>

    <!-- 오른쪽: 입주자 정보 -->
    <VCol cols="12" lg="6">
      <VCard>
        <VCardTitle class="text-h6 pa-4 d-flex justify-space-between align-center">
          <span>入居者情報</span>
          <!-- <VBtn
            color="primary"
            size="small"
            prepend-icon="ri-add-line"
            @click="goToResidentCreate"
          >
            入居者追加
          </VBtn> -->
        </VCardTitle>

        <VCardText>
          <!-- 입주자 에러 메시지 -->
          <VAlert
            v-if="residentError"
            type="error"
            class="mb-6"
          >
            {{ residentError }}
          </VAlert>

          <!-- 입주자 로딩 중 -->
          <div v-if="residentLoading" class="d-flex justify-center pa-8">
            <VProgressCircular indeterminate />
          </div>

          <!-- 현재 입주자 정보 -->
          <div v-else-if="activeResidents.length > 0">
            <VList>
              <VListItem
                v-for="resident in activeResidents"
                :key="resident.id"
                class="mb-2"
                variant="outlined"
              >
                <template #prepend>
                  <VAvatar
                    v-if="getResidentAvatar(resident)"
                    :image="getResidentAvatar(resident)"
                    size="40"
                  />
                  <VAvatar
                    v-else
                    size="40"
                  >
                    {{ getResidentInitial(resident) }}
                  </VAvatar>
                </template>

                <VListItemTitle>
                  {{ getResidentName(resident) }}
                </VListItemTitle>

                <VListItemSubtitle>
                  {{ getResidentPhone(resident) }}
                </VListItemSubtitle>

                <template #append>
                  <div class="d-flex align-center gap-2">
                    <VChip color="success" size="small">入居中</VChip>

                    <VBtn
                      icon="ri-eye-line"
                      variant="text"
                      size="small"
                      color="primary"
                      @click="goToStudentDetail(resident.id)"
                      title="入居記録詳細"
                    />
                  </div>
                </template>
              </VListItem>
            </VList>
          </div>

          <!-- 현재 입주자가 없을 때 -->
          <div v-else class="text-center pa-8">
            <VIcon size="64" color="grey" class="mb-4">ri-user-line</VIcon>
            <div class="text-h6 text-medium-emphasis">入居者なし</div>
            <div class="text-body-2 text-medium-emphasis">この部屋には現在入居者がいません。</div>
          </div>
        </VCardText>
      </VCard>
    </VCol>
  </VRow>

  <!-- 입주 기록 (전체 너비) -->
  <VRow class="mt-6">
    <VCol cols="12">
      <VCard>
        <VCardTitle class="text-h6 pa-4 d-flex justify-space-between align-center">
          <span>入居履歴</span>
          <!-- <VBtn
            color="primary"
            size="small"
            prepend-icon="ri-add-line"
            @click="goToResidentCreate"
          >
            新規入居者追加
          </VBtn> -->
        </VCardTitle>

        <VCardText>
          <div v-if="residentLoading" class="text-center py-8">
            <VProgressCircular indeterminate />
          </div>

          <div v-else-if="residentError" class="text-center py-8">
            <VAlert type="error">{{ residentError }}</VAlert>
          </div>

          <div v-else-if="residentHistory.length === 0" class="text-center py-8">
            <div class="text-body-1 text-medium-emphasis">入居記録がありません</div>
          </div>

          <div v-else>
            <VTable>
              <thead>
                <tr>
                  <th>名前</th>
                  <th>カタカナ</th>
                  <th>入居日</th>
                  <th>退去日</th>
                  <th>状態</th>
                  <!-- <th>操作</th> -->
                </tr>
              </thead>
              <tbody>
                <tr v-for="resident in residentHistory" :key="resident.id">
                  <td>
                    <div class="d-flex align-center">
                      <VAvatar
                        v-if="getResidentAvatar(resident.student)"
                        :image="getResidentAvatar(resident.student)"
                        size="32"
                        class="me-2"
                      />
                      <VAvatar
                        v-else
                        size="32"
                        class="me-2"
                      >
                        {{ getResidentInitial(resident.student) }}
                      </VAvatar>
                      <span>{{ getResidentName(resident.student) }}</span>
                    </div>
                  </td>
                  <td>
                    <span v-if="isStudentResident(resident)">
                      {{ resident.student.name_katakana }}
                    </span>
                    <span v-else>-</span>
                  </td>
                  <td>{{ formatDate(resident.check_in_date) }}</td>
                  <td>{{ resident.check_out_date ? formatDate(resident.check_out_date) : '-' }}</td>
                  <td>
                    <VChip
                      :color="resident.is_active ? 'success' : 'default'"
                      size="small"
                    >
                      {{ resident.is_active ? '入居中' : '退去済み' }}
                    </VChip>
                  </td>
                  <!-- <td>
                    <div class="d-flex gap-1">
                      <VBtn
                        icon="ri-eye-line"
                        variant="text"
                        size="small"
                        color="primary"
                        @click="goToResidentDetail(resident.id, resident.resident_type)"
                        title="入居記録詳細"
                      />
                    </div>
                  </td> -->
                </tr>
              </tbody>
            </VTable>
          </div>
        </VCardText>
      </VCard>
    </VCol>
  </VRow>

  <!-- 유틸리티 비용 추가/편집 모달 -->
  <VDialog
    v-model="isUtilityModalOpen"
    max-width="600px"
    persistent
  >
    <VCard>
      <VCardTitle class="text-h6 pa-4">
        {{ editingUtility ? '光熱費編集' : '光熱費追加' }}
      </VCardTitle>

      <VCardText class="pa-4">
        <VForm @submit.prevent="saveUtility()">
          <VRow>
            <VCol cols="12" md="6">
              <VTextField
                v-model="utilityForm.charge_month"
                label="請求月"
                type="month"
                required
                hide-details="auto"
                readonly
              />
            </VCol>
          </VRow>

          <!-- 전기 요금 -->
          <VCard variant="outlined" class="mt-4 pa-4">
            <VCardTitle class="text-h6 d-flex align-center">
              <VIcon class="me-2" color="warning">ri-flashlight-line</VIcon>
              電気代
            </VCardTitle>
            <VRow>
              <VCol cols="12" md="6">
                <VTextField
                  v-model="utilityForm.utilities.electricity.period_start"
                  label="期間開始日"
                  type="date"
                  hide-details="auto"
                />
              </VCol>
              <VCol cols="12" md="6">
                <VTextField
                  v-model="utilityForm.utilities.electricity.period_end"
                  label="期間終了日"
                  type="date"
                  hide-details="auto"
                />
              </VCol>
              <VCol cols="12" md="6">
                <VTextField
                  v-model="utilityForm.utilities.electricity.total_amount"
                  label="金額"
                  type="number"
                  min="0"
                  step="1"
                  placeholder="0"
                  hide-details="auto"
                  prepend-inner-icon="ri-money-dollar-circle-line"
                />
              </VCol>
              <VCol cols="12">
                <VTextarea
                  v-model="utilityForm.utilities.electricity.memo"
                  label="メモ"
                  rows="2"
                  hide-details="auto"
                />
              </VCol>
            </VRow>
          </VCard>

          <!-- 수도 요금 -->
          <VCard variant="outlined" class="mt-4 pa-4">
            <VCardTitle class="text-h6 d-flex align-center">
              <VIcon class="me-2" color="info">ri-water-flash-line</VIcon>
              水道代
            </VCardTitle>
            <VRow>
              <VCol cols="12" md="6">
                <VTextField
                  v-model="utilityForm.utilities.water.period_start"
                  label="期間開始日"
                  type="date"
                  hide-details="auto"
                />
              </VCol>
              <VCol cols="12" md="6">
                <VTextField
                  v-model="utilityForm.utilities.water.period_end"
                  label="期間終了日"
                  type="date"
                  hide-details="auto"
                />
              </VCol>
              <VCol cols="12" md="6">
                <VTextField
                  v-model="utilityForm.utilities.water.total_amount"
                  label="金額"
                  type="number"
                  min="0"
                  step="1"
                  placeholder="0"
                  hide-details="auto"
                  prepend-inner-icon="ri-money-dollar-circle-line"
                />
              </VCol>
              <VCol cols="12">
                <VTextarea
                  v-model="utilityForm.utilities.water.memo"
                  label="メモ"
                  rows="2"
                  hide-details="auto"
                />
              </VCol>
            </VRow>
          </VCard>

          <!-- 가스 요금 -->
          <VCard variant="outlined" class="mt-4 pa-4">
            <VCardTitle class="text-h6 d-flex align-center">
              <VIcon class="me-2" color="error">ri-fire-line</VIcon>
              ガス代
            </VCardTitle>
            <VRow>
              <VCol cols="12" md="6">
                <VTextField
                  v-model="utilityForm.utilities.gas.period_start"
                  label="期間開始日"
                  type="date"
                  hide-details="auto"
                />
              </VCol>
              <VCol cols="12" md="6">
                <VTextField
                  v-model="utilityForm.utilities.gas.period_end"
                  label="期間終了日"
                  type="date"
                  hide-details="auto"
                />
              </VCol>
              <VCol cols="12" md="6">
                <VTextField
                  v-model="utilityForm.utilities.gas.total_amount"
                  label="金額"
                  type="number"
                  min="0"
                  step="1"
                  placeholder="0"
                  hide-details="auto"
                  prepend-inner-icon="ri-money-dollar-circle-line"
                />
              </VCol>
              <VCol cols="12">
                <VTextarea
                  v-model="utilityForm.utilities.gas.memo"
                  label="メモ"
                  rows="2"
                  hide-details="auto"
                />
              </VCol>
            </VRow>
          </VCard>
        </VForm>
      </VCardText>

      <VCardActions class="pa-4">
        <VSpacer />
        <VBtn
          color="error"
          variant="text"
          @click="closeUtilityModal"
        >
          キャンセル
        </VBtn>
        <VBtn
          color="primary"
          @click="saveUtility()"
        >
          {{ editingUtility ? '更新' : '追加' }}
        </VBtn>
      </VCardActions>
    </VCard>
  </VDialog>
</template> 
