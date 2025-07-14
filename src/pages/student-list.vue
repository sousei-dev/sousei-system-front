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
  nationality: '',
  name: '',
  name_katakana: '',
  company: '',
  consultant: 0,
  building_name: '',
  room_number: '',
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
    page: route.query.page ? Number(route.query.page) : 1,
    size: route.query.size ? Number(route.query.size) : 10,
    allQueries: route.query
  }
})

// URL 파라미터를 상태에 적용하는 함수
const applyUrlParams = () => {
  // type 파라미터 적용
  if (urlParams.value.type && urlParams.value.type !== filters.value.student_type) {
    filters.value.student_type = urlParams.value.type
  }
  
  // 페이지 파라미터 적용
  if (urlParams.value.page && urlParams.value.page !== page.value) {
    page.value = urlParams.value.page
  }
  
  // 페이지 크기 파라미터 적용
  if (urlParams.value.size && urlParams.value.size !== itemsPerPage.value) {
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
  fetchCompanies()
  fetchStudents()
})

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
    page.value = 1
    fetchStudents()
  }, 300)
}, { deep: true })

// route.query 변경 감지 (URL 파라미터 변경 시)
watch(() => route.query, (newQuery) => {
  console.log('Route query changed:', newQuery)
  applyUrlParams()
  fetchStudents()
}, { deep: true })

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
  { title: '名前', key: 'name' },
  { title: '会社', key: 'company.name' },
  { title: '建物', key: 'building' },
  { title: '相談回数', key: 'consultant' },
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
  router.push({
    path: `/student-detail/${id}`,
    query: tab ? { tab } : undefined,
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
    
    // TODO: 가정 리스트 다운로드 API 호출
    const response = await buildingService.getBuildingDownloadMonthlyInvoice(new Date().getFullYear(), selectedRentMonth.value)
    
    const url = window.URL.createObjectURL(new Blob([response.data]))
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `請求リスト_${new Date().getFullYear()}_${selectedMonth.value}.pdf`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    // 임시로 성공 메시지만 표시
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
  fetchStudents()
}

// 아이템 페이지 변경 이벤트 핸들러
const handleItemsPerPageChange = (newItemsPerPage: number) => {
  itemsPerPage.value = newItemsPerPage
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
              <VTextField
                v-model="filters.consultant"
                label="相談回数"
                placeholder="最小相談回数"
                type="number"
                hide-details
                density="compact"
                clearable
                prepend-inner-icon="ri-customer-service-2-line"
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
                @click="filters = { name: '', name_katakana: '', company: '', consultant: 0, nationality: '', building_name: '', room_number: '', student_type: filters.student_type }"
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
