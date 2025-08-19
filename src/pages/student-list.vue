<script setup lang="ts">
import { companyService, type Company } from '@/services/company'
import { invoiceService } from '@/services/invoice'
import { buildingService } from '@/services/building'
import { studentService, type Student } from '@/services/student'
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { canAccessStudentType, getCurrentUserPermission } from '@/utils/permissions'
import PermissionGuard from '@/components/PermissionGuard.vue'

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
  student_type: route.query.type as string || '',
  grade: route.query.grade as string || '',
})

// 정렬 상태 (별도 관리)
const sortBy = ref(route.query.sortBy as string || '')
const sortDesc = ref(route.query.sortDesc === 'true')

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
const gradeOptions = [
  { title: '1期生', value: '1期生' },
  { title: '2期生', value: '2期生' },
  { title: '3期生', value: '3期生' },
  { title: '4期生', value: '4期生' },
  { title: '5期生', value: '5期生' },
  { title: '6期生', value: '6期生' },
  { title: '7期生', value: '7期生' },
  { title: '8期生', value: '8期生' },
  { title: '9期生', value: '9期生' },
  { title: '10期生', value: '10期生' },
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
  const currentPermission = getCurrentUserPermission()
  
  // 권한에 따라 기본 타입 설정
  let defaultType = ''
  if (currentPermission === 'manager_specified') {
    defaultType = 'SPECIFIED'
  } else if (currentPermission === 'manager_general') {
    defaultType = 'GENERAL'
  }
  
  return {
    type: route.query.type as string || defaultType,
    page: route.query.page ? Number(route.query.page) : undefined,
    size: route.query.size ? Number(route.query.size) : undefined,
    allQueries: route.query
  }
})

// URL 파라미터를 상태에 적용하는 함수
const applyUrlParams = () => {
  const currentPermission = getCurrentUserPermission()
  
  // 검색 필터 파라미터 적용 (URL에 값이 없으면 빈 문자열로 설정)
  filters.value.nationality = (urlParams.value.allQueries.nationality as string) || ''
  filters.value.name = (urlParams.value.allQueries.name as string) || ''
  filters.value.name_katakana = (urlParams.value.allQueries.name_katakana as string) || ''
  filters.value.company = (urlParams.value.allQueries.company as string) || ''
  filters.value.status = (urlParams.value.allQueries.status as string) || ''
  filters.value.building_name = (urlParams.value.allQueries.building_name as string) || ''
  filters.value.grade = (urlParams.value.allQueries.grade as string) || ''

  // type 파라미터 적용 (권한에 따라 제한)
  let studentType = urlParams.value.type || ''
  
  // 권한에 따라 학생 타입 제한
  if (currentPermission === 'manager_specified') {
    studentType = 'SPECIFIED'
  } else if (currentPermission === 'manager_general') {
    studentType = 'GENERAL'
  }
  
  filters.value.student_type = studentType
  
  // 정렬 파라미터 적용
  sortBy.value = (urlParams.value.allQueries.sortBy as string) || ''
  sortDesc.value = (urlParams.value.allQueries.sortDesc as string) === 'true'
  
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
      size: itemsPerPage.value,
      sort_by: sortBy.value,
      sort_desc: sortDesc.value
    } as any)
    
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
    error.value = err.response?.data?.message || '技能生リストの取得に失敗しました。'
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
  
  if (newFilters.grade) query.grade = newFilters.grade
  else delete query.grade
  
  // 정렬 파라미터 처리
  if (newFilters.sort_by) {
    query.sortBy = newFilters.sort_by
    query.sortDesc = newFilters.sort_desc.toString()
  } else {
    delete query.sortBy
    delete query.sortDesc
  }
  
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
  
  // 정렬 상태도 동기화
  if (newQuery.sortBy) {
    sortBy.value = newQuery.sortBy as string
    sortDesc.value = newQuery.sortDesc === 'true'
  } else {
    sortBy.value = ''
    sortDesc.value = false
  }
  
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
  { title: '国籍', key: 'nationality', sortable: true, filterable: true },
  { title: '期生', key: 'grade.name', sortable: true, filterable: true },
  { title: '名前', key: 'name', sortable: false, filterable: true },
  { title: '会社', key: 'company.name', sortable: false, filterable: true },
  { title: '建物', key: 'building', sortable: false, filterable: true },
  { title: '状態', key: 'status', sortable: false, filterable: false },
  { title: '操作', key: 'actions', sortable: false, filterable: false },
]

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
  if (filters.value.student_type) query.type = filters.value.student_type
  if (filters.value.grade) query.grade = filters.value.grade
  if (page.value > 1) query.page = page.value.toString()
  if (itemsPerPage.value !== 10) query.size = itemsPerPage.value.toString()
  
  router.push({
    path: `/student-detail/${id}`,
    query: Object.keys(query).length > 0 ? query : undefined,
  })
}

// 학생 생성 페이지로 이동 (권한에 따라 타입 제한)
const handleCreateStudent = () => {
  const currentPermission = getCurrentUserPermission()
  const query: any = {}
  
  // 권한에 따라 학생 타입 제한
  if (currentPermission === 'manager_specified') {
    query.type = 'SPECIFIED'
  } else if (currentPermission === 'manager_general') {
    query.type = 'GENERAL'
  }
  
  // 현재 검색 필터 정보 전달
  if (filters.value.nationality) query.nationality = filters.value.nationality
  if (filters.value.name) query.name = filters.value.name
  if (filters.value.name_katakana) query.name_katakana = filters.value.name_katakana
  if (filters.value.company) query.company = filters.value.company
  if (filters.value.status) query.status = filters.value.status
  if (filters.value.building_name) query.building_name = filters.value.building_name
  if (filters.value.grade) query.grade = filters.value.grade
  if (page.value > 1) query.page = page.value.toString()
  if (itemsPerPage.value !== 10) query.size = itemsPerPage.value.toString()
  
  router.push({
    path: '/student-create',
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
const invoiceNote = ref('')
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
    const response = await invoiceService.getCompanyInvoicePdfV2(selectedCompany.value, new Date().getFullYear(), selectedMonth.value, invoiceNote.value, filters.value.student_type)
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
    invoiceNote.value = '' // 비고 초기화
    alert('請求書が正常に発行されました。')
  } catch (err: any) {
    error.value = err.response?.data?.message || '請求書の発行に失敗しました。'
  } finally {
    loading.value = false
  }
}

const handleDownloadExcel = async () => {
  try {
    loading.value = true
    error.value = null
    const response = await invoiceService.getCompanyInvoiceExcel(new Date().getFullYear(), selectedMonth.value, selectedCompany.value, filters.value.student_type)
    
    const url = window.URL.createObjectURL(new Blob([response.data]))
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `管理費用請求書_${new Date().getFullYear()}_${selectedMonth.value}.xlsx`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  } catch (err: any) {
    console.log(err.response?.data)
    
    // blob 데이터인 경우 텍스트로 변환해서 에러 메시지 추출
    if (err.response?.data instanceof Blob) {
      const reader = new FileReader()
      reader.onload = () => {
        try {
          const errorText = reader.result as string
          // JSON 파싱 시도
          const errorData = JSON.parse(errorText)
          if (errorData.detail) {
            error.value = errorData.detail
          } else if (errorData.message) {
            error.value = errorData.message
          } else {
            error.value = errorText
          }
        } catch (parseError) {
          // JSON 파싱 실패 시 텍스트 그대로 사용
          error.value = errorText
        }
      }
      reader.readAsText(err.response.data)
    } else if (err.response?.data?.detail) {
      error.value = err.response.data.detail
    } else if (err.response?.data?.message) {
      error.value = err.response.data.message
    } else if (err.message) {
      error.value = err.message
    } else {
      error.value = 'EXCELのダウンロードに失敗しました。'
    }
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
  
  // URL 업데이트 (검색 필터와 정렬 상태 유지)
  const query = { ...route.query }
  query.page = newPage.toString()
  
  // 정렬 상태도 URL에 포함
  if (sortBy.value) {
    query.sortBy = sortBy.value
    query.sortDesc = sortDesc.value.toString()
  }
  
  router.replace({ query })
  
  fetchStudents()
}

// 아이템 페이지 변경 이벤트 핸들러
const handleItemsPerPageChange = (newItemsPerPage: number) => {
  itemsPerPage.value = newItemsPerPage
  
  // URL 업데이트 (검색 필터와 정렬 상태 유지)
  const query = { ...route.query }
  query.size = newItemsPerPage.toString()
  query.page = '1' // 페이지 크기 변경 시 첫 페이지로 리셋
  
  // 정렬 상태도 URL에 포함
  if (sortBy.value) {
    query.sortBy = sortBy.value
    query.sortDesc = sortDesc.value.toString()
  }
  
  router.replace({ query })
  
  fetchStudents()
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
  fetchStudents()
}
// 페이지 제목 계산
const pageTitle = computed(() => {
  const type = urlParams.value.type
  const currentPermission = getCurrentUserPermission()
  
  // 권한에 따라 제목 결정
  if (currentPermission === 'manager_specified') {
    return '特定技能実習生リスト'
  } else if (currentPermission === 'manager_general') {
    return '技能実習生リスト'
  } else if (type === 'SPECIFIED') {
    return '特定技能実習生リスト'
  } else if (type === 'GENERAL') {
    return '技能実習生リスト'
  }
  return '全員リスト'
})

// 권한에 따라 접근 가능한 학생 타입 제한
const allowedStudentTypes = computed(() => {
  const currentPermission = getCurrentUserPermission()
  
  if (currentPermission === 'manager_specified') {
    return ['SPECIFIED']
  } else if (currentPermission === 'manager_general') {
    return ['GENERAL']
  }
  
  return ['SPECIFIED', 'GENERAL']
})

// 권한에 따라 학생 타입 필터 강제 적용
const enforceStudentTypeFilter = () => {
  const currentPermission = getCurrentUserPermission()
  
  if (currentPermission === 'manager_specified') {
    // 特定技能 관리자는 SPECIFIED만 접근 가능
    if (filters.value.student_type !== 'SPECIFIED') {
      filters.value.student_type = 'SPECIFIED'
      // URL도 업데이트
      const query = { ...route.query, type: 'SPECIFIED' }
      router.replace({ query })
    }
  } else if (currentPermission === 'manager_general') {
    // 技能実習 관리자는 GENERAL만 접근 가능
    if (filters.value.student_type !== 'GENERAL') {
      filters.value.student_type = 'GENERAL'
      // URL도 업데이트
      const query = { ...route.query, type: 'GENERAL' }
      router.replace({ query })
    }
  }
}
</script>

<template>
  <VRow>
    <VCol cols="12">
      <VCard>
        <VCardText>
          <div class="d-flex justify-space-between align-center mb-6">
            <h3 class="text-h3">{{ pageTitle }}</h3>
            <div class="d-flex gap-2">
              <PermissionGuard feature="billing_management">
                <VBtn
                  v-if="filters.student_type !== 'ALL'"
                  color="primary"
                  prepend-icon="ri-add-line"
                  @click="openInvoiceModal"
                >
                  受入請求書発行
                </VBtn>
              </PermissionGuard>
              
              <PermissionGuard feature="student_management">
                <VBtn
                  color="primary"
                  prepend-icon="ri-add-line"
                  @click="handleCreateStudent"
                >
                  技能生追加
                </VBtn>
              </PermissionGuard>
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
              <VSelect
                v-model="filters.grade"
                :items="gradeOptions"
                item-title="title"
                item-value="value"
                label="期生"
                hide-details
                density="compact"
                clearable
                prepend-inner-icon="ri-calendar-line"
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
              <VBtn
                color="error"
                variant="tonal"
                block
                @click="() => {
                  const currentPermission = getCurrentUserPermission()
                  let studentType = filters.student_type
                  
                  // 권한에 따라 학생 타입 제한
                  if (currentPermission === 'manager_specified') {
                    studentType = 'SPECIFIED'
                  } else if (currentPermission === 'manager_general') {
                    studentType = 'GENERAL'
                  }
                  
                  filters = { name: '', name_katakana: '', company: '', status: '', nationality: '', building_name: '', student_type: studentType, grade: '' }
                  sortBy = ''
                  sortDesc = false
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
            :show-select="false"
            :show-expand="false"
            :show-group-by="false"
            :show-column-select="true"
            :show-density="true"
            :show-sort="true"
            :show-filter="true"
            @update:page="handlePageChange"
            @update:items-per-page="handleItemsPerPageChange"
            @update:sort-by="handleSortChange"
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
          <VCol cols="12">
            <VTextarea
              v-model="invoiceNote"
              label="備考"
              rows="3"
              placeholder="請求書に関する備考を入力してください"
              hide-details
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
          :disabled="!selectedCompany"
        >
          発行
        </VBtn>
        <VBtn
          color="primary"
          :loading="loading"
          @click="handleDownloadExcel"
          :disabled="!selectedCompany"
        >
          EXCELダウンロード
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
