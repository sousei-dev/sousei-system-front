// @ts-nocheck
<script lang="ts" setup>
import { invoiceService, type Invoice, type InvoiceItem } from '@/services/invoice'
import type { Student } from '@/services/student'
import { computed, onMounted, ref } from 'vue'

const props = defineProps<{
  student: Student
}>()

// 상태 관리
const loading = ref(false)
const error = ref<string | null>(null)
const selectedYear = ref(new Date().getFullYear())
const billingItems = ref<BillingItem[]>([])

// 청구서 항목 타입
interface BillingItem {
  id: string
  name: string
  amount: number
}

// 월별 데이터 타입
interface MonthlyData {
  [month: number]: {
    [item_name: string]: {
      id: string
      unit_price: number
      quantity: number
      amount: number
      memo: string
    }
  }
}

const monthlyData = ref<MonthlyData>({})

// 년도 옵션 (현재 년도 기준 전후 2년)
const yearOptions = computed(() => {
  const currentYear = new Date().getFullYear()
  return Array.from({ length: 5 }, (_, i) => currentYear - 1 + i)
})

// 월 옵션
const monthOptions = Array.from({ length: 12 }, (_, i) => i + 1)

// 월별 데이터 초기화
const initializeMonthlyData = () => {
  monthlyData.value = {}
  monthOptions.forEach(month => {
    monthlyData.value[month] = {}
    billingItems.value.forEach(item => {
      monthlyData.value[month][item.id] = {
        id: item.id,
        unit_price: item.amount,
        quantity: 1,
        amount: item.amount,
        memo: item.description
      }
    })
  })
}

// 년도 변경 시 데이터 초기화
const handleYearChange = () => {
  initializeMonthlyData()
  fetchMonthlyInvoices()
}

// 새로운 청구서 항목 추가
const newItemName = ref('')
const isAddingItem = ref(false)
const newItemInput = ref<HTMLElement>()

const addBillingItem = () => {
  isAddingItem.value = true
  newItemName.value = ''
  // 다음 tick에서 인풋에 포커스
  nextTick(() => {
    if (newItemInput.value) {
      newItemInput.value.focus()
    }
  })
}

const confirmAddItem = async () => {
  if (!newItemName.value || newItemName.value.trim() === '') {
    isAddingItem.value = false
    newItemName.value = ''
    return
  }

  try {
    // 새로운 API로 항목 생성
    await invoiceService.createStudentMonthlyItems(
      props.student.id,
      {
        student_id: props.student.id,
        item_name: newItemName.value.trim(),
        memo: ''
      }
    )

    // 항목 생성 후 데이터를 다시 불러와서 매칭
    await fetchMonthlyInvoices()

    // 입력 모드 종료 및 입력값 초기화
    isAddingItem.value = false
    newItemName.value = ''
  } catch (error) {
    console.error('항목 추가 중 오류:', error)
    // 에러 발생 시에도 입력 모드 종료
    isAddingItem.value = false
    newItemName.value = ''
  }
}

const cancelAddItem = () => {
  isAddingItem.value = false
  newItemName.value = ''
}

// 개별 항목 업데이트 함수
const updateIndividualItem = async (itemId: string, itemData: any) => {
  try {
    await invoiceService.updateMonthlyItem(itemId, {
      amount: itemData.amount,
      memo: itemData.memo
    })
  } catch (error) {
    console.error(`항목 ${itemId} 업데이트 중 오류:`, error)
  }
}

// 개별 월 저장 함수
const saveIndividualMonth = async (month: number) => {
  try {
    // 해당 월의 모든 항목에 대해 개별 업데이트
    const monthData = monthlyData.value[month]
    if (!monthData) return

    for (const [itemId, data] of Object.entries(monthData)) {
      try {
        // API에서 받은 item_id를 사용하여 업데이트
        const item = billingItems.value.find(bi => bi.id === itemId)
        if (item) {
          await invoiceService.updateMonthlyItem(itemId, {
            amount: data.amount,
            memo: data.memo
          })
        }
      } catch (error) {
        console.error(`항목 ${itemId} 업데이트 중 오류:`, error)
      }
    }
  } catch (error) {
    console.error(`${month}월 저장 중 오류:`, error)
  }
}

// 1~12월 전체 저장 함수
const saveAllMonths = async () => {
  try {
    for (const month of monthOptions) {
      await saveIndividualMonth(month)
    }
  } catch (error) {
    console.error('전체 저장 중 오류:', error)
  }
}

// 청구서 항목 삭제
const removeBillingItem = async (itemId: string) => {
  try {
    // 삭제 확인 다이얼로그
    const confirmed = confirm('この項目を削除しますか？この操作は元に戻せません。')
    if (!confirmed) return

    // API 호출하여 항목 삭제
    await invoiceService.deleteMonthlyItem(props.student.id, itemId)
    
    // 삭제 후 데이터를 다시 불러와서 매칭
    await fetchMonthlyInvoices()
    
    // 성공 메시지
    alert('項目が正常に削除されました。')
  } catch (error) {
    console.error('항목 삭제 중 오류:', error)
    alert('項目の削除に失敗しました。')
  }
}

// 월별 청구서 조회
const fetchMonthlyInvoices = async () => {
  try {
    loading.value = true
    error.value = null

    // 새로운 API로 월별 관리비 항목 조회
    const response = await invoiceService.getStudentMonthlyItems(
      props.student.id,
      selectedYear.value
    )
    
    // 응답 데이터 처리
    if (response && response.items) {
      // 기존 항목 초기화
      billingItems.value = []
      monthlyData.value = {}

      // 각 항목별로 처리
      response.items.forEach((item: any) => {
        // 새로운 항목 추가
        const newBillingItem: BillingItem = {
          id: item.item_name, // 항목명을 ID로 사용 (고유성 보장)
          name: item.item_name,
          amount: 0
        }
        billingItems.value.push(newBillingItem)
        
        // 모든 월에 해당 항목 초기화
        monthOptions.forEach(month => {
          if (!monthlyData.value[month]) {
            monthlyData.value[month] = {}
          }
          monthlyData.value[month][newBillingItem.id] = {
            id: item.id,
            unit_price: 0,
            quantity: 1,
            amount: 0,
            memo: ''
          }
        })
        
        // 각 월별 데이터 설정
        item.months.forEach((monthData: any) => {
          if (!monthlyData.value[monthData.month]) {
            monthlyData.value[monthData.month] = {}
          }
          monthlyData.value[monthData.month][newBillingItem.id] = {
            id: monthData.item_id,
            unit_price: 0,
            quantity: 1,
            amount: monthData.amount || 0,
            memo: monthData.memo || ''
          }
        })
      })
    }
    // 데이터가 없을 때만 자동으로 추가 버튼 활성화
    if (billingItems.value.length === 0) {
      addBillingItem()
    }
  } catch (err: any) {
    error.value = err.response?.data?.message || '請求書データの取得に失敗しました。'
    console.error('월별 관리비 항목 조회 중 오류:', err)
  } finally {
    loading.value = false
  }
}

// 항목 금액 계산
const calculateItemAmount = (month: number, itemId: string) => {
  if (monthlyData.value[month] && monthlyData.value[month][itemId]) {
    const item = monthlyData.value[month][itemId]
    item.amount = item.unit_price * item.quantity
  }
}

// 월별 총 금액 계산
const getMonthlyTotal = (month: number) => {
  if (!monthlyData.value[month]) return 0

  return Object.values(monthlyData.value[month]).reduce((sum, item) => {
    const amount = Number(item.amount) || 0
    return sum + amount
  }, 0)
}

// 금액 포맷팅
const formatAmount = (amount: number) => {
  return new Intl.NumberFormat('ja-JP').format(amount)
}

// 청구서 저장
const saveInvoice = async (month: number) => {
  if (!monthlyData.value[month]) return

  try {
    loading.value = true
    error.value = null

    // 유효한 항목들만 필터링
    const validItems: InvoiceItem[] = []
    let sortOrder = 1

    Object.entries(monthlyData.value[month]).forEach(([itemId, itemData]) => {
      if (itemData.amount > 0) {
        const billingItem = billingItems.value.find(item => item.id === itemId)
        if (billingItem) {
          validItems.push({
            name: billingItem.name,
            unit_price: itemData.unit_price,
            quantity: itemData.quantity,
            sort_order: sortOrder++,
            amount: itemData.amount,
            memo: itemData.memo,
            type: billingItem.type
          })
        }
      }
    })

    if (validItems.length === 0) {
      error.value = '有効な請求項目がありません。'
      return
    }

    // 청구서 생성
    await invoiceService.createInvoice({
      student_id: props.student.id,
      year: selectedYear.value,
      month: month,
      items: validItems
    })

    // 성공 메시지
    alert(`${month}月の請求書が正常に保存されました。`)
  } catch (err: any) {
    error.value = err.response?.data?.message || '請求書の保存に失敗しました。'
  } finally {
    loading.value = false
  }
}

// 상태에 따른 색상 반환
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

// 상태에 따른 텍스트 반환
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

onMounted(() => {
  fetchMonthlyInvoices()
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
        {{ selectedYear }}年 月別請求書管理
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
              @update:model-value="handleYearChange"
            />
          </VCol>
          

        </VRow>
      </VCardText>
    </VCard>



    <!-- 월별 청구서 테이블 -->
    <VCard>
      <VCardTitle class="text-h6">
        <VIcon class="me-2">ri-calendar-line</VIcon>
        月別請求書一覧
      </VCardTitle>
      
      <VCardText>
        <!-- 로딩 상태 -->
        <div v-if="loading" class="d-flex justify-center align-center py-8">
          <VProgressCircular
            indeterminate
            color="primary"
            size="64"
          />
          <span class="ml-4 text-body-1">データを読み込み中...</span>
        </div>

        <!-- 테이블 -->
        <div v-else class="table-container">
          <VTable class="billing-table">
            <thead>
              <tr>
                <th class="fixed-column">項目名</th>
                <th v-for="month in monthOptions" :key="month" class="month-column">
                  {{ month }}月
                </th>
                <th class="total-column">合計</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in billingItems" :key="item.id">
                <td class="fixed-column item-name">
                  <div class="d-flex align-center justify-space-between">
                    <span class="font-weight-bold">{{ item.name }}</span>
                    <VBtn
                      icon
                      variant="text"
                      color="error"
                      size="small"
                      @click="removeBillingItem(item.id)"
                      class="ml-2"
                    >
                      <VIcon>ri-delete-bin-line</VIcon>
                    </VBtn>
                  </div>
                </td>
                <td 
                  v-for="month in monthOptions" 
                  :key="month"
                  class="month-cell"
                >
                  <div class="d-flex flex-column">
                    <VTextField
                      :model-value="monthlyData[month]?.[item.id]?.amount || 0"
                      type="number"
                      min="0"
                      density="compact"
                      hide-details
                      class="mb-1"
                      placeholder="単価"
                      @update:model-value="(value) => {
                        if (!monthlyData[month]) monthlyData[month] = {}
                        if (!monthlyData[month][item.id]) monthlyData[month][item.id] = { id: item.id, unit_price: 0, quantity: 1, amount: 0, memo: '' }
                        monthlyData[month][item.id].amount = Number(value) || 0
                        calculateItemAmount(month, monthlyData[month][item.id].id)
                      }"
                      @blur="() => {
                        if (monthlyData[month]?.[item.id]) {
                          updateIndividualItem(monthlyData[month][item.id].id, monthlyData[month][item.id])
                        }
                      }"
                    />
                  </div>
                </td>
                <td class="total-column">
                  <span class="font-weight-bold">
                    ¥{{ formatAmount(billingItems.reduce((sum, item) => {
                      const itemTotal = monthOptions.reduce((monthSum, month) => {
                        const amount = Number(monthlyData[month]?.[item.id]?.amount) || 0
                        return monthSum + amount
                      }, 0)
                      return sum + itemTotal
                    }, 0)) }}
                  </span>
                </td>
              </tr>
              <!-- 추가 버튼 행 -->
              <tr class="add-item-row" v-if="isAddingItem">
                <td class="fixed-column">
                  <div class="d-flex align-center gap-2">
                    <VTextField
                      v-model="newItemName"
                      placeholder="項目名を入力"
                      density="compact"
                      hide-details
                      variant="outlined"
                      size="small"
                      @keyup.enter="confirmAddItem"
                      @keyup.esc="cancelAddItem"
                      style="min-width: 120px;"
                      ref="newItemInput"
                    />
                    <VBtn
                      icon
                      variant="text"
                      color="success"
                      size="small"
                      @click="confirmAddItem"
                    >
                      <VIcon>ri-check-line</VIcon>
                    </VBtn>
                    <VBtn
                      icon
                      variant="text"
                      color="error"
                      size="small"
                      @click="cancelAddItem"
                    >
                      <VIcon>ri-close-line</VIcon>
                    </VBtn>
                  </div>
                </td>
                <td
                  v-for="month in monthOptions"
                  :key="month"
                  class="add-cell"
                >
                  <!-- 빈 셀 -->
                </td>
                <td class="total-column">
                  <!-- 빈 셀 -->
                </td>
              </tr>
              <tr class="add-item-row" v-else>
                <td class="fixed-column">
                  <VBtn
                    icon
                    variant="text"
                    color="primary"
                    size="small"
                    @click="addBillingItem"
                  >
                    <VIcon>ri-add-line</VIcon>
                  </VBtn>
                </td>
                <td
                  v-for="month in monthOptions"
                  :key="month"
                  class="add-cell"
                >
                  <!-- 빈 셀 -->
                </td>
                <td class="total-column">
                  <!-- 빈 셀 -->
                </td>
                <td class="add-column">
                  <!-- 빈 셀 -->
                </td>
              </tr>
              <!-- 월별 합계 행 -->
              <tr class="monthly-total-row">
                <td class="fixed-column">
                  <span class="font-weight-bold">月別合計</span>
                </td>
                <td 
                  v-for="month in monthOptions" 
                  :key="month"
                  class="monthly-total-cell"
                >
                  <div class="d-flex flex-column align-center">
                    <span class="font-weight-bold">
                      ¥{{ formatAmount(getMonthlyTotal(month)) }}
                    </span>
                  </div>
                </td>
                <td class="total-column">
                  <span class="font-weight-bold">
                    ¥{{ formatAmount(monthOptions.reduce((sum, month) => {
                      const monthlyTotal = getMonthlyTotal(month)
                      return sum + monthlyTotal
                    }, 0)) }}
                  </span>
                </td>
              </tr>
            </tbody>
          </VTable>
        </div>
      </VCardText>
    </VCard>
  </div>


</template>

<style scoped>
.table-container {
  overflow-x: auto;
  max-width: 100%;
}

.billing-table {
  min-width: 1200px;
  background: white;
  border-radius: 4px;
}

.billing-table th {
  font-weight: 500;
  color: rgba(var(--v-theme-on-surface), 0.7);
  text-align: center;
  padding: 12px 8px;
  border-bottom: 2px solid rgba(var(--v-theme-border-color), var(--v-theme-border-opacity));
}

.billing-table td {
  color: rgba(var(--v-theme-on-surface), 0.87);
  padding: 8px;
  border-bottom: 1px solid rgba(var(--v-theme-border-color), var(--v-theme-border-opacity));
}

.fixed-column {
  position: sticky;
  left: 0;
  background: white;
  z-index: 1;
  min-width: 150px;
  max-width: 200px;
}

.month-column {
  min-width: 120px;
  text-align: center;
}

.total-column {
  min-width: 120px;
  text-align: center;
  background: rgba(var(--v-theme-primary), 0.1);
}

.add-column {
  min-width: 60px;
  text-align: center;
}

.add-item-row {
  background: rgba(var(--v-theme-primary), 0.02);
}

.add-cell {
  text-align: center;
}

.action-column {
  min-width: 80px;
  text-align: center;
}

.month-cell {
  text-align: center;
}

.monthly-total-row {
  background: rgba(var(--v-theme-primary), 0.05);
}

.monthly-total-cell {
  text-align: center;
}

.amount-display {
  font-size: 0.875rem;
  font-weight: 500;
  color: rgba(var(--v-theme-primary), 0.8);
  margin-top: 4px;
}

.item-name {
  font-weight: 500;
}

.v-table {
  background: white;
  border-radius: 4px;
}
</style>

