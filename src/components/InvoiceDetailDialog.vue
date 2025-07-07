<template>
  <VDialog
    v-model="dialog"
    max-width="800px"
    persistent
  >
    <VCard>
      <VCardTitle class="text-h6 d-flex justify-space-between align-center">
        <span>請求書詳細情報</span>
        <VBtn
          icon
          variant="text"
          @click="closeDialog"
        >
          <VIcon>ri-close-line</VIcon>
        </VBtn>
      </VCardTitle>
      
      <VCardText v-if="invoice">
        <!-- 청구서 기본 정보 -->
        <VRow class="mb-4">
          <VCol cols="6">
            <div class="text-subtitle-2 text-medium-emphasis">請求書番号</div>
            <div class="text-body-1">{{ `${invoice.year}年 ${invoice.month}月` }}</div>
          </VCol>
          <VCol cols="6">
            <div class="text-subtitle-2 text-medium-emphasis">状態</div>
            <VChip
              :color="getStatusColor(invoice.payment_status)"
              size="small"
            >
              {{ getStatusText(invoice.payment_status) }}
            </VChip>
          </VCol>
        </VRow>

        <!-- 청구 항목 테이블 -->
        <div class="text-h6 mb-3">請求項目</div>
        <VTable>
          <thead>
            <tr>
              <th>項目名</th>
              <th>単価</th>
              <th>数量</th>
              <th>備考</th>
              <th>金額</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="item in invoice.items"
              :key="item.sort_order"
            >
              <td>{{ item.name }}</td>
              <td>{{ formatAmount(item.unit_price) }}円</td>
              <td>{{ item.quantity }}</td>
              <td>{{ item.memo }}</td>
              <td>{{ formatAmount(item.amount) }}円</td>
            </tr>
          </tbody>
        </VTable>

        <!-- 총 금액 -->
        <VRow class="mt-4">
          <VCol cols="12" class="text-right">
            <div class="text-h6">
              総金額: {{ formatAmount(getTotalAmount()) }}円
            </div>
          </VCol>
        </VRow>
      </VCardText>

      <VCardActions class="justify-end">
        <VBtn
          color="primary"
          @click="closeDialog"
        >
          閉じる
        </VBtn>
      </VCardActions>
    </VCard>
  </VDialog>
</template>

<script lang="ts" setup>
import type { Invoice } from '@/services/invoice';
import { computed } from 'vue';

interface Props {
  modelValue: boolean
  invoice: Invoice | null
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

const dialog = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

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

// 총 금액 계산
const getTotalAmount = () => {
  if (!props.invoice?.items) return 0
  return props.invoice.items.reduce((sum, item) => sum + item.amount, 0)
}

// 다이얼로그 닫기
const closeDialog = () => {
  dialog.value = false
}
</script>

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
</style> 
