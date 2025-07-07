<script setup lang="ts">
import { buildingService, type Building } from '@/services/building'
import { roomService, type Room } from '@/services/room'
import { studentService, type Student } from '@/services/student'
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const router = useRouter()
const route = useRoute()

// 빌딩 데이터
const building = ref<Building | null>(null)
const rooms = ref<Room[]>([])
const tenants = ref<Student[]>([])
const loading = ref(false)
const error = ref<string | null>(null)

// 페이지네이션
const page = ref(1)
const itemsPerPage = ref(10)
const totalItems = ref(0)

// 필터
const filters = ref({
  name: '',
  nationality: '',
  room_id: ''
})

// 빌딩 정보 로드
const fetchBuilding = async () => {
  try {
    const buildingId = route.query.building_id as string
    if (!buildingId) return
    
    const data = await buildingService.getBuilding(buildingId)
    building.value = data
  } catch (err: any) {
    error.value = err.response?.data?.message || '建物の取得に失敗しました。'
  }
}

// 방 목록 로드
const fetchRooms = async () => {
  try {
    const buildingId = route.query.building_id as string
    if (!buildingId) return
    
    const response = await roomService.getRoomsByBuilding(buildingId)
    rooms.value = response.items
  } catch (err: any) {
    error.value = err.response?.data?.message || '部屋リストの取得に失敗しました。'
  }
}

// 입주자 목록 로드
const fetchTenants = async () => {
  try {
    loading.value = true
    error.value = null
    
    const buildingId = route.query.building_id as string
    if (!buildingId) return
    
    // 빌딩의 모든 방 ID
    const roomIds = rooms.value.map(room => room.id)
    
    if (roomIds.length === 0) {
      tenants.value = []
      totalItems.value = 0
      return
    }
    
    // 필터된 방 ID (특정 방이 선택된 경우)
    const filteredRoomIds = filters.value.room_id 
      ? [filters.value.room_id]
      : roomIds
    
    // 각 방별로 학생을 조회하여 합치기
    const allTenants: Student[] = []
    
    for (const roomId of filteredRoomIds) {
      try {
        const response = await studentService.getStudents({
          current_room_id: roomId,
          name: filters.value.name || undefined,
          nationality: filters.value.nationality || undefined,
          page: 1,
          size: 1000 // 충분히 큰 수로 설정
        })
        
        allTenants.push(...response.items)
      } catch (err) {
        console.error(`Failed to fetch students for room ${roomId}:`, err)
      }
    }
    
    // 페이지네이션 적용
    const startIndex = (page.value - 1) * itemsPerPage.value
    const endIndex = startIndex + itemsPerPage.value
    
    tenants.value = allTenants.slice(startIndex, endIndex)
    totalItems.value = allTenants.length
  } catch (err: any) {
    error.value = err.response?.data?.message || '入居者リストの取得に失敗しました。'
  } finally {
    loading.value = false
  }
}

// 필터 변경 감지
watch(filters, () => {
  page.value = 1
  fetchTenants()
}, { deep: true })

// 페이지 변경
const handlePageChange = (newPage: number) => {
  page.value = newPage
  fetchTenants()
}

// 입주자 상세로 이동
const goToTenantDetail = (studentId: string) => {
  router.push(`/student-detail/${studentId}`)
}

// 빌딩 상세로 돌아가기
const goToBuildingDetail = () => {
  const buildingId = route.query.building_id as string
  if (buildingId) {
    router.push(`/building-detail/${buildingId}`)
  } else {
    router.push('/building-list')
  }
}

// 방 옵션
const roomOptions = computed(() => {
  return [
    { title: '全ての部屋', value: '' },
    ...rooms.value.map(room => ({
      title: `${room.room_number}${room.floor ? ` (${room.floor}階)` : ''}`,
      value: room.id
    }))
  ]
})

onMounted(async () => {
  await fetchBuilding()
  await fetchRooms()
  await fetchTenants()
})
</script>

<template>
  <VRow>
    <VCol cols="12">
      <VCard>
        <VCardTitle class="text-h5 pa-4 d-flex justify-space-between align-center">
          <span>入居者管理 - {{ building?.name || '建物' }}</span>
          <VBtn
            color="secondary"
            variant="text"
            @click="goToBuildingDetail"
          >
            建物詳細に戻る
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

          <!-- 검색 필터 -->
          <VRow class="mb-6">
            <VCol cols="12" sm="6" md="4">
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
            <VCol cols="12" sm="6" md="4">
              <VTextField
                v-model="filters.nationality"
                label="国籍"
                placeholder="国籍で検索"
                hide-details
                density="compact"
                prepend-inner-icon="ri-global-line"
                clearable
              />
            </VCol>
            <VCol cols="12" sm="6" md="4">
              <VSelect
                v-model="filters.room_id"
                label="部屋"
                :items="roomOptions"
                hide-details
                density="compact"
                prepend-inner-icon="ri-home-line"
                clearable
              />
            </VCol>
          </VRow>

          <!-- 입주자 목록 테이블 -->
          <VDataTableServer
            v-model:page="page"
            v-model:items-per-page="itemsPerPage"
            :headers="[
              { title: '名前', key: 'name' },
              { title: 'カタカナ', key: 'name_katakana' },
              { title: '国籍', key: 'nationality' },
              { title: '部屋', key: 'room' },
              { title: '電話番号', key: 'phone' },
              { title: '操作', key: 'actions', sortable: false },
            ]"
            :items="tenants"
            :loading="loading"
            :items-length="totalItems"
            :server-items-length="totalItems"
            :items-per-page-options="[5, 10, 25, 50]"
            :show-current-page="true"
            :show-items-per-page="true"
            @update:page="handlePageChange"
            class="elevation-1"
          >
            <!-- 이름 컬럼 템플릿 -->
            <template #[`item.name`]="{ item }">
              <div class="d-flex align-center">
                <VAvatar
                  v-if="item.avatar"
                  :image="item.avatar"
                  size="32"
                  class="me-3"
                />
                <VAvatar
                  v-else
                  size="32"
                  class="me-3"
                >
                  {{ item.name.charAt(0) }}
                </VAvatar>
                <span>{{ item.name }}</span>
              </div>
            </template>

            <!-- 카타카나 컬럼 템플릿 -->
            <template #[`item.name_katakana`]="{ item }">
              <span>{{ item.name_katakana }}</span>
            </template>

            <!-- 국적 컬럼 템플릿 -->
            <template #[`item.nationality`]="{ item }">
              <span>{{ item.nationality }}</span>
            </template>

            <!-- 방 컬럼 템플릿 -->
            <template #[`item.room`]="{ item }">
              <span v-if="item.current_room_id">
                {{ rooms.find(room => room.id === item.current_room_id)?.room_number || '-' }}
              </span>
              <span v-else class="text-medium-emphasis">未入居</span>
            </template>

            <!-- 전화번호 컬럼 템플릿 -->
            <template #[`item.phone`]="{ item }">
              <span>{{ item.phone || '-' }}</span>
            </template>

            <!-- 작업 컬럼 템플릿 -->
            <template #[`item.actions`]="{ item }">
              <VBtn
                icon
                variant="text"
                size="small"
                color="primary"
                @click="goToTenantDetail(item.id)"
              >
                <VIcon>ri-eye-line</VIcon>
              </VBtn>
            </template>
          </VDataTableServer>
        </VCardText>
      </VCard>
    </VCol>
  </VRow>
</template> 
