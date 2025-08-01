<script setup lang="ts">
import { ref, defineProps } from 'vue'

interface ElectricityRecord {
  month: number
  reading_date: string
  usage: number
  base_amount: number
  total_amount: number
}

const props = defineProps<{
  selectedYear: number
}>()

// 월별 전기 요금 데이터
const electricityRecords = ref<ElectricityRecord[]>([])

// 월 옵션
const monthOptions = Array.from({ length: 12 }, (_, i) => ({
  title: `${i + 1}月`,
  value: i + 1,
}))

// 초기 데이터 설정
const initializeRecords = () => {
  const records: ElectricityRecord[] = []
  
  for (let month = 1; month <= 12; month++) {
    records.push({
      month,
      reading_date: '',
      usage: 0,
      base_amount: 0,
      total_amount: 0,
    })
  }
  
  electricityRecords.value = records
}

// 세금포함 요금 계산 (10% 부가세)
const calculateTotalAmount = (baseAmount: number) => {
  return Math.round(baseAmount * 1.1)
}

// 사용량 변경 시 요금 자동 계산
const handleUsageChange = (month: number, usage: number) => {
  const record = electricityRecords.value.find(r => r.month === month)
  if (record) {
    record.usage = usage
    // 간단한 요금 계산 (실제로는 더 복잡한 계산식이 필요)
    record.base_amount = Math.round(usage * 25) // 예시: 1kWh당 25엔
    record.total_amount = calculateTotalAmount(record.base_amount)
  }
}

// 기본 요금 변경 시 세금포함 요금 자동 계산
const handleBaseAmountChange = (month: number, baseAmount: number) => {
  const record = electricityRecords.value.find(r => r.month === month)
  if (record) {
    record.base_amount = baseAmount
    record.total_amount = calculateTotalAmount(baseAmount)
  }
}

// 컴포넌트 마운트 시 초기화
initializeRecords()
</script>

<template>
  <div class="electricity-billing-form">
    <VCard>
      <VCardTitle class="d-flex align-center gap-2">
        <VIcon>ri-flashlight-line</VIcon>
        <span>電気料金入力</span>
      </VCardTitle>
      <VCardText>
        <VTable class="electricity-table" density="compact">
          <thead>
            <tr>
              <th style="min-width: 80px;">月</th>
              <th style="min-width: 120px;">検針日</th>
              <th style="min-width: 100px;">使用量(kWh)</th>
              <th style="min-width: 120px;">基本料金(円)</th>
              <th style="min-width: 120px;">税込料金(円)</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="month in monthOptions" :key="month.value">
              <td class="text-center font-weight-medium">
                {{ month.title }}
              </td>
              <td>
                <VTextField
                  :model-value="electricityRecords.find(r => r.month === month.value)?.reading_date || ''"
                  @update:model-value="(val) => {
                    const record = electricityRecords.find(r => r.month === month.value)
                    if (record) record.reading_date = val
                  }"
                  type="date"
                  density="compact"
                  hide-details
                  variant="outlined"
                  size="small"
                />
              </td>
              <td>
                <VTextField
                  :model-value="electricityRecords.find(r => r.month === month.value)?.usage"
                  @update:model-value="(val) => handleUsageChange(month.value, Number(val) || 0)"
                  type="number"
                  density="compact"
                  hide-details
                  variant="outlined"
                  size="small"
                  suffix="kWh"
                />
              </td>
              <td>
                <VTextField
                  :model-value="electricityRecords.find(r => r.month === month.value)?.base_amount"
                  @update:model-value="(val) => handleBaseAmountChange(month.value, Number(val) || 0)"
                  type="number"
                  density="compact"
                  hide-details
                  variant="outlined"
                  size="small"
                  suffix="円"
                />
              </td>
              <td>
                <VTextField
                  :model-value="electricityRecords.find(r => r.month === month.value)?.total_amount"
                  type="number"
                  density="compact"
                  hide-details
                  variant="outlined"
                  size="small"
                  suffix="円"
                  readonly
                  class="total-amount-field"
                />
              </td>
            </tr>
          </tbody>
        </VTable>
        
        <!-- 요약 정보 -->
        <div class="mt-6">
          <VCard variant="outlined">
            <VCardText>
              <div class="d-flex justify-space-between align-center">
                <div>
                  <h6 class="text-h6 mb-2">年間合計</h6>
                  <div class="d-flex gap-4">
                    <div>
                      <span class="text-caption text-medium-emphasis">総使用量:</span>
                      <span class="text-h6 font-weight-bold ml-2">
                        {{ electricityRecords.reduce((sum, record) => sum + record.usage, 0).toLocaleString() }} kWh
                      </span>
                    </div>
                    <div>
                      <span class="text-caption text-medium-emphasis">総料金:</span>
                      <span class="text-h6 font-weight-bold text-primary ml-2">
                        ¥{{ electricityRecords.reduce((sum, record) => sum + record.total_amount, 0).toLocaleString() }}
                      </span>
                    </div>
                  </div>
                </div>
                <VBtn
                  color="primary"
                  prepend-icon="ri-save-line"
                  size="small"
                >
                  保存
                </VBtn>
              </div>
            </VCardText>
          </VCard>
        </div>
      </VCardText>
    </VCard>
  </div>
</template>

<style lang="scss" scoped>
.electricity-billing-form {
  .electricity-table {
    th, td {
      border: 1px solid rgb(var(--v-border-color));
      padding: 8px;
      text-align: center;
      vertical-align: middle;
    }
    
    th {
      background-color: rgba(var(--v-theme-primary), 0.1);
      font-weight: bold;
    }
  }
  
  .total-amount-field {
    background-color: rgba(var(--v-theme-success), 0.1);
    
    :deep(.v-field__input) {
      color: rgb(var(--v-theme-success));
      font-weight: bold;
    }
  }
}
</style> 