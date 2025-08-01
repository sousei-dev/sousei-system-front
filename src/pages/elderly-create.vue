<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { elderlyService, type ElderlyCreateRequest } from '@/services/elderly'
import { buildingService, type Building } from '@/services/building'
import { roomService, type Room } from '@/services/room'

const router = useRouter()

// 폼 데이터
const form = ref<ElderlyCreateRequest>({
  name: '',
  name_katakana: '',
  room_id: '',
  birth_date: '',
  gender: '男',
  care_level: '介護1',
  admission_date: '',
  note: '',
  security_months: 0,
  security_deposit: 0,
  rent: 0,
  maintenance: 0,
  service: 0,
  status_id: 1,
})

// 빌딩 데이터
const buildings = ref<Building[]>([])
const buildingsLoading = ref(false)
const buildingsError = ref<string | null>(null)

// 선택된 빌딩의 방 데이터
const rooms = ref<Room[]>([])
const roomsLoading = ref(false)
const roomsError = ref<string | null>(null)

// 선택된 빌딩 ID
const selectedBuildingId = ref('')

// 로딩 상태
const loading = ref(false)
const error = ref<string | null>(null)

// 옵션들
const genderOptions = [
  { title: '男性', value: '男' },
  { title: '女性', value: '女' },
]

const statusOptions = [
  { title: '一般', value: 1 },
  { title: '生保', value: 2 },
]

const careLevelOptions = [
  { title: '介護1', value: '介護1' },
  { title: '介護2', value: '介護2' },
  { title: '介護3', value: '介護3' },
  { title: '介護4', value: '介護4' },
  { title: '介護5', value: '介護5' },
]

// 빌딩 목록 조회
const fetchBuildings = async () => {
  try {
    buildingsLoading.value = true
    buildingsError.value = null

    const response = await buildingService.getBuildings({
      resident_type: 'elderly',
    })
    buildings.value = response.items
  } catch (err: any) {
    buildingsError.value = err.response?.data?.message || '建物の取得に失敗しました。'
  } finally {
    buildingsLoading.value = false
  }
}

// 선택된 빌딩의 방 목록 조회
const fetchRooms = async (buildingId: string) => {
  try {
    roomsLoading.value = true
    roomsError.value = null

    const response = await roomService.getRoomsByBuilding(buildingId)
    rooms.value = response.items
  } catch (err: any) {
    roomsError.value = err.response?.data?.message || '部屋の取得に失敗しました。'
  } finally {
    roomsLoading.value = false
  }
}

// 빌딩 선택 시 방 목록 업데이트
watch(selectedBuildingId, (newBuildingId) => {
  if (newBuildingId) {
    fetchRooms(newBuildingId)
    form.value.room_id = '' // 빌딩이 변경되면 방 선택 초기화
    // 비용 정보 초기화
    form.value.rent = 0
    form.value.maintenance = 0
    form.value.service = 0
  } else {
    rooms.value = []
    form.value.room_id = ''
    // 비용 정보 초기화
    form.value.rent = 0
    form.value.maintenance = 0
    form.value.service = 0
    form.value.security_months = 0
    form.value.security_deposit = 0
    form.value.status_id = 1
  }
})

// 방 선택 시 해당 방의 정보를 폼에 대입
const handleRoomSelect = (roomId: string) => {
  const selectedRoom = rooms.value.find(room => room.id === roomId)
  if (selectedRoom) {
    // status_id에 따라 다른 가격 설정
    if (form.value.status_id === 1) {
      form.value.rent = selectedRoom.rent || 0
    } else if (form.value.status_id === 2) {
      form.value.rent = selectedRoom.monthly_rent || 0
    } else {
      form.value.rent = selectedRoom.rent || 0
    }
    
    form.value.maintenance = selectedRoom.maintenance || 0
    form.value.service = selectedRoom.service || 0
    form.value.security_months = selectedRoom.security_months || 1.8
    form.value.security_deposit = selectedRoom.security_deposit || 0
  }
}

// status_id에 따라 방 가격 반환
const getRoomPrice = (room: any) => {
  if (form.value.status_id === 1) {
    return room.rent || 0
  } else if (form.value.status_id === 2) {
    return room.monthly_rent || 0
  }
  return room.rent || 0
}

// status_id 변경 시 방 가격 업데이트
watch(() => form.value.status_id, () => {
  // status_id가 변경되면 방 선택을 강제로 다시 실행하여 가격 업데이트
  if (form.value.room_id) {
    handleRoomSelect(form.value.room_id)
  }
})

// 입주자 생성
const handleSubmit = async () => {
  try {
    loading.value = true
    error.value = null

    await elderlyService.createElderly(form.value)

    // 성공 시 목록 페이지로 이동
    router.push('/elderly-list')
  } catch (err: any) {
    error.value = err.response?.data?.message || '入居者の作成に失敗しました。'
  } finally {
    loading.value = false
  }
}

// 취소
const handleCancel = () => {
  router.push('/elderly-list')
}

// 초기화
onMounted(() => {
  fetchBuildings()
})
</script>

<template>
  <VRow>
    <VCol cols="12">
      <VCard>
        <VCardTitle class="text-h5 pa-4 d-flex justify-space-between align-center">
          <span>入居者追加</span>
          <VBtn
            color="secondary"
            variant="text"
            @click="handleCancel"
          >
            キャンセル
          </VBtn>
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

          <!-- 빌딩 에러 메시지 -->
          <VAlert
            v-if="buildingsError"
            type="error"
            class="mb-6"
          >
            {{ buildingsError }}
          </VAlert>

          <!-- 방 에러 메시지 -->
          <VAlert
            v-if="roomsError"
            type="error"
            class="mb-6"
          >
            {{ roomsError }}
          </VAlert>

          <VForm @submit.prevent="handleSubmit">
            <VRow>
              <!-- 기본 정보 -->
              <VCol cols="12">
                <h4 class="text-h6 mb-4">基本情報</h4>
              </VCol>

              <VCol cols="12" md="6">
                <VTextField
                  v-model="form.name"
                  label="名前"
                  required
                  hide-details="auto"
                  prepend-inner-icon="ri-user-line"
                />
              </VCol>

              <VCol cols="12" md="6">
                <VTextField
                  v-model="form.name_katakana"
                  label="カタカナ"
                  required
                  hide-details="auto"
                  prepend-inner-icon="ri-user-line"
                />
              </VCol>

              <VCol cols="12" md="6">
                <VTextField
                  v-model="form.birth_date"
                  label="生年月日"
                  type="date"
                  required
                  hide-details="auto"
                  prepend-inner-icon="ri-calendar-line"
                />
              </VCol>

              <VCol cols="12" md="6">
                <VSelect
                  v-model="form.gender"
                  :items="genderOptions"
                  item-title="title"
                  item-value="value"
                  label="性別"
                  required
                  hide-details="auto"
                  prepend-inner-icon="ri-user-line"
                />
              </VCol>

              <VCol cols="12" md="6">
                <VSelect
                  v-model="form.status_id"
                  :items="statusOptions"
                  item-title="title"
                  item-value="value"
                  label="ステータス"
                  required
                  hide-details="auto"
                  prepend-inner-icon="ri-heart-line"
                />
              </VCol>

              <VCol cols="12" md="6">
                <VSelect
                  v-model="form.care_level"
                  :items="careLevelOptions"
                  item-title="title"
                  item-value="value"
                  label="介護度"
                  required
                  hide-details="auto"
                  prepend-inner-icon="ri-heart-line"
                />
              </VCol>

              <VCol cols="12" md="6">
                <VTextField
                  v-model="form.admission_date"
                  label="入居日"
                  type="date"
                  required
                  hide-details="auto"
                  prepend-inner-icon="ri-calendar-line"
                />
              </VCol>

              <!-- 거주지 정보 -->
              <VCol cols="12">
                <h4 class="text-h6 mb-4">居住地情報</h4>
              </VCol>

              <VCol cols="12" md="6">
                <VSelect
                  v-model="selectedBuildingId"
                  :items="buildings"
                  item-title="name"
                  item-value="id"
                  label="建物"
                  required
                  :loading="buildingsLoading"
                  hide-details="auto"
                  prepend-inner-icon="ri-building-line"
                  clearable
                />
              </VCol>

              <VCol cols="12" md="6">
                <VSelect
                  v-model="form.room_id"
                  :items="rooms"
                  item-title="room_number"
                  item-value="id"
                  label="部屋"
                  required
                  :loading="roomsLoading"
                  :disabled="!selectedBuildingId"
                  hide-details="auto"
                  prepend-inner-icon="ri-home-line"
                  clearable
                  @update:model-value="handleRoomSelect"
                >
                  <template #item="{ item, props }">
                    <VListItem v-bind="props">
                      <template #prepend>
                        <VIcon>ri-home-line</VIcon>
                      </template>
                      <VListItemSubtitle>
                        ¥{{ getRoomPrice(item.raw)?.toLocaleString() || '0' }} / 月
                      </VListItemSubtitle>
                    </VListItem>
                  </template>
                </VSelect>
              </VCol>

              <!-- 월세 및 관리비 정보 -->
              <VCol cols="12" md="4">
                <VTextField
                  v-model="form.rent"
                  label="月額家賃"
                  type="number"
                  min="0"
                  step="1000"
                  required
                  hide-details="auto"
                  prepend-inner-icon="ri-money-dollar-circle-line"
                />
              </VCol>

              <VCol cols="12" md="4">
                <VTextField
                  v-model="form.maintenance"
                  label="共益費"
                  type="number"
                  min="0"
                  step="1000"
                  required
                  hide-details="auto"
                  prepend-inner-icon="ri-money-dollar-circle-line"
                />
              </VCol>

              <VCol cols="12" md="4">
                <VTextField
                  v-model="form.service"
                  label="サービス費"
                  type="number"
                  min="0"
                  step="1000"
                  required
                  hide-details="auto"
                  prepend-inner-icon="ri-money-dollar-circle-line"
                />
              </VCol>

              <!-- 敷金 정보 -->
              <VCol cols="12" md="3">
                <VTextField
                  v-model="form.security_months"
                  label="敷金月数"
                  type="number"
                  min="0"
                  max="12"
                  required
                  hide-details="auto"
                  prepend-inner-icon="ri-time-line"
                />
              </VCol>

              <VCol cols="12" md="3">
                <VTextField
                  v-model="form.security_deposit"
                  label="敷金金額"
                  type="number"
                  min="0"
                  step="1000"
                  required
                  hide-details="auto"
                  prepend-inner-icon="ri-money-dollar-circle-line"
                />
              </VCol>

              <!-- 메모 -->
              <VCol cols="12">
                <VTextarea
                  v-model="form.note"
                  label="メモ"
                  rows="3"
                  hide-details="auto"
                  prepend-inner-icon="ri-file-text-line"
                />
              </VCol>
            </VRow>

            <!-- 액션 버튼 -->
            <VCardActions class="pa-4">
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
                @click="handleSubmit"
              >
                作成
              </VBtn>
            </VCardActions>
          </VForm>
        </VCardText>
      </VCard>
    </VCol>
  </VRow>
</template> 