// @ts-nocheck
<script lang="ts" setup>
/* eslint-disable @typescript-eslint/no-explicit-any */
import InvoiceDetailDialog from '@/components/InvoiceDetailDialog.vue';
import { billingService, type BillingItem, type BillingItemOption, type BillingItemOptions } from '@/services/billing';
import { invoiceService, type Invoice, type InvoiceItem } from '@/services/invoice';
import type { Student } from '@/services/student';
import { computed, onMounted, ref } from 'vue';

const props = defineProps<{
  student: Student
}>()

// BillingItemForm 타입 정의
type BillingItemForm = {
  name: string;
  memo: string;
  unit: number;
  qna: number;
  amount: number;
  manual?: boolean;
  checked: boolean;
};

const invoices = ref<Invoice[]>([])
const loading = ref(false)
const error = ref<string | null>(null)

// 청구서 목록 조회
const fetchBillings = async () => {
  try {
    loading.value = true
    error.value = null
    
    // API 연동 전 더미 데이터 사용
    const response = await invoiceService.getInvoices(props.student.id)
    invoices.value = response.items
    fetchBillingItemOptions()
  }
  catch (err: any) {
    error.value = err.response?.data?.message || '請求書リストの取得に失敗しました。'
  }
  finally {
    loading.value = false
  }
}

const thisMonthInvoice = ref(false)
const invoiceId = ref('')
// 청구서 상세 조회
const fetchInvoice = async () => {
  const today = new Date()

  try {
    loading.value = true
    error.value = null
    
    // API 연동 전 더미 데이터 사용
    const response = await invoiceService.getInvoiceStudentYearMonth(props.student.id, today.getFullYear(), today.getMonth() + 1)
    console.log(response)
    thisMonthInvoice.value = response?.is_data || false
    // custom 타입 항목들을 customForm에 추가
    if (response?.items && response.items.length > 0) {
      invoiceId.value = response.id || ''
      const customItems = response.items.filter((item: any) => item.type === 'CUSTOM')
      customForm.value = customItems.map((item: any) => ({
        name: item.name,
        memo: item.memo || '',
        unit: item.unit_price,
        qna: item.quantity,
        amount: item.amount,
        manual: false,
        checked: true,
      }))

      // GROUP 타입 항목들을 groupChecked와 groupAmounts에 설정
      const groupItems = response.items.filter((item: any) => item.type === 'GROUP')
      
      // 기존 groupChecked의 각 항목에 대해 response에 있는지 확인하고 업데이트
      groupItems.forEach((item: any) => {
        if (item.name === '日本語学費') {
          groupChecked.value.japanese = true
          groupAmounts.value.japanese = item.amount
        } else if (item.name === '実務経験') {
          groupChecked.value.work = true
          groupAmounts.value.work = item.amount
        } else if (item.name === '入国時到着') {
          groupChecked.value.arrival = true
          groupAmounts.value.arrival = item.amount
        } else if (item.name === '支援費用') {
          groupChecked.value.support = true
          groupAmounts.value.support = item.amount
        }
      })

      // response에 없는 그룹 항목들은 checked를 false로 설정
      if (!groupItems.some((item: any) => item.name === '日本語学費')) {
        groupChecked.value.japanese = false
      }
      if (!groupItems.some((item: any) => item.name === '実務経験')) {
        groupChecked.value.work = false
      }
      if (!groupItems.some((item: any) => item.name === '入国時到着')) {
        groupChecked.value.arrival = false
      }
      if (!groupItems.some((item: any) => item.name === '支援費用')) {
        groupChecked.value.support = false
      }

      // INDIVIDUAL 타입 항목들을 individualForm에 설정
      const individualItems = response.items.filter((item: any) => item.type === 'INDIVIDUAL')
      
      // 기존 individualForm의 각 항목에 대해 response에 있는지 확인하고 업데이트
      individualForm.value.forEach(existingItem => {
        const responseItem = individualItems.find((item: any) => item.name === existingItem.name)
        if (responseItem) {
          // response에 있는 항목은 값만 업데이트하고 checked를 true로 설정
          existingItem.memo = responseItem.memo || ''
          existingItem.unit = responseItem.unit_price
          existingItem.qna = responseItem.quantity
          existingItem.amount = responseItem.amount
          existingItem.checked = true
        } else {
          // response에 없는 항목은 checked를 false로 설정
          existingItem.checked = false
        }
      })
    }
    
  } 
  catch (err: any) {
    error.value = err.response?.data?.message || '請求書リストの取得に失敗しました。'
  }
  finally {
    loading.value = false
  }
}

// 상태에 따른 색상 반환
const getStatusColor = (status: Invoice['payment_status']) => {
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
const getStatusText = (status: Invoice['payment_status']) => {
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
  return new Intl.NumberFormat('ja-JP').format(amount)
}

// 그룹 옵션 정의
const groupOptions = ref<{
  japanese: BillingItemOption[];
  work: BillingItemOption[];
  arrival: BillingItemOption[];
  support: BillingItemOption[];
}>({
  japanese: [],
  work: [],
  arrival: [],
  support: [],
})

// 나머지 개별 항목
const individualItems = ref<BillingItemOptions['individualItems']>([])

const billingTypeDesc: Record<string, string> = {
  initial: '入国時/初期費用',
  monthly_1_3: '1~3ヶ月間発生',
  monthly_4_12: '4~12ヶ月間発生',
  after_12: '1年以降発生',
}

// 선택 상태 관리
const selected = ref({
  japanese: props.student.japanese_level,
  work: props.student.experience_over_2_years ? 'OVER_2_YEARS' : 'UNDER_2_YEARS',
  arrival: props.student.arrival_type === 'SHIP' ? 'ARRIVAL_SHIP_MEET_AND_GREET' : 'ARRIVAL_FLIGHT_MEET_AND_GREET',
  support: (() => {
    if (!props.student.entry_date) return 'MONTHLY_1_3'
    const assignmentDate = new Date(props.student.assignment_date || '')
    const today = new Date()
    const monthsDiff = (today.getFullYear() - assignmentDate.getFullYear()) * 12 + 
                      (today.getMonth() - assignmentDate.getMonth())
    
    if (monthsDiff <= 3) return 'MONTHLY_1_3'
    if (monthsDiff <= 12) return 'MONTHLY_4_12'
    return 'AFTER_12'
  })(),
})

// 현재 월의 일수 계산
const getDaysInMonth = (date: Date) => {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
}

// 두 날짜 사이의 일수 계산
const getDaysBetweenDates = (startDate: Date, endDate: Date) => {
  const diffTime = Math.abs(endDate.getTime() - startDate.getTime())
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
}

// invoices가 있는지 확인
const hasInvoices = computed(() => {
  return invoices.value && invoices.value.length > 1
})

// 지원비용 금액 계산
const calculateSupportAmount = (unit: number) => { 
  // invoices가 있으면 계산하지 않음
  if (hasInvoices.value) {
    return unit
  }

  if (!props.student.assignment_date) return unit

  const assignmentDate = new Date(props.student.assignment_date)
  const today = new Date()
  
  // 입국일이 미래인 경우
  if (assignmentDate > today) return 0
  
  // 입국일이 오늘인 경우
  if (assignmentDate.toDateString() === today.toDateString()) return unit
  
  // 입국일이 속한 월의 마지막 날 계산
  const lastDayOfMonth = new Date(assignmentDate.getFullYear(), assignmentDate.getMonth() + 1, 0)
  
  // 입국일부터 해당 월의 마지막 날까지의 일수 계산
  const daysBetween = getDaysBetweenDates(assignmentDate, lastDayOfMonth) + 1 // 입국일 포함
  
  // 해당 월의 일수로 나누어 일별 금액 계산
  const daysInMonth = getDaysInMonth(assignmentDate)
  const result = Math.floor((unit / daysInMonth) * daysBetween)
  return result
}

const groupAmounts = ref({
  japanese: 0,
  work: 0,
  arrival: 0,
  support: 0,
})

const individualForm = ref<BillingItemForm[]>([])

const customForm = ref<BillingItemForm[]>([])

const showInlineAdd = ref(false)
const inlineNewItem = ref<BillingItemForm>({
  name: '', memo: '', unit: 0, qna: 1, amount: 0, manual: false, checked: true
})

// 그룹 체크 상태
const groupChecked = ref({
  japanese: true,
  work: true,
  arrival: true,
  support: true,
})

// 합계 계산
const totalSelectedAmount = computed(() => {
  let total = 0
  if (groupChecked.value.japanese) total += groupAmounts.value.japanese
  if (groupChecked.value.work) total += groupAmounts.value.work
  if (groupChecked.value.arrival) total += groupAmounts.value.arrival
  if (groupChecked.value.support) total += groupAmounts.value.support
  total += individualForm.value.filter((i: BillingItemForm) => i.checked).reduce((sum, i) => sum + (i.amount || 0), 0)
  total += customForm.value.filter((i: BillingItemForm) => i.checked).reduce((sum, i) => sum + (i.amount || 0), 0)
  return total
})

const addInlineItem = () => {
  if (!inlineNewItem.value.name) return
  inlineNewItem.value.amount = inlineNewItem.value.unit * inlineNewItem.value.qna
  customForm.value.push({ ...inlineNewItem.value })
  showInlineAdd.value = false
  inlineNewItem.value = { name: '', memo: '', unit: 0, qna: 1, amount: 0, manual: false, checked: true }
}

// 커스텀 청구 항목 삭제 함수
const removeCustomBillingItem = (index: number) => {
  customForm.value.splice(index, 1)
}

const fetchBillingItemOptions = async () => {
  try {
    const data = await billingService.getBillingItemOptions()
    groupOptions.value = data.groupOptions
    individualForm.value = data.individualItems.map((item: BillingItem) => ({
      ...item,
      memo: item.memo || '',
      amount: item.unit,
      checked: true,
    }))
    setGrouptOptionData(groupOptions.value)
    if (hasInvoices.value) {
      // invoices가 있으면 모든 그룹 체크박스 해제
      groupChecked.value.japanese = false
      groupChecked.value.work = false
      groupChecked.value.arrival = false
      groupChecked.value.support = true
      
      // individualForm의 모든 checked 값도 false로 설정
      individualForm.value.forEach(item => {
        item.checked = false
      })
    }
  } catch (err: any) {
    error.value = err.response?.data?.message || 'リストの取得に失敗しました。'
  }
  fetchInvoice()
}

const setGrouptOptionData = (newOptions: any) => {
  if (newOptions && newOptions.japanese && newOptions.japanese.length > 0) {
      groupAmounts.value.japanese = groupOptions.value.japanese?.find(i => i.value === selected.value.japanese)?.unit || 0
    }
    if (newOptions && newOptions.work && newOptions.work.length > 0) {
      groupAmounts.value.work = groupOptions.value.work?.find(i => i.value === selected.value.work)?.unit || 0
    }
    if (newOptions && newOptions.arrival && newOptions.arrival.length > 0) {
      groupAmounts.value.arrival = groupOptions.value.arrival?.find(i => i.value === selected.value.arrival)?.unit || 0
    }
    if (newOptions && newOptions.support && newOptions.support.length > 0) {
      const unit = groupOptions.value.support?.find(i => i.value === selected.value.support)?.unit || 0
      groupAmounts.value.support = calculateSupportAmount(unit)
    }
}

// 지원비용 계산 예시 텍스트 생성
const getSupportCalculationExample = () => {
  // invoices가 있으면 표시하지 않음
  if (hasInvoices.value) return ''

  if (!props.student.assignment_date) return ''

  const assignmentDate = new Date(props.student.assignment_date)
  const today = new Date()
  
  // 입국일이 미래인 경우
  if (assignmentDate > today) return '入社日が未来です。'
  
  // 입국일이 오늘인 경우
  if (assignmentDate.toDateString() === today.toDateString()) return '入社日当日です。'
  
  const unit = groupOptions.value.support?.find(i => i.value === selected.value.support)?.unit || 0
  const lastDayOfMonth = new Date(assignmentDate.getFullYear(), assignmentDate.getMonth() + 1, 0)
  const daysBetween = getDaysBetweenDates(assignmentDate, lastDayOfMonth) + 1 // 입국일 포함
  const daysInMonth = getDaysInMonth(assignmentDate)
  const dailyAmount = Math.floor(unit / daysInMonth)
  const totalAmount = Math.floor((unit / daysInMonth) * daysBetween)
  
  return `月単価: ${unit.toLocaleString()}円 ÷ ${daysInMonth}日 = ${dailyAmount.toLocaleString()}円/日\n` +
       `${assignmentDate.toLocaleDateString()} ~ ${lastDayOfMonth.toLocaleDateString()} ${daysBetween}日 × ${dailyAmount.toLocaleString()}円 = ${totalAmount.toLocaleString()}円`
}

// 청구서 저장
const saveInvoice = async () => {
  try {
    loading.value = true
    error.value = null

    // 선택된 항목들 수집
    const items: InvoiceItem[] = []

    // 그룹 항목들 추가
    if (groupChecked.value.japanese && groupAmounts.value.japanese > 0) {
      items.push({
        name: '日本語学費',
        unit_price: groupAmounts.value.japanese,
        quantity: 1,
        sort_order: items.length + 1,
        amount: groupAmounts.value.japanese,
        memo: `${selected.value.japanese} レベル`,
        type: 'GROUP',
      })
    }
    if (groupChecked.value.work && groupAmounts.value.work > 0) {
      items.push({
        name: '実務経験',
        unit_price: groupAmounts.value.work,
        quantity: 1,
        sort_order: items.length + 1,
        amount: groupAmounts.value.work,
        memo: selected.value.work === 'OVER_2_YEARS' ? '2年以上' : '2年未満',
        type: 'GROUP',
      })
    }
    if (groupChecked.value.arrival && groupAmounts.value.arrival > 0) {
      items.push({
        name: '入国時到着',
        unit_price: groupAmounts.value.arrival,
        quantity: 1,
        sort_order: items.length + 1,
        amount: groupAmounts.value.arrival,
        memo: selected.value.arrival.includes('SHIP') ? '船舶到着' : '航空到着',
        type: 'GROUP',
      })
    }
    if (groupChecked.value.support && groupAmounts.value.support > 0) {
      items.push({
        name: '支援費用',
        unit_price: groupAmounts.value.support,
        quantity: 1,
        sort_order: items.length + 1,
        amount: groupAmounts.value.support,
        memo: `${billingTypeDesc[groupOptions.value.support?.find(i => i.value === selected.value.support)?.billing_type || 'initial']} 期間`,
        type: 'GROUP',
      })
    }

    // 개별 항목들 추가
    individualForm.value
      .filter(item => item.checked && item.amount > 0)
      .forEach(item => {
        items.push({
          name: item.name,
          unit_price: item.amount,
          quantity: 1,
          sort_order: items.length + 1,
          amount: item.amount,
          memo: billingTypeDesc[item.billing_type || 'initial'],
          type: 'INDIVIDUAL',
        })
      })

    // 커스텀 항목들 추가
    customForm.value
      .filter(item => item.checked && item.amount > 0)
      .forEach(item => {
        items.push({
          name: item.name,
          unit_price: item.unit,
          quantity: item.qna,
          sort_order: items.length + 1,
          amount: item.amount,
          memo: item.memo,
          type: 'CUSTOM',
        })
      })

    // 청구서 생성
    const today = new Date()
    const invoice = await invoiceService.createInvoice({
      student_id: props.student.id,
      year: today.getFullYear(),
      month: today.getMonth() + 1,
      items,
    })

    // 성공 메시지 표시
    alert('請求書が正常に作成されました。')
    
    // 청구서 목록 새로고침
    await fetchBillings()
  }
  catch (err: any) {
    error.value = err.response?.data?.message || '請求書の作成に失敗しました。'
  }
  finally {
    loading.value = false
  }
}

const updateInvoice = async () => {
  try {
    loading.value = true
    error.value = null

    // 선택된 항목들 수집
    const items: InvoiceItem[] = []

    // 그룹 항목들 추가
    if (groupChecked.value.japanese && groupAmounts.value.japanese > 0) {
      items.push({
        name: '日本語学費',
        unit_price: groupAmounts.value.japanese,
        quantity: 1,
        sort_order: items.length + 1,
        amount: groupAmounts.value.japanese,
        memo: `${selected.value.japanese} レベル`,
        type: 'GROUP',
      })
    }
    if (groupChecked.value.work && groupAmounts.value.work > 0) {
      items.push({
        name: '実務経験',
        unit_price: groupAmounts.value.work,
        quantity: 1,
        sort_order: items.length + 1,
        amount: groupAmounts.value.work,
        memo: selected.value.work === 'OVER_2_YEARS' ? '2年以上' : '2年未満',
        type: 'GROUP',
      })
    }
    if (groupChecked.value.arrival && groupAmounts.value.arrival > 0) {
      items.push({
        name: '入国時到着',
        unit_price: groupAmounts.value.arrival,
        quantity: 1,
        sort_order: items.length + 1,
        amount: groupAmounts.value.arrival,
        memo: selected.value.arrival.includes('SHIP') ? '船舶到着' : '航空到着',
        type: 'GROUP',
      })
    }
    if (groupChecked.value.support && groupAmounts.value.support > 0) {
      items.push({
        name: '支援費用',
        unit_price: groupAmounts.value.support,
        quantity: 1,
        sort_order: items.length + 1,
        amount: groupAmounts.value.support,
        memo: `${billingTypeDesc[groupOptions.value.support?.find(i => i.value === selected.value.support)?.billing_type || 'initial']} 期間`,
        type: 'GROUP',
      })
    }

    // 개별 항목들 추가
    individualForm.value
      .filter(item => item.checked && item.amount > 0)
      .forEach(item => {
        items.push({
          name: item.name,
          unit_price: item.amount,
          quantity: 1,
          sort_order: items.length + 1,
          amount: item.amount,
          memo: billingTypeDesc[item.billing_type || 'initial'],
          type: 'INDIVIDUAL',
        })
      })

    // 커스텀 항목들 추가
    customForm.value
      .filter(item => item.checked && item.amount > 0)
      .forEach(item => {
        items.push({
          name: item.name,
          unit_price: item.unit,
          quantity: item.qna,
          sort_order: items.length + 1,
          amount: item.amount,
          memo: item.memo,
          type: 'CUSTOM',
        })
      })

    // 청구서 생성
    const today = new Date()
    const invoice =  await invoiceService.updateInvoice({
      invoice_id: invoiceId.value,
      year: today.getFullYear(),
      month: today.getMonth() + 1,
      items,
    })

    // 성공 메시지 표시
    alert('請求書が正常に修正されました。')
    
    // 청구서 목록 새로고침
    await fetchBillings()
  }
  catch (err: any) {
    error.value = err.response?.data?.message || '請求書の作成に失敗しました。'
  }
  finally {
    loading.value = false
  }
}

// ISO 날짜를 YYYY-MM-DD 형식으로 변환
const formatDate = (dateString: string) => {
  return dateString.split('T')[0]
}

// 이번달의 마지막날 계산
const getLastDayOfMonth = (dateString: string) => {
  const date = new Date(dateString)
  const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0)
  return lastDay.toISOString().split('T')[0]
}

const showInvoiceDialog = ref(false)
const selectedInvoice = ref<Invoice | null>(null)

// 청구서 상세 보기
const viewInvoice = async (invoiceId: string) => {
  try {
    loading.value = true
    error.value = null
    const invoice = await invoiceService.getInvoice(invoiceId)
    if (invoice) {
      selectedInvoice.value = invoice
      showInvoiceDialog.value = true
    }
  }
  catch (err: any) {
    error.value = err.response?.data?.message || '請求書詳細の表示に失敗しました。'
  }
}

onMounted(() => {
  fetchBillings()
})
</script>

<template>
  <!-- 이번 달 청구서 작성 카드 -->
  <VCard class="mb-6">
    <VCardTitle class="text-h6 d-flex justify-space-between align-center">
      <span>({{ new Date().getMonth() + 1 }}月) 請求書作成 {{ thisMonthInvoice ? '完了' : '未完了' }}</span>
    </VCardTitle>
    <VCardText>
      <VTable>
        <thead>
          <tr>
            <th></th>
            <th>項目グループ</th>
            <th>詳細項目</th>
            <th>単価</th>
            <th>個数</th>
            <th>備考</th>
            <th>金額</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <!-- 일본어학비 그룹 -->
          <tr>
            <td>
              <VCheckbox v-model="groupChecked.japanese" density="compact" hide-details />
            </td>
            <td>日本語学費</td>
            <td>
              <!-- <VSelect
                v-model="selected.japanese"
                :items="groupOptions.japanese"
                item-title="name"
                item-value="value"
                density="compact"
                hide-details
                style="min-width:140px"
                readonly
                @update:modelValue="(val: string) => groupAmounts.japanese = groupOptions.japanese?.find(i => i.value === val)?.unit || 0"
              /> -->
              {{ groupOptions.japanese?.find(option => option.value === selected.japanese)?.name }}
            </td>
            <td>{{ groupOptions.japanese?.find(i => i.value === selected.japanese)?.unit?.toLocaleString() }}</td>
            <td>1</td>
            <td>{{ billingTypeDesc[groupOptions.japanese?.find(i => i.value === selected.japanese)?.billing_type || 'initial'] }}</td>
            <td>
              <span>{{ groupAmounts.japanese.toLocaleString() }}</span>
            </td>
            <td></td>
          </tr>
          <!-- 실무경험 그룹 -->
          <tr>
            <td>
              <VCheckbox v-model="groupChecked.work" density="compact" hide-details />
            </td>
            <td>実務経験</td>
            <td>
              <!-- <VSelect
                v-model="selected.work"
                :items="groupOptions.work"
                item-title="name"
                item-value="value"
                density="compact"
                hide-details
                style="min-width:140px"
                @update:modelValue="(val: string) => groupAmounts.work = groupOptions.work?.find(i => i.name === val)?.unit || 0"
              /> -->
              {{ groupOptions.work?.find(option => option.value === selected.work)?.name }}
            </td>
            <td>{{ groupOptions.work?.find(i => i.value === selected.work)?.unit?.toLocaleString() }}</td>
            <td>1</td>
            <td>{{ billingTypeDesc[groupOptions.work?.find(i => i.name === selected.work)?.billing_type || 'initial'] }}</td>
            <td>
              <span>{{ groupAmounts.work.toLocaleString() }}</span>
            </td>
            <td></td>
          </tr>
          <!-- 입국시 도착 그룹 -->
          <tr>
            <td>
              <VCheckbox v-model="groupChecked.arrival" density="compact" hide-details />
            </td>
            <td>入国時到着</td>
            <td>
              <!-- <VSelect
                v-model="selected.arrival"
                :items="groupOptions.arrival"
                item-title="name"
                item-value="value"
                density="compact"
                hide-details
                style="min-width:140px"
                @update:modelValue="(val: string) => groupAmounts.arrival = groupOptions.arrival?.find(i => i.value === val)?.unit || 0"
              /> -->
              {{ groupOptions.arrival?.find(option => option.value === selected.arrival)?.name }}
            </td>
            <td>{{ groupOptions.arrival?.find(i => i.value === selected.arrival)?.unit?.toLocaleString() }}</td>
            <td>1</td>
            <td>{{ billingTypeDesc[groupOptions.arrival?.find(i => i.value === selected.arrival)?.billing_type || 'initial'] }}</td>
            <td>
              <span>{{ groupAmounts.arrival.toLocaleString() }}</span>
            </td>
            <td></td>
          </tr>
          <!-- 지원비용 그룹 -->
          <tr>
            <td>
              <VCheckbox v-model="groupChecked.support" density="compact" hide-details />
            </td>
            <td>支援費用</td>
            <td>
              <!-- <VSelect
                v-model="selected.support"
                :items="groupOptions.support"
                item-title="name"
                item-value="value"
                density="compact"
                hide-details
                style="min-width:140px"
                @update:modelValue="(val: string) => {
                  const unit = groupOptions.support?.find(i => i.value === val)?.unit || 0
                  groupAmounts.support = calculateSupportAmount(unit)
                }"
              />  -->
              {{ groupOptions.support?.find(option => option.value === selected.support)?.name }}
            </td>
            <td>{{ groupOptions.support?.find(i => i.value === selected.support)?.unit?.toLocaleString() }}</td>
            <td>1</td>
            <td>
              {{ billingTypeDesc[groupOptions.support?.find(i => i.value === selected.support)?.billing_type || 'initial'] }} <br>
              <small style="white-space: pre-line" class="text-red">
                {{ getSupportCalculationExample() }}
              </small>
            </td>
            <td>
              <span>{{ groupAmounts.support.toLocaleString() }}</span>
            </td>
            <td></td>
          </tr>
          <!-- 개별 항목 -->
          <tr v-for="item in individualForm" :key="item.name">
            <td>
              <VCheckbox v-model="item.checked" density="compact" hide-details />
            </td>
            <td>{{ item.name }}</td>
            <td>-</td>
            <td>{{ item.unit.toLocaleString() }}</td>
            <td>1</td>
            <td>{{ billingTypeDesc[item.billing_type || 'initial'] }}</td>
            <td>
              <span>{{ item.amount.toLocaleString() }}</span>
            </td>
            <td>
            </td>
          </tr>
          <!-- 추가 항목 -->
          <tr v-for="(item, idx) in customForm" :key="'custom-' + idx">
            <td>
              <VCheckbox v-model="item.checked" density="compact" hide-details />
            </td>
            <td>{{ item.name }}</td>
            <td>-</td>
            <td>
              <VTextField
                v-model.number="item.unit"
                type="number"
                min="0"
                density="compact"
                hide-details
                style="max-width:120px"
                @update:modelValue="(val) => { if (!item.manual) item.amount = item.qna * val }"
              />
            </td>
            <td>
              <VTextField
                v-model.number="item.qna"
                type="number"
                min="0"
                density="compact"
                hide-details
                @update:modelValue="(val) => { if (!item.manual) item.amount = item.unit * val }"
              />
            </td>
            <td>
              <VTextField
                v-model.number="item.memo"
                density="compact"
                hide-details
                style="max-width:120px"
              />
            </td>
            <td>
              <VTextField
                v-model.number="item.amount"
                type="number"
                min="0"
                density="compact"
                hide-details
                style="max-width:120px"
              />
            </td>
            <td>
              <VBtn
                icon
                variant="text"
                size="small"
                color="error"
                @click="removeCustomBillingItem(idx)"
                class="me-2"
              >
                <VIcon>ri-delete-bin-line</VIcon>
              </VBtn>
            </td>
          </tr>
          <!-- 추가 버튼 행 -->
          <tr v-if="!showInlineAdd">
            <td colspan="8" class="text-center">
              <VBtn color="primary" @click="showInlineAdd = true" size="small">
                <VIcon start>ri-add-line</VIcon> 請求項目追加
              </VBtn>
            </td>
          </tr>
          <!-- 인라인 입력 행 -->
          <tr v-else>
            <td><VCheckbox v-model="inlineNewItem.checked" density="compact" hide-details /></td>
            <td><VTextField v-model="inlineNewItem.name" density="compact" hide-details /></td>
            <td>-</td>
            <td><VTextField v-model.number="inlineNewItem.unit" type="number" min="1" density="compact" hide-details /></td>
            <td><VTextField v-model.number="inlineNewItem.qna" type="number" min="1" density="compact" hide-details /></td>
            <td><VTextField v-model.number="inlineNewItem.memo" density="compact" hide-details /></td>
            <td>-</td>
            <td>
              <VBtn class="mr-2" icon size="small" color="primary" @click="addInlineItem">
                <VIcon>ri-check-line</VIcon>
              </VBtn>
              <VBtn icon size="small" color="error" @click="showInlineAdd = false">
                <VIcon>ri-close-line</VIcon>
              </VBtn>
            </td>
          </tr>
          <!-- 합계 행 -->
          <tr>
            <td colspan="7" class="text-right font-weight-bold">選択項目合計</td>
            <td class="font-weight-bold">{{ totalSelectedAmount.toLocaleString() }} 円</td>
          </tr>
        </tbody>
      </VTable>
      <div class="d-flex justify-end mt-4">
        <VBtn v-if="!thisMonthInvoice" color="primary" @click="saveInvoice">保存</VBtn>
        <VBtn v-else color="primary" @click="updateInvoice">修正</VBtn>
      </div>
    </VCardText>
  </VCard>

  <VCard>
    <VCardText>
      <VRow>
        <!-- 에러 메시지 -->
        <VCol
          v-if="error"
          cols="12"
        >
          <VAlert
            type="error"
            variant="tonal"
            class="mb-3"
          >
            {{ error }}
          </VAlert>
        </VCol>

        <!-- 헤더 -->
        <VCol cols="12">
          <div class="d-flex justify-space-between align-center mb-4">
            <h2 class="text-h4">
              請求書情報リスト
            </h2>
          </div>
        </VCol>

        <!-- 청구서 목록 -->
        <VCol cols="12">
          <VTable>
            <thead>
              <tr>
                <th>請求書番号</th>
                <th>請求作成日</th>
                <th>納付期限</th>
                <th>金額</th>
                <th>状態</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="invoice in invoices"
                :key="invoice.id || `${invoice.year}-${invoice.month}`"
              >
                <td>{{ invoice.invoice_number }}</td>
                <td>{{ `${invoice.year}-${invoice.month.toString().padStart(2, '0')}-01` }}</td>
                <td>{{ getLastDayOfMonth(`${invoice.year}-${invoice.month.toString().padStart(2, '0')}-01`) }}</td>
                <td>{{ formatAmount(invoice.total_amount)}}円</td>
                <td>
                  <VChip
                    :color="getStatusColor(invoice.status)"
                    size="small"
                  >
                    {{ getStatusText(invoice.status) }}
                  </VChip>
                </td>
                <td>
                  <VBtn
                    icon
                    variant="text"
                    color="primary"
                    size="small"
                    @click="viewInvoice(invoice.id)"
                  >
                    <VIcon>ri-eye-line</VIcon>
                  </VBtn>
                </td>
              </tr>
            </tbody>
          </VTable>
        </VCol>
      </VRow>
    </VCardText>
  </VCard>

  <InvoiceDetailDialog
    v-model="showInvoiceDialog"
    :invoice="selectedInvoice"
  />
</template>

<style scoped>
.v-table {
  background: white;
  border-radius: 4px;
}

.v-table th {
  font-weight: 500;
  color: rgba(var(--v-theme-on-surface), 0.7);
}

.v-table td {
  color: rgba(var(--v-theme-on-surface), 0.87);
}

.text-red {
  color: red;
}
</style>

