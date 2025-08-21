<script setup lang="ts">
import { buildingService, type Building } from '@/services/building'
import { residentService, type Resident } from '@/services/resident'
import { roomService } from '@/services/room'
import { type Student } from '@/services/student'
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

// Props 정의
interface Props {
  student: Student
}

const props = defineProps<Props>()

const route = useRoute()
const router = useRouter()

// 학생 ID
const studentId = computed(() => props.student.id)

// 데이터 상태
const currentResident = ref<Resident | null>(null)
const residentHistory = ref<Resident[]>([])
const currentBuilding = ref<Building | null>(null)
const currentRoom = ref<any>(null)
const loading = ref(false)
const error = ref<string | null>(null)

// 팝업 상태
const showResidenceModal = ref(false)
const modalType = ref<'change' | 'checkout' | 'new'>('change')
const selectedResident = ref<Resident | null>(null)

// 청구서 팝업 상태
const showInvoiceModal = ref(false)
const invoiceForm = ref({
  target_month: '',
  note: '',
  // 각 방별 청구서 데이터
  room_invoices: [
    {
      room_id: '',
      room_number: '',
      building_name: '',
      daily_rate: 0,
      days_in_month: 0,
      rent_amount: 0,
      // 전기 요금
      electricity_amount: 0,
      electricity_start_date: '',
      electricity_end_date: '',
      // 가스 요금
      gas_amount: 0,
      gas_start_date: '',
      gas_end_date: '',
      // 물 요금
      water_amount: 0,
      water_start_date: '',
      water_end_date: '',
      // 거주 기간
      check_in_date: '',
      check_out_date: '',
      // 학생별 유틸리티 할당 정보
      student_utility_allocation: {
        electricity: { amount_per_day: 0, my_amount: 0 },
        gas: { amount_per_day: 0, my_amount: 0 },
        water: { amount_per_day: 0, my_amount: 0 }
      }
    }
  ],
  total_amount: 0,
})

// 폼 데이터
const form = ref({
  change_date: '',
  new_building_id: '',
  new_room_id: '',
  note: ''
})

// 빌딩 및 호실 옵션
const buildingOptions = ref<{ value: string; title: string }[]>([])
const roomOptions = ref<{ value: string; title: string }[]>([])

// 현재 거주지 정보
const currentResidence = computed(() => {
  if (!currentResident.value || !currentBuilding.value || !currentRoom.value) return null
  
  return {
    building: currentBuilding.value,
    room: currentRoom.value,
    resident: currentResident.value
  }
})

// 거주자 정보 조회 (현재 거주지 포함)
const fetchResidentInfo = async () => {
  try {
    loading.value = true
    error.value = null
    
    // 학생별 거주자 히스토리 조회
    const history = await residentService.getResidentHistoryByStudent(studentId.value)
    residentHistory.value = history.items
    
    // 현재 활성 거주자 찾기
    currentResident.value = history.items.find(resident => resident.is_active) || null
    
    // 현재 거주자가 있으면 해당 빌딩과 호실 정보 설정
    if (currentResident.value) {
      currentRoom.value = currentResident.value.room || null
      currentBuilding.value = currentResident.value.building || null
    }
  } catch (err: any) {
    error.value = err.response?.data?.message || '居住者情報の取得に失敗しました。'
  } finally {
    loading.value = false
  }
}

// 빌딩 옵션 조회
const fetchBuildingOptions = async () => {
  try {
    const response = await buildingService.getBuildingOptions()
    buildingOptions.value = response.options.map(option => ({
      value: option.value,
      title: option.label
    }))
  } catch (err: any) {
    console.error('빌딩 옵션 조회 실패:', err)
  }
}

// 호실 옵션 조회
const fetchRoomOptions = async (buildingId: string) => {
  try {
    const response = await buildingService.getEmptyRoomsByBuilding(buildingId)
    roomOptions.value = response.options.map(option => ({
      value: option.value,
      title: `${option.room_number} (¥${option.rent?.toLocaleString() || 0})`
    }))
  } catch (err: any) {
    console.error('호실 옵션 조회 실패:', err)
    roomOptions.value = []
  }
}

// 빌딩 선택 시 호실 옵션 업데이트
const handleBuildingChange = () => {
  form.value.new_room_id = ''
  if (form.value.new_building_id) {
    fetchRoomOptions(form.value.new_building_id)
  } else {
    roomOptions.value = []
  }
}

// 모달 열기
const openModal = (type: 'change' | 'checkout' | 'new', resident?: Resident) => {
  modalType.value = type
  
  // 폼 초기화
  form.value = {
    change_date: '',
    new_building_id: '',
    new_room_id: '',
    note: ''
  }
  
  showResidenceModal.value = true
}

// 모달 닫기
const closeModal = () => {
  showResidenceModal.value = false
}

// 거주지 변경 처리
const handleResidenceChange = async () => {
  try {
    loading.value = true
    error.value = null

    await residentService.updateResident(studentId.value, {
      new_room_id: form.value.new_room_id,
      change_date: form.value.change_date,
      note: form.value.note
    })
    // 3. 데이터 새로고침
    await fetchResidentInfo()
    
    // 4. 모달 닫기
    closeModal()
    
    alert('居住地変更が完了しました。')
  } catch (err: any) {
    error.value = err.response?.data?.message || '居住地変更に失敗しました。'
  } finally {
    loading.value = false
  }
}

// 퇴실 처리
const handleCheckout = async () => {
  try {
    loading.value = true
    error.value = null
    
    
    await residentService.updateResident(studentId.value, {
      change_date: form.value.change_date,
      is_active: false,
      note: form.value.note
    })
    
    // 데이터 새로고침
    await fetchResidentInfo()
    
    // 모달 닫기
    closeModal()
    
    alert('退去処理が完了しました。')
  } catch (err: any) {
    error.value = err.response?.data?.message || '退去処理に失敗しました。'
  } finally {
    loading.value = false
  }
}

// 신규입주등록 처리
const handleNewResidence = async () => {
  try {
    loading.value = true
    error.value = null

    await residentService.createResident(studentId.value, {
      new_room_id: form.value.new_room_id,
      change_date: form.value.change_date,
      note: form.value.note
    })
    
    // 데이터 새로고침
    await fetchResidentInfo()
    
    // 모달 닫기
    closeModal()
    
    alert('新規入居登録が完了しました。')
  } catch (err: any) {
    error.value = err.response?.data?.message || '新規入居登録に失敗しました。'
  } finally {
    loading.value = false
  }
}

// 날짜 포맷팅
const formatDate = (dateString: string) => {
  if (!dateString) return '-'
  return new Date(dateString).toLocaleDateString('ja-JP')
}

// 빌딩 이름 가져오기 (히스토리용)
const getBuildingName = (item: Resident) => {
  return item.building?.name || '-'
}

// 호실 번호 가져오기 (히스토리용)
const getRoomNumber = (item: Resident) => {
  return item.room?.room_number || '-'
}

// 청구서 모달 열기
const openInvoiceModal = async () => {
  try {  
    // 표시용: 현재 달
    const now = new Date()
    const currentMonth = now.getMonth() + 1 // 1-12
    const currentYear = now.getFullYear()
    const displayMonth = `${currentYear}-${String(currentMonth).padStart(2, '0')}`
    
    // 계산용: 이전 달
    const lastMonth = now.getMonth() === 0 ? 12 : now.getMonth()
    const lastMonthYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear()
    const targetMonth = `${lastMonthYear}-${String(lastMonth).padStart(2, '0')}`
    
    // 해당 월의 거주 기록 조회 (API 사용) - 이전 달 데이터
    const monthlyHistory = await residentService.getMonthlyResidentHistory(
      studentId.value, 
      lastMonthYear, 
      lastMonth
    )
    
    // 각 방별 청구서 데이터 생성
    const roomInvoicesPromises = monthlyHistory.items.map(async (resident) => {
      const monthlyRent = Number(resident.room?.rent) || 0
      const daysInMonth = 30 // 야칭은 무조건 30일로 계산
      const dailyRate = Math.round(monthlyRent / daysInMonth)
      const daysInResidence = calculateDaysInResidenceForRoom(resident, targetMonth)
      
      // room-detail에서 등록한 광열비 정보 가져오기 (이번달 데이터)
      let utilityData = {
        electricity_amount: 0,
        electricity_start_date: '',
        electricity_end_date: '',
        gas_amount: 0,
        gas_start_date: '',
        gas_end_date: '',
        water_amount: 0,
        water_start_date: '',
        water_end_date: '',
      }
      
      // 학생별 유틸리티 할당 정보 가져오기
      let studentUtilityAllocation = {
        electricity: { amount_per_day: 0, my_amount: 0 },
        gas: { amount_per_day: 0, my_amount: 0 },
        water: { amount_per_day: 0, my_amount: 0 }
      }
      
      if (resident.room_id) {
        try {
          // 이번달 유틸리티 데이터 조회
          const utilitiesResponse = await roomService.getUtilitiesByMonth(resident.room_id, displayMonth)
          const utilities = utilitiesResponse.items || []
          
          // 유틸리티 데이터 매핑
          utilities.forEach((utility: any) => {
            switch (utility.utility_type) {
              case 'electricity':
                utilityData.electricity_amount = utility.total_amount || 0
                utilityData.electricity_start_date = utility.period_start || ''
                utilityData.electricity_end_date = utility.period_end || ''
                break
              case 'gas':
                utilityData.gas_amount = utility.total_amount || 0
                utilityData.gas_start_date = utility.period_start || ''
                utilityData.gas_end_date = utility.period_end || ''
                break
              case 'water':
                utilityData.water_amount = utility.total_amount || 0
                utilityData.water_start_date = utility.period_start || ''
                utilityData.water_end_date = utility.period_end || ''
                break
            }
          })
          
          // 학생별 유틸리티 할당 정보 조회
          const allocationResponse = await roomService.getStudentMonthlyUtilityAllocation(
            resident.room_id,
            studentId.value,
            currentYear,
            currentMonth
          )
          
          // 할당 정보 매핑
          if (allocationResponse.utilities) {
            allocationResponse.utilities.forEach((utility: any) => {
              switch (utility.utility_type) {
                case 'electricity':
                  studentUtilityAllocation.electricity = {
                    amount_per_day: utility.amount_per_day || 0,
                    my_amount: Math.floor(utility.my_amount || 0)
                  }
                  break
                case 'gas':
                  studentUtilityAllocation.gas = {
                    amount_per_day: utility.amount_per_day || 0,
                    my_amount: Math.floor(utility.my_amount || 0)
                  }
                  break
                case 'water':
                  studentUtilityAllocation.water = {
                    amount_per_day: utility.amount_per_day || 0,
                    my_amount: Math.floor(utility.my_amount || 0)
                  }
                  break
              }
            })
          }
        } catch (error) {
          console.error('유틸리티 데이터 로드 실패:', error)
        }
      }
      
      return {
        room_id: resident.room_id || '',
        room_number: resident.room?.room_number || '',
        building_name: resident.building?.name || '',
        daily_rate: dailyRate,
        days_in_month: daysInResidence,
        rent_amount: dailyRate * daysInResidence,
        electricity_amount: utilityData.electricity_amount,
        electricity_start_date: utilityData.electricity_start_date,
        electricity_end_date: utilityData.electricity_end_date,
        gas_amount: utilityData.gas_amount,
        gas_start_date: utilityData.gas_start_date,
        gas_end_date: utilityData.gas_end_date,
        water_amount: utilityData.water_amount,
        water_start_date: utilityData.water_start_date,
        water_end_date: utilityData.water_end_date,
        check_in_date: resident.check_in_date,
        check_out_date: resident.check_out_date || '',
        // 학생별 유틸리티 할당 정보 추가
        student_utility_allocation: studentUtilityAllocation
      }
    })
    
    // 모든 방의 데이터를 병렬로 처리
    const roomInvoices = await Promise.all(roomInvoicesPromises)
    invoiceForm.value.room_invoices = roomInvoices
    
    // 표시용으로 현재 달 설정
    invoiceForm.value.target_month = displayMonth
    updateTotalAmount()
    showInvoiceModal.value = true
    
  } catch (err: any) {
    error.value = err.response?.data?.message || '月別居住記録の取得に失敗しました。'
  } finally {
  }
}

// 청구서 모달 닫기
const closeInvoiceModal = () => {
  showInvoiceModal.value = false
}

// 해당 월의 거주 일수 계산
const calculateDaysInResidence = (targetMonth: string) => {
  if (!currentResidence.value) return 0
  
  const [year, month] = targetMonth.split('-').map(Number)
  const targetDate = new Date(year, month - 1, 1)
  const lastDayOfMonth = new Date(year, month, 0)
  
  const checkInDate = new Date(currentResidence.value.resident.check_in_date)
  const checkOutDate = currentResidence.value.resident.check_out_date 
    ? new Date(currentResidence.value.resident.check_out_date)
    : null
  
  // 입주일이 해당 월보다 늦으면 0일
  if (checkInDate > lastDayOfMonth) return 0
  
  // 퇴실일이 해당 월보다 이르면 0일
  if (checkOutDate && checkOutDate < targetDate) return 0
  
  // 거주 시작일 (해당 월 1일과 입주일 중 늦은 날)
  const startDate = checkInDate > targetDate ? checkInDate : targetDate
  
  // 거주 종료일 (해당 월 마지막 날과 퇴실일 중 이른 날)
  const endDate = checkOutDate && checkOutDate < lastDayOfMonth 
    ? checkOutDate 
    : lastDayOfMonth
  
  // 일수 계산 (종료일 포함)
  const diffTime = endDate.getTime() - startDate.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1
  
  return Math.max(0, diffDays)
}

// 특정 방의 해당 월 거주 일수 계산 함수
const calculateDaysInResidenceForRoom = (resident: any, targetMonth: string) => {
  const [year, month] = targetMonth.split('-').map(Number)
  const targetStart = new Date(year, month - 1, 1)
  const targetEnd = new Date(year, month, 0)
  
  const checkIn = new Date(resident.check_in_date)
  const checkOut = resident.check_out_date ? new Date(resident.check_out_date) : new Date()
  
  // 거주 기간과 대상 월의 교집합 계산
  const startDate = checkIn > targetStart ? checkIn : targetStart
  const endDate = checkOut < targetEnd ? checkOut : targetEnd
  
  if (startDate > endDate) return 0
  
  const diffTime = endDate.getTime() - startDate.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1
  
  return Math.max(0, diffDays)
}

// 컴포넌트 마운트 시 데이터 로드
onMounted(() => {
  fetchResidentInfo()
  fetchBuildingOptions()
})

// 청구서 모달에서 target_month가 변경될 때마다 계산을 다시 하도록 watch를 추가하고, 템플릿에서 target_month 필드를 편집 가능하도록 변경합니다.
watch(() => invoiceForm.value.target_month, async (newMonth) => {
  if (newMonth) {
    try {
      loading.value = true
      error.value = null
      
      // 표시된 월을 이전 달로 변환 (예: 2024-03 → 2024-02)
      const [year, month] = newMonth.split('-').map(Number)
      let targetYear = year
      let targetMonth = month - 1
      
      // 1월인 경우 작년 12월로 설정
      if (targetMonth === 0) {
        targetMonth = 12
        targetYear = year - 1
      }
      
      // 해당 월의 거주 기록 조회 (API 사용) - 이전 달 데이터
      const monthlyHistory = await residentService.getMonthlyResidentHistory(
        studentId.value, 
        targetYear, 
        targetMonth
      )
      
      // 각 방별 청구서 데이터 업데이트
      const roomInvoicesPromises = monthlyHistory.items.map(async (resident) => {
        const monthlyRent = Number(resident.room?.rent) || 0
        const daysInMonth = 30 // 야칭은 무조건 30일로 계산
        const dailyRate = Math.round(monthlyRent / daysInMonth)
        const daysInResidence = calculateDaysInResidenceForRoom(resident, `${targetYear}-${String(targetMonth).padStart(2, '0')}`)
        
        // room-detail에서 등록한 광열비 정보 가져오기 (선택된 월 데이터)
        let utilityData = {
          electricity_amount: 0,
          electricity_start_date: '',
          electricity_end_date: '',
          gas_amount: 0,
          gas_start_date: '',
          gas_end_date: '',
          water_amount: 0,
          water_start_date: '',
          water_end_date: '',
        }
        
        // 학생별 유틸리티 할당 정보 가져오기
        let studentUtilityAllocation = {
          electricity: { amount_per_day: 0, my_amount: 0 },
          gas: { amount_per_day: 0, my_amount: 0 },
          water: { amount_per_day: 0, my_amount: 0 }
        }
        
        if (resident.room_id) {
          try {
            // 선택된 월의 유틸리티 데이터 조회
            const utilitiesResponse = await roomService.getUtilitiesByMonth(resident.room_id, newMonth)
            const utilities = utilitiesResponse.items || []
            
            // 유틸리티 데이터 매핑
            utilities.forEach((utility: any) => {
              switch (utility.utility_type) {
                case 'electricity':
                  utilityData.electricity_amount = utility.total_amount || 0
                  utilityData.electricity_start_date = utility.period_start || ''
                  utilityData.electricity_end_date = utility.period_end || ''
                  break
                case 'gas':
                  utilityData.gas_amount = utility.total_amount || 0
                  utilityData.gas_start_date = utility.period_start || ''
                  utilityData.gas_end_date = utility.period_end || ''
                  break
                case 'water':
                  utilityData.water_amount = utility.total_amount || 0
                  utilityData.water_start_date = utility.period_start || ''
                  utilityData.water_end_date = utility.period_end || ''
                  break
              }
            })
            
            // 학생별 유틸리티 할당 정보 조회
            const allocationResponse = await roomService.getStudentMonthlyUtilityAllocation(
              resident.room_id,
              studentId.value,
              year,
              month
            )
            
            // 할당 정보 매핑
            if (allocationResponse.utilities) {
              allocationResponse.utilities.forEach((utility: any) => {
                switch (utility.utility_type) {
                  case 'electricity':
                    studentUtilityAllocation.electricity = {
                      amount_per_day: utility.amount_per_day || 0,
                      my_amount: Math.floor(utility.my_amount || 0)
                    }
                    break
                  case 'gas':
                    studentUtilityAllocation.gas = {
                      amount_per_day: utility.amount_per_day || 0,
                      my_amount: Math.floor(utility.my_amount || 0)
                    }
                    break
                  case 'water':
                    studentUtilityAllocation.water = {
                      amount_per_day: utility.amount_per_day || 0,
                      my_amount: Math.floor(utility.my_amount || 0)
                    }
                    break
                }
              })
            }
          } catch (error) {
            console.error('유틸리티 데이터 로드 실패:', error)
          }
        }
        
        return {
          room_id: resident.room_id || '',
          room_number: resident.room?.room_number || '',
          building_name: resident.building?.name || '',
          daily_rate: dailyRate,
          days_in_month: daysInResidence,
          rent_amount: dailyRate * daysInResidence,
          electricity_amount: utilityData.electricity_amount,
          electricity_start_date: utilityData.electricity_start_date,
          electricity_end_date: utilityData.electricity_end_date,
          gas_amount: utilityData.gas_amount,
          gas_start_date: utilityData.gas_start_date,
          gas_end_date: utilityData.gas_end_date,
          water_amount: utilityData.water_amount,
          water_start_date: utilityData.water_start_date,
          water_end_date: utilityData.water_end_date,
          check_in_date: resident.check_in_date,
          check_out_date: resident.check_out_date || '',
          // 학생별 유틸리티 할당 정보 추가
          student_utility_allocation: studentUtilityAllocation
        }
      })
      
      // 모든 방의 데이터를 병렬로 처리
      const roomInvoices = await Promise.all(roomInvoicesPromises)
      invoiceForm.value.room_invoices = roomInvoices
      
      updateTotalAmount()
      
    } catch (err: any) {
      error.value = err.response?.data?.message || '月別居住記録の取得に失敗しました。'
    } finally {
      loading.value = false
    }
  }
}, { deep: true })

// 총액 계산 함수
const updateTotalAmount = () => {
  const total = invoiceForm.value.room_invoices.reduce((sum, roomInvoice) => {
    const roomTotal = roomInvoice.rent_amount + 
                     roomInvoice.electricity_amount + 
                     roomInvoice.gas_amount + 
                     roomInvoice.water_amount
    return sum + roomTotal
  }, 0)
  
  invoiceForm.value.total_amount = total
}

// 전기, 가스, 물 요금 변경 시 총액 업데이트
watch(() => invoiceForm.value.room_invoices, () => {
  updateTotalAmount()
}, { deep: true })
</script>

<template>
  <VCard>
    <VCardTitle class="text-h5 pa-4">
      <VIcon class="me-2">ri-home-line</VIcon>
      居住地情報
    </VCardTitle>

    <VCardText>
      <!-- 에러 메시지 -->
      <VAlert
        v-if="error"
        type="error"
        class="mb-6"
      >
        {{ error }}
      </VAlert>

      <!-- 로딩 상태 -->
      <VProgressLinear
        v-if="loading"
        indeterminate
        color="primary"
        class="mb-6"
      />

      <!-- 현재 거주지 정보 -->
      <div v-if="!loading && currentResidence" class="mb-8">
        <div class="d-flex justify-space-between align-center mb-4">
          <h4 class="text-h6">
          <VIcon class="me-2">ri-map-pin-line</VIcon>
          現在の居住地
        </h4>
          
          <div class="d-flex gap-2">
            <VBtn
              color="primary"
              variant="outlined"
              size="small"
              prepend-icon="ri-file-text-line"
              @click="openInvoiceModal"
            >
              請求書作成
            </VBtn>
            <VBtn
              color="warning"
              variant="outlined"
              size="small"
              prepend-icon="ri-exchange-line"
              @click="openModal('change')"
            >
              居住地変更
            </VBtn>
            <VBtn
              color="error"
              variant="outlined"
              size="small"
              prepend-icon="ri-logout-box-line"
              @click="openModal('checkout')"
            >
              退去処理
            </VBtn>
          </div>
        </div>
        
        <VCard variant="outlined" class="pa-4">
          <VRow>
            <VCol cols="12" md="6">
              <div class="d-flex align-center mb-3">
                <VIcon class="me-2" color="primary">ri-building-line</VIcon>
                <strong>建物:</strong>
                <span class="ml-2">{{ currentResidence.building?.name }}</span>
              </div>
              
              <div class="d-flex align-center mb-3">
                <VIcon class="me-2" color="primary">ri-home-line</VIcon>
                <strong>部屋番号:</strong>
                <span class="ml-2">{{ currentResidence.room?.room_number }}</span>
              </div>
              
              <div class="d-flex align-center mb-3">
                <VIcon class="me-2" color="primary">ri-money-dollar-circle-line</VIcon>
                <strong>家賃:</strong>
                <span class="ml-2">¥{{ currentResidence.room?.rent?.toLocaleString() }}</span>
              </div>
            </VCol>
            
            <VCol cols="12" md="6">
              <div class="d-flex align-center mb-3">
                <VIcon class="me-2" color="primary">ri-calendar-line</VIcon>
                <strong>入居日:</strong>
                <span class="ml-2">{{ formatDate(currentResidence.resident.check_in_date) }}</span>
              </div>
              
              <div class="d-flex align-center mb-3">
                <VIcon class="me-2" color="primary">ri-file-text-line</VIcon>
                <strong>備考:</strong>
                <span class="ml-2">{{ currentResidence.resident.note || '-' }}</span>
              </div>
              
              <div class="d-flex align-center">
                <VIcon class="me-2" color="primary">ri-check-line</VIcon>
                <strong>ステータス:</strong>
                <VChip
                  :color="currentResidence.resident.is_active ? 'success' : 'error'"
                  size="small"
                  class="ml-2"
                >
                  {{ currentResidence.resident.is_active ? '在住中' : '退去' }}
                </VChip>
              </div>
            </VCol>
          </VRow>
        </VCard>
      </div>

      <!-- 입실 정보가 없을 때 -->
      <div v-if="!loading && !currentResidence" class="mb-8">
        <div class="d-flex justify-space-between align-center mb-4">
          <h4 class="text-h6">
            <VIcon class="me-2">ri-map-pin-line</VIcon>
            現在の居住地
          </h4>
          
          <div class="d-flex gap-2">
            <VBtn
              color="primary"
              variant="outlined"
              size="small"
              prepend-icon="ri-file-text-line"
              @click="openInvoiceModal"
            >
              請求書作成
            </VBtn>
          <VBtn
            color="primary"
              variant="outlined"
              size="small"
            prepend-icon="ri-add-line"
              @click="openModal('new')"
          >
            新規入居登録
          </VBtn>
          </div>
        </div>
        
        <VAlert
          type="info"
          variant="tonal"
          class="mb-4"
        >
          <template #prepend>
            <VIcon>ri-information-line</VIcon>
          </template>
          <div class="text-h6 mb-2">入居情報がありません</div>
          <div class="text-body-2">
            現在、この技能生は入居していません。新しい入居情報を登録するか、過去の入居履歴を確認してください。
          </div>
        </VAlert>
      </div>

      <!-- 거주지 변경 기록 -->
      <div v-if="!loading" class="mb-6">
        <h4 class="text-h6 mb-4">
          <VIcon class="me-2">ri-history-line</VIcon>
          居住地変更履歴
        </h4>

        <VDataTable
          :headers="[
            { title: '建物', key: 'building' },
            { title: '部屋番号', key: 'room' },
            { title: '入居日', key: 'check_in' },
            { title: '退去日', key: 'check_out' },
            { title: 'ステータス', key: 'status' },
            { title: '備考', key: 'note' }
          ]"
          :items="residentHistory"
          :loading="loading"
          class="elevation-1"
        >
          <!-- 빌딩 컬럼 -->
          <template #[`item.building`]="{ item }">
            {{ getBuildingName(item) }}
          </template>

          <!-- 호실 컬럼 -->
          <template #[`item.room`]="{ item }">
            {{ getRoomNumber(item) }}
          </template>

          <!-- 입주일 컬럼 -->
          <template #[`item.check_in`]="{ item }">
            {{ formatDate(item.check_in_date) }}
          </template>

          <!-- 퇴거일 컬럼 -->
          <template #[`item.check_out`]="{ item }">
            {{ formatDate(item.check_out_date || '') }}
          </template>

          <!-- 상태 컬럼 -->
          <template #[`item.status`]="{ item }">
            <VChip
              :color="item.is_active ? 'success' : 'error'"
              size="small"
            >
              {{ item.is_active ? '在住中' : '退去' }}
            </VChip>
          </template>

          <!-- 비고 컬럼 -->
          <template #[`item.note`]="{ item }">
            {{ item.note || '-' }}
          </template>
        </VDataTable>

        <!-- 기록이 없을 때 -->
        <VAlert
          v-if="residentHistory.length === 0"
          type="info"
          class="mt-4"
        >
          居住地変更履歴がありません。
        </VAlert>
      </div>
    </VCardText>
  </VCard>

  <!-- 거주지 변경/퇴실 모달 -->
  <VDialog
    v-model="showResidenceModal"
    max-width="600px"
    persistent
  >
    <VCard>
      <VCardTitle class="text-h5 pa-4">
        <VIcon class="me-2">
          {{ modalType === 'change' ? 'ri-exchange-line' : modalType === 'checkout' ? 'ri-logout-box-line' : 'ri-add-line' }}
        </VIcon>
        {{ modalType === 'change' ? '居住地変更' : modalType === 'checkout' ? '退去処理' : '新規入居登録' }}
      </VCardTitle>

      <VCardText class="pa-4">
        <VForm @submit.prevent="modalType === 'change' ? handleResidenceChange() : modalType === 'checkout' ? handleCheckout() : handleNewResidence()">
          <VRow>
            <!-- 변경일/퇴실일 -->
            <VCol cols="12" md="6">
              <VTextField
                v-model="form.change_date"
                :label="modalType === 'change' ? '変更日' : modalType === 'checkout' ? '退去日' : '入居日'"
                type="date"
                required
                :rules="[v => !!v || (modalType === 'change' ? '変更日を入力してください' : modalType === 'checkout' ? '退去日を入力してください' : '入居日を入力してください')]"
              />
            </VCol>

            <!-- 새 빌딩 (변경 시에만) -->
            <VCol v-if="modalType === 'change' || modalType === 'new'" cols="12" md="6">
              <VSelect
                v-model="form.new_building_id"
                :items="buildingOptions"
                item-title="title"
                item-value="value"
                label="新築物"
                required
                :rules="[v => !!v || (modalType === 'change' ? '新築物を選択してください' : modalType === 'new' ? '新築物を選択してください' : '')]"
                @update:model-value="handleBuildingChange"
              />
            </VCol>

            <!-- 새 호실 (변경 시에만) -->
            <VCol v-if="modalType === 'change' || modalType === 'new'" cols="12" md="6">
              <VSelect
                v-model="form.new_room_id"
                :items="roomOptions"
                item-title="title"
                item-value="value"
                label="新部屋"
                required
                :rules="[v => !!v || (modalType === 'change' ? '新部屋を選択してください' : modalType === 'new' ? '新部屋を選択してください' : '')]"
                :disabled="!form.new_building_id"
              />
            </VCol>

            <!-- 비고 -->
            <VCol cols="12">
              <VTextarea
                v-model="form.note"
                label="備考"
                rows="3"
                placeholder="変更理由やその他の注意事項を入力してください"
              />
            </VCol>
          </VRow>
        </VForm>
      </VCardText>

      <VCardActions class="pa-4">
        <VSpacer />
        <VBtn
          color="error"
          variant="text"
          @click="closeModal"
          :disabled="loading"
        >
          キャンセル
        </VBtn>
        <VBtn
          :color="modalType === 'change' ? 'warning' : modalType === 'checkout' ? 'error' : 'primary'"
          :loading="loading"
          @click="modalType === 'change' ? handleResidenceChange() : modalType === 'checkout' ? handleCheckout() : handleNewResidence()"
        >
          {{ modalType === 'change' ? '変更' : modalType === 'checkout' ? '退去' : '新規入居登録' }}
        </VBtn>
      </VCardActions>
    </VCard>
  </VDialog>

  <!-- 청구서 작성 모달 -->
  <VDialog
    v-model="showInvoiceModal"
    max-width="700px"
    persistent
  >
    <VCard>
      <VCardTitle class="text-h5 pa-4">
        <VIcon class="me-2">ri-file-text-line</VIcon>
        請求書作成
      </VCardTitle>

      <VCardText class="pa-4">
        <VForm>
          <VRow>
            <!-- 청구 월 -->
            <VCol cols="12" md="6">
              <VTextField
                v-model="invoiceForm.target_month"
                label="請求月"
                type="month"
                :disabled="loading"
              />
            </VCol>

            <!-- 총 청구 금액 -->
            <VCol cols="12" md="6">
              <VTextField
                :model-value="`¥${invoiceForm.total_amount.toLocaleString()}`"
                label="総請求金額"
                readonly
                variant="outlined"
                class="text-h6"
                color="primary"
              />
            </VCol>

            <!-- 각 방별 청구서 -->
            <VCol cols="12">
              <VExpansionPanels>
                <VExpansionPanel
                  v-for="(roomInvoice, index) in invoiceForm.room_invoices"
                  :key="index"
                >
                  <VExpansionPanelTitle>
                    <div class="d-flex align-center justify-space-between w-100">
                      <div>
                        <strong>{{ roomInvoice.building_name }} {{ roomInvoice.room_number }}号室</strong>
                        <div class="text-caption">
                          {{ formatDate(roomInvoice.check_in_date) }} ~ {{ formatDate(roomInvoice.check_out_date) }}
                        </div>
                      </div>
                      <div class="text-right">
                        <div class="text-subtitle-2">
                          ¥{{ (Number(roomInvoice.rent_amount) + 
                               Number(roomInvoice.electricity_amount) + 
                               Number(roomInvoice.gas_amount) + 
                               Number(roomInvoice.water_amount)).toLocaleString() }}
                        </div>
                        <div class="text-caption">
                          {{ roomInvoice.days_in_month }}日間
                          (家賃: ¥{{ roomInvoice.rent_amount.toLocaleString() }} + 
                          光熱費: ¥{{ (Number(roomInvoice.electricity_amount) + 
                                       Number(roomInvoice.gas_amount) + 
                                       Number(roomInvoice.water_amount)).toLocaleString() }})
                        </div>
                      </div>
                    </div>
                  </VExpansionPanelTitle>
                  
                  <VExpansionPanelText>
                    <VRow>
                      <!-- 임대료 정보 -->
                      <VCol cols="12" md="4">
                        <VTextField
                          :model-value="`¥${roomInvoice.daily_rate.toLocaleString()}`"
                          label="日額家賃"
                          readonly
                          variant="outlined"
                        />
                      </VCol>
                      
                      <VCol cols="12" md="4">
                        <VTextField
                          :model-value="`${roomInvoice.days_in_month}日`"
                          label="居住日数"
                          readonly
                          variant="outlined"
                        />
                      </VCol>
                      
                      <VCol cols="12" md="4">
                        <VTextField
                          :model-value="`¥${roomInvoice.rent_amount.toLocaleString()}`"
                          label="家賃合計"
                          readonly
                          variant="outlined"
                          color="primary"
                        />
                      </VCol>

                      <!-- 유틸리티 요금 (한 줄로 표시) -->
                      <VCol cols="12">
                        <VCard variant="outlined" class="pa-3">
                          <div class="text-subtitle-2 mb-3">光熱費</div>
                          <div class="d-flex flex-column gap-2">
                            <!-- 전기 요금 -->
                            <div class="d-flex align-center justify-space-between">
                              <div class="d-flex align-center">
                                <VIcon class="me-1" color="warning" size="16">ri-flashlight-line</VIcon>
                                <span class="text-body-2">電気: ¥{{ roomInvoice.electricity_amount.toLocaleString() }}</span>
                              </div>
                              <div class="text-caption text-grey">
                                {{ formatDate(roomInvoice.electricity_start_date) }} ~ {{ formatDate(roomInvoice.electricity_end_date) }}
                              </div>
                            </div>
                            <!-- 전기 요금 할당 정보 -->
                            <div class="d-flex align-center justify-space-between ml-4">
                              <span class="text-caption">日額: ¥{{ roomInvoice.student_utility_allocation?.electricity?.amount_per_day?.toLocaleString() || 0 }}</span>
                              <span class="text-caption">私の負担: ¥{{ roomInvoice.student_utility_allocation?.electricity?.my_amount?.toLocaleString() || 0 }}</span>
                            </div>
                            
                            <!-- 가스 요금 -->
                            <div class="d-flex align-center justify-space-between">
                              <div class="d-flex align-center">
                                <VIcon class="me-1" color="error" size="16">ri-fire-line</VIcon>
                                <span class="text-body-2">ガス: ¥{{ roomInvoice.gas_amount.toLocaleString() }}</span>
                              </div>
                              <div class="text-caption text-grey">
                                {{ formatDate(roomInvoice.gas_start_date) }} ~ {{ formatDate(roomInvoice.gas_end_date) }}
                              </div>
                            </div>
                            <!-- 가스 요금 할당 정보 -->
                            <div class="d-flex align-center justify-space-between ml-4">
                              <span class="text-caption">日額: ¥{{ roomInvoice.student_utility_allocation?.gas?.amount_per_day?.toLocaleString() || 0 }}</span>
                              <span class="text-caption">私の負担: ¥{{ roomInvoice.student_utility_allocation?.gas?.my_amount?.toLocaleString() || 0 }}</span>
                            </div>
                            
                            <!-- 물 요금 -->
                            <div class="d-flex align-center justify-space-between">
                              <div class="d-flex align-center">
                                <VIcon class="me-1" color="info" size="16">ri-water-flash-line</VIcon>
                                <span class="text-body-2">水道: ¥{{ roomInvoice.water_amount.toLocaleString() }}</span>
                              </div>
                              <div class="text-caption text-grey">
                                {{ formatDate(roomInvoice.water_start_date) }} ~ {{ formatDate(roomInvoice.water_end_date) }}
                              </div>
                            </div>
                            <!-- 물 요금 할당 정보 -->
                            <div class="d-flex align-center justify-space-between ml-4">
                              <span class="text-caption">日額: ¥{{ roomInvoice.student_utility_allocation?.water?.amount_per_day?.toLocaleString() || 0 }}</span>
                              <span class="text-caption">私の負担: ¥{{ roomInvoice.student_utility_allocation?.water?.my_amount?.toLocaleString() || 0 }}</span>
                            </div>
                          </div>
                        </VCard>
                      </VCol>
                    </VRow>
                  </VExpansionPanelText>
                </VExpansionPanel>
              </VExpansionPanels>
            </VCol>

            <!-- 비고 -->
            <VCol cols="12">
              <VTextarea
                v-model="invoiceForm.note"
                label="備考"
                rows="3"
                placeholder="請求書に関する備考を入力してください"
              />
            </VCol>
          </VRow>
        </VForm>
      </VCardText>

      <VCardActions class="pa-4">
        <VSpacer />
        <VBtn
          color="error"
          variant="text"
          @click="closeInvoiceModal"
          :disabled="loading"
        >
          キャンセル
        </VBtn>
      </VCardActions>
    </VCard>
  </VDialog>
</template>

<style lang="scss" scoped>
.v-data-table {
  .v-data-table-header {
    background-color: rgb(var(--v-theme-surface));
  }
}
</style>
