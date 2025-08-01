<script setup lang="ts">
import { companyService, type Company } from '@/services/company'
import { invoiceService } from '@/services/invoice'
import { buildingService } from '@/services/building'
import { studentService, type Student } from '@/services/student'
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const router = useRouter()
const route = useRoute()

// 검색 필터 상태
const filters = ref({
  nationality: route.query.nationality as string || '',
  name: route.query.name as string || '',
  name_katakana: route.query.name_katakana as string || '',
  company: route.query.company as string || '',
  status: route.query.status as string || '',
  building_name: route.query.building_name as string || '',
  room_number: route.query.room_number as string || '',
  student_type: route.query.type as string || ''
})

// 디바운스된 검색 필터
const debouncedFilters = ref({ ...filters.value })

// 학생 데이터 상태
const students = ref<Student[]>([])
const companies = ref<Company[]>([])
const nationalityOptions = [
  { title: '🇲🇲 ミャンマー', value: 'ミャンマー' },
  { title: '🇻🇳 ベトナム', value: 'ベトナム' },
  { title: '🇰🇷 韓国', value: '韓国' },
  { title: '🇰🇭 カンボジア', value: 'カンボジア' },
]
const statusOptions = [
  { title: '在留中', value: 'ACTIVE' },
  { title: '退職', value: 'RESIGNED' },
]
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
    type: route.query.type as string || '',
    page: route.query.page ? Number(route.query.page) : undefined,
    size: route.query.size ? Number(route.query.size) : undefined,
    allQueries: route.query
  }
})

// URL 파라미터를 상태에 적용하는 함수
const applyUrlParams = () => {
  // 검색 필터 파라미터 적용 (URL에 값이 없으면 빈 문자열로 설정)
  filters.value.nationality = (urlParams.value.allQueries.nationality as string) || ''
  filters.value.name = (urlParams.value.allQueries.name as string) || ''
  filters.value.name_katakana = (urlParams.value.allQueries.name_katakana as string) || ''
  filters.value.company = (urlParams.value.allQueries.company as string) || ''
  filters.value.status = (urlParams.value.allQueries.status as string) || ''
  filters.value.building_name = (urlParams.value.allQueries.building_name as string) || ''
  filters.value.room_number = (urlParams.value.allQueries.room_number as string) || ''
  
  // type 파라미터 적용
  filters.value.student_type = urlParams.value.type || ''
  
  // 페이지 파라미터 적용 (URL에 값이 있을 때만 number로 변환해서 업데이트)
  if (urlParams.value.page !== undefined) {
    page.value = urlParams.value.page
  }
  
  // 페이지 크기 파라미터 적용 (URL에 값이 있을 때만 number로 변환해서 업데이트)
  if (urlParams.value.size !== undefined) {
    itemsPerPage.value = urlParams.value.size
  }
}

// 회사 목록 조회
const fetchCompanies = async () => {
  try {
    companies.value = await companyService.getCompanies()
  } catch (err: any) {
    error.value = err.response?.data?.message || '会社リストの取得に失敗しました。'
  }
}

// 학생 목록 조회
const fetchStudents = async () => {
  try {
    loading.value = true
    error.value = null
    console.log('Fetching students with:', { page: page.value, size: itemsPerPage.value, filters: debouncedFilters.value })
    
    const response = await studentService.getStudents({
      ...debouncedFilters.value,
      page: page.value,
      size: itemsPerPage.value
    })
    
    console.log('API Response:', response)
    
    students.value = response.items
    totalItems.value = response.total
    totalPages.value = response.total_pages
    
    console.log('Updated state:', { 
      studentsCount: students.value.length, 
      totalItems: totalItems.value, 
      totalPages: totalPages.value,
      currentPage: page.value 
    })
  } catch (err: any) {
    error.value = err.response?.data?.message || '学生リストの取得に失敗しました。'
  } finally {
    loading.value = false
  }
}

// 컴포넌트 마운트 시 데이터 로드
onMounted(() => {
  applyUrlParams() // URL 파라미터 적용
  debouncedFilters.value = { ...filters.value } // debouncedFilters도 동기화
  fetchCompanies()
  // fetchStudents() 호출 제거
})

// URL 업데이트 함수
const updateUrlWithFilters = (newFilters: any, resetPage: boolean = true) => {
  const query = { ...route.query }
  
  // 검색 필터를 URL 쿼리에 추가
  if (newFilters.nationality) query.nationality = newFilters.nationality
  else delete query.nationality
  
  if (newFilters.name) query.name = newFilters.name
  else delete query.name
  
  if (newFilters.name_katakana) query.name_katakana = newFilters.name_katakana
  else delete query.name_katakana
  
  if (newFilters.company) query.company = newFilters.company
  else delete query.company
  
  if (newFilters.status) query.status = newFilters.status
  else delete query.status
  
  if (newFilters.building_name) query.building_name = newFilters.building_name
  else delete query.building_name
  
  if (newFilters.room_number) query.room_number = newFilters.room_number
  else delete query.room_number
  
  // 페이지 처리
  if (resetPage || page.value === 1) {
    delete query.page
  } else {
    query.page = page.value.toString()
  }
  
  // URL 업데이트
  router.replace({ query })
}

// 디바운스된 검색 필터 변경 감지
let searchTimeout: NodeJS.Timeout | null = null
watch(filters, (newFilters) => {
  // 이전 타이머가 있으면 취소
  if (searchTimeout) {
    clearTimeout(searchTimeout)
  }
  
  // 300ms 후에 검색 실행
  searchTimeout = setTimeout(() => {
    debouncedFilters.value = { ...newFilters }
    // 검색 필터 변경 시에는 페이지를 리셋하지 않음
    updateUrlWithFilters(newFilters, false)
    fetchStudents()
  }, 300)
}, { deep: true })

// route.query 변경 감지 (URL 파라미터 변경 시)
watch(() => route.query, (newQuery) => {
  console.log('Route query changed:', newQuery)
  applyUrlParams()
  debouncedFilters.value = { ...filters.value } // debouncedFilters도 동기화
  fetchStudents()
}, { deep: true, immediate: true })

// 회사 옵션
const companyOptions = computed(() => {
  return companies.value.map(company => company.name)
})

const nationalityFlags: Record<string, string> = {
  'ミャンマー': '🇲🇲',
  'ベトナム': '🇻🇳',
  '韓国': '🇰🇷',
  'カンボジア': '🇰🇭',
}

const tableHeaders = [
  { title: '国籍', key: 'nationality' },
  { title: '期生', key: 'grade.name' },
  { title: '名前', key: 'name' },
  { title: '会社', key: 'company.name' },
  { title: '建物', key: 'building' },
  { title: '状態', key: 'status' },
  { title: '操作', key: 'actions', sortable: false },
]

// 학생 삭제
const handleDelete = async (id: string) => {
  if (confirm('本当にこの学生を削除しますか？')) {
    try {
      loading.value = true
      error.value = null
      await studentService.deleteStudent(id)
      await fetchStudents()
    } catch (err: any) {
      error.value = err.response?.data?.message || '学生の削除に失敗しました。'
    } finally {
      loading.value = false
    }
  }
}

const handleEdit = (id: string, tab: string = '') => {
  // 현재 페이지 정보를 포함한 쿼리 생성
  const query: any = {}
  
  if (tab) {
    query.tab = tab
  }
  
  // 현재 검색 필터와 페이지 정보를 전달
  if (filters.value.nationality) query.nationality = filters.value.nationality
  if (filters.value.name) query.name = filters.value.name
  if (filters.value.name_katakana) query.name_katakana = filters.value.name_katakana
  if (filters.value.company) query.company = filters.value.company
  if (filters.value.status) query.status = filters.value.status
  if (filters.value.building_name) query.building_name = filters.value.building_name
  if (filters.value.room_number) query.room_number = filters.value.room_number
  if (filters.value.student_type) query.type = filters.value.student_type
  if (page.value > 1) query.page = page.value.toString()
  if (itemsPerPage.value !== 10) query.size = itemsPerPage.value.toString()
  
  router.push({
    path: `/student-detail/${id}`,
    query: Object.keys(query).length > 0 ? query : undefined,
  })
}

const openInvoiceModal = () => {
  showInvoiceModal.value = true
}

const openRentListModal = () => {
  showRentListModal.value = true
}

// 청구서 발행 모달 관련 상태
const showInvoiceModal = ref(false)
const selectedMonth = ref(new Date().getMonth() + 1) // 현재 월
const selectedCompany = ref('')
const monthOptions = Array.from({ length: 12 }, (_, i) => ({
  title: `${i + 1}月`,
  value: i + 1,
}))

// 가정 리스트 다운로드 모달 관련 상태
const showRentListModal = ref(false)
const selectedRentMonth = ref(new Date().getMonth() + 1) // 현재 월
const rentMonthOptions = Array.from({ length: 12 }, (_, i) => ({
  title: `${i + 1}月`,
  value: i + 1,
}))

// 청구서 발행 함수
const handleCreateInvoices = async () => {
  try {
    loading.value = true
    error.value = null
    
    const response = await invoiceService.getCompanyInvoicePdf(selectedCompany.value, new Date().getFullYear(), selectedMonth.value)    
    // PDF 다운로드
    const url = window.URL.createObjectURL(new Blob([response.data]))
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `${selectedCompany.value}_請求書_${new Date().getFullYear()}_${selectedMonth.value}.pdf`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    // 성공 처리
    showInvoiceModal.value = false
    alert('請求書が正常に発行されました。')
  } catch (err: any) {
    error.value = err.response?.data?.message || '請求書の発行に失敗しました。'
  } finally {
    loading.value = false
  }
}

// 가정 리스트 다운로드 함수
const handleDownloadRentList = async () => {
  try {
    loading.value = true
    error.value = null
    
    // 먼저 검증 수행
    const validationResponse = await buildingService.getBuildingDownloadMonthlyInvoiceValidate(new Date().getFullYear(), selectedRentMonth.value)
    
    // 검증 결과 확인
    console.log(validationResponse)
    if (!validationResponse.is_valid) {
      let errorMessage = '選択された月の家賃リストデータに光熱費が含まれていません。確認してください。'
      
      // missing_rooms가 있는 경우 상세 정보 추가
      if (validationResponse.missing_rooms && validationResponse.missing_rooms.length > 0) {
        const missingRoomNumbers = validationResponse.missing_rooms.map(room => room.room_number).join(', ')
        errorMessage += `\n\n不足している部屋番号: ${missingRoomNumbers}`
      }
      
      error.value = errorMessage
      return
    }
    
    // 검증 통과 시 다운로드 수행
    const response = await buildingService.getBuildingDownloadMonthlyInvoice(new Date().getFullYear(), selectedRentMonth.value)
    
    const url = window.URL.createObjectURL(new Blob([response.data]))
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `請求リスト_${new Date().getFullYear()}_${selectedRentMonth.value}.pdf`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    showRentListModal.value = false
    alert('家賃リストが正常にダウンロードされました。')
  } catch (err: any) {
    error.value = err.response?.data?.message || '家賃リストのダウンロードに失敗しました。'
  } finally {
    loading.value = false
  }
}

// 페이지 변경 이벤트 핸들러
const handlePageChange = (newPage: number) => {
  page.value = newPage
  
  // URL 업데이트 (검색 필터 유지)
  const query = { ...route.query }
  query.page = newPage.toString()
  router.replace({ query })
  
  fetchStudents()
}

// 아이템 페이지 변경 이벤트 핸들러
const handleItemsPerPageChange = (newItemsPerPage: number) => {
  itemsPerPage.value = newItemsPerPage
  
  // URL 업데이트
  const query = { ...route.query }
  query.size = newItemsPerPage.toString()
  query.page = '1' // 페이지 크기 변경 시 첫 페이지로 리셋
  router.replace({ query })
  
  fetchStudents()
}
// 페이지 제목 계산
const pageTitle = computed(() => {
  const type = urlParams.value.type
  if (type === 'specified') {
    return '特定技能実習生リスト'
  } else if (type === 'general') {
    return '技能実習生リスト'
  }
  return '全員リスト'
})
</script>

<template>
  <VRow>
    <VCol cols="12">
      <VCard>
        <VCardText>
          <div class="d-flex justify-space-between align-center mb-6">
            <h3 class="text-h3">{{ pageTitle }}</h3>
            <div class="d-flex gap-2">
              <VBtn
                color="primary"
                prepend-icon="ri-add-line"
                @click="openInvoiceModal()"
                disabled
              >
                受入請求書発行
              </VBtn>
              <VBtn
                color="primary"
                prepend-icon="ri-add-line"
                @click="openRentListModal"
              >
                家賃リストダウンロード
              </VBtn>
              <VBtn
                color="primary"
                prepend-icon="ri-add-line"
                @click="router.push('/student-create')"
              >
                学生追加
              </VBtn>
            </div>
          </div>

          <!-- 검색 필터 -->
          <VRow class="mb-6">
            <VCol cols="12" sm="6" md="3">
              <VSelect
                v-model="filters.nationality"
                :items="nationalityOptions"
                item-title="title"
                item-value="value"
                label="国籍"
                hide-details
                density="compact"
                clearable
                prepend-inner-icon="ri-flag-line"
              />
            </VCol>
            <VCol cols="12" sm="6" md="3">
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
            <VCol cols="12" sm="6" md="3">
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
            <VCol cols="12" sm="6" md="3">
              <VSelect
                v-model="filters.company"
                label="会社"
                :items="companyOptions"
                hide-details
                density="compact"
                clearable
                prepend-inner-icon="ri-building-line"
              />
            </VCol>

            <VCol cols="12" sm="6" md="3">
              <VSelect
                v-model="filters.status"
                label="状態"
                placeholder="状態で検索"
                hide-details
                density="compact"
                clearable
                prepend-inner-icon="ri-checkbox-line"
                :items="statusOptions"
                item-title="title"
                item-value="value"
              />
            </VCol>
            <VCol cols="12" sm="6" md="3">
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
            <VCol cols="12" sm="6" md="3">
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
            <VCol cols="12" sm="6" md="3">
              <VBtn
                color="error"
                variant="tonal"
                block
                @click="() => {
                  filters = { name: '', name_katakana: '', company: '', status: '', nationality: '', building_name: '', room_number: '', student_type: filters.student_type }
                  updateUrlWithFilters(filters, true)
                }"
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


          <!-- 학생 목록 테이블 -->
          <VDataTableServer
            v-model:page="page"
            v-model:items-per-page="itemsPerPage"
            :headers="tableHeaders"
            :items="students"
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
            <!-- 국적 컬럼 템플릿 -->
            <template #[`item.nationality`]="{ item }">
              {{ nationalityFlags[item.nationality] || '' }} {{ item.nationality }}
            </template>

            <!-- 이름 컬럼 템플릿 -->
            <template #[`item.name`]="{ item }">
              <div>
                <div>{{ item.name }}</div>
                <div class="text-caption text-medium-emphasis">{{ item.name_katakana }}</div>
              </div>
            </template>

            <!-- 빌딩 컬럼 템플릿 -->
            <template #[`item.building`]="{ item }">
              <div>
                <div>{{ item.current_room?.building_name || '-' }}</div>
                <div class="text-caption text-medium-emphasis">{{ item.current_room?.room_number || '-' }}</div>
              </div>
            </template>

            <!-- 상태 컬럼 템플릿 -->
            <template #[`item.status`]="{ item }">
              <VChip
                :color="item.status === 'ACTIVE' ? 'success' : 'error'"
                size="small"
                variant="tonal"
              >
                {{ item.status === 'ACTIVE' ? '在留中' : item.status === 'RESIGNED' ? '退職' : item.status }}
              </VChip>
            </template>

            <!-- 작업 컬럼 템플릿 -->
            <template #[`item.actions`]="{ item }">
              <VBtn
                icon
                variant="text"
                size="small"
                color="primary"
                @click="handleEdit(item.id, 'account')"
                class="me-2"
              >
                <VIcon>ri-edit-line</VIcon>
              </VBtn>
              <VBtn
                icon
                variant="text"
                size="small"
                color="primary"
                @click="handleEdit(item.id, 'bill')"
                class="me-2"
              >
                <VIcon>ri-bank-card-line</VIcon>
              </VBtn>
            </template>
          </VDataTableServer>
        </VCardText>
      </VCard>
    </VCol>
  </VRow>
  
  <!-- 청구서 발행 모달 -->
  <VDialog
    v-model="showInvoiceModal"
    max-width="500px"
  >
    <VCard>
      <VCardTitle class="text-h5 pa-4">
        請求書一括発行
      </VCardTitle>

      <VCardText>
        <VRow>
          <VCol cols="12">
            <VSelect
              v-model="selectedMonth"
              :items="monthOptions"
              item-title="title"
              item-value="value"
              label="請求月"
              hide-details
              class="mb-4"
            />
          </VCol>
          <VCol cols="12">
            <VSelect
              v-model="selectedCompany"
              :items="companies"
              item-title="name"
              item-value="id"
              label="会社"
              hide-details
              class="mb-4"
            />
          </VCol>
        </VRow>
      </VCardText>

      <VCardActions class="pa-4">
        <VSpacer />
        <VBtn
          color="error"
          variant="text"
          @click="showInvoiceModal = false"
        >
          キャンセル
        </VBtn>
        <VBtn
          color="primary"
          :loading="loading"
          @click="handleCreateInvoices"
        >
          発行
        </VBtn>
      </VCardActions>
    </VCard>
  </VDialog>

  <!-- 가정 리스트 다운로드 모달 -->
  <VDialog
    v-model="showRentListModal"
    max-width="400px"
  >
    <VCard>
      <VCardTitle class="text-h5 pa-4">
        家賃リストダウンロード
      </VCardTitle>

      <VCardText>
        <VRow>
          <VCol cols="12">
            <VSelect
              v-model="selectedRentMonth"
              :items="rentMonthOptions"
              item-title="title"
              item-value="value"
              label="対象月"
              hide-details
              class="mb-4"
            />
          </VCol>
        </VRow>
      </VCardText>

      <VCardActions class="pa-4">
        <VSpacer />
        <VBtn
          color="error"
          variant="text"
          @click="showRentListModal = false"
        >
          キャンセル
        </VBtn>
        <VBtn
          color="primary"
          :loading="loading"
          @click="handleDownloadRentList"
        >
          ダウンロード
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
</style>
