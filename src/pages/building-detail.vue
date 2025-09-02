<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { type Building, buildingService } from '@/services/building'
import { type Room, roomService } from '@/services/room'

const router = useRouter()
const route = useRoute()

// 빌딩 데이터
const building = ref<Building | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)

// 거주자 타입 (빌딩 데이터에서 확인)
const residentType = ref<string | null>(null)

// 방 데이터
const rooms = ref<Room[]>([])
const roomsLoading = ref(false)
const roomsError = ref<string | null>(null)

// 편집 모드
const isEditing = ref(false)

// 폼 데이터
const form = ref({
  name: '',
  address: '',
  total_rooms: undefined as number | undefined,
  note: '',
})

// 빌딩 데이터 로드
const fetchBuilding = async () => {
  try {
    loading.value = true
    error.value = null

    const buildingId = route.params.id as string
    const data = await buildingService.getBuilding(buildingId)

    building.value = data
    residentType.value = data.resident_type

    // 폼 데이터 초기화
    form.value = {
      name: data.name,
      address: data.address || '',
      total_rooms: data.total_rooms,
      note: data.note || '',
    }
  }
  catch (err: any) {
    error.value = err.response?.data?.message || '建物の取得に失敗しました。'
  }
  finally {
    loading.value = false
  }
}

// 방 목록 조회
const fetchRooms = async () => {
  try {
    roomsLoading.value = true
    roomsError.value = null

    const buildingId = route.params.id as string
    const response = await roomService.getRoomsByBuilding(buildingId)

    rooms.value = response.items
  }
  catch (err: any) {
    roomsError.value = err.response?.data?.message || '部屋リストの取得に失敗しました。'
  }
  finally {
    roomsLoading.value = false
  }
}

// 빌딩 수정
const handleUpdate = async () => {
  try {
    loading.value = true
    error.value = null

    const buildingId = route.params.id as string

    await buildingService.updateBuilding(buildingId, {
      name: form.value.name,
      address: form.value.address || undefined,
      total_rooms: form.value.total_rooms,
      note: form.value.note || undefined,
    })

    // 성공 시 편집 모드 해제
    isEditing.value = false
    await fetchBuilding() // 데이터 다시 로드
  }
  catch (err: any) {
    error.value = err.response?.data?.message || '建物の更新に失敗しました。'
  }
  finally {
    loading.value = false
  }
}

// 편집 모드 토글
const toggleEdit = () => {
  isEditing.value = !isEditing.value
}

// キャンセル
const handleCancel = () => {
  isEditing.value = false

  // 폼 데이터를 원래 데이터로 복원
  if (building.value) {
    form.value = {
      name: building.value.name,
      address: building.value.address || '',
      total_rooms: building.value.total_rooms,
      note: building.value.note || '',
    }
  }
}

// 목록으로 돌아가기
const goToList = () => {
  router.push('/building-list?type=student')
}

// 방 상세로 이동
const goToRoomDetail = (roomId: string) => {
  router.push(`/room-detail/${roomId}`)
}

// 방 생성으로 이동
const goToRoomCreate = () => {
  const buildingId = route.params.id as string

  router.push(`/room-create?building_id=${buildingId}`)
}

// 部屋削除
const _handleRoomDelete = async (roomId: string) => {
  // eslint-disable-next-line no-alert
  if (window.confirm('本当にこの部屋を削除しますか？')) {
    try {
      roomsLoading.value = true
      await roomService.deleteRoom(roomId)
      await fetchRooms() // 방 목록 다시 로드
    }
    catch (err: any) {
      roomsError.value = err.response?.data?.message || '部屋の削除に失敗しました。'
    }
    finally {
      roomsLoading.value = false
    }
  }
}

onMounted(async () => {
  await fetchBuilding()
  await fetchRooms()
})
</script>

<template>
  <VRow>
    <VCol cols="12">
      <VCard>
        <VCardTitle class="text-h5 pa-4 d-flex justify-space-between align-center">
          <span>建物詳細</span>
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
              @click="goToList"
            >
              リストに戻る
            </VBtn>
          </div>
        </VCardTitle>

        <VCardText>
          <!-- エラーメッセージ -->
          <VAlert
            v-if="error"
            type="error"
            class="mb-6"
          >
            {{ error }}
          </VAlert>

          <!-- 読み込み中 -->
          <div
            v-if="loading"
            class="d-flex justify-center pa-8"
          >
            <VProgressCircular indeterminate />
          </div>

          <!-- 빌딩 정보 -->
          <div v-else-if="building">
            <VRow>
              <VCol
                cols="12"
                md="6"
              >
                <VTextField
                  v-model="form.name"
                  label="建物名"
                  :readonly="!isEditing"
                  hide-details="auto"
                  prepend-inner-icon="ri-building-line"
                />
              </VCol>

              <VCol
                cols="12"
                md="6"
              >
                <VTextField
                  v-model="form.address"
                  label="住所"
                  :readonly="!isEditing"
                  hide-details="auto"
                  prepend-inner-icon="ri-map-pin-line"
                />
              </VCol>

              <VCol
                cols="12"
                md="6"
              >
                <VTextField
                  v-model="form.total_rooms"
                  label="総部屋数"
                  :readonly="!isEditing"
                  type="number"
                  min="0"
                  hide-details="auto"
                  prepend-inner-icon="ri-home-line"
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
            </VRow>
          </div>
        </VCardText>

        <!-- 편집 모드일 때만 액션 버튼 표시 -->
        <VCardActions
          v-if="isEditing"
          class="pa-4"
        >
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

      <!-- 방 목록 -->
      <VCard class="mt-6">
        <VCardTitle class="text-h6 pa-4 d-flex justify-space-between align-center">
          <span>部屋リスト</span>
          <VBtn
            color="primary"
            size="small"
            prepend-icon="ri-add-line"
            @click="goToRoomCreate"
          >
            部屋追加
          </VBtn>
        </VCardTitle>

        <VCardText>
          <!-- 방 에러 메시지 -->
          <VAlert
            v-if="roomsError"
            type="error"
            class="mb-6"
          >
            {{ roomsError }}
          </VAlert>

          <!-- 방 로딩 중 -->
          <div
            v-if="roomsLoading"
            class="d-flex justify-center pa-8"
          >
            <VProgressCircular indeterminate />
          </div>

          <!-- 방 목록 테이블 -->
          <div v-else>
            <VTable v-if="rooms.length > 0">
              <thead>
                <tr>
                  <th>部屋番号</th>
                  <th>階数</th>
                  <th>家賃</th>
                  <th v-if="residentType === 'elderly'">
                    管理費
                  </th>
                  <th v-if="residentType === 'elderly'">
                    サービス費
                  </th>
                  <th>定員</th>
                  <th>利用可能</th>
                  <th>メモ</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="room in rooms"
                  :key="room.id"
                >
                  <td>{{ room.room_number }}</td>
                  <td>{{ room.floor || '-' }}</td>
                  <td>{{ room.rent ? `¥${room.rent.toLocaleString()}` : '-' }}</td>
                  <td v-if="residentType === 'elderly'">
                    {{ room.maintenance ? `¥${room.maintenance.toLocaleString()}` : '-' }}
                  </td>
                  <td v-if="residentType === 'elderly'">
                    {{ room.service ? `¥${room.service.toLocaleString()}` : '-' }}
                  </td>
                  <td>{{ room.capacity ? `${room.capacity}` : '-' }}</td>
                  <td>
                    <VChip
                      :color="room.is_available ? 'success' : 'error'"
                      size="small"
                    >
                      {{ room.is_available ? '利用可能' : '利用中' }}
                    </VChip>
                  </td>
                  <td>{{ room.note || '-' }}</td>
                  <td>
                    <VBtn
                      icon
                      variant="text"
                      size="small"
                      color="primary"
                      class="me-2"
                      @click="goToRoomDetail(room.id)"
                    >
                      <VIcon>ri-edit-line</VIcon>
                    </VBtn>
                    <VBtn
                      icon
                      variant="text"
                      size="small"
                      color="error"
                      @click="_handleRoomDelete(room.id)"
                    >
                      <VIcon>ri-delete-bin-line</VIcon>
                    </VBtn>
                  </td>
                </tr>
              </tbody>
            </VTable>

            <!-- 방이 없을 때 -->
            <div
              v-else
              class="text-center pa-8 text-medium-emphasis"
            >
              部屋が登録されていません。
            </div>
          </div>
        </VCardText>
      </VCard>
    </VCol>
  </VRow>
</template>
