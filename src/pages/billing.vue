<script lang="ts" setup>
import { buildingService } from '@/services/building'
import { companyService, type Company } from '@/services/company'
import { invoiceService, type Invoice } from '@/services/invoice'
import { computed, onMounted, ref } from 'vue'

// 상태 관리
const loading = ref(false)
const error = ref<string | null>(null)
const companies = ref<Company[]>([])
const selectedYear = ref(new Date().getFullYear())
const selectedMonth = ref(new Date().getMonth() + 1)
const selectedCompany = ref<Company | null>(null)
const companyInvoices = ref<Invoice[]>([])

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
            unit_price: utility.student_amount,
            quantity: 1,
            sort_order: 2 + index,
            amount: utility.student_amount,
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
  }
  
  selectedCompany.value = companyId
  await fetchCompanyInvoices(selectedCompany.value || '')
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

onMounted(() => {
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
            />
          </VCol>
          
          <!-- 월 선택 -->
          <VCol cols="12" md="3">
            <VSelect
              v-model="selectedMonth"
              :items="monthOptions"
              label="月"
              variant="outlined"
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
          {{ selectedCompany.name }} - {{ selectedYear }}年{{ selectedMonth }}月 請求書一覧
        </div>
        <VBtn
          color="primary"
          prepend-icon="ri-add-line"
          @click="goToCreateInvoice(selectedCompany.id || '')"
        >
          請求書作成
        </VBtn>
      </VCardTitle>
      
      <VCardText>
        <VDataTable
          :headers="[
            { title: '学生名', key: 'student_name' },
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
</style>

