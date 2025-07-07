<script lang="ts" setup>
import type { Billing } from '@/types/billing'
import { onMounted, ref } from 'vue'

// 더미 데이터
const dummyBillings: Billing[] = [
  {
    id: 1,
    student_id: 1,
    student_name: '홍길동',
    billing_date: '2024-03-01',
    due_date: '2024-03-15',
    total_amount: 350000,
    status: 'pending',
    items: [
      {
        id: 1,
        name: '월세',
        amount: 300000,
        description: '3월 월세',
      },
      {
        id: 2,
        name: '관리비',
        amount: 50000,
        description: '3월 관리비',
      },
    ],
    created_at: '2024-03-01T00:00:00',
    updated_at: '2024-03-01T00:00:00',
  },
  {
    id: 2,
    student_id: 2,
    student_name: '김철수',
    billing_date: '2024-03-01',
    due_date: '2024-03-15',
    total_amount: 350000,
    status: 'paid',
    items: [
      {
        id: 3,
        name: '월세',
        amount: 300000,
        description: '3월 월세',
      },
      {
        id: 4,
        name: '관리비',
        amount: 50000,
        description: '3월 관리비',
      },
    ],
    created_at: '2024-03-01T00:00:00',
    updated_at: '2024-03-01T00:00:00',
  },
]

const billings = ref<Billing[]>([])
const loading = ref(false)
const error = ref<string | null>(null)

// 청구서 목록 조회
const fetchBillings = async () => {
  try {
    loading.value = true
    error.value = null
    
    // API 연동 전 더미 데이터 사용
    // billings.value = await billingService.getBillings()
    billings.value = dummyBillings
  }
  catch (err: any) {
    error.value = err.response?.data?.message || '청구서 목록을 불러오는데 실패했습니다.'
  }
  finally {
    loading.value = false
  }
}

// 상태에 따른 색상 반환
const getStatusColor = (status: Billing['status']) => {
  switch (status) {
    case 'pending':
      return 'warning'
    case 'paid':
      return 'success'
    case 'overdue':
      return 'error'
    default:
      return 'primary'
  }
}

// 상태에 따른 텍스트 반환
const getStatusText = (status: Billing['status']) => {
  switch (status) {
    case 'pending':
      return '미납'
    case 'paid':
      return '납부완료'
    case 'overdue':
      return '연체'
    default:
      return status
  }
}

// 금액 포맷팅
const formatAmount = (amount: number) => {
  return new Intl.NumberFormat('ko-KR').format(amount)
}

onMounted(() => {
  fetchBillings()
})
</script>

<template>
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
              월세 청구서
            </h2>
            <VBtn
              color="primary"
              prepend-icon="ri-add-line"
            >
              청구서 생성
            </VBtn>
          </div>
        </VCol>

        <!-- 청구서 목록 -->
        <VCol cols="12">
          <VTable>
            <thead>
              <tr>
                <th>학생명</th>
                <th>청구일</th>
                <th>납부기한</th>
                <th>금액</th>
                <th>상태</th>
                <th>작업</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="billing in billings"
                :key="billing.id"
              >
                <td>{{ billing.student_name }}</td>
                <td>{{ billing.billing_date }}</td>
                <td>{{ billing.due_date }}</td>
                <td>{{ formatAmount(billing.total_amount) }}원</td>
                <td>
                  <VChip
                    :color="getStatusColor(billing.status)"
                    size="small"
                  >
                    {{ getStatusText(billing.status) }}
                  </VChip>
                </td>
                <td>
                  <VBtn
                    icon
                    variant="text"
                    color="primary"
                    size="small"
                  >
                    <VIcon>ri-eye-line</VIcon>
                  </VBtn>
                  <VBtn
                    icon
                    variant="text"
                    color="error"
                    size="small"
                  >
                    <VIcon>ri-delete-bin-line</VIcon>
                  </VBtn>
                </td>
              </tr>
            </tbody>
          </VTable>
        </VCol>
      </VRow>
    </VCardText>
  </VCard>

  <!-- 청구서 상세 다이얼로그 -->
  <VDialog
    max-width="600px"
  >
    <VCard>
      <VCardTitle class="text-h5 pa-4">
        청구서 상세
      </VCardTitle>

      <VCardText>
        <VRow>
          <VCol cols="12">
            <VTable>
              <tbody>
                <tr>
                  <th>학생명</th>
                  <td>홍길동</td>
                </tr>
                <tr>
                  <th>청구일</th>
                  <td>2024-03-01</td>
                </tr>
                <tr>
                  <th>납부기한</th>
                  <td>2024-03-15</td>
                </tr>
                <tr>
                  <th>상태</th>
                  <td>
                    <VChip
                      color="warning"
                      size="small"
                    >
                      미납
                    </VChip>
                  </td>
                </tr>
              </tbody>
            </VTable>
          </VCol>

          <VCol cols="12">
            <h3 class="text-h6 mb-2">
              청구 항목
            </h3>
            <VTable>
              <thead>
                <tr>
                  <th>항목</th>
                  <th>설명</th>
                  <th>금액</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>월세</td>
                  <td>3월 월세</td>
                  <td>300,000원</td>
                </tr>
                <tr>
                  <td>관리비</td>
                  <td>3월 관리비</td>
                  <td>50,000원</td>
                </tr>
                <tr>
                  <td colspan="2" class="text-right font-weight-bold">
                    합계
                  </td>
                  <td class="font-weight-bold">
                    350,000원
                  </td>
                </tr>
              </tbody>
            </VTable>
          </VCol>
        </VRow>
      </VCardText>

      <VCardActions class="pa-4">
        <VSpacer />
        <VBtn
          color="primary"
          variant="tonal"
        >
          닫기
        </VBtn>
      </VCardActions>
    </VCard>
  </VDialog>
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
</style> 
