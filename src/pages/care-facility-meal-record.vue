<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue'
import MealBillingForm from '@/views/pages/care-facility-settings/MealBillingForm.vue'
import DiaperBillingForm from '@/views/pages/care-facility-settings/DiaperBillingForm.vue'
import ElectricityBillingForm from '@/views/pages/care-facility-settings/ElectricityBillingForm.vue'
import { useRouter, useRoute } from 'vue-router'

const router = useRouter()
const route = useRoute()
// 거주자 데이터 타입 (DiaperBillingForm에서 사용)
interface Resident {
  id: string
  name: string
  room_number: string
  age: number
  gender: 'male' | 'female'
}

// URL 파라미터에서 건물 ID 가져오기
const buildingId = computed(() => route.query.building_id as string)

// 거주자 목록 (임시 데이터)
const residents = ref<Resident[]>([
  { id: '1', name: '田中 花子', room_number: '101', age: 85, gender: 'female' },
  { id: '2', name: '佐藤 太郎', room_number: '102', age: 78, gender: 'male' },
  { id: '3', name: '鈴木 美咲', room_number: '103', age: 82, gender: 'female' },
  { id: '4', name: '高橋 健一', room_number: '201', age: 79, gender: 'male' },
  { id: '5', name: '渡辺 和子', room_number: '202', age: 88, gender: 'female' },
])

// 선택된 월
const selectedMonth = ref(new Date().getMonth() + 1)
const selectedYear = ref(new Date().getFullYear())

// 청구 관련 정보 선택
const selectedBillingType = ref('meal') // 기본값을 meal로 설정
const billingTypes = [
  { title: '家賃請求', value: 'rent' },
  { title: '電気請求', value: 'electricity' },
  { title: '食費請求', value: 'meal' },
  { title: 'おむつ請求', value: 'diaper' },
  { title: 'その他請求', value: 'other' },
]

// 월 옵션
const monthOptions = Array.from({ length: 12 }, (_, i) => ({
  title: `${i + 1}月`,
  value: i + 1,
}))

// 년도 옵션 (현재 년도 기준 ±2년)
const yearOptions = computed(() => {
  const currentYear = new Date().getFullYear()
  return Array.from({ length: 5 }, (_, i) => ({
    title: `${currentYear - 2 + i}年`,
    value: currentYear - 2 + i,
  }))
})

// 선택된 월의 날짜들 계산
const daysInMonth = computed(() => {
  const year = selectedYear.value
  const month = selectedMonth.value
  const billingType = selectedBillingType.value
  
  // diaper 청구인 경우: 전월 21일 ~ 당월 20일
  if (billingType === 'diaper') {
    let startYear = year
    let startMonth = month - 1 // 전월
    let startDay = 21 // 전월 21일부터
    
    // 1월인 경우 작년 12월로 설정
    if (startMonth === 0) {
      startYear = year - 1
      startMonth = 12
    }
    
    const endYear = year
    const endMonth = month
    const endDay = 20 // 당월 20일까지
    
    // 시작일과 종료일 계산
    const startDate = new Date(startYear, startMonth - 1, startDay)
    const endDate = new Date(endYear, endMonth - 1, endDay)
    
    // 총 일수 계산
    const totalDays = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1
    
    return Array.from({ length: totalDays }, (_, i) => {
      const currentDate = new Date(startDate.getTime() + (i * 24 * 60 * 60 * 1000))
      const day = currentDate.getDate()
      const date = currentDate.toISOString().split('T')[0] // YYYY-MM-DD 형식
      
      return {
        day,
        date,
        dayOfWeek: ['日', '月', '火', '水', '木', '金', '土'][currentDate.getDay()],
        isToday: currentDate.toDateString() === new Date().toDateString(),
      }
    })
  } else {
    // 그 외 청구: 당월 1일 ~ 당월 말일
    const startYear = year
    const startMonth = month
    const startDay = 1 // 당월 1일부터
    
    const endYear = year
    const endMonth = month
    const endDay = new Date(year, month, 0).getDate() // 당월 말일
    
    // 시작일과 종료일 계산
    const startDate = new Date(startYear, startMonth - 1, startDay)
    const endDate = new Date(endYear, endMonth - 1, endDay)
    
    // 총 일수 계산
    const totalDays = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1
    
    return Array.from({ length: totalDays }, (_, i) => {
      const currentDate = new Date(startDate.getTime() + (i * 24 * 60 * 60 * 1000))
      const day = currentDate.getDate()
      const date = currentDate.toISOString().split('T')[0] // YYYY-MM-DD 형식
      
      return {
        day,
        date,
        dayOfWeek: ['日', '月', '火', '水', '木', '金', '土'][currentDate.getDay()],
        isToday: currentDate.toDateString() === new Date().toDateString(),
      }
    })
  }
})



// 월/년도 변경 시 처리
const handleMonthYearChange = () => {
  // 월/년도 변경 시 필요한 로직
  console.log('Month/Year changed:', selectedYear.value, selectedMonth.value)
}

// 청구 종류 변경 시 처리
const handleBillingTypeChange = () => {
  // 청구 종류에 따른 추가 로직 구현 가능
  console.log('Selected billing type:', selectedBillingType.value)
}

// 컴포넌트 마운트 시 초기화
onMounted(() => {
  // 오늘 날짜로 스크롤
  nextTick(() => {
    scrollToToday()
  })
})

// 오늘 날짜로 스크롤하는 함수 개선
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
          behavior: 'smooth'
        })
      }
    }
  }
}

// 테이블 헤더 계산
const tableHeaders = computed(() => {
  const headers = [
    { title: '名前', key: 'name', fixed: true, width: '150px' },
    { title: '部屋番号', key: 'room_number', fixed: false, width: '100px' },
    { title: '年齢', key: 'age', fixed: false, width: '80px' },
    { title: '性別', key: 'gender', fixed: false, width: '80px' },
  ]
  
  // 날짜 헤더 추가
  daysInMonth.value.forEach(day => {
    headers.push({
      title: `${day.day}日(${day.dayOfWeek})`,
      key: `date_${day.date}`,
      width: '120px',
      date: day.date,
      isToday: day.isToday,
    })
  })
  
  return headers
})

// 성별 표시 텍스트
const getGenderText = (gender: string) => {
  return gender === 'male' ? '男性' : '女性'
}

// 今日の日付かどうか確認
const isToday = (date: string) => {
  return date === new Date().toISOString().split('T')[0]
}

// 날짜 범위 표시용 텍스트 계산
const dateRangeText = computed(() => {
  const year = selectedYear.value
  const month = selectedMonth.value
  const billingType = selectedBillingType.value
  
  // diaper 청구인 경우: 前月21日 ~ 当月20日
  if (billingType === 'diaper') {
    let startYear = year
    let startMonth = month - 1 // 前月
    let startDay = 21 // 前月21日から
    
    // 1月の場合は昨年12月に設定
    if (startMonth === 0) {
      startYear = year - 1
      startMonth = 12
    }
    
    const endYear = year
    const endMonth = month
    const endDay = 20 // 当月20日まで
    
    // 開始日と終了日の計算
    const startDate = new Date(startYear, startMonth - 1, startDay)
    const endDate = new Date(endYear, endMonth - 1, endDay)
    
    // 月/日形式でフォーマット
    const formatDate = (date: Date) => {
      const month = date.getMonth() + 1
      const day = date.getDate()
      return `${month}月${day}日`
    }
    
    const startText = formatDate(startDate)
    const endText = formatDate(endDate)
    
    return `${startText} ~ ${endText}`
  } else {
    // その他の 청구: 当月1日 ~ 当月末日
    const startYear = year
    const startMonth = month
    const startDay = 1 // 当月1日から
    
    const endYear = year
    const endMonth = month
    const endDay = new Date(year, month, 0).getDate() // 当月末日
    
    // 開始日と終了日の計算
    const startDate = new Date(startYear, startMonth - 1, startDay)
    const endDate = new Date(endYear, endMonth - 1, endDay)
    
    // 月/日形式でフォーマット
    const formatDate = (date: Date) => {
      const month = date.getMonth() + 1
      const day = date.getDate()
      return `${month}月${day}日`
    }
    
    const startText = formatDate(startDate)
    const endText = formatDate(endDate)
    
    return `${startText} ~ ${endText}`
  }
})
</script>

<template>
  <VRow>
    <VCol cols="12">
      <VCard>
        <VCardText>
          <!-- ヘッダー -->
          <div class="d-flex justify-space-between align-center mb-6">
            <div class="d-flex align-center gap-4">
              <VSelect
                v-model="selectedBillingType"
                :items="billingTypes"
                item-title="title"
                item-value="value"
                label="請求種類"
                hide-details
                density="compact"
                style="max-width: 200px"
                clearable
                @update:model-value="handleBillingTypeChange"
              />
              <div v-if="selectedBillingType !== 'electricity'" class="d-flex align-center gap-2">
                <VSelect
                  v-model="selectedYear"
                  :items="yearOptions"
                  item-title="title"
                  item-value="value"
                  label="年"
                  hide-details
                  density="compact"
                  style="width: 120px"
                  @update:model-value="handleMonthYearChange"
                />
                <VSelect
                  v-model="selectedMonth"
                  :items="monthOptions"
                  item-title="title"
                  item-value="value"
                  label="月"
                  hide-details
                  density="compact"
                  style="width: 120px"
                  @update:model-value="handleMonthYearChange"
                />
              </div>
              <!-- 날짜 범위 표시 -->
              <div v-if="dateRangeText && selectedBillingType !== 'electricity'" class="d-flex align-center">
                <VChip
                  color="primary"
                  variant="tonal"
                  size="small"
                  class="font-weight-medium"
                >
                  {{ dateRangeText }}
                </VChip>
              </div>
            </div>
            <VBtn
              color="primary"
              prepend-icon="ri-file-text-line"
            >
              請求書作成
            </VBtn>
          </div>

           <!-- 설명 -->
           <!-- <VAlert
             type="info"
             class="mb-6"
             variant="tonal"
           >
             <template #prepend>
               <VIcon>ri-information-line</VIcon>
             </template>
             <div>
               <strong>使用方法:</strong><br>
               • ボタンをクリックすると「食事しなかった」に変更されます<br>
               • デフォルトは「食事した」状態です（○マーク）<br>
               • クリックすると✕マークが表示され「食事しなかった」を意味します<br>
               • 朝食(🌅)、昼食(☀️)、夕食(🌙)の順で表示されます
             </div>
           </VAlert> -->

          <!-- billingTypes별로 입력폼 분기 -->
          <MealBillingForm
            v-if="selectedBillingType === 'meal'"
            :selected-year="selectedYear"
            :selected-month="selectedMonth"
            :building-id="buildingId"
          />
          <DiaperBillingForm
            v-if="selectedBillingType === 'diaper'"
            :residents="residents"
            :daysInMonth="daysInMonth"
          />
          <ElectricityBillingForm
            v-if="selectedBillingType === 'electricity'"
            :selected-year="selectedYear"
          />
          <!-- 추후 RentBillingForm, UtilityBillingForm 등 추가 가능 -->
        </VCardText>
      </VCard>
    </VCol>
  </VRow>
</template>

<style lang="scss" scoped>
</style> 