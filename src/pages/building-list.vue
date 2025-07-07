<script setup lang="ts">
import { buildingService, type Building } from '@/services/building'
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const router = useRouter()
const route = useRoute()

// 검색 필터 상태
const filters = ref({
  name: '',
  address: ''
})

// 빌딩 데이터 상태
const buildings = ref<Building[]>([])
const loading = ref(false)
const error = ref<string | null>(null)

// 페이지네이션 상태
const page = ref(1)
const itemsPerPage = ref(10)
const totalItems = ref(0)
const totalPages = ref(0)

// URL에서 파라미터 추출
const urlParams = computed(() => {
  return {
    page: route.query.page ? Number(route.query.page) : 1,
    size: route.query.size ? Number(route.query.size) : 10,
    allQueries: route.query
  }
})

// URL 파라미터를 상태에 적용하는 함수
const applyUrlParams = () => {
  // 페이지 파라미터 적용
  if (urlParams.value.page && urlParams.value.page !== page.value) {
    page.value = urlParams.value.page
  }
  
  // 페이지 크기 파라미터 적용
  if (urlParams.value.size && urlParams.value.size !== itemsPerPage.value) {
    itemsPerPage.value = urlParams.value.size
  }
}

// 빌딩 목록 조회
const fetchBuildings = async () => {
  try {
    loading.value = true
    error.value = null
    console.log('Fetching buildings with:', { page: page.value, size: itemsPerPage.value, filters: filters.value })
    
    const response = await buildingService.getBuildings({
      ...filters.value,
      page: page.value,
      size: itemsPerPage.value
    })
    
    console.log('API Response:', response)
    
    buildings.value = response.items
    totalItems.value = response.total
    totalPages.value = response.total_pages
    
    console.log('Updated state:', { 
      buildingsCount: buildings.value.length, 
      totalItems: totalItems.value, 
      totalPages: totalPages.value,
      currentPage: page.value 
    })
  } catch (err: any) {
    error.value = err.response?.data?.message || '建物リストの取得に失敗しました。'
  } finally {
    loading.value = false
  }
}

// 컴포넌트 마운트 시 데이터 로드
onMounted(() => {
  applyUrlParams() // URL 파라미터 적용
  fetchBuildings()
})

// route.query 변경 감지 (URL 파라미터 변경 시)
watch(() => route.query, (newQuery) => {
  console.log('Route query changed:', newQuery)
  applyUrlParams()
  fetchBuildings()
}, { deep: true })

// filters 값 변경 감지
watch(filters, () => {
  page.value = 1 // 필터 변경 시 첫 페이지로 이동
  fetchBuildings()
}, { deep: true })

const tableHeaders = [
  { title: '建物名', key: 'name' },
  { title: '住所', key: 'address' },
  { title: '総部屋数', key: 'total_rooms' },
  { title: 'メモ', key: 'note' },
  { title: '操作', key: 'actions', sortable: false },
]

// 빌딩 삭제
const handleDelete = async (id: string) => {
  if (confirm('本当にこの建物を削除しますか？')) {
    try {
      loading.value = true
      error.value = null
      await buildingService.deleteBuilding(id)
      await fetchBuildings()
    } catch (err: any) {
      error.value = err.response?.data?.message || '建物の削除に失敗しました。'
    } finally {
      loading.value = false
    }
  }
}

const handleEdit = (id: string) => {
  router.push(`/building-detail/${id}`)
}

const handleCreate = () => {
  router.push('/building-create')
}

// 페이지 변경 이벤트 핸들러
const handlePageChange = (newPage: number) => {
  page.value = newPage
  fetchBuildings()
}

// 아이템 페이지 변경 이벤트 핸들러
const handleItemsPerPageChange = (newItemsPerPage: number) => {
  itemsPerPage.value = newItemsPerPage
  fetchBuildings()
}

// URL 파라미터 디버깅용 함수
const logUrlParams = () => {
  console.log('Current URL params:', urlParams.value)
  console.log('Route params:', route.params)
  console.log('Route query:', route.query)
  console.log('Current filters:', filters.value)
}
</script>

<template>
  <VRow>
    <VCol cols="12">
      <VCard>
        <VCardText>
          <div class="d-flex justify-space-between align-center mb-6">
            <h3 class="text-h3">建物リスト</h3>
            <div class="d-flex gap-2">
              <VBtn
                color="primary"
                prepend-icon="ri-add-line"
                @click="handleCreate"
              >
                建物追加
              </VBtn>
            </div>
          </div>

          <!-- 검색 필터 -->
          <VRow class="mb-6">
            <VCol cols="12" sm="6" md="4">
              <VTextField
                v-model="filters.name"
                label="建物名"
                placeholder="建物名で検索"
                hide-details
                density="compact"
                prepend-inner-icon="ri-building-line"
                clearable
              />
            </VCol>
            <VCol cols="12" sm="6" md="4">
              <VTextField
                v-model="filters.address"
                label="住所"
                placeholder="住所で検索"
                hide-details
                density="compact"
                prepend-inner-icon="ri-map-pin-line"
                clearable
              />
            </VCol>
            <VCol cols="12" sm="6" md="4">
              <VBtn
                color="error"
                variant="tonal"
                block
                @click="filters = { name: '', address: '' }"
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

          <!-- 빌딩 목록 테이블 -->
          <VDataTableServer
            v-model:page="page"
            v-model:items-per-page="itemsPerPage"
            :headers="tableHeaders"
            :items="buildings"
            :loading="loading"
            :items-length="totalItems"
            :server-items-length="totalItems"
            :items-per-page-options="[5, 10, 25, 50]"
            :show-current-page="true"
            :show-items-per-page="true"
            @update:page="handlePageChange"
            @update:items-per-page="handleItemsPerPageChange"
            class="elevation-1"
          >
            <!-- 주소 컬럼 템플릿 -->
            <template #[`item.address`]="{ item }">
              <span v-if="item.address">{{ item.address }}</span>
              <span v-else class="text-medium-emphasis">-</span>
            </template>

            <!-- 총 방 개수 컬럼 템플릿 -->
            <template #[`item.total_rooms`]="{ item }">
              <span v-if="item.total_rooms">{{ item.total_rooms }}部屋</span>
              <span v-else class="text-medium-emphasis">-</span>
            </template>

            <!-- 메모 컬럼 템플릿 -->
            <template #[`item.note`]="{ item }">
              <span v-if="item.note">{{ item.note }}</span>
              <span v-else class="text-medium-emphasis">-</span>
            </template>

            <!-- 작업 컬럼 템플릿 -->
            <template #[`item.actions`]="{ item }">
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
              <!-- <VBtn
                icon
                variant="text"
                size="small"
                color="error"
                @click="handleDelete(item.id)"
              >
                <VIcon>ri-delete-bin-line</VIcon>
              </VBtn> -->
            </template>
          </VDataTableServer>
        </VCardText>
      </VCard>
    </VCol>
  </VRow>
</template>

<style lang="scss" scoped>
.v-data-table {
  .v-data-table-header {
    background-color: rgb(var(--v-theme-surface));
  }
}
</style>
