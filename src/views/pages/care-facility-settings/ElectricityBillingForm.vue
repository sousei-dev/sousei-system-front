<script setup lang="ts">
import { ref, defineProps } from 'vue'

interface ElectricityRecord {
  personId: string
  personName: string
  month: number
  reading_date: string
  previous_usage: number
  usage: number
  base_amount: number
  total_amount: number
}

const props = defineProps<{
  selectedYear: number
}>()

// 사람별 월별 전기 요금 데이터
const electricityRecords = ref<ElectricityRecord[]>([])

// 사람 목록 (예시 데이터)
const people = ref([
  { id: '1', name: '田中太郎' },
  { id: '2', name: '佐藤花子' },
  { id: '3', name: '鈴木一郎' },
])

// 월 옵션
const monthOptions = Array.from({ length: 12 }, (_, i) => ({
  title: `${i + 1}月`,
  value: i + 1,
}))

// 초기 데이터 설정
const initializeRecords = () => {
  const records: ElectricityRecord[] = []

  for (const person of people.value) {
    for (let month = 1; month <= 12; month++) {
      records.push({
        personId: person.id,
        personName: person.name,
        month,
        reading_date: '',
        previous_usage: 0,
        usage: 0,
        base_amount: 0,
        total_amount: 0,
      })
    }
  }

  electricityRecords.value = records
}

// 세금포함 요금 계산 (10% 부가세)
const calculateTotalAmount = (baseAmount: number) => {
  return Math.round(baseAmount * 1.1)
}

// 사용량 변경 시 요금 자동 계산
const handleUsageChange = (personId: string, month: number, usage: number) => {
  const record = electricityRecords.value.find(r => r.personId === personId && r.month === month)
  if (record) {
    record.usage = usage
    // 간단한 요금 계산 (실제로는 더 복잡한 계산식이 필요)
    record.base_amount = Math.round(usage * 25) // 예시: 1kWh당 25엔
    record.total_amount = calculateTotalAmount(record.base_amount)
  }
}

// 기본 요금 변경 시 세금포함 요금 자동 계산
const handleBaseAmountChange = (personId: string, month: number, baseAmount: number) => {
  const record = electricityRecords.value.find(r => r.personId === personId && r.month === month)
  if (record) {
    record.base_amount = baseAmount
    record.total_amount = calculateTotalAmount(baseAmount)
  }
}

// 사람별 월별 데이터 가져오기
const getRecord = (personId: string, month: number) => {
  return electricityRecords.value.find(r => r.personId === personId && r.month === month)
}

// 사람별 총계 계산
const getPersonTotal = (personId: string) => {
  const personRecords = electricityRecords.value.filter(r => r.personId === personId)
  return {
    totalUsage: personRecords.reduce((sum, record) => sum + record.usage, 0),
    totalAmount: personRecords.reduce((sum, record) => sum + record.total_amount, 0),
  }
}

// 전체 총계 계산
const getOverallTotal = () => {
  return {
    totalUsage: electricityRecords.value.reduce((sum, record) => sum + record.usage, 0),
    totalAmount: electricityRecords.value.reduce((sum, record) => sum + record.total_amount, 0),
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
        <span>電気料金入力 ({{ selectedYear }}年)</span>
      </VCardTitle>
      <VCardText>
        <div class="table-container">
          <VTable class="electricity-table" density="compact">
            <thead>
              <tr>
                <th style="min-width: 120px;">利用者</th>
                <template v-for="month in monthOptions" :key="month.value">
                  <th colspan="5" style="min-width: 400px;" class="month-group-header">
                    {{ month.title }}
                  </th>
                </template>
                <th style="min-width: 100px;">年間合計</th>
              </tr>
              <tr>
                <th style="min-width: 120px;"></th>
                <template v-for="month in monthOptions" :key="month.value">
                  <th style="min-width: 120px;" class="sub-header">前月使用量</th>
                  <th style="min-width: 140px;" class="sub-header">検針日</th>
                  <th style="min-width: 120px;" class="sub-header">使用量</th>
                  <th style="min-width: 120px;" class="sub-header">基本料金</th>
                  <th style="min-width: 80px;" class="sub-header">税込料金</th>
                </template>
                <th style="min-width: 100px;"></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="person in people" :key="person.id">
                <td class="person-name">
                  <div class="font-weight-medium">{{ person.name }}</div>
                </td>
                <template v-for="month in monthOptions" :key="month.value">
                  <td class="previous-usage-cell">
                    <span>0</span>
                  </td>
                  <td class="reading-date-cell">
                    <VTextField
                      :model-value="getRecord(person.id, month.value)?.reading_date || ''"
                      @update:model-value="(val) => {
                        const record = getRecord(person.id, month.value)
                        if (record) record.reading_date = val
                      }"
                      type="date"
                      density="compact"
                      hide-details
                      variant="outlined"
                      size="medium"
                      class="date-input"
                    />
                  </td>
                  <td class="usage-cell">
                    <VTextField
                      :model-value="getRecord(person.id, month.value)?.usage"
                      @update:model-value="(val) => handleUsageChange(person.id, month.value, Number(val) || 0)"
                      type="number"
                      density="compact"
                      hide-details
                      variant="outlined"
                      size="x-small"
                      suffix="kWh"
                      class="usage-input"
                    />
                  </td>
                  <td class="base-amount-cell">
                    <VTextField
                      :model-value="getRecord(person.id, month.value)?.base_amount"
                      @update:model-value="(val) => handleBaseAmountChange(person.id, month.value, Number(val) || 0)"
                      type="number"
                      density="compact"
                      hide-details
                      variant="outlined"
                      size="x-small"
                      suffix="円"
                      class="base-amount-input"
                    />
                  </td>
                  <td class="total-amount-cell">
                    <span class="total-amount">
                      ¥{{ getRecord(person.id, month.value)?.total_amount?.toLocaleString() || '0' }}
                    </span>
                  </td>
                </template>
                <td class="person-total">
                  <div class="total-info">
                    <div class="total-row">
                      <span class="label">総使用量:</span>
                      <span class="value">{{ getPersonTotal(person.id).totalUsage.toLocaleString() }} kWh</span>
                    </div>
                    <div class="total-row">
                      <span class="label">総料金:</span>
                      <span class="value total-amount">¥{{ getPersonTotal(person.id).totalAmount.toLocaleString() }}</span>
                    </div>
                  </div>
                </td>
              </tr>
            </tbody>
            <tfoot>
              <tr class="overall-total">
                <td class="font-weight-bold">全体合計</td>
                <template v-for="month in monthOptions" :key="month.value">
                  <td class="month-total">
                  </td>
                  <td class="month-total">
                  </td>
                  <td class="month-total">
                    <div class="month-summary">
                      <div>¥{{ electricityRecords.filter(r => r.month === month.value).reduce((sum, r) => sum + r.base_amount, 0).toLocaleString() }}</div>
                    </div>
                  </td>
                  <td class="month-total">
                    <div class="month-summary">
                      <div>¥{{ electricityRecords.filter(r => r.month === month.value).reduce((sum, r) => sum + r.total_amount, 0).toLocaleString() }}</div>
                    </div>
                  </td>
                </template>
                <td class="overall-total-amount">
                  <div class="total-info">
                    <div class="total-row">
                      <span class="label">総使用量:</span>
                      <span class="value">{{ getOverallTotal().totalUsage.toLocaleString() }} kWh</span>
                    </div>
                    <div class="total-row">
                      <span class="label">総料金:</span>
                      <span class="value total-amount">¥{{ getOverallTotal().totalAmount.toLocaleString() }}</span>
                    </div>
                  </div>
                </td>
              </tr>
            </tfoot>
          </VTable>
        </div>

        <!-- 저장 버튼 -->
        <div class="mt-6 d-flex justify-end">
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
</template>

<style lang="scss" scoped>
.electricity-billing-form {
  .table-container {
    overflow-x: auto;
  }

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
      font-size: 0.8rem;
      line-height: 1.2;
    }

    .month-group-header {
      background-color: rgba(var(--v-theme-primary), 0.15);
      font-weight: bold;
      font-size: 0.9rem;
      text-align: center;
      color: rgb(var(--v-theme-primary));
      border-bottom: 2px solid rgb(var(--v-theme-primary));
    }

    .sub-header {
      background-color: rgba(var(--v-theme-primary), 0.1);
      font-weight: bold;
      font-size: 0.7rem;
      line-height: 1.2;
      text-align: center;
    }

    .person-name {
      background-color: rgba(var(--v-theme-primary), 0.05);
      font-weight: bold;
    }

    .reading-date-cell,
    .usage-cell,
    .base-amount-cell,
    .total-amount-cell {
      padding: 4px;
      vertical-align: middle;

      .v-text-field {
        width: 100%;
        max-width: 100%;
      }

      .total-amount {
        font-weight: bold;
        color: rgb(var(--v-theme-success));
        display: block;
        text-align: center;
      }
    }

    .person-total {
      background-color: rgba(var(--v-theme-primary), 0.05);
      font-weight: bold;

      .total-info {
        .total-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 4px;
          font-size: 0.8rem;

          &:last-child {
            margin-bottom: 0;
          }

          .label {
            color: rgba(var(--v-theme-on-surface), 0.7);
          }

          .value {
            font-weight: bold;
          }

          .total-amount {
            color: rgb(var(--v-theme-success));
          }
        }
      }
    }

    .overall-total {
      background-color: rgba(var(--v-theme-primary), 0.1);
      font-weight: bold;

      .month-total {
        .month-summary {
          font-size: 0.7rem;
          text-align: center;

          div {
            margin-bottom: 2px;

            &:last-child {
              margin-bottom: 0;
            }
          }
        }
      }

      .overall-total-amount {
        .total-info {
          .total-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 4px;
            font-size: 0.8rem;

            &:last-child {
              margin-bottom: 0;
            }

            .label {
              color: rgba(var(--v-theme-on-surface), 0.7);
            }

            .value {
              font-weight: bold;
            }

            .total-amount {
              color: rgb(var(--v-theme-success));
            }
          }
        }
      }
    }
  }
}
</style>