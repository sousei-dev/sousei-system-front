<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { elderlyService, type Elderly } from '@/services/elderly'

const router = useRouter()

// 고령자 데이터
const elderlys = ref<Elderly[]>([])
const loading = ref(false)
const error = ref<string | null>(null)

// 검색 필터 상태
const filters = ref({
  name: '',
  name_katakana: '',
  building_name: '',
  room_number: '',
  care_level: '',
  gender: '',
})

// 페이지네이션 상태
const page = ref(1)
const itemsPerPage = ref(10)
const totalItems = ref(0)
const totalPages = ref(0)

// 고령자 목록 조회
const fetchElderlys = async () => {
  try {
    loading.value = true
    error.value = null

    const params = {
      page: page.value,
      page_size: itemsPerPage.value,
      ...filters.value,
    }

    const response = await elderlyService.getElderlys(params)

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

// 거주자 추가 페이지로 이동
const handleAdd = () => {
  router.push('/elderly-create')
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
  { title: '部屋番号', key: 'current_room.room_number', sortable: true, filterable: true },
  { title: '生年月日', key: 'birth_date', sortable: true, filterable: true },
  { title: '性別', key: 'gender', sortable: true, filterable: true },
  { title: '介護度', key: 'care_level' },
  { title: '入居日', key: 'admission_date' },
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

// 날짜 포맷팅
const formatDate = (dateString: string) => {
  const date = new Date(dateString)

  return date.toLocaleDateString('ja-JP')
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
            <h3 class="text-h3">介護施設入居者リスト</h3>
            <div class="d-flex gap-2">
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
                v-model="filters.name_katakana"
                label="カタカナ"
                placeholder="カタカナで検索"
                hide-details
                density="compact"
                prepend-inner-icon="ri-user-line"
                clearable
              />
            </VCol>
            <VCol cols="12" md="3">
              <VTextField
                v-model="filters.building_name"
                label="建物名"
                placeholder="建物名で検索"
                hide-details
                density="compact"
                clearable
                prepend-inner-icon="ri-building-line"
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
          <VDataTable
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
            class="elevation-1"
          >
            <!-- 이름 컬럼 템플릿 -->
            <template #item.name="{ item }">
              <div>
                <div>{{ item.name }}</div>
                <div class="text-caption text-medium-emphasis">{{ item.name_katakana }}</div>
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
              <VBtn
                icon
                variant="text"
                size="small"
                color="info"
                @click="router.push(`/care-facility-meal-record?elderly_id=${item.id}`)"
                class="me-2"
              >
                <VIcon>ri-restaurant-line</VIcon>
              </VBtn>
            </template>
          </VDataTable>
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