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
const showDischargeDialog = ref(false)
const selectedElderly = ref<Elderly | null>(null)
const selectedRecord = ref<ElderlyHospitalizationResponse | null>(null)

const showContactDialog = ref(false)
const imageInput = ref<HTMLInputElement>()
const contactTab = ref<'create' | 'list'>('create')
const showCommentsDialog = ref(false)
const selectedContactForComments = ref<any>(null)

// 연락 목록 데이터
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
  const params = buildingId.value ? { building_id: buildingId.value } : {}
  router.push({
    path: `/elderly-detail/${id}`,
    query: params,
  })
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

// 페이지 제목
const pageTitle = computed(() => {
  return '介護施設入居者リスト'
})

// 건물 이름 가져오기
const getBuildingName = (item: Elderly) => {
  return (item.current_room as any)?.building?.name || '-'
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
            <template #[`item.name`]="{ item }">
              <div>
                <div>{{ item.name }}</div>
                <div class="text-caption text-medium-emphasis">{{ item.name_katakana }}</div>
              </div>
            </template>

            <!-- 건물명 컬럼 템플릿 -->
            <template #[`item.current_room.building.name`]="{ item }">
              <div>
                <div>{{ getBuildingName(item) }}</div>
              </div>
            </template>

            <template #[`item.current_room`]="{ item }">
              <div>
                <div>{{ item.current_room?.room_number || '-' }}</div>
              </div>
            </template>

            <!-- 요양 등급 컬럼 템플릿 -->
            <template #[`item.care_level`]="{ item }">
              <VChip
                :color="getCareLevelColor(item.care_level)"
                size="small"
                variant="tonal"
              >
                {{ item.care_level }}
              </VChip>
            </template>

            <!-- 입원 상태 컬럼 템플릿 -->
            <template #[`item.hospitalization_status`]="{ item }">
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

/* 연락 항목 스타일 */
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