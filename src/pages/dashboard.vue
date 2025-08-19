<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { studentService, type VisaRenewalStudent } from '@/services/student'

const router = useRouter()

// 비자갱신 임박 학생 상태
const visaRenewalStudents = ref<VisaRenewalStudent[]>([])
const loadingVisaStudents = ref(false)
const errorVisaStudents = ref<string | null>(null)
const isVisaCardExpanded = ref(true) // 카드 확장/축소 상태

// 비자갱신 임박 학생 조회
const fetchVisaRenewalStudents = async () => {
  try {
    loadingVisaStudents.value = true
    errorVisaStudents.value = null

    // ビザ更新が迫っている技能生を取得
    const response = await studentService.getVisaRenewalStudents()
    visaRenewalStudents.value = response.items || []
  } catch (error) {
    console.error('ビザ更新が迫っている技能生の取得中にエラーが発生しました:', error)
    errorVisaStudents.value = 'ビザ更新が迫っている技能生の取得に失敗しました。'
  } finally {
    loadingVisaStudents.value = false
  }
}

// 학생 상세 페이지로 이동
const goToStudentDetail = (studentId: string) => {
  router.push(`/student-detail/${studentId}`)
}

// 비자 상태에 따른 색상 반환
const getVisaStatusColor = (daysUntilExpiry: number) => {
  if (daysUntilExpiry <= 30) return 'error'
  if (daysUntilExpiry <= 60) return 'warning'
  return 'info'
}

onMounted(() => {
  fetchVisaRenewalStudents()
})
</script>

<template>
  <VRow class="match-height">
    <!-- 비자갱신 임박 학생 리스트 -->
    <VCol cols="12" md="6">
      <VCard>
        <VCardTitle class="d-flex align-center justify-space-between">
          <div class="d-flex align-center">
            <VIcon class="me-2" color="warning">ri-passport-line</VIcon>
            <span>ビザ更新が迫っている技能生</span>
          </div>
          <div class="d-flex align-center">
            <VBtn
              icon
              variant="text"
              size="small"
              @click="isVisaCardExpanded = !isVisaCardExpanded"
              class="me-2"
            >
              <VIcon>{{ isVisaCardExpanded ? 'ri-arrow-up-s-line' : 'ri-arrow-down-s-line' }}</VIcon>
            </VBtn>
            <VBtn
              icon
              variant="text"
              size="small"
              @click="fetchVisaRenewalStudents"
              :loading="loadingVisaStudents"
            >
              <VIcon>ri-refresh-line</VIcon>
            </VBtn>
          </div>
        </VCardTitle>
        
        <VCardText v-if="isVisaCardExpanded">
          <!-- 에러 메시지 -->
          <VAlert
            v-if="errorVisaStudents"
            type="error"
            variant="tonal"
            class="mb-4"
          >
            {{ errorVisaStudents }}
          </VAlert>
          
          <!-- 로딩 상태 -->
          <div v-if="loadingVisaStudents" class="d-flex justify-center align-center py-8">
            <VProgressCircular
              indeterminate
              color="primary"
              size="32"
            />
            <span class="ml-3">データを読み込み中...</span>
          </div>
          
          <!-- 학생 리스트 -->
          <div v-else-if="visaRenewalStudents.length > 0">
            <VList>
              <VListItem
                v-for="student in visaRenewalStudents"
                :key="student.id"
                @click="goToStudentDetail(student.id)"
                class="mb-2 cursor-pointer"
                :class="`border-${getVisaStatusColor(student.days_until_expiry)}`"
                style="border-left: 4px solid; border-radius: 4px;"
              >
                <template #prepend>
                  <VAvatar
                    :color="getVisaStatusColor(student.days_until_expiry)"
                    size="40"
                  >
                    <VIcon>ri-user-line</VIcon>
                  </VAvatar>
                </template>
                <VListItemTitle class="font-weight-bold">
                  {{ student.name }}
                </VListItemTitle>
                <VListItemSubtitle>
                  <div class="d-flex align-center">
                    <VIcon size="small" class="me-1">ri-calendar-line</VIcon>
                    在留カード有効期限: {{ new Date(student.residence_card_expiry).toLocaleDateString('ja-JP') }}
                  </div>
                  <div class="d-flex align-center mt-1">
                    <VIcon size="small" class="me-1">ri-time-line</VIcon>
                    <span :class="`text-${getVisaStatusColor(student.days_until_expiry)}`">
                      {{ student.expiry_status }}
                    </span>
                  </div>
                  <div class="d-flex align-center mt-1" v-if="student.company">
                    <VIcon size="small" class="me-1">ri-building-line</VIcon>
                    {{ student.company.name }}
                  </div>
                  <div class="d-flex align-center mt-1" v-if="student.current_room">
                    <VIcon size="small" class="me-1">ri-home-line</VIcon>
                    {{ student.current_room.building?.name }} {{ student.current_room.room_number }}号室
                  </div>
                </VListItemSubtitle>
                <template #append>
                  <VBtn
                    icon
                    variant="text"
                    size="small"
                    @click.stop="goToStudentDetail(student.id)"
                  >
                    <VIcon>ri-arrow-right-line</VIcon>
                  </VBtn>
                </template>
              </VListItem>
            </VList>
          </div>
          
          <!-- 데이터 없음 -->
          <div v-else class="text-center py-8">
            <VIcon size="64" color="grey-lighten-1">ri-check-line</VIcon>
            <p class="text-grey mt-2">ビザ更新が迫っている技能生はいません。</p>
          </div>
        </VCardText>
      </VCard>
    </VCol>

    <!-- 기존 대시보드 컴포넌트들 -->
    <!-- <VCol cols="12" md="6">
      <VRow class="match-height">
        <VCol cols="12" sm="6">
          <CardStatisticsVertical v-bind="totalProfit" />
        </VCol>
        <VCol cols="12" sm="6">
          <CardStatisticsVertical v-bind="newProject" />
        </VCol>
      </VRow>
    </VCol>

    <VCol cols="12" md="4">
      <AnalyticsAward />
    </VCol>

    <VCol cols="12" md="8">
      <AnalyticsTransactions />
    </VCol>

    <VCol cols="12" md="4">
      <AnalyticsWeeklyOverview />
    </VCol>

    <VCol cols="12" md="4">
      <AnalyticsTotalEarning />
    </VCol>

    <VCol cols="12" md="4">
      <VRow class="match-height">
        <VCol cols="12" sm="6">
          <AnalyticsTotalProfitLineCharts />
        </VCol>
        <VCol cols="12" sm="6">
          <AnalyticsBarCharts />
        </VCol>
      </VRow>
    </VCol>

    <VCol cols="12" md="4">
      <AnalyticsSalesByCountries />
    </VCol>

    <VCol cols="12" md="8">
      <AnalyticsDepositWithdraw />
    </VCol>

    <VCol cols="12">
      <AnalyticsUserTable />
    </VCol> -->
  </VRow>
</template>

<style scoped>
.cursor-pointer {
  width: 99%;
  cursor: pointer;
  transition: all 0.2s ease;
}

.cursor-pointer:hover {
  transform: translateX(4px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.border-error {
  border-left-color: rgb(var(--v-theme-error)) !important;
}

.border-warning {
  border-left-color: rgb(var(--v-theme-warning)) !important;
}

.border-info {
  border-left-color: rgb(var(--v-theme-info)) !important;
}

.border-success {
  border-left-color: rgb(var(--v-theme-success)) !important;
}
</style>
