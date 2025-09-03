<script lang="ts" setup>
import { buildingService, type Building } from '@/services/building'
import { companyService, type Company } from '@/services/company'
import { invoiceService, type Invoice } from '@/services/invoice'
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import * as XLSX from 'xlsx'
import { getCurrentUserPermission } from '@/utils/permissions'

const router = useRouter()
const route = useRoute()

// 상태 관리
const loading = ref(false)
const error = ref<string | null>(null)
const companies = ref<Company[]>([])
const buildings = ref<Building[]>([])
const selectedYear = ref(new Date().getFullYear())
const selectedMonth = ref(new Date().getMonth() + 1)
const selectedCompany = ref<Company | null>(null)
const selectedBuilding = ref<Building | null>(null)
const companyInvoices = ref<Invoice[]>([])
const billingType = ref<'company' | 'building'>('company') // 기본값: 회사 기준

// 권한 체크
const checkPermission = () => {
  const currentPermission = getCurrentUserPermission()
  
  if (currentPermission === 'manager_specified') {
    // 特定技能 관리자는 /special-student-list만 접근 가능
    router.replace({
      path: '/unauthorized',
      query: { 
        requiredPermission: 'manager_specified',
        currentPermission,
        from: route.path,
        message: '特定技能管理者は/special-student-listページのみアクセス可能です。',
      },
    })

    return false
  }
  
  return true
}

// 년도 옵션 (현재 년도 기준 전후 2년)
const yearOptions = computed(() => {
  const currentYear = new Date().getFullYear()

  return Array.from({ length: 5 }, (_, i) => currentYear - 2 + i)
})

// 월 옵션
const monthOptions = Array.from({ length: 12 }, (_, i) => ({ title: i + 1 + '月の請求書', value: i + 1 }))

// 청구 기준 옵션
const billingTypeOptions = [
  { title: '会社基準', value: 'company' },
  { title: '建物基準', value: 'building', },
]

// 회사 목록 조회
const fetchCompanies = async () => {
  try {
    loading.value = true
    error.value = null

    const response = await companyService.getCompanies()

    companies.value = response
  }
  catch (err: any) {
    error.value = err.response?.data?.message || '会社リストの取得に失敗しました。'
  }
  finally {
    loading.value = false
  }
}

// 건물 목록 조회
const fetchBuildings = async () => {
  try {
    loading.value = true
    error.value = null

    const response = await buildingService.getBuildings({ resident_type: 'student' })

    buildings.value = response.items
  }
  catch (err: any) {
    error.value = err.response?.data?.message || '建物リストの取得に失敗しました。'
  }
  finally {
    loading.value = false
  }
}

// API 응답 타입 정의
interface Utility {
  utility_type: string
  period_start: string
  period_end: string
  total_amount: number
  student_days: number
  total_person_days: number
  student_amount: number
}

interface StudentBilling {
  student_id: string
  student_name: string
  room_number: string
  building_name: string
  company_name: string // 회사명 필드 추가
  student_type: string
  grade_name: string
  days_in_month: number
  rent_amount: number
  wifi_amount: number
  management_fee: number // 관리비 필드 추가
  has_utilities: boolean
  utilities: Utility[]
  electricity_amount: number
  water_amount: number
  gas_amount: number
  total_utilities_amount: number
  rent_management_wifi_total: number
  utilities_total: number
  total_amount: number
}

interface MonthlyInvoiceResponse {
  year: number
  month: number
  billing_period: string
  total_students: number
  students: StudentBilling[]
  summary: {
    total_utilities_amount: number
    total_electricity_amount: number
    total_water_amount: number
    total_gas_amount: number
    total_rent_amount: number
    total_wifi_amount: number
    total_management_fee: number // 관리비 합계 추가
    grand_total: number
  }
}

// 회사 기준 청구서 조회
const fetchCompanyInvoices = async (companyId: string) => {
  try {
    loading.value = true
    error.value = null

    const response = await buildingService.getMonthlyInvoicePreviewCompany(
      selectedYear.value,
      selectedMonth.value,
      companyId || '',
    ) as unknown as MonthlyInvoiceResponse

    // API 응답을 기존 Invoice 형식으로 변환
    companyInvoices.value = response.students.map(student => {
      // 광열비 항목들 계산
      const utilities = student.has_utilities && student.utilities.length > 0 
        ? student.utilities.map((utility, index) => ({
          name: utility.utility_type === 'electricity' 
            ? '電気代' 
            : utility.utility_type === 'water' 
              ? '水道代' 
              : utility.utility_type === 'gas' 
                ? 'ガス代' 
                : '光熱費',
          unit_price: utility.utility_type === 'electricity' 
            ? student.electricity_amount 
            : utility.utility_type === 'water' 
              ? student.water_amount 
              : utility.utility_type === 'gas' 
                ? student.gas_amount 
                : 0,
          quantity: 1,
          sort_order: 3 + index,
          amount: utility.utility_type === 'electricity' 
            ? student.electricity_amount 
            : utility.utility_type === 'water' 
              ? student.water_amount 
              : utility.utility_type === 'gas' 
                ? student.gas_amount 
                : 0,
          memo: `${response.month}月分`,
          type: utility.utility_type,
        }))
        : []

      // 총 금액 계산 (월세 + WiFi + 관리비 + 광열비)
      const rentAmount = student.rent_amount || 0
      const wifiAmount = student.wifi_amount || 0
      const managementFee = student.management_fee || 0
      const utilitiesAmount = utilities.reduce((sum, utility) => sum + utility.amount, 0)
      const calculatedTotal = rentAmount + wifiAmount + managementFee + utilitiesAmount

      return {
        id: student.student_id,
        student_id: student.student_id,
        student_name: student.student_name,
        room_number: student.room_number,
        building_name: student.building_name,
        company_name: student.company_name, // 회사명 추가
        student_type: student.student_type,
        grade_name: student.grade_name,
        year: response.year,
        month: response.month,
        items: [
          {
            name: '家賃',
            unit_price: student.rent_amount,
            quantity: 1,
            sort_order: 1,
            amount: student.rent_amount,
            memo: `${response.month}月分`,
            type: 'rent',
          },
          {
            name: 'WiFi代',
            unit_price: student.wifi_amount,
            quantity: 1,
            sort_order: 2,
            amount: student.wifi_amount,
            memo: `${response.month}月分`,
            type: 'wifi',
          },
          {
            name: '管理費',
            unit_price: student.management_fee,
            quantity: 1,
            sort_order: 3,
            amount: student.management_fee,
            memo: `${response.month}月分`,
            type: 'management_fee',
          },
          ...utilities,
        ],
        payment_status: 'ACTIVE',
        is_data: true,
        total_amount: calculatedTotal, // 계산된 총 금액 사용
        days_in_month: student.days_in_month,
      }
    })

    // 요약 행 추가
    if (response.summary) {
      companyInvoices.value.push({
        id: 'summary',
        student_id: '',
        year: response.year,
        month: response.month,
        items: [
          {
            name: '家賃',
            unit_price: response.summary.total_rent_amount,
            quantity: 1,
            sort_order: 1,
            amount: response.summary.total_rent_amount,
            memo: `${response.month}月分`,
            type: 'rent',
          },
          {
            name: 'WiFi代',
            unit_price: response.summary.total_wifi_amount,
            quantity: 1,
            sort_order: 2,
            amount: response.summary.total_wifi_amount,
            memo: `${response.month}月分`,
            type: 'wifi',
          },
          {
            name: '管理費',
            unit_price: response.summary.total_management_fee,
            quantity: 1,
            sort_order: 3,
            amount: response.summary.total_management_fee,
            memo: `${response.month}月分`,
            type: 'management_fee',
          },
          {
            name: '電気代',
            unit_price: response.summary.total_electricity_amount,
            quantity: 1,
            sort_order: 4,
            amount: response.summary.total_electricity_amount,
            memo: `${response.month}月分`,
            type: 'electricity',
          },
          {
            name: '水道代',
            unit_price: response.summary.total_water_amount,
            quantity: 1,
            sort_order: 5,
            amount: response.summary.total_water_amount,
            memo: `${response.month}月分`,
            type: 'water',
          },
          {
            name: 'ガス代',
            unit_price: response.summary.total_gas_amount,
            quantity: 1,
            sort_order: 6,
            amount: response.summary.total_gas_amount,
            memo: `${response.month}月分`,
            type: 'gas',
          },
        ],
        total_amount: response.summary.grand_total,
        payment_status: 'ACTIVE',
        is_data: true,
      } as any)
    }
  }
  catch (err: any) {
    error.value = err.response?.data?.message || '請求書の取得に失敗しました。'
  }
  finally {
    loading.value = false
  }
}

// 건물 기준 청구서 조회
const fetchBuildingInvoices = async (buildingId: string) => {
  try {
    loading.value = true
    error.value = null

    const response = await buildingService.getMonthlyInvoicePreviewBuilding(
      selectedYear.value,
      selectedMonth.value,
      buildingId,
    ) as unknown as MonthlyInvoiceResponse

    // 동일한 변환 로직 사용
    companyInvoices.value = response.students.map(student => {
      // 광열비 항목들 계산
      const utilities = student.has_utilities && student.utilities.length > 0 
        ? student.utilities.map((utility, index) => ({
          name: utility.utility_type === 'electricity' 
            ? '電気代' 
            : utility.utility_type === 'water' 
              ? '水道代' 
              : utility.utility_type === 'gas' 
                ? 'ガス代' 
                : '光熱費',
          unit_price: utility.utility_type === 'electricity' 
            ? student.electricity_amount 
            : utility.utility_type === 'water' 
              ? student.water_amount 
              : utility.utility_type === 'gas' 
                ? student.gas_amount 
                : 0,
          quantity: 1,
          sort_order: 3 + index,
          amount: utility.utility_type === 'electricity' 
            ? student.electricity_amount 
            : utility.utility_type === 'water' 
              ? student.water_amount 
              : utility.utility_type === 'gas' 
                ? student.gas_amount 
                : 0,
          memo: `${response.month}月分`,
          type: utility.utility_type,
        }))
        : []

      // 총 금액 계산 (월세 + WiFi + 관리비 + 광열비)
      const rentAmount = student.rent_amount || 0
      const wifiAmount = student.wifi_amount || 0
      const managementFee = student.management_fee || 0
      const utilitiesAmount = utilities.reduce((sum, utility) => sum + utility.amount, 0)
      const calculatedTotal = rentAmount + wifiAmount + managementFee + utilitiesAmount

      return {
        id: student.student_id,
        student_id: student.student_id,
        student_name: student.student_name,
        room_number: student.room_number,
        building_name: student.building_name,
        company_name: student.company_name, // 회사명 추가
        student_type: student.student_type,
        grade_name: student.grade_name,
        year: response.year,
        month: response.month,
        items: [
          {
            name: '家賃',
            unit_price: student.rent_amount,
            quantity: 1,
            sort_order: 1,
            amount: student.rent_amount,
            memo: `${response.month}月分`,
            type: 'rent',
          },
          {
            name: 'WiFi代',
            unit_price: student.wifi_amount,
            quantity: 1,
            sort_order: 2,
            amount: student.wifi_amount,
            memo: `${response.month}月分`,
            type: 'wifi',
          },
          {
            name: '管理費',
            unit_price: student.management_fee,
            quantity: 1,
            sort_order: 3,
            amount: student.management_fee,
            memo: `${response.month}月分`,
            type: 'management_fee',
          },
          ...utilities,
        ],
        payment_status: 'ACTIVE',
        is_data: true,
        total_amount: calculatedTotal, // 계산된 총 금액 사용
        days_in_month: student.days_in_month,
      }
    })

    // 요약 행 추가
    if (response.summary) {
      companyInvoices.value.push({
        id: 'summary',
        student_id: '',
        year: response.year,
        month: response.month,
        items: [
          {
            name: '家賃',
            unit_price: response.summary.total_rent_amount,
            quantity: 1,
            sort_order: 1,
            amount: response.summary.total_rent_amount,
            memo: `${response.month}月分`,
            type: 'rent',
          },
          {
            name: 'WiFi代',
            unit_price: response.summary.total_wifi_amount,
            quantity: 1,
            sort_order: 2,
            amount: response.summary.total_wifi_amount,
            memo: `${response.month}月分`,
            type: 'wifi',
          },
          {
            name: '管理費',
            unit_price: response.summary.total_management_fee,
            quantity: 1,
            sort_order: 3,
            amount: response.summary.total_management_fee,
            memo: `${response.month}月分`,
            type: 'management_fee',
          },
          {
            name: '電気代',
            unit_price: response.summary.total_electricity_amount,
            quantity: 1,
            sort_order: 4,
            amount: response.summary.total_electricity_amount,
            memo: `${response.month}月分`,
            type: 'electricity',
          },
          {
            name: '水道代',
            unit_price: response.summary.total_water_amount,
            quantity: 1,
            sort_order: 5,
            amount: response.summary.total_water_amount,
            memo: `${response.month}月分`,
            type: 'water',
          },
          {
            name: 'ガス代',
            unit_price: response.summary.total_gas_amount,
            quantity: 1,
            sort_order: 6,
            amount: response.summary.total_gas_amount,
            memo: `${response.month}月分`,
            type: 'gas',
          },
        ],
        total_amount: response.summary.grand_total,
        payment_status: 'ACTIVE',
        is_data: true,
      } as any)
    }
  }
  catch (err: any) {
    error.value = err.response?.data?.message || '請求書の取得に失敗しました。'
  }
  finally {
    loading.value = false
  }
}

// 회사 선택 처리
const handleCompanySelect = async (companyId: string) => {
  if (!companyId) {
    selectedCompany.value = null
    companyInvoices.value = []

    return
  }
  
  const company = companies.value.find(c => c.id === companyId)

  selectedCompany.value = company || null
  await fetchCompanyInvoices(companyId)
}

// 건물 선택 처리
const handleBuildingSelect = async (buildingId: string) => {
  if (!buildingId) {
    selectedBuilding.value = null
    companyInvoices.value = []

    return
  }
  
  const building = buildings.value.find(b => b.id === buildingId)

  selectedBuilding.value = building || null
  await fetchBuildingInvoices(buildingId)
}

// 청구 기준 변경 처리
const handleBillingTypeChange = () => {
  selectedCompany.value = null
  selectedBuilding.value = null
  companyInvoices.value = []
}

// 년도/월 변경 시 초기화
const handleYearMonthChange = () => {
  selectedCompany.value = null
  selectedBuilding.value = null
  companyInvoices.value = []
}

// 금액 포맷팅
const formatAmount = (amount: number) => {
  return new Intl.NumberFormat('ja-JP').format(Math.floor(amount))
}

// 청구서 PDF 다운로드
const _downloadInvoicePdf = async (invoiceId: string) => {
  try {
    const response = await invoiceService.getInvoicePdf(invoiceId)
    const blob = new Blob([response.data], { type: 'application/pdf' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')

    link.href = url
    link.download = `invoice-${invoiceId}.pdf`
    link.click()
    window.URL.revokeObjectURL(url)
  }
  catch (err: any) {
    error.value = err.response?.data?.message || 'PDFのダウンロードに失敗しました。'
  }
}

// 청구서 작성 페이지로 이동
const goToCreateInvoice = (id: string) => {
  console.log('청구서 작성 페이지로 이동:', id)
}

// EXCEL 다운로드
const downloadExcel = async () => {
  try {
    if (!companyInvoices.value || companyInvoices.value.length === 0) {
      error.value = 'ダウンロードするデータがありません。'

      return
    }

    // 엑셀 데이터 준비
    const excelData = companyInvoices.value.map((invoice: any) => {
      if (invoice.id === 'summary') 
        return null
      
      return {
        名前: invoice.student_name || '',
        部屋番号: invoice.room_number || '',
        在留資格: invoice.student_type === 'SPECIFIED' 
          ? '特定技能' 
          : invoice.student_type === 'GENERAL' 
            ? '技能実習' 
            : invoice.student_type || '',
        等級: invoice.grade_name || '',
        建物名: invoice.building_name || '',
        会社名: invoice.company_name || '', // 회사명 컬럼 추가
        家賃: invoice.items.find((item: any) => item.type === 'rent')?.amount || 0,
        WiFi代: invoice.items.find((item: any) => item.type === 'wifi')?.amount || 0,
        管理費: invoice.items.find((item: any) => item.type === 'management_fee')?.amount || 0,
        家賃合計: (invoice.items.find((item: any) => item.type === 'rent')?.amount || 0) 
          + (invoice.items.find((item: any) => item.type === 'wifi')?.amount || 0)
          + (invoice.items.find((item: any) => item.type === 'management_fee')?.amount || 0),
        電気代: invoice.items.find((item: any) => item.type === 'electricity')?.amount || 0,
        水道代: invoice.items.find((item: any) => item.type === 'water')?.amount || 0,
        ガス代: invoice.items.find((item: any) => item.type === 'gas')?.amount || 0,
        光熱費合計: (invoice.items.find((item: any) => item.type === 'electricity')?.amount || 0) 
          + (invoice.items.find((item: any) => item.type === 'water')?.amount || 0) 
          + (invoice.items.find((item: any) => item.type === 'gas')?.amount || 0),
        合計金額: invoice.total_amount || 0,
      }
    }).filter(Boolean)

    // 워크북 생성
    const workbook = XLSX.utils.book_new()
    const worksheet = XLSX.utils.json_to_sheet(excelData)
    
    // 컬럼 너비 자동 조정
    const columnWidths = [
      { wch: 15 }, // 이름
      { wch: 10 }, // 방번호
      { wch: 12 }, // 재류자격
      { wch: 10 }, // 등급
      { wch: 15 }, // 빌딩명
      { wch: 15 }, // 회사명
      { wch: 12 }, // 월세
      { wch: 12 }, // WiFi료
      { wch: 12 }, // 관리비
      { wch: 12 }, // 월세+WiFi+관리비
      { wch: 12 }, // 전기료
      { wch: 12 }, // 수도료
      { wch: 12 }, // 가스료
      { wch: 12 }, // 광열비 합계
      { wch: 15 }, // 총 금액
    ]

    worksheet['!cols'] = columnWidths

    // 워크시트를 워크북에 추가
    XLSX.utils.book_append_sheet(workbook, worksheet, `${selectedYear.value}年${selectedMonth.value}月請求書`)

    // 파일명 생성
    const targetName = billingType.value === 'company' 
      ? selectedCompany.value?.name 
      : selectedBuilding.value?.name

    const fileName = `${selectedYear.value}年${selectedMonth.value}月_${targetName || '請求書'}.xlsx`

    // 엑셀 파일 다운로드
    XLSX.writeFile(workbook, fileName)

    console.log('엑셀 다운로드 완료:', fileName)
  } 
  catch (err: any) {
    console.error('엑셀 다운로드 오류:', err)
    error.value = 'EXCELダウンロード中にエラーが発生しました。'
  }
}

// 선택된 대상 정보
const selectedTarget = computed(() => {
  if (billingType.value === 'company') 
    return selectedCompany.value
  else 
    return selectedBuilding.value
})

// 월의 마지막 날 계산
const getLastDayOfMonth = (year: number, month: number) => {
  return new Date(year, month, 0).getDate()
}

onMounted(() => {
  if (!checkPermission()) 
    return
  
  fetchCompanies()
  fetchBuildings()
})

// 청구서 PDF 다운로드 (회사 기준만)
const downloadInvoicePdf = async () => {
  try {
    if (!selectedCompany.value) {
      error.value = 'PDFをダウンロードする会社を選択してください。'
      return
    }

    loading.value = true
    error.value = null

    const response = await buildingService.downloadMonthlyInvoicePdfCompany(
      selectedYear.value,
      selectedMonth.value,
      selectedCompany.value.id
    )

    // PDF 파일 다운로드
    const blob = new Blob([response.data], { type: 'application/pdf' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')

    link.href = url
    link.download = `${selectedYear.value}年${selectedMonth.value}月_${selectedCompany.value.name}_請求書.pdf`
    link.click()
    window.URL.revokeObjectURL(url)

    console.log('PDF 다운로드 완료')
  }
  catch (err: any) {
    console.error('PDF 다운로드 오류:', err)
    error.value = err.response?.data?.message || 'PDFのダウンロードに失敗しました。'
  }
  finally {
    loading.value = false
  }
}

</script>

<template>
  <div>
    <!-- 에러 메시지 -->
    <VAlert
      v-if="error"
      type="error"
      variant="tonal"
      class="mb-4"
    >
      {{ error }}
    </VAlert>

    <!-- 헤더 -->
    <VCard class="mb-6">
      <VCardTitle class="text-h5">
        <VIcon class="me-2">ri-file-list-line</VIcon>
        請求書管理
      </VCardTitle>
      
      <VCardText>
        <VRow>
          <!-- 년도 선택 -->
          <VCol cols="12" md="2">
            <VSelect
              v-model="selectedYear"
              :items="yearOptions"
              label="年"
              variant="outlined"
              @update:model-value="handleYearMonthChange"
            />
          </VCol>
          
          <!-- 월 선택 -->
          <VCol cols="12" md="2">
            <VSelect
              v-model="selectedMonth"
              :items="monthOptions"
              item-title="title"
              item-value="value"
              label="月"
              variant="outlined"
              @update:model-value="handleYearMonthChange"
            />
          </VCol>

          <!-- 청구 기준 선택 -->
          <VCol cols="12" md="3">
            <VSelect
              v-model="billingType"
              :items="billingTypeOptions"
              label="請求基準"
              variant="outlined"
              @update:model-value="handleBillingTypeChange"
            />
          </VCol>
          
          <!-- 회사 선택 (회사 기준일 때만) -->
          <VCol v-if="billingType === 'company'" cols="12" md="5">
            <VSelect
              v-model="selectedCompany"
              :items="companies"
              item-title="name"
              item-value="id"
              label="会社"
              placeholder="会社を選択してください"
              variant="outlined"
              clearable
              @update:model-value="handleCompanySelect"
            />
          </VCol>

          <!-- 건물 선택 (건물 기준일 때만) -->
          <VCol v-if="billingType === 'building'" cols="12" md="5">
            <VSelect
              v-model="selectedBuilding"
              :items="buildings"
              item-title="name"
              item-value="id"
              label="建物"
              placeholder="建物を選択してください"
              variant="outlined"
              clearable
              @update:model-value="handleBuildingSelect"
            />
          </VCol>
        </VRow>
      </VCardText>
    </VCard>

    <!-- 선택된 대상의 청구서 리스트 -->
    <VCard v-if="selectedTarget">
      <VCardTitle class="text-h6 d-flex align-center justify-space-between">
        <div class="d-flex align-center">
          <VIcon class="me-2">ri-file-text-line</VIcon>
          {{ selectedYear }}年{{ selectedMonth }}月 請求書一覧 
          <VChip class="ms-2" color="primary" size="small">
            {{ billingType === 'company' ? '会社基準' : '建物基準' }}
          </VChip>
        </div>
        <div class="d-flex align-center">
          <!-- PDF 다운로드 버튼 (회사 기준일 때만 표시) -->
          <VBtn
            v-if="billingType === 'company'"
            color="info"
            prepend-icon="ri-file-pdf-line"
            class="me-2"
            @click="downloadInvoicePdf"
          >
            PDFダウンロード
          </VBtn>
          <VBtn
            color="success"
            prepend-icon="ri-file-excel-line"
            class="me-2"
            @click="downloadExcel"
          >
            EXCELダウンロード
          </VBtn>
          <VBtn
            color="primary"
            prepend-icon="ri-add-line"
            @click="goToCreateInvoice(selectedTarget.id || '')"
            disabled
          >
            請求書作成
          </VBtn>
        </div>
      </VCardTitle>
      
      <!-- 계산 기준 정보 -->
      <VCardText class="pb-0">
        <VAlert
          type="info"
          variant="tonal"
          class="mb-4"
        >
          <template #title>
            {{ selectedYear }}年{{ selectedMonth }}月 計算基準
          </template>
          <div class="mt-2">
            <div class="text-body-2 mb-1">
              <strong>家賃（月額）・WiFi代:</strong>
            </div>
            <ul class="text-body-2 mb-2">
              <li>一般: {{ selectedYear }}年{{ selectedMonth - 1 }}月1日 ～ {{ selectedYear }}年{{ selectedMonth - 1 }}月{{ getLastDayOfMonth(selectedYear, selectedMonth - 1) }}日</li>
              <li class="text-warning font-weight-bold">技能実習2期生: {{ selectedYear }}年{{ selectedMonth + 1 }}月1日 ～ {{ selectedYear }}年{{ selectedMonth + 1 }}月{{ getLastDayOfMonth(selectedYear, selectedMonth + 1) }}日</li>
              <li class="text-success font-weight-bold">技能実習3期生: {{ selectedYear }}年{{ selectedMonth }}月1日 ～ {{ selectedYear }}年{{ selectedMonth }}月{{ getLastDayOfMonth(selectedYear, selectedMonth) }}日</li>
            </ul>
            <div class="text-body-2">
              <strong>光熱費:</strong> {{ selectedYear }}年{{ selectedMonth }}月分として登録された基準で計算
            </div>
          </div>
        </VAlert>
      </VCardText>
      
      <VCardText>
        <VDataTable
          :headers="[
            { title: '名前', key: 'student_name' },
            { title: '部屋番号', key: 'room_number' },
            { title: '在留資格', key: 'student_type' },
            { title: '等級', key: 'grade_name' },
            {
              title: billingType === 'company' ? '建物名' : '会社名',
              key: billingType === 'company' ? 'building_name' : 'company_name',
            },
            { title: '家賃', key: 'rent_amount' },
            { title: '管理費', key: 'management_fee' },
            { title: 'WiFi代', key: 'wifi_amount' },
            { title: '家賃合計', key: 'rent_management_wifi_total' },
            { 
              title: '光熱費',
              key: 'utilities',
              align: 'center',
              children: [
                { title: '電気代', key: 'electricity_amount' },
                { title: '水道代', key: 'water_amount' },
                { title: 'ガス代', key: 'gas_amount' },
              ],
            },
            { title: '光熱費合計', key: 'utilities_total' },
            { title: '合計金額', key: 'total_amount' },
          ]"
          :items="companyInvoices"
          :loading="loading"
          :items-per-page="-1"
          :items-per-page-options="[-1]"
          class="elevation-1 custom-table"
        >
          <!-- 학생명 컬럼 -->
          <template #[`item.student_name`]="{ item }">
            {{ item.student_name }}
          </template>

          <!-- 방번호 컬럼 -->
          <template #[`item.room_number`]="{ item }">
            {{ item.room_number }}
          </template>

          <!-- 재류자격 컬럼 -->
          <template #[`item.student_type`]="{ item }">
            <VChip
              v-if="item.student_type"
              :color="item.student_type === 'SPECIFIED' ? 'primary' : 'secondary'"
              size="small"
              variant="tonal"
            >
              {{ item.student_type === 'SPECIFIED' ? '特定技能' : item.student_type === 'GENERAL' ? '技能実習' : item.student_type }}
            </VChip>
          </template>

          <!-- 등급 컬럼 -->
          <template #[`item.grade_name`]="{ item }">
            <div v-if="item.student_type === 'GENERAL' && item.grade_name?.includes('2期') || item.grade_name?.includes('3期')" class="d-flex align-center">
              <VChip
                :color="item.grade_name?.includes('2期') ? 'warning' : item.grade_name?.includes('3期') ? 'success' : 'default'"
                size="small"
                variant="tonal"
                class="me-1"
              >
                {{ item.grade_name?.includes('2期') ? '2期生' : item.grade_name?.includes('3期') ? '3期生' : '' }}
              </VChip>
            </div>
            <div v-else>
              {{ item.grade_name }}
            </div>
          </template>

          <!-- 건물명/회사명 컬럼 (기준에 따라 다르게 표시) -->
          <template #[`item.building_name`]="{ item }">
            {{ billingType === 'company' ? item.building_name : item.company_name }}
          </template>

          <!-- 월세 컬럼 -->
          <template #[`item.rent_amount`]="{ item }">
            ¥{{ formatAmount(item.items.find(i => i.type === 'rent')?.amount || 0) }}
          </template>

          <!-- WiFi료 컬럼 -->
          <template #[`item.wifi_amount`]="{ item }">
            ¥{{ formatAmount(item.items.find(i => i.type === 'wifi')?.amount || 0) }}
          </template>

          <!-- 관리비 컬럼 -->
          <template #[`item.management_fee`]="{ item }">
            ¥{{ formatAmount(item.items.find(i => i.type === 'management_fee')?.amount || 0) }}
          </template>

          <!-- 월세+WiFi+관리비 컬럼 -->
          <template #[`item.rent_management_wifi_total`]="{ item }">
            ¥{{ formatAmount((item.items.find(i => i.type === 'rent')?.amount || 0) + (item.items.find(i => i.type === 'wifi')?.amount || 0) + (item.items.find(i => i.type === 'management_fee')?.amount || 0)) }}
          </template>

          <!-- 전기료 컬럼 -->
          <template #[`item.electricity_amount`]="{ item }">
            ¥{{ formatAmount(item.items.find(i => i.type === 'electricity')?.amount || 0) }}
          </template>

          <!-- 수도료 컬럼 -->
          <template #[`item.water_amount`]="{ item }">
            ¥{{ formatAmount(item.items.find(i => i.type === 'water')?.amount || 0) }}
          </template>

          <!-- 가스료 컬럼 -->
          <template #[`item.gas_amount`]="{ item }">
            ¥{{ formatAmount(item.items.find(i => i.type === 'gas')?.amount || 0) }}
          </template>

          <!-- 광열비 합계 컬럼 -->
          <template #[`item.utilities_total`]="{ item }">
            ¥{{ formatAmount((item.items.find(i => i.type === 'electricity')?.amount || 0) + (item.items.find(i => i.type === 'water')?.amount || 0) + (item.items.find(i => i.type === 'gas')?.amount || 0)) }}
          </template>

          <!-- 총 금액 컬럼 -->
          <template #[`item.total_amount`]="{ item }">
            ¥{{ formatAmount(item.total_amount) }}
          </template>
        </VDataTable>

        <!-- 청구서가 없을 때 -->
        <VAlert
          v-if="companyInvoices.length === 0 && !loading"
          type="info"
          class="mt-4"
        >
          {{ selectedYear }}年{{ selectedMonth }}月の請求書がありません。
        </VAlert>
      </VCardText>
    </VCard>

    <!-- 대상을 선택하지 않았을 때 안내 -->
    <VCard v-else class="text-center pa-8">
      <VIcon size="64" color="medium-emphasis" class="mb-4">
        {{ billingType === 'company' ? 'ri-building-line' : 'ri-home-line' }}
      </VIcon>
      <h3 class="text-h5 mb-2">
        {{ billingType === 'company' ? '会社を選択してください' : '建物を選択してください' }}
      </h3>
      <p class="text-body-1 text-medium-emphasis">
        {{ billingType === 'company' 
          ? '上記の会社選択から請求書を確認したい会社を選択してください。' 
          : '上記の建物選択から請求書を確認したい建物を選択してください。' 
        }}
      </p>
    </VCard>
  </div>
</template>

<style scoped>
/* 헤더 높이 조정 */
.custom-table table__td {
  height: 25px;
}

/* 푸터 완전 숨기기 */
.custom-table .v-data-table-footer {
  display: none !important;
}
</style>

