<script lang="ts" setup>
import { buildingService } from '@/services/building'
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
const selectedYear = ref(new Date().getFullYear())
const selectedMonth = ref(new Date().getMonth() + 1)
const selectedCompany = ref<Company | null>(null)
const companyInvoices = ref<Invoice[]>([])

// 권한 체크
const checkPermission = () => {
  const currentPermission = getCurrentUserPermission()
  
  if (currentPermission === 'manager_specified') {
    // 特定技能 관리자는 /special-student-list만 접근 가능
    router.replace({
      path: '/unauthorized',
      query: { 
        requiredPermission: 'manager_specified',
        currentPermission: currentPermission,
        from: route.path,
        message: '特定技能管理者は/special-student-listページのみアクセス可能です。'
      }
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
const monthOptions = Array.from({ length: 12 }, (_, i) => i + 1)

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
  student_type: string
  grade_name: string
  days_in_month: number
  rent_amount: number
  wifi_amount: number
  has_utilities: boolean
  utilities: Utility[]
  electricity_amount: number
  water_amount: number
  gas_amount: number
  total_utilities_amount: number
  rent_wifi_total: number
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
    grand_total: number
  }
}

// 선택된 회사의 청구서 조회
const fetchCompanyInvoices = async (companyId: string) => {
  try {
    loading.value = true
    error.value = null

    const response = await buildingService.getMonthlyInvoicePreview(
      selectedYear.value,
      selectedMonth.value,
      companyId || '',
    ) as unknown as MonthlyInvoiceResponse

    // API 응답을 기존 Invoice 형식으로 변환
    companyInvoices.value = response.students.map(student => ({
      id: student.student_id,
      student_id: student.student_id,
      student_name: student.student_name,
      room_number: student.room_number,
      building_name: student.building_name,
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
          type: 'rent'
        },
        ...(student.has_utilities && student.utilities.length > 0 
          ? student.utilities.map((utility, index) => ({
            name: utility.utility_type === 'electricity' ? '電気代' : 
                  utility.utility_type === 'water' ? '水道代' : 
                  utility.utility_type === 'gas' ? 'ガス代' : '光熱費',
            unit_price: utility.utility_type === 'electricity' ? student.electricity_amount :
                        utility.utility_type === 'water' ? student.water_amount :
                        utility.utility_type === 'gas' ? student.gas_amount : 0,
            quantity: 1,
            sort_order: 2 + index,
            amount: utility.utility_type === 'electricity' ? student.electricity_amount :
                    utility.utility_type === 'water' ? student.water_amount :
                    utility.utility_type === 'gas' ? student.gas_amount : 0,
            memo: `${response.month}月分`,
            type: utility.utility_type,
          }))
          : []
        ),
        {
          name: 'WiFi代',
          unit_price: student.wifi_amount,
          quantity: 1,
          sort_order: 2 + (student.utilities?.length || 0),
          amount: student.wifi_amount,
          memo: `${response.month}月分`,
          type: 'wifi'
        }
      ],
      payment_status: 'ACTIVE', // 기본값
      is_data: true,
      total_amount: student.total_amount,
      days_in_month: student.days_in_month
    }))

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
            type: 'rent'
          },
          {
            name: '電気代',
            unit_price: response.summary.total_electricity_amount,
            quantity: 1,
            sort_order: 2,
            amount: response.summary.total_electricity_amount,
            memo: `${response.month}月分`,
            type: 'electricity'
          },
          {
            name: '水道代',
            unit_price: response.summary.total_water_amount,
            quantity: 1,
            sort_order: 2,
            amount: response.summary.total_water_amount,
            memo: `${response.month}月分`,
            type: 'water'
          },
          {
            name: 'ガス代',
            unit_price: response.summary.total_gas_amount,
            quantity: 1,
            sort_order: 2,
            amount: response.summary.total_gas_amount,
            memo: `${response.month}月分`,
            type: 'gas'
          },
          {
            name: 'WiFi代',
            unit_price: response.summary.total_wifi_amount,
            quantity: 1,
            sort_order: 3,
            amount: response.summary.total_wifi_amount,
            memo: `${response.month}月分`,
            type: 'wifi'
          },
        ],
        total_amount: response.summary.grand_total,
        payment_status: 'ACTIVE',
        is_data: true
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

// 드롭다운에서 회사 선택 처리
const handleCompanySelectFromDropdown = async (companyId: string) => {
  if (!companyId) {
    selectedCompany.value = null
    companyInvoices.value = []
    return
  }
  
  selectedCompany.value = companyId
  await fetchCompanyInvoices(selectedCompany.value || '')
}

// 년도/월 변경 시 회사 초기화
const handleYearMonthChange = () => {
  selectedCompany.value = null
  companyInvoices.value = []
}

// 청구서 상태에 따른 색상 반환
const getStatusColor = (status: string) => {
  switch (status) {
    case 'ACTIVE':
      return 'warning'
    case 'SAVED':
      return 'success'
    case 'OVERDUE':
      return 'error'
    default:
      return 'primary'
  }
}

// 청구서 상태에 따른 텍스트 반환
const getStatusText = (status: string) => {
  switch (status) {
    case 'ACTIVE':
      return '未保存'
    case 'SAVED':
      return '保存完了'
    case 'OVERDUE':
      return '延滞'
    default:
      return status
  }
}

// 금액 포맷팅
const formatAmount = (amount: number) => {
  return new Intl.NumberFormat('ja-JP').format(Math.floor(amount))
}

// 총 금액 계산
const calculateTotalAmount = (invoice: Invoice) => {
  return invoice.items.reduce((sum, item) => sum + item.amount, 0)
}

// 청구서 PDF 다운로드
const downloadInvoicePdf = async (invoiceId: string) => {
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
const goToCreateInvoice = (buildingId: string) => {
  // 실제 라우터 이동 로직으로 변경
  console.log('청구서 작성 페이지로 이동:', buildingId)
}

// EXCEL 다운로드
const downloadExcel = async (companyId: string) => {
  try {
    if (!companyInvoices.value || companyInvoices.value.length === 0) {
      error.value = '다운로드할 데이터가 없습니다.'
      return
    }

    // 엑셀 데이터 준비
    const excelData = companyInvoices.value.map((invoice: any) => {
      // 요약 행은 건너뛰기
      if (invoice.id === 'summary') return null
      
      return {
        '名前': invoice.student_name || '',
        '部屋番号': invoice.room_number || '',
        '在留資格': invoice.student_type === 'SPECIFIED' ? '特定技能' : 
                   invoice.student_type === 'GENERAL' ? '技能実習' : 
                   invoice.student_type || '',
        '等級': invoice.grade_name || '',
        '建物名': invoice.building_name || '',
        '家賃': invoice.items.find((item: any) => item.type === 'rent')?.amount || 0,
        'WiFi代': invoice.items.find((item: any) => item.type === 'wifi')?.amount || 0,
        '家賃合計': (invoice.items.find((item: any) => item.type === 'rent')?.amount || 0) + 
                   (invoice.items.find((item: any) => item.type === 'wifi')?.amount || 0),
        '電気代': invoice.items.find((item: any) => item.type === 'electricity')?.amount || 0,
        '水道代': invoice.items.find((item: any) => item.type === 'water')?.amount || 0,
        'ガス代': invoice.items.find((item: any) => item.type === 'gas')?.amount || 0,
        '光熱費合計': (invoice.items.find((item: any) => item.type === 'electricity')?.amount || 0) + 
                     (invoice.items.find((item: any) => item.type === 'water')?.amount || 0) + 
                     (invoice.items.find((item: any) => item.type === 'gas')?.amount || 0),
        '合計金額': invoice.total_amount || 0
      }
    }).filter(Boolean) // null 값 제거

    // 워크북 생성
    const workbook = XLSX.utils.book_new()
    
    // 워크시트 생성
    const worksheet = XLSX.utils.json_to_sheet(excelData)
    
    // 컬럼 너비 자동 조정
    const columnWidths = [
      { wch: 15 }, // 이름
      { wch: 10 }, // 방번호
      { wch: 12 }, // 재류자격
      { wch: 10 }, // 등급
      { wch: 15 }, // 빌딩명
      { wch: 12 }, // 월세
      { wch: 12 }, // WiFi료
      { wch: 12 }, // 월세+WiFi
      { wch: 12 }, // 전기료
      { wch: 12 }, // 수도료
      { wch: 12 }, // 가스료
      { wch: 12 }, // 광열비 합계
      { wch: 15 }  // 총 금액
    ]
    worksheet['!cols'] = columnWidths

    // 헤더 행 추가 (광열비 병합 + 세부 분리)
    const headerRow = [
      '名前', '部屋番号', '在留資格', '等級', '建物名', '家賃', 'WiFi代', '家賃合計',
      '光熱費', '光熱費', '光熱費', '光熱費合計', '合計金額'
    ]
    
    const subHeaderRow = [
      '名前', '部屋番号', '在留資格', '等級', '建物名', '家賃', 'WiFi代', '家賃合計',
      '電気代', '水道代', 'ガス代', '', ''
    ]

    // 헤더 행들을 워크시트에 추가
    XLSX.utils.sheet_add_aoa(worksheet, [headerRow, subHeaderRow], { origin: 'A1' })
    
    // 데이터를 헤더 아래로 이동 (2차원 배열로 변환)
    const dataRows = excelData.map((row: any) => [
      row['名前'],
      row['部屋番号'],
      row['在留資格'],
      row['等級'],
      row['建物名'],
      row['家賃'],
      row['WiFi代'],
      row['家賃合計'],
      row['電気代'],
      row['水道代'],
      row['ガス代'],
      row['光熱費合計'],
      row['合計金額']
    ])
    
    // 합계 행 추가
    const totalRow = [
      '合計',
      '',
      '',
      '',
      '',
      excelData.reduce((sum, row) => sum + (row?.['家賃'] || 0), 0),
      excelData.reduce((sum, row) => sum + (row?.['WiFi代'] || 0), 0),
      excelData.reduce((sum, row) => sum + (row?.['家賃合計'] || 0), 0),
      excelData.reduce((sum, row) => sum + (row?.['電気代'] || 0), 0),
      excelData.reduce((sum, row) => sum + (row?.['水道代'] || 0), 0),
      excelData.reduce((sum, row) => sum + (row?.['ガス代'] || 0), 0),
      excelData.reduce((sum, row) => sum + (row?.['光熱費合計'] || 0), 0),
      excelData.reduce((sum, row) => sum + (row?.['合計金額'] || 0), 0)
    ]
    
    // 데이터 행과 합계 행을 헤더 아래로 추가
    XLSX.utils.sheet_add_aoa(worksheet, [...dataRows, totalRow], { origin: 'A3' })

    // 셀 병합 설정
    if (!worksheet['!merges']) worksheet['!merges'] = []
    
    // 광열비를 제외한 다른 컬럼들을 1행과 2행 병합
    // 이름 (A1:A2)
    worksheet['!merges'].push({ s: { r: 0, c: 0 }, e: { r: 1, c: 0 } })
    // 방번호 (B1:B2)
    worksheet['!merges'].push({ s: { r: 0, c: 1 }, e: { r: 1, c: 1 } })
    // 재류자격 (C1:C2)
    worksheet['!merges'].push({ s: { r: 0, c: 2 }, e: { r: 1, c: 2 } })
    // 등급 (D1:D2)
    worksheet['!merges'].push({ s: { r: 0, c: 3 }, e: { r: 1, c: 3 } })
    // 빌딩명 (E1:E2)
    worksheet['!merges'].push({ s: { r: 0, c: 4 }, e: { r: 1, c: 4 } })
    // 월세 (F1:F2)
    worksheet['!merges'].push({ s: { r: 0, c: 5 }, e: { r: 1, c: 5 } })
    // WiFi료 (G1:G2)
    worksheet['!merges'].push({ s: { r: 0, c: 6 }, e: { r: 1, c: 6 } })
    // 월세+WiFi (H1:H2)
    worksheet['!merges'].push({ s: { r: 0, c: 7 }, e: { r: 1, c: 7 } })
    
    // 광열비 컬럼들을 1행에서 병합 (I1:K1)
    worksheet['!merges'].push({ s: { r: 0, c: 8 }, e: { r: 0, c: 10 } })
    
    // 광열비 합계 컬럼을 1행과 2행 병합 (L1:L2)
    worksheet['!merges'].push({ s: { r: 0, c: 11 }, e: { r: 1, c: 11 } })
    
    // 총 금액 컬럼을 1행과 2행 병합 (M1:M2)
    worksheet['!merges'].push({ s: { r: 0, c: 12 }, e: { r: 1, c: 12 } })

    // 워크시트를 워크북에 추가
    XLSX.utils.book_append_sheet(workbook, worksheet, `${selectedYear.value}年${selectedMonth.value}月請求書`)

    // 파일명 생성
    const fileName = `${selectedYear.value}年${selectedMonth.value}月_${selectedCompany.value?.name || '家賃請求書'}.xlsx`

    // 엑셀 파일 다운로드
    XLSX.writeFile(workbook, fileName)

    console.log('엑셀 다운로드 완료:', fileName)
  } catch (err: any) {
    console.error('엑셀 다운로드 오류:', err)
    
    // API 에러 메시지 처리
    if (err.response?.data?.detail) {
      error.value = err.response.data.detail
    } else if (err.response?.data?.message) {
      error.value = err.response.data.message
    } else if (err.message) {
      error.value = err.message
    } else {
      error.value = '엑셀 다운로드 중 오류가 발생했습니다.'
    }
  }
}

onMounted(() => {
  // 권한 체크
  if (!checkPermission()) {
    return
  }
  
  fetchCompanies()
})
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
          <VCol cols="12" md="3">
            <VSelect
              v-model="selectedYear"
              :items="yearOptions"
              label="年"
              variant="outlined"
              @update:model-value="handleYearMonthChange"
            />
          </VCol>
          
          <!-- 월 선택 -->
          <VCol cols="12" md="3">
            <VSelect
              v-model="selectedMonth"
              :items="monthOptions"
              label="月"
              variant="outlined"
              @update:model-value="handleYearMonthChange"
            />
          </VCol>
          
          <!-- 회사 선택 -->
          <VCol cols="12" md="4">
            <VSelect
              v-model="selectedCompany"
              :items="companies"
              item-title="name"
              item-value="id"
              label="会社"
              placeholder="会社を選択してください"
              variant="outlined"
              clearable
              @update:model-value="handleCompanySelectFromDropdown"
            />
          </VCol>
        </VRow>
      </VCardText>
    </VCard>



    <!-- 선택된 회사의 청구서 리스트 -->
    <VCard v-if="selectedCompany">
      <VCardTitle class="text-h6 d-flex align-center justify-space-between">
        <div class="d-flex align-center">
          <VIcon class="me-2">ri-file-text-line</VIcon>
            {{ selectedYear }}年{{ selectedMonth }}月 請求書一覧
        </div>
        <div class="d-flex align-center">
          <VBtn
            color="success"
            prepend-icon="ri-file-excel-line"
            class="me-2"
            @click="downloadExcel(selectedCompany.id || '')"
          >
            EXCELダウンロード
          </VBtn>
          <VBtn
            color="primary"
            prepend-icon="ri-add-line"
            @click="goToCreateInvoice(selectedCompany.id || '')"
            disabled
          >
            請求書作成
          </VBtn>
        </div>
      </VCardTitle>
      
      <VCardText>
        <VDataTable
          :headers="[
            { title: '名前', key: 'student_name' },
            { title: '部屋番号', key: 'room_number' },
            { title: '在留資格', key: 'student_type' },
            { title: '等級', key: 'grade_name' },
            { title: '建物名', key: 'building_name' },
            { title: '家賃', key: 'rent_amount' },
            { title: 'WiFi代', key: 'wifi_amount' },
            { title: '家賃合計', key: 'rent_wifi_total' },
            { 
              title: '光熱費',
              key: 'utilities',
              align: 'center',
              children: [
                { title: '電気代', key: 'electricity_amount' },
                { title: '水道代', key: 'water_amount' },
                { title: 'ガス代', key: 'gas_amount' }
              ]
            },
            { title: '光熱費合計', key: 'utilities_total' },
            { title: '合計金額', key: 'total_amount' },
            // { title: '操作', key: 'actions' }
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
            {{ item.student_type === 'SPECIFIED' ? '特定技能' : item.student_type === 'GENERAL' ? '技能実習' : item.student_type }}
          </template>

          <!-- 등급 컬럼 -->
          <template #[`item.grade_name`]="{ item }">
            {{ item.grade_name }}
          </template>

          <!-- 빌딩명 컬럼 -->
          <template #[`item.building_name`]="{ item }">
            {{ item.building_name }}
          </template>

          <!-- 월세 컬럼 -->
          <template #[`item.rent_amount`]="{ item }">
            ¥{{ formatAmount(item.items.find(item => item.type === 'rent')?.amount || 0) }}
          </template>

          <!-- WiFi료 컬럼 -->
          <template #[`item.wifi_amount`]="{ item }">
            ¥{{ formatAmount(item.items.find(item => item.type === 'wifi')?.amount || 0) }}
          </template>

          <!-- 월세+WiFi 컬럼 -->
          <template #[`item.rent_wifi_total`]="{ item }">
            ¥{{ formatAmount((item.items.find(item => item.type === 'rent')?.amount || 0) + (item.items.find(item => item.type === 'wifi')?.amount || 0)) }}
          </template>

          <!-- 전기료 컬럼 -->
          <template #[`item.electricity_amount`]="{ item }">
            ¥{{ formatAmount(item.items.find(item => item.type === 'electricity')?.amount || 0) }}
          </template>

          <!-- 수도료 컬럼 -->
          <template #[`item.water_amount`]="{ item }">
            ¥{{ formatAmount(item.items.find(item => item.type === 'water')?.amount || 0) }}
          </template>

          <!-- 가스료 컬럼 -->
          <template #[`item.gas_amount`]="{ item }">
            ¥{{ formatAmount(item.items.find(item => item.type === 'gas')?.amount || 0) }}
          </template>

          <!-- 광열비 합계 컬럼 -->
          <template #[`item.utilities_total`]="{ item }">
            ¥{{ formatAmount((item.items.find(item => item.type === 'electricity')?.amount || 0) + (item.items.find(item => item.type === 'water')?.amount || 0) + (item.items.find(item => item.type === 'gas')?.amount || 0)) }}
          </template>

          <!-- 총 금액 컬럼 -->
          <template #[`item.total_amount`]="{ item }">
            ¥{{ formatAmount(item.total_amount) }}
          </template>

          <!-- 작업 컬럼 -->
          <template #[`item.actions`]="{ item }">
            <VBtn
              icon
              variant="text"
              color="primary"
              size="small"
              @click="downloadInvoicePdf(item.id || '')"
            >
              <VIcon>ri-download-line</VIcon>
            </VBtn>
            <VBtn
              icon
              variant="text"
              color="info"
              size="small"
            >
              <VIcon>ri-eye-line</VIcon>
            </VBtn>
            <VBtn
              icon
              variant="text"
              color="warning"
              size="small"
            >
              <VIcon>ri-edit-line</VIcon>
            </VBtn>
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

    <!-- 회사를 선택하지 않았을 때 안내 -->
    <VCard v-else class="text-center pa-8">
      <VIcon size="64" color="medium-emphasis" class="mb-4">ri-building-line</VIcon>
      <h3 class="text-h5 mb-2">会社を選択してください</h3>
      <p class="text-body-1 text-medium-emphasis">
        上記の会社選択から請求書を確認したい会社を選択してください。
      </p>
    </VCard>
  </div>
</template>

<style scoped>
.company-card {
  transition: all 0.2s ease;
}

.company-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.company-card.selected {
  border-color: rgb(var(--v-theme-primary));
  background-color: rgb(var(--v-theme-primary-container));
}

.cursor-pointer {
  cursor: pointer;
}

/* 헤더 높이 조정 */
.custom-table table__td {
  height: 25px;
}

/* 푸터 완전 숨기기 */
.custom-table .v-data-table-footer {
  display: none !important;
}
</style>

