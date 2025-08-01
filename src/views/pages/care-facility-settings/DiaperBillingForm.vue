<script setup lang="ts">
import { ref, defineProps, watch, nextTick } from 'vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import { careItemService } from '@/services/careItem'

const headers = [
  { key: 'name', label: '名前', width: 150, fixed: true},
  { key: 'room_number', label: '部屋番号', width: 100, fixed: false },
  { key: 'age', label: '年齢', width: 80, fixed: false },
  { key: 'gender', label: '性別', width: 80, fixed: false },
  { key: 'diaper', label: '種類', width: 420, left: 150, fixed: true},
];

const diaperTypes = ref<{ label: string; value: string; price: number }[]>([])

interface Resident {
  id: string
  name: string
  room_number: string
  age: number
  gender: 'male' | 'female'
}

interface DiaperItem {
  id: string
  diaperType: string
  dailyCounts: Record<string, number>
}

const props = defineProps<{
  residents: Resident[]
  daysInMonth: { day: number; date: string; dayOfWeek: string; isToday: boolean }[]
}>()

// 거주자별 항목 관리
const residentDiapers = ref<Record<string, DiaperItem[]>>({})
const addSelectValues = ref<Record<string, string | null>>({}) // residentId별 임시 선택값
const dialogOpen = ref(false)
const pendingDelete = ref<{ residentId: string, itemId: string } | null>(null)

const ensureEmptyItem = (residentId: string) => {
  const items = residentDiapers.value[residentId] || []
  // 빈 항목이 2개 이상이면 1개만 남기고 모두 제거
  const emptyItems = items.filter(item => !item.diaperType)
  if (emptyItems.length > 1) {
    // 첫 번째만 남기고 나머지 삭제
    emptyItems.slice(1).forEach(item => {
      const idx = items.indexOf(item)
      if (idx !== -1) items.splice(idx, 1)
    })
  }
  // 빈 항목이 없으면 추가
  if (emptyItems.length === 0) {
    items.push({
      id: Math.random().toString(36).slice(2),
      diaperType: '',
      dailyCounts: Object.fromEntries(props.daysInMonth.map(day => [day.date, 0])),
    })
  }
  residentDiapers.value[residentId] = items
}

const handleDiaperTypeChange = (residentId: string, item: DiaperItem, newType: string) => {
  item.diaperType = newType
  ensureEmptyItem(residentId)
}

const askRemoveDiaperItem = (residentId: string, itemId: string) => {
  pendingDelete.value = { residentId, itemId }
  dialogOpen.value = true
}

const confirmRemoveDiaperItem = () => {
  if (pendingDelete.value) {
    const { residentId, itemId } = pendingDelete.value
    const items = residentDiapers.value[residentId] || []
    if (items.length > 1) {
      residentDiapers.value[residentId] = items.filter(item => item.id !== itemId)
    }
  }
  dialogOpen.value = false
  pendingDelete.value = null
}

const getDiaperItems = (residentId: string) => {
  const items = (residentDiapers.value && residentDiapers.value[residentId]) ? residentDiapers.value[residentId] : []
  // 선택된 항목만 반환 (diaperType이 있는 것)
  return items.filter(item => !!item.diaperType)
}

const addDiaperItem = (residentId: string, diaperType: string) => {
  const items = residentDiapers.value[residentId] || []
  items.push({
    id: Math.random().toString(36).slice(2),
    diaperType,
    dailyCounts: Object.fromEntries(props.daysInMonth.map(day => [day.date, 0])),
  })
  residentDiapers.value[residentId] = items
  addSelectValues.value[residentId] = null // 선택 후 셀렉트 초기화
}

const scrollToToday = () => {
  const tableContainer = document.querySelector('.v-table__wrapper')
  if (tableContainer) {
    const todayIndex = props.daysInMonth.findIndex(day => day.isToday)
    if (todayIndex >= 0) {

      const ths = tableContainer.querySelectorAll('th')
      const targetTh = ths[todayIndex] as HTMLElement
      if (targetTh) {
        tableContainer.scrollTo({
          left: targetTh.offsetLeft - 150, // 이름 컬럼 너비만큼 보정
          behavior: 'smooth'
        })
      }
    }
  }
}

// 컴포넌트 마운트 및 daysInMonth 변경 시, 각 거주자별로 최소 1줄 보장
watch(
  [() => props.residents, () => props.daysInMonth],
  ([newResidents, newDays]) => {
    newResidents.forEach(resident => {
      if (!residentDiapers.value[resident.id]) {
        residentDiapers.value[resident.id] = [
          {
            id: Math.random().toString(36).slice(2),
            diaperType: '',
            dailyCounts: Object.fromEntries(newDays.map(day => [day.date, 0])),
          },
        ]
      } else {
        // 날짜가 바뀌면 dailyCounts도 맞춰줌
        residentDiapers.value[resident.id].forEach(item => {
          newDays.forEach(day => {
            if (!(day.date in item.dailyCounts)) {
              item.dailyCounts[day.date] = 0
            }
          })
        })
      }
      ensureEmptyItem(resident.id)
    })
  },
  { immediate: true }
)

const fetchDiaperTypes = async () => {
  try {
    const items = await careItemService.getCareItems({ is_active: true })
    diaperTypes.value = items.map(item => ({ 
      label: item.name, 
      value: item.id, 
      price: item.price || 0 
    }))
    console.log(diaperTypes.value)
  } catch (err: any) {
    console.error('種類リストの取得に失敗しました:', err)
  }
}

onMounted(async () => {
  // 오늘 날짜로 스크롤
  nextTick(() => {
    scrollToToday()
  })
  await fetchDiaperTypes()
})

// 각 항목별 합계 계산 함수
const getItemTotal = (item: DiaperItem) => {
  return Object.values(item.dailyCounts).reduce((sum, count) => sum + count, 0)
}

// 각 항목별 금액 계산 함수
const getItemAmount = (item: DiaperItem) => {
  const total = getItemTotal(item)
  const diaperType = diaperTypes.value.find(type => type.value === item.diaperType)
  const price = diaperType?.price || 0
  return total * price
}

// 거주자별 전체 합계 계산 함수
const getResidentTotal = (residentId: string) => {
  const items = getDiaperItems(residentId)
  return items.reduce((sum, item) => sum + getItemTotal(item), 0)
}

// 거주자별 전체 금액 계산 함수
const getResidentAmount = (residentId: string) => {
  const items = getDiaperItems(residentId)
  return items.reduce((sum, item) => sum + getItemAmount(item), 0)
}

// 전체 합계 계산 함수
const getGrandTotal = () => {
  return props.residents.reduce((sum, resident) => sum + getResidentTotal(resident.id), 0)
}
</script>

<template>
  <div class="table-container">
    <VTable class="diaper-billing-table" density="compact">
      <thead>
        <tr>
          <th
            v-for="col in headers"
            :key="col.key"
            :class="col.fixed ? 'fixed-column ' + col.key + '-col' : ''"
            :style="`min-width: ${col.width}px;${col.fixed ? `left: ${col.left}px; z-index: 10};` : ''}`"
          >
            {{ col.label }}
          </th>
          <th
            v-for="day in props.daysInMonth"
            :key="day.date"
            style="min-width: 120px"
            :class="{ 'today-column': day.isToday }"
          >
            <div class="d-flex flex-column align-center">
              <span class="text-caption">{{ day.day }}日({{ day.dayOfWeek }})</span>
            </div>
          </th>
          <!-- 합계 헤더 -->
          <th
            style="min-width: 120px; background-color: rgba(var(--v-theme-primary), 0.1);"
            class="total-header-column"
          >
            <div class="d-flex flex-column align-center">
              <span class="text-caption font-weight-bold">合計</span>
            </div>
          </th>
          <!-- 금액 합계 헤더 -->
          <th
            style="min-width: 120px; background-color: rgba(var(--v-theme-success), 0.1);"
            class="amount-header-column"
          >
            <div class="d-flex flex-column align-center">
              <span class="text-caption font-weight-bold">金額</span>
            </div>
          </th>
          <!-- 총금액 헤더 -->
          <th
            style="min-width: 120px; background-color: rgba(var(--v-theme-success), 0.2);"
            class="total-amount-header-column"
          >
            <div class="d-flex flex-column align-center">
              <span class="text-caption font-weight-bold">総金額</span>
            </div>
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="resident in props.residents" :key="resident.id">
          <td
            v-for="col in headers"
            :key="col.key"
            :class="col.fixed ? 'fixed-column ' + col.key + '-col' : ''"
            :style="`width: ${col.width}px;${col.fixed ? `left: ${col.left}px;z-index:10;` : ''}`"
          >
            <template v-if="col.key === 'name'">{{ resident.name }}</template>
            <template v-else-if="col.key === 'room_number'">{{ resident.room_number }}</template>
            <template v-else-if="col.key === 'age'">{{ resident.age }}歳</template>
            <template v-else-if="col.key === 'gender'">{{ resident.gender === 'male' ? '男性' : '女性' }}</template>
            <template v-else-if="col.key === 'diaper'">
              <div v-for="item in getDiaperItems(resident?.id || '')" :key="item.id" class="mb-2 d-flex align-center gap-2 pt-2">
                <span class="diaper-type-label">
                  {{ (diaperTypes || []).find(type => type.value === item.diaperType)?.label || item.diaperType }}
                </span>
                <VBtn v-if="getDiaperItems(resident?.id || '').length > 0" icon size="small" color="error" variant="text" @click="askRemoveDiaperItem(resident?.id || '', item.id)">
                  <VIcon>ri-delete-bin-line</VIcon>
                </VBtn>
              </div>
              <!-- 추가용 빈 항목은 무조건 한 줄 -->
              <div class="mb-2 d-flex align-center gap-2">
                <VSelect
                  v-model="addSelectValues[resident?.id || '']"
                  :items="(diaperTypes || []).filter(type => !getDiaperItems(resident?.id || '').some(i => i.diaperType === type.value))"
                  item-title="label"
                  item-value="value"
                  label="追加"
                  density="compact"
                  hide-details
                  class="pt-2"
                  style="min-width: 120px"
                  @update:model-value="val => { if(val) { addDiaperItem(resident?.id || '', val) } }"
                />
              </div>
            </template>
          </td>
          <td v-for="day in props.daysInMonth" :key="day.date" :class="{ 'today-column': day.isToday }">
            <div style="display: flex; flex-direction: column; height: 100%;">
              <div
                v-for="item in getDiaperItems(resident.id)"
                :key="item.id"
                class="mb-2 pt-2"
                style="align-self: flex-start;"
              >
                <VTextField
                  v-model.number="item.dailyCounts[day.date]"
                  type="number"
                  min="0"
                  density="compact"
                  hide-details
                  style="width: 60px"
                />
              </div>
              <!-- 추가용 빈 항목은 수량 입력 없음 -->
              <div class="mb-2"></div>
            </div>
          </td>
          <!-- 합계 컬럼 -->
          <td
            class="total-column"
            style="background-color: rgba(var(--v-theme-primary), 0.1);"
          >
            <div style="display: flex; flex-direction: column; height: 100%;">
              <div
                v-for="item in getDiaperItems(resident?.id || '')"
                :key="item.id"
                class="mb-2 pt-2 mt-1"
                style="align-self: flex-start;"
              >
                <div class="d-flex align-center justify-center" style="width: 60px; height: 32px;">
                  <span class="text-h6 font-weight-bold text-primary">{{ getItemTotal(item) }}</span>
                </div>
              </div>
              <!-- 추가용 빈 항목은 수량 입력 없음 -->
              <div class="mb-2"></div>
            </div>
          </td>
          <!-- 금액 합계 컬럼 -->
          <td
            class="amount-column"
            style="background-color: rgba(var(--v-theme-success), 0.1);"
          >
            <div style="display: flex; flex-direction: column; height: 100%;">
              <div
                v-for="item in getDiaperItems(resident?.id || '')"
                :key="item.id"
                class="mb-2 pt-2 mt-1"
                style="align-self: flex-start;"
              >
                <div class="d-flex align-center justify-center" style="width: 80px; height: 32px;">
                  <span class="text-h6 font-weight-bold text-success">¥{{ getItemAmount(item).toLocaleString() }}</span>
                </div>
              </div>
              <!-- 추가용 빈 항목은 수량 입력 없음 -->
              <div class="mb-2"></div>
            </div>
          </td>
          <!-- 총금액 컬럼 -->
          <td
            class="total-amount-column"
            style="background-color: rgba(var(--v-theme-success), 0.2);"
          >
            <div class="d-flex align-center justify-center" style="height: 100%;">
              <span class="text-h6 font-weight-bold text-success">¥{{ getResidentAmount(resident?.id || '').toLocaleString() }}</span>
            </div>
          </td>
        </tr>
      </tbody>
    </VTable>
  </div>
  <ConfirmDialog
    v-model:open="dialogOpen"
    title="削除の確認"
    message="本当に削除しますか？"
    confirmText="削除"
    cancelText="キャンセル"
    icon="mdi-delete-outline"
    color="error"
    @confirm="confirmRemoveDiaperItem"
  />
</template>

<style lang="scss" scoped>
.today-column {
  background-color: rgba(var(--v-theme-primary), 0.08);
}
.text-caption {
  font-size: 13px;
  color: #222;
}
.table-container {
  overflow-x: scroll; // 항상 스크롤바 표시
  border-radius: 8px;
  border: 1px solid rgb(var(--v-border-color));
}

.diaper-billing-table {
  min-width: 100%;
  
  th, td {
    border: 1px solid rgb(var(--v-border-color));
    padding: 8px;
    text-align: center;
    vertical-align: middle;
    color: #222 !important;
    font-weight: 500 !important;
    font-size: 15px;
  }
  
  // 헤더 고정
  thead {
    position: sticky;
    top:0;
    z-index:2; 
    background-color: rgb(var(--v-theme-surface));
  }
  
  .fixed-column {
    position: sticky;
    background-color: rgb(var(--v-theme-surface));
    border-right:2px solid rgb(var(--v-border-color));
  }
  .name-col {
    left: 0;
    z-index: 3;
  }
  .room-col {
    left: 150px;
    z-index: 2;
  }
  
  .today-column {
    background-color: rgba(var(--v-theme-primary), 0.1);
  }
  
  .diaper-btn {
    min-width: 32px !important;
    width: 32px !important;
    height: 32px !important;
    padding: 0 !important;
    margin: 0;
  }
  
  // 캡션 등도 선명하게
  .text-caption {
    color: #222 !important;
    font-weight: 500 !important;
    font-size: 14px !important;
  }
}

  .diaper-type-label {
    min-width: 120px;
    display: inline-block;
    font-size: 1rem;
    padding: 4px 8px;
    background: #f5f5f5;
    border-radius: 6px;
    text-align: left;
  }

  .total-column {
    border-left: 2px solid rgba(var(--v-theme-primary), 0.3) !important;
  }

  .total-header-column {
    border-left: 3px solid rgb(var(--v-theme-primary)) !important;
    font-weight: bold;
  }

  .amount-header-column {
    border-left: 3px solid rgb(var(--v-theme-success)) !important;
    font-weight: bold;
  }

  .amount-column {
    border-left: 2px solid rgba(var(--v-theme-success), 0.3) !important;
  }

  .total-amount-header-column {
    border-left: 3px solid rgb(var(--v-theme-success)) !important;
    font-weight: bold;
  }

  .total-amount-column {
    border-left: 2px solid rgba(var(--v-theme-success), 0.3) !important;
  }

  .grand-total-column {
    border-left: 3px solid rgb(var(--v-theme-primary)) !important;
    font-weight: bold;
  }

// 스크롤바 스타일링
.table-container::-webkit-scrollbar {
  height: 12px;
  background: #eee;
}

.table-container::-webkit-scrollbar-track {
  background: #eee;
  border-radius: 6px;
}

.table-container::-webkit-scrollbar-thumb {
  background: #bdbdbd;
  border-radius: 6px;
  border: 2px solid #eee;
}

.table-container::-webkit-scrollbar-thumb:hover {
  background: #888;
}
</style> 