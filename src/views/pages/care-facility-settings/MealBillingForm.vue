<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue'
import { elderlyMealRecordService, type ElderlyMealRecordCreate } from '@/services/elderlyMealRecord'

// API 응답 데이터 타입
interface DailyRecord {
  day: number
  date: string
  breakfast: boolean
  lunch: boolean
  dinner: boolean
  total_skipped: number
}

interface HospitalizationRecord {
  id: string
  elderly_id: string
  hospitalization_type: 'admission' | 'discharge'
  hospital_name: string
  date: string
  last_meal_date?: string
  last_meal_type?: 'breakfast' | 'lunch' | 'dinner'
  meal_resume_date?: string
  meal_resume_type?: 'breakfast' | 'lunch' | 'dinner'
  note?: string
  created_at: string
  updated_at: string
}

interface ResidentMealData {
  resident_id: string
  resident_name: string
  room_number: string
  breakfast_skipped: number
  lunch_skipped: number
  dinner_skipped: number
  total_skipped: number
  days_with_skips: number
  daily_records: DailyRecord[]
  hospitalizations?: HospitalizationRecord[]
}

interface ApiResponse {
  residents: ResidentMealData[]
}

// 거주자 데이터 타입
interface Resident {
  id: string
  name: string
  room_number: string
  age: number
  gender: 'male' | 'female'
  hospitalizations?: HospitalizationRecord[]
}

// 식사 기록 타입
interface MealRecord {
  resident_id: string
  date: string
  breakfast: boolean
  lunch: boolean
  dinner: boolean
}

const props = defineProps<{
  selectedYear: number
  selectedMonth: number
  buildingId: string
}>()

// 거주자 목록 (API에서 받아올 데이터)
const residents = ref<Resident[]>([])

// 식사 기록 데이터
const mealRecords = ref<MealRecord[]>([])

// 테이블 헤더 정의
const headers = [
  { title: '名前', key: 'name', fixed: true, width: 150, left: 0 },
  { title: '部屋番号', key: 'room_number', fixed: true, width: 100, left: 150 },
]

// 로딩 상태
const isLoading = ref(false)

// 선택된 월의 날짜들 계산
const daysInMonth = computed(() => {
  const year = props.selectedYear
  const month = props.selectedMonth

  // 당월 1일 ~ 당월 말일
  const startDate = new Date(year, month - 1, 1) // JavaScript Date는 0부터 시작하므로 -1
  const endDate = new Date(year, month, 0) // 다음 월의 0일 = 현재 월의 마지막 날

  // 총 일수 계산
  const totalDays = endDate.getDate()

  const result = Array.from({ length: totalDays }, (_, i) => {
    const currentDate = new Date(startDate.getTime() + (i * 24 * 60 * 60 * 1000))
    const day = currentDate.getDate()
    
    // 로컬 시간대 기준으로 YYYY-MM-DD 형식 생성
    const localYear = currentDate.getFullYear()
    const localMonth = String(currentDate.getMonth() + 1).padStart(2, '0')
    const localDay = String(currentDate.getDate()).padStart(2, '0')
    const dateString = `${localYear}-${localMonth}-${localDay}`

    return {
      day,
      date: dateString,
      dayOfWeek: ['日', '月', '火', '水', '木', '金', '土'][currentDate.getDay()],
      isToday: currentDate.toDateString() === new Date().toDateString(),
    }
  })

  // 디버깅: 첫 번째와 마지막 날짜 확인
  const formatLocalDate = (date: Date) => {
    const localYear = date.getFullYear()
    const localMonth = String(date.getMonth() + 1).padStart(2, '0')
    const localDay = String(date.getDate()).padStart(2, '0')
    return `${localYear}-${localMonth}-${localDay}`
  }
  
  console.log('daysInMonth 계산:', {
    year,
    month,
    startDate: formatLocalDate(startDate),
    endDate: formatLocalDate(endDate),
    totalDays,
    firstDate: result[0]?.date,
    lastDate: result[result.length - 1]?.date,
  })

  return result
})

// 병원 기록 가져오기


// 식사 타입 비교 (a가 b 이후인지 확인)
const isAfterMealType = (a: string, b: string) => {
  const mealOrder = { breakfast: 1, lunch: 2, dinner: 3 }
  return mealOrder[a as keyof typeof mealOrder] > mealOrder[b as keyof typeof mealOrder]
}

// 병원 기록 검증 함수 (식사 타입별)
const validateHospitalizationRecords = (residentId: string, date: string, mealType: 'breakfast' | 'lunch' | 'dinner') => {
  try {
    // 해당 거주자 찾기
    const resident = residents.value.find(r => r.id === residentId)
    if (!resident || !resident.hospitalizations || resident.hospitalizations.length === 0) {
      return false
    }

    const dateObj = new Date(date)
    const dateString = dateObj.toISOString().split('T')[0]

    // discharge 타입의 기록 찾기 (입원과 퇴원 정보를 모두 포함)
    const dischargeRecord = resident.hospitalizations.find(record =>
      record.hospitalization_type === 'discharge',
    )

    // admission 타입의 기록 찾기 (입원만 있는 경우)
    const admissionRecord = resident.hospitalizations.find(record =>
      record.hospitalization_type === 'admission',
    )

    // discharge 기록이 있으면 그것을 사용, 없으면 admission 기록 사용
    const record = dischargeRecord || admissionRecord

    if (!record) {
      return false
    }

    // 입원 시작일 (last_meal_date)
    const admissionStartDate = record.last_meal_date || record.date
    const lastMealType = record.last_meal_type

    // 퇴원 종료일 (meal_resume_date) - discharge 기록이 있으면 meal_resume_date 사용
    const dischargeEndDate = dischargeRecord?.meal_resume_date
    const resumeMealType = dischargeRecord?.meal_resume_type

    // 디버깅 로그 추가
    console.log('병원 기록 검증:', {
      residentId,
      date,
      mealType,
      admissionStartDate,
      dischargeEndDate,
      dateString,
      isInAdmissionPeriod: dateString >= admissionStartDate,
      isInDischargePeriod: dischargeRecord && dischargeEndDate ? dateString <= dischargeEndDate : 'no discharge record',
      allHospitalizations: resident.hospitalizations,
      dischargeRecord: dischargeRecord,
      admissionRecord: admissionRecord
    })

    // 입원 날짜인 경우 식사 타입 확인
    if (dateString === admissionStartDate && lastMealType) {
      // 해당 식사가 마지막 식사 이후인지 확인 (마지막 식사 이후부터 입원)
      return isAfterMealType(mealType, lastMealType)
    }

    // 퇴원 날짜인 경우 식사 타입 확인
    if (dischargeEndDate && dateString === dischargeEndDate && resumeMealType) {
      // meal_resume_type부터 식사 시작하므로 그 이전까지는 입원 상태
      // 예: meal_resume_type이 'lunch'라면 breakfast까지만 입원 상태
      return !isAfterMealType(mealType, resumeMealType)
    }

    // 현재 날짜가 입원 기간에 포함되는지 확인
    const isInAdmissionPeriod = dateString >= admissionStartDate

    // 퇴원 기록이 있고 meal_resume_date가 있으면 퇴원 날짜까지, 없으면 현재까지
    let isInDischargePeriod = true
    if (dischargeRecord && dischargeEndDate) {
      // 퇴원 기록이 있고 meal_resume_date가 있으면 퇴원 날짜까지
      isInDischargePeriod = dateString <= dischargeEndDate
    }

    const result = isInAdmissionPeriod && isInDischargePeriod
    console.log('병원 기록 검증 결과:', result)
    return result
  } catch (error) {
    console.error('병원 기록 검증 오류:', error)
    return false
  }
}

// 식사 기록 초기화
const initializeMealRecords = async () => {
  const startTime = performance.now()
  
  try {
    isLoading.value = true
    
    // API에서 데이터 로드
    const apiStartTime = performance.now()
    const apiResponse: ApiResponse = await elderlyMealRecordService.getElderlyMealRecordsByMonth(
      props.selectedYear,
      props.selectedMonth,
      props.buildingId,
    )

    // 거주자 목록 업데이트
    const residentsStartTime = performance.now()
    residents.value = apiResponse.residents.map(resident => ({
      id: resident.resident_id,
      name: resident.resident_name,
      room_number: resident.room_number,
      age: 0, // API에서 제공되지 않으므로 기본값
      gender: 'male' as const, // API에서 제공되지 않으므로 기본값
      hospitalizations: resident.hospitalizations || [], // 병원 기록 포함
    }))

    // 식사 기록 데이터 생성
    const records: MealRecord[] = []
    
    apiResponse.residents.forEach(resident => {
      resident.daily_records.forEach(dailyRecord => {
        records.push({
          resident_id: resident.resident_id,
          date: dailyRecord.date,
          breakfast: dailyRecord.breakfast, // true = 식사 건너뛰기
          lunch: dailyRecord.lunch,
          dinner: dailyRecord.dinner,
        })
      })
    })
    
    mealRecords.value = records
    
    // 병원 기록은 API 응답에 이미 포함되어 있음
    console.log('거주자 병원 기록:', residents.value.map(r => ({ 
      id: r.id, 
      hospitalizations: r.hospitalizations,
      admissionRecords: r.hospitalizations?.filter(h => h.hospitalization_type === 'admission'),
      dischargeRecords: r.hospitalizations?.filter(h => h.hospitalization_type === 'discharge'),
    })))
    
    // 캐시 초기화 (새로운 데이터 로드 시)
    cellStateCache.clear()
    hospitalizationCache.clear()
  } catch (error) {
    console.error('식사 기록 로드 실패:', error)
    // 에러 시 기본 데이터로 초기화
    mealRecords.value = []
  } finally {
    isLoading.value = false
  }
}

// getCellState 함수는 getCellStateForResident로 대체됨

// 성능 최적화를 위한 computed 속성들
const getCellStateForResident = (residentId: string, date: string) => {
  const record = mealRecords.value.find(
    r => r.resident_id === residentId && r.date === date,
  )
  
  return {
    breakfast: record?.breakfast ?? false,
    lunch: record?.lunch ?? false,
    dinner: record?.dinner ?? false,
  }
}

const getHospitalizationStateForResident = (residentId: string, date: string) => {
  const breakfast = validateHospitalizationRecords(residentId, date, 'breakfast')
  const lunch = validateHospitalizationRecords(residentId, date, 'lunch')
  const dinner = validateHospitalizationRecords(residentId, date, 'dinner')
  
  return {
    breakfast,
    lunch,
    dinner,
    hasHospitalization: breakfast || lunch || dinner,
  }
}

// 모든 거주자와 날짜에 대한 상태를 미리 계산하는 computed 속성
const computedCellStates = computed(() => {
  const states = new Map<string, { breakfast: boolean; lunch: boolean; dinner: boolean }>()
  const hospitalizationStates = new Map<string, {
    breakfast: boolean
    lunch: boolean
    dinner: boolean
    hasHospitalization: boolean
  }>()
  
  residents.value.forEach(resident => {
    daysInMonth.value.forEach(day => {
      const cellKey = `${resident.id}_${day.date}`
      
      // 셀 상태 계산
      states.set(cellKey, getCellStateForResident(resident.id, day.date))
      
      // 병원 기록 상태 계산
      hospitalizationStates.set(cellKey, getHospitalizationStateForResident(resident.id, day.date))
    })
  })
  
  return { states, hospitalizationStates }
})

// 성능 최적화를 위한 캐시 맵 (computed와 함께 사용)
const cellStateCache = new Map<string, { breakfast: boolean; lunch: boolean; dinner: boolean }>()
const hospitalizationCache = new Map<string, {
  breakfast: boolean
  lunch: boolean
  dinner: boolean
  hasHospitalization: boolean
}>()

// 캐시된 셀 상태 가져오기
const getCachedCellState = (residentId: string, date: string) => {
  const cacheKey = `${residentId}_${date}`
  const cached = cellStateCache.get(cacheKey)
  
  if (cached) {
    return cached
  }
  
  const state = getCellStateForResident(residentId, date)
  cellStateCache.set(cacheKey, state)
  return state
}

// 캐시된 병원 기록 상태 가져오기
const getCachedHospitalizationState = (residentId: string, date: string) => {
  const cacheKey = `${residentId}_${date}`
  const cached = hospitalizationCache.get(cacheKey)
  
  if (cached) {
    return cached
  }
  
  const state = getHospitalizationStateForResident(residentId, date)
  hospitalizationCache.set(cacheKey, state)
  return state
}

// API 호출 함수
const saveMealRecord = async (residentId: string, skipDate: string, mealType: 'breakfast' | 'lunch' | 'dinner', value: boolean) => {
  try {
    const data: ElderlyMealRecordCreate = {
      resident_id: residentId,
      skip_date: skipDate,
      meal_type: mealType,
    }

    // await elderlyMealRecordService.createElderlyMealRecord(data)
    console.log('식사 기록 처리 성공:', { residentId, skipDate, mealType, value })
  } catch (error) {
    console.error('식사 기록 처리 실패:', error)
    throw error // 상위에서 처리하도록 에러 전파
  }
}

// 식사 기록 업데이트 및 저장
const updateMealRecord = async (residentId: string, date: string, mealType: 'breakfast' | 'lunch' | 'dinner', value: boolean) => {
  // UI 즉시 업데이트
  const recordIndex = mealRecords.value.findIndex(
    r => r.resident_id === residentId && r.date === date,
  )
  
  if (recordIndex >= 0) {
    // 기존 기록이 있는 경우 해당 식사 타입만 업데이트
    mealRecords.value[recordIndex][mealType] = value
  } else {
    // 새 기록 생성
    mealRecords.value.push({
      resident_id: residentId,
      date,
      breakfast: mealType === 'breakfast' ? value : false,
      lunch: mealType === 'lunch' ? value : false,
      dinner: mealType === 'dinner' ? value : false,
    })
  }
  
  // 캐시 즉시 업데이트 (UI 반응성 향상)
  const cacheKey = `${residentId}_${date}`
  const currentState = getCellStateForResident(residentId, date)
  cellStateCache.set(cacheKey, currentState)
  
  // 병원 기록 캐시도 무효화 (상태 변경 시 재계산 필요)
  hospitalizationCache.delete(cacheKey)

  // 백그라운드에서 API 호출
  try {
    await saveMealRecord(residentId, date, mealType, value)
    console.log('식사 기록 처리 성공:', { residentId, date, mealType, value })
  } catch (error) {
    console.error('API 호출 실패:', error)
    // 실패 시 UI 되돌리기
    if (recordIndex >= 0) {
      mealRecords.value[recordIndex][mealType] = !value
    } else {
      // 새로 추가된 기록인 경우 제거
      const removeIndex = mealRecords.value.findIndex(
        r => r.resident_id === residentId && r.date === date,
      )
      if (removeIndex >= 0) {
        mealRecords.value.splice(removeIndex, 1)
      }
    }
    
    // 캐시도 되돌리기
    const revertedState = getCellStateForResident(residentId, date)
    cellStateCache.set(cacheKey, revertedState)
    
    throw error // 상위에서 처리하도록 에러 전파
  }
}

// 오늘 날짜로 스크롤하는 함수
const scrollToToday = () => {
  const tableContainer = document.querySelector('.v-table__wrapper')
  if (tableContainer) {
    const todayIndex = daysInMonth.value.findIndex(day => day.isToday)
    if (todayIndex >= 0) {
      const ths = tableContainer.querySelectorAll('th')
      const targetTh = ths[todayIndex] as HTMLElement
      if (targetTh) {
        tableContainer.scrollTo({
          left: targetTh.offsetLeft - 150, // 이름 컬럼 너비만큼 보정
          behavior: 'smooth',
        })
      }
    }
  }
}



// 컴포넌트 마운트 시 초기화
onMounted(async () => {
  await initializeMealRecords()
  // 오늘 날짜로 스크롤
  nextTick(() => {
    scrollToToday()
  })
})
</script>

<template>
  <div class="meal-billing-form">
    <VCard>
      <VCardTitle class="d-flex align-center gap-2">
        <VIcon>ri-restaurant-line</VIcon>
        <span>食費請求 ({{ selectedYear }}年{{ selectedMonth }}月)</span>
      </VCardTitle>
      <VCardText>
        <!-- 로딩 상태 표시 -->
        <div v-if="isLoading" class="loading-container">
          <VProgressCircular indeterminate color="primary" size="64" />
          <p class="mt-4 text-center">データを読み込み中...</p>
        </div>
        
        <!-- 테이블 컨테이너 -->
        <div v-else class="table-container">
          <!-- 디버깅 정보 -->
          <div v-if="residents.length === 0" class="text-center pa-4">
            <VIcon size="48" color="grey" class="mb-2">ri-inbox-line</VIcon>
            <p class="text-h6 text-grey">データがありません</p>
            <p class="text-body-2 text-grey">データがありません</p>
          </div>
          
          <VTable v-else class="meal-record-table" density="compact">
            <thead>
              <tr>
                <th v-for="header in [
                  ...headers,
                  ...daysInMonth.map(day => ({
                    title: `${day.day}日(${day.dayOfWeek})`,
                    key: `date_${day.date}`,
                    width: 120,
                    fixed: false,
                    left: 0,
                    date: day.date,
                    isToday: day.isToday,
                  })),
                ]"
                :key="header.key"
                :class="header.fixed ? `fixed-column ${header.key}-col` : ''"
                :style="`min-width: ${header.width}px;${header.fixed ? `left: ${header.left}px; z-index: 10;` : ''}`"
                >
                  <div class="d-flex flex-column align-center">
                    <span class="text-caption">{{ header.title }}</span>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="resident in residents" :key="resident.id">
                <td v-for="header in headers" :key="header.key" :class="`fixed-column ${header.key}-col`" :style="`width: ${header.width}px; left: ${header.left}px; z-index: 10;`">
                  <template v-if="header.key === 'name'">
                    <div class="d-flex align-center">
                      <VAvatar size="32" class="me-2" :color="resident.gender === 'male' ? 'primary' : 'secondary'">
                        <VIcon>{{ resident.gender === 'male' ? 'ri-user-line' : 'ri-user-line' }}</VIcon>
                      </VAvatar>
                      <span class="font-weight-medium">{{ resident.name }}</span>
                    </div>
                  </template>
                  <template v-else-if="header.key === 'room_number'" class="text-center">
                    {{ resident.room_number }}
                  </template>
                </td>
                <td v-for="day in daysInMonth" :key="`${resident.id}_${day.date}`" :class="{ 'today-column': day.isToday }">
                  <div class="d-flex flex-column gap-1">
                    <!-- 병원 기록 경고 표시 (computed 상태 사용) -->
                    <div v-if="computedCellStates.hospitalizationStates.get(`${resident.id}_${day.date}`)?.hasHospitalization" class="hospitalization-warning">
                      <VChip size="x-small" color="warning" variant="tonal">
                        <VIcon start size="12" icon="ri-hospital-line" />
                        入院中
                      </VChip>
                    </div>
                    
                    <div class="d-flex align-center justify-space-between">
                      <span class="text-caption">朝食:</span>
                      <VBtn 
                        :color="computedCellStates.states.get(`${resident.id}_${day.date}`)?.breakfast ? 'error' : 'default'" 
                        variant="text" 
                        size="small" 
                        class="meal-btn"
                        :class="{ 'hospitalization-mismatch': computedCellStates.hospitalizationStates.get(`${resident.id}_${day.date}`)?.breakfast && !computedCellStates.states.get(`${resident.id}_${day.date}`)?.breakfast }"
                        @click="async () => {
                          const currentValue = computedCellStates.states.get(`${resident.id}_${day.date}`)?.breakfast ?? false
                          await updateMealRecord(resident.id, day.date, 'breakfast', !currentValue)
                        }"
                      >
                        <span v-if="computedCellStates.states.get(`${resident.id}_${day.date}`)?.breakfast" class="meal-x">✕</span>
                        <span v-else class="meal-o">○</span>
                      </VBtn>
                    </div>
                    <div class="d-flex align-center justify-space-between">
                      <span class="text-caption">昼食:</span>
                      <VBtn 
                        :color="getCachedCellState(resident.id, day.date).lunch ? 'error' : 'default'" 
                        variant="text" 
                        size="small" 
                        class="meal-btn"
                        :class="{ 'hospitalization-mismatch': getCachedHospitalizationState(resident.id, day.date).lunch && !getCachedCellState(resident.id, day.date).lunch }"
                        @click="async () => {
                          const currentValue = getCachedCellState(resident.id, day.date).lunch
                          await updateMealRecord(resident.id, day.date, 'lunch', !currentValue)
                        }"
                      >
                        <span v-if="getCachedCellState(resident.id, day.date).lunch" class="meal-x">✕</span>
                        <span v-else class="meal-o">○</span>
                      </VBtn>
                    </div>
                    <div class="d-flex align-center justify-space-between">
                      <span class="text-caption">夕食:</span>
                      <VBtn 
                        :color="getCachedCellState(resident.id, day.date).dinner ? 'error' : 'default'" 
                        variant="text" 
                        size="small" 
                        class="meal-btn"
                        :class="{ 'hospitalization-mismatch': getCachedHospitalizationState(resident.id, day.date).dinner && !getCachedCellState(resident.id, day.date).dinner }"
                        @click="async () => {
                          const currentValue = getCachedCellState(resident.id, day.date).dinner
                          await updateMealRecord(resident.id, day.date, 'dinner', !currentValue)
                        }"
                      >
                        <span v-if="getCachedCellState(resident.id, day.date).dinner" class="meal-x">✕</span>
                        <span v-else class="meal-o">○</span>
                      </VBtn>
                    </div>
                  </div>
                </td>
              </tr>
            </tbody>
          </VTable>
        </div>
      </VCardText>
    </VCard>
  </div>
</template>

<style lang="scss" scoped>
.meal-billing-form {
  .loading-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 60px 20px;
    min-height: 300px;
    
    p {
      color: rgb(var(--v-theme-on-surface));
      font-size: 16px;
      margin: 0;
    }
  }

  .table-container {
    overflow-x: scroll; // 항상 스크롤바 표시
    border-radius: 8px;
    border: 1px solid rgb(var(--v-border-color));
  }

  .meal-record-table {
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
      top: 0;
      z-index: 2;
      background-color: rgb(var(--v-theme-surface));
    }

    .fixed-column {
      position: sticky;
      background-color: rgb(var(--v-theme-surface));
      border-right: 2px solid rgb(var(--v-border-color));
      z-index: 1;
    }
    
    .name-col {
      left: 0;
      z-index: 3;
    }
    
    .room_number-col {
      left: 150px;
      z-index: 2;
    }

    .today-column {
      background-color: rgba(var(--v-theme-primary), 0.1);
    }

    .meal-btn {
      min-width: 32px !important;
      width: 32px !important;
      height: 32px !important;
      padding: 0 !important;
      margin: 0;

      :deep(.v-btn__content) {
        font-size: 16px;
        font-weight: bold;

        .meal-x {
          color: #d32f2f !important;
          font-weight: bold;
          text-shadow: 0 0 1px #d32f2f;
        }
        .meal-o {
          color: #333 !important;
          font-weight: bold;
          text-shadow: 0 0 1px #333;
        }
      }
      
      // 병원 기록과 불일치하는 경우 스타일
      &.hospitalization-mismatch {
        border: 2px solid #ff9800 !important;
        background-color: rgba(255, 152, 0, 0.1) !important;
        animation: pulse-warning 2s infinite;
        
        :deep(.v-btn__content) {
          .meal-o {
            color: #ff9800 !important;
            text-shadow: 0 0 2px #ff9800;
          }
        }
      }
    }
    
    // 병원 기록 경고 스타일
    .hospitalization-warning {
      margin-bottom: 4px;
      
      .v-chip {
        font-size: 10px;
        height: 20px;
      }
    }
    
    @keyframes pulse-warning {
      0% {
        box-shadow: 0 0 5px rgba(255, 152, 0, 0.3);
      }
      50% {
        box-shadow: 0 0 10px rgba(255, 152, 0, 0.5);
      }
      100% {
        box-shadow: 0 0 5px rgba(255, 152, 0, 0.3);
      }
    }

    // 캡션 등도 선명하게
    .text-caption {
      color: #222 !important;
      font-weight: 500 !important;
      font-size: 14px !important;
    }
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
}
</style> 