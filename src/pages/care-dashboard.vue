<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue'
import { useRouter } from 'vue-router'
import { buildingService, type MyBuildingItem } from '@/services/building'
import { elderlyService, type ElderlyBuildingStatistics } from '@/services/elderly'

const router = useRouter()

// 페이지 로딩 상태
const isLoading = ref(false)

// 빌딩 관련 상태
const myBuildings = ref<MyBuildingItem[]>([])
const selectedBuilding = ref<MyBuildingItem | null>(null)
const buildingsLoading = ref(false)

// 빌딩 통계 데이터
const buildingStatistics = ref<ElderlyBuildingStatistics | null>(null)

// 통계 데이터 (선택된 빌딩 기반)
const stats = computed(() => {
  if (!selectedBuilding.value) {
    return {
      totalElderly: 0,
      hospitalized: 0,
      nonHospitalized: 0,
      hospitalizationRate: 0,
      totalRooms: 0,
      occupiedRooms: 0,
      emptyRooms: 0,
      occupancyRate: 0
    }
  }
  
  const building = selectedBuilding.value
  const statistics = buildingStatistics.value?.statistics
  
  // API 데이터가 있으면 사용, 없으면 기존 계산 방식 사용
  if (statistics) {
    return {
      totalElderly: statistics.total_residents,
      hospitalized: statistics.hospitalized_count,
      nonHospitalized: statistics.non_hospitalized_count,
      hospitalizationRate: statistics.hospitalization_rate,
      totalRooms: statistics.total_rooms,
      occupiedRooms: statistics.occupied_rooms,
      emptyRooms: statistics.vacant_rooms,
      occupancyRate: statistics.occupancy_rate
    }
  }
  
  // Fallback: API 데이터 없을 때
  const emptyRooms = building.total_rooms - building.active_residents_count
  const occupancyRate = building.total_rooms > 0 
    ? Math.round((building.active_residents_count / building.total_rooms) * 100) 
    : 0
  
  return {
    totalElderly: building.active_residents_count,
    hospitalized: 0,
    nonHospitalized: building.active_residents_count,
    hospitalizationRate: 0,
    totalRooms: building.total_rooms,
    occupiedRooms: building.active_residents_count,
    emptyRooms: emptyRooms,
    occupancyRate: occupancyRate
  }
})

// 요양등급 분포 데이터
const careLevelData = computed(() => {
  if (!buildingStatistics.value?.statistics) return []
  
  return Object.entries(buildingStatistics.value.statistics.care_level_distribution)
    .map(([level, count]) => ({ level, count }))
    .sort((a, b) => b.count - a.count)
})

// 연령대 분포 데이터
const ageDistributionData = computed(() => {
  if (!buildingStatistics.value?.statistics) return []
  
  return Object.entries(buildingStatistics.value.statistics.age_distribution)
    .map(([range, count]) => ({ range, count }))
})

// 성별 분포 데이터
const genderDistributionData = computed(() => {
  if (!buildingStatistics.value?.statistics) return []
  
  const dist = buildingStatistics.value.statistics.gender_distribution
  return [
    { gender: '男性', count: dist['男'] || 0, color: 'primary' },
    { gender: '女性', count: dist['女'] || 0, color: 'error' },
    { gender: 'その他', count: dist['その他'] || 0, color: 'grey' }
  ].filter(item => item.count > 0)
})

// 입원 중인 입주자 목록
const hospitalizedResidents = computed(() => {
  return buildingStatistics.value?.hospitalized_residents || []
})

// 최다 연령대 계산
const topAgeRange = computed(() => {
  if (ageDistributionData.value.length === 0) {
    return { range: '-', count: 0 }
  }
  return ageDistributionData.value.reduce((max, curr) => 
    curr.count > max.count ? curr : max, 
    ageDistributionData.value[0]
  )
})

// 내 빌딩 목록 조회
const fetchMyBuildings = async () => {
  try {
    isLoading.value = true
    const response = await buildingService.getMyBuildings()
    myBuildings.value = response.buildings
    
    // 첫 번째 빌딩을 기본 선택
    if (myBuildings.value.length > 0) {
      selectedBuilding.value = myBuildings.value[0]
    }
  } catch (error) {
    console.error('빌딩 목록 조회 오류:', error)
  } finally {
    isLoading.value = false
  }
}

// 빌딩 통계 조회
const fetchBuildingStatistics = async (buildingId: string) => {
  try {
    buildingStatistics.value = await elderlyService.getBuildingStatistics(buildingId)
  } catch (error) {
    console.error('빌딩 통계 조회 오류:', error)
    buildingStatistics.value = null
  }
}

// 선택된 빌딩이 변경될 때마다 통계 조회
watch(selectedBuilding, (newBuilding) => {
  if (newBuilding) {
    fetchBuildingStatistics(newBuilding.building_id)
  } else {
    buildingStatistics.value = null
  }
})


// 노인 목록으로 이동 (선택된 빌딩 포함)
const goToElderlyList = () => {
  if (selectedBuilding.value) {
    router.push({ path: '/elderly-list', query: { building_id: selectedBuilding.value.building_id } })
  } else {
    router.push('/elderly-list')
  }
}

// 식사 기록으로 이동 (선택된 빌딩 포함)
const goToMealRecord = () => {
  if (selectedBuilding.value) {
    router.push({ path: '/care-facility-meal-record', query: { building_id: selectedBuilding.value.building_id } })
  } else {
    router.push('/care-facility-meal-record')
  }
}

// 연락 작성으로 이동 (선택된 빌딩 포함)
const goToContact = () => {
  if (selectedBuilding.value) {
    router.push({ path: '/elderly-contact', query: { building_id: selectedBuilding.value.building_id } })
  } else {
    router.push('/elderly-contact')
  }
}

onMounted(async () => {
  await fetchMyBuildings()
  
  // 첫 번째 빌딩이 선택되었으면 통계 조회
  if (selectedBuilding.value) {
    await fetchBuildingStatistics(selectedBuilding.value.building_id)
  }
})
</script>

<template>
  <div class="care-dashboard">
    <!-- 헤더 -->
    <div class="dashboard-header">
      <div>
        <h1 class="dashboard-title">
          <VIcon size="32" class="me-3">ri-heart-pulse-line</VIcon>
          介護管理ダッシュボード
        </h1>
        <p class="dashboard-subtitle">高齢者管理システム</p>
      </div>
      
      <!-- 빌딩 선택 -->
      <div class="building-selector">
        <div v-if="myBuildings.length > 0" class="building-scroll-container">
          <div class="building-chips">
            <VChip
              v-for="building in myBuildings"
              :key="building.building_id"
              :color="selectedBuilding?.building_id === building.building_id ? 'primary' : 'default'"
              :variant="selectedBuilding?.building_id === building.building_id ? 'elevated' : 'outlined'"
              class="building-chip"
              @click="selectedBuilding = building"
              clickable
            >
              <VIcon size="16" class="me-2">ri-building-line</VIcon>
              {{ building.building_name }}
            </VChip>
          </div>
        </div>
      </div>
    </div>

    <!-- 로딩 상태 -->
    <div v-if="isLoading" class="loading-container">
      <VProgressCircular
        indeterminate
        color="primary"
        size="48"
      />
      <p class="mt-4 text-body-1">読み込み中...</p>
    </div>

    <!-- 메인 컨텐츠 -->
    <div v-else class="dashboard-content">
      <!-- 통계 카드 -->
      <VRow class="mb-6">
        <VCol cols="12" sm="6" md="3">
          <VCard class="stat-card">
            <VCardText>
              <div class="stat-icon-wrapper primary">
                <VIcon size="32" color="white">ri-user-3-line</VIcon>
              </div>
              <div class="stat-info">
                <div class="stat-label">総利用者数</div>
                <div class="stat-value">{{ stats.totalElderly }}</div>
              </div>
            </VCardText>
          </VCard>
        </VCol>

        <VCol cols="12" sm="6" md="3">
          <VCard class="stat-card">
            <VCardText>
              <div class="stat-icon-wrapper success">
                <VIcon size="32" color="white">ri-hospital-line</VIcon>
              </div>
              <div class="stat-info">
                <div class="stat-label">入院者数</div>
                <div class="stat-value">{{ stats.hospitalized }}</div>
              </div>
            </VCardText>
          </VCard>
        </VCol>
        <VCol cols="12" sm="6" md="3">
          <VCard class="stat-card">
            <VCardText>
              <div class="stat-icon-wrapper error">
                <VIcon size="32" color="white">ri-door-line</VIcon>
              </div>
              <div class="stat-info">
                <div class="stat-label">総部屋数</div>
                <div class="stat-value">{{ stats.totalRooms }}</div>
              </div>
            </VCardText>
          </VCard>
        </VCol>

        <VCol cols="12" sm="6" md="3">
          <VCard class="stat-card">
            <VCardText>
              <div class="stat-icon-wrapper info">
                <VIcon size="32" color="white">ri-home-line</VIcon>
              </div>
              <div class="stat-info">
                <div class="stat-label">空室現況</div>
                <div class="stat-value">{{ stats.emptyRooms }}</div>
              </div>
            </VCardText>
          </VCard>
        </VCol>

        <VCol cols="12" sm="6" md="3">
          <VCard class="stat-card">
            <VCardText>
              <div class="stat-icon-wrapper secondary">
                <VIcon size="32" color="white">ri-pie-chart-line</VIcon>
              </div>
              <div class="stat-info">
                <div class="stat-label">入居率</div>
                <div class="stat-value">{{ stats.occupancyRate }}%</div>
              </div>
            </VCardText>
          </VCard>
        </VCol>
        <VCol cols="12" sm="6" md="3">
          <VCard class="stat-card">
            <VCardText>
              <div class="stat-icon-wrapper primary">
                <VIcon size="32" color="white">ri-men-line</VIcon>
              </div>
              <div class="stat-info">
                <div class="stat-label">男性</div>
                <div class="stat-value">{{ genderDistributionData.find(g => g.gender === '男性')?.count || 0 }}</div>
              </div>
            </VCardText>
          </VCard>
        </VCol>

        <!-- 여성 -->
        <VCol cols="12" sm="6" md="3">
          <VCard class="stat-card">
            <VCardText>
              <div class="stat-icon-wrapper error">
                <VIcon size="32" color="white">ri-women-line</VIcon>
              </div>
              <div class="stat-info">
                <div class="stat-label">女性</div>
                <div class="stat-value">{{ genderDistributionData.find(g => g.gender === '女性')?.count || 0 }}</div>
              </div>
            </VCardText>
          </VCard>
        </VCol>
      </VRow>

      <!-- 메뉴 카드 -->
      <VRow>
        <!-- 연락 관리 카드 -->
        <VCol cols="12" md="6" lg="4">
          <VCard 
            class="menu-card contact-card"
            hover
            @click="goToContact"
          >
            <VCardText class="menu-card-content">
              <div class="menu-icon-wrapper">
                <VIcon size="64" color="error">ri-file-text-line</VIcon>
              </div>
              <div class="menu-info">
                <h2 class="menu-title">連絡管理</h2>
                <p class="menu-description">
                  故障・クレーム等の連絡を管理
                </p>
                <div class="menu-features">
                  <div class="feature-item">
                    <VIcon size="16" class="me-1">ri-check-line</VIcon>
                    <span>連絡作成</span>
                  </div>
                  <div class="feature-item">
                    <VIcon size="16" class="me-1">ri-check-line</VIcon>
                    <span>送信履歴確認</span>
                  </div>
                  <div class="feature-item">
                    <VIcon size="16" class="me-1">ri-check-line</VIcon>
                    <span>コメント管理</span>
                  </div>
                </div>
              </div>
              <VIcon class="menu-arrow" size="32" color="error">ri-arrow-right-line</VIcon>
            </VCardText>
          </VCard>
        </VCol>
        <!-- 노인 목록 카드 -->
        <VCol cols="12" md="6" lg="4">
          <VCard 
            class="menu-card elderly-card"
            hover
            @click="goToElderlyList"
          >
            <VCardText class="menu-card-content">
              <div class="menu-icon-wrapper">
                <VIcon size="64" color="primary">ri-user-3-line</VIcon>
              </div>
              <div class="menu-info">
                <h2 class="menu-title">利用者一覧</h2>
                <p class="menu-description">
                  高齢者の情報を管理・閲覧します
                </p>
                <div class="menu-features">
                  <div class="feature-item">
                    <VIcon size="16" class="me-1">ri-check-line</VIcon>
                    <span>利用者情報管理</span>
                  </div>
                  <div class="feature-item">
                    <VIcon size="16" class="me-1">ri-check-line</VIcon>
                    <span>健康状態確認</span>
                  </div>
                  <div class="feature-item">
                    <VIcon size="16" class="me-1">ri-check-line</VIcon>
                    <span>介護記録閲覧</span>
                  </div>
                </div>
              </div>
              <VIcon class="menu-arrow" size="32" color="primary">ri-arrow-right-line</VIcon>
            </VCardText>
          </VCard>
        </VCol>

        <!-- 식사 기록 카드 -->
        <VCol cols="12" md="6" lg="4">
          <VCard 
            class="menu-card meal-card disabled"
          >
            <VCardText class="menu-card-content">
              <div class="menu-icon-wrapper">
                <VIcon size="64" color="success">ri-receipt-line</VIcon>
              </div>
              <div class="menu-info">
                <div class="d-flex align-center gap-2 mb-2">
                  <h2 class="menu-title mb-0">請求管理</h2>
                  <VChip size="small" color="warning" variant="elevated">
                    開発中
                  </VChip>
                </div>
                <p class="menu-description">
                  施設内の請求を管理します
                </p>
                <div class="menu-features">
                  <div class="feature-item">
                    <VIcon size="16" class="me-1">ri-check-line</VIcon>
                    <span>食事記録管理</span>
                  </div>
                  <div class="feature-item">
                    <VIcon size="16" class="me-1">ri-check-line</VIcon>
                    <span>おむつ管理</span>
                  </div>
                  <div class="feature-item">
                    <VIcon size="16" class="me-1">ri-check-line</VIcon>
                    <span>公課金管理</span>
                  </div>
                </div>
              </div>
            </VCardText>
          </VCard>
        </VCol>
      </VRow>
    </div>
  </div>
</template>

<style scoped>
.care-dashboard {
  padding: 24px;
  max-width: 1400px;
  margin: 0 auto;
}

.dashboard-header {
  margin-bottom: 32px;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 24px;
}

.dashboard-title {
  font-size: 32px;
  font-weight: 700;
  color: #333;
  margin-bottom: 8px;
  display: flex;
  align-items: center;
}

.dashboard-subtitle {
  font-size: 16px;
  color: #666;
  margin: 0;
}

/* 빌딩 선택 */
.building-selector {
  flex-shrink: 0;
  min-width: 200px;
  max-width: 250px;
}

.building-scroll-container {
  overflow-x: auto;
  overflow-y: hidden;
  padding: 4px;
  
  /* 스크롤바 스타일 */
  scrollbar-width: thin;
  scrollbar-color: #7c3aed #f0f0f0;
}

.building-scroll-container::-webkit-scrollbar {
  height: 6px;
}

.building-scroll-container::-webkit-scrollbar-track {
  background: #f0f0f0;
  border-radius: 3px;
}

.building-scroll-container::-webkit-scrollbar-thumb {
  background: #7c3aed;
  border-radius: 3px;
}

.building-scroll-container::-webkit-scrollbar-thumb:hover {
  background: #6d28d9;
}

.building-chips {
  display: flex;
  gap: 8px;
  flex-wrap: nowrap;
  padding-bottom: 4px;
}

.building-chip {
  flex-shrink: 0;
  transition: all 0.3s;
  cursor: pointer;
}

.building-chip:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.12);
}

.building-address {
  display: flex;
  align-items: center;
  padding: 4px 8px;
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 20px;
}

.dashboard-content {
  width: 100%;
}

/* 통계 카드 */
.stat-card {
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  transition: transform 0.2s, box-shadow 0.2s;
}

.stat-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
}

.stat-card .v-card-text {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
}

.stat-icon-wrapper {
  border-radius: 12px;
  padding: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.stat-icon-wrapper.primary {
  background-color: #7c3aed;
}

.stat-icon-wrapper.success {
  background-color: #10b981;
}

.stat-icon-wrapper.warning {
  background-color: #f59e0b;
}

.stat-icon-wrapper.info {
  background-color: #0ea5e9;
}

.stat-icon-wrapper.secondary {
  background-color: #8b5cf6;
}

.stat-icon-wrapper.error {
  background-color: #ef4444;
}

.stat-info {
  flex: 1;
}

.stat-label {
  font-size: 13px;
  color: #666;
  margin-bottom: 4px;
}

.stat-value {
  font-size: 28px;
  font-weight: 700;
  color: #333;
}

.stat-value-small {
  font-size: 20px;
  font-weight: 700;
  color: #333;
}

.stat-sub-value {
  font-size: 13px;
  color: #666;
  margin-top: 2px;
}

/* 메뉴 카드 */
.menu-card {
  border-radius: 16px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  transition: all 0.3s;
  cursor: pointer;
  border: 2px solid transparent;
  height: 100%;
  min-height: 280px;
}

.menu-card:hover {
  transform: translateY(-8px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
}

.menu-card.elderly-card:hover {
  border-color: #7c3aed;
  background: linear-gradient(135deg, #ffffff 0%, #f5f3ff 100%);
}

.menu-card.meal-card:hover {
  border-color: #10b981;
  background: linear-gradient(135deg, #ffffff 0%, #ecfdf5 100%);
}

.menu-card.contact-card:hover {
  border-color: #ef4444;
  background: linear-gradient(135deg, #ffffff 0%, #fef2f2 100%);
}

.menu-card.disabled {
  opacity: 0.6;
  cursor: not-allowed;
  pointer-events: none;
  filter: grayscale(0.3);
}

.menu-card.disabled:hover {
  transform: none;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  border-color: transparent;
  background: white;
}

.menu-card-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 24px 24px;
  position: relative;
  height: 100%;
}

.menu-icon-wrapper {
  margin-bottom: 24px;
  padding: 20px;
  border-radius: 20px;
  background-color: rgba(124, 58, 237, 0.08);
  transition: all 0.3s;
}

.meal-card .menu-icon-wrapper {
  background-color: rgba(16, 185, 129, 0.08);
}

.contact-card .menu-icon-wrapper {
  background-color: rgba(239, 68, 68, 0.08);
}

.menu-card:hover .menu-icon-wrapper {
  transform: scale(1.1);
}

.menu-info {
  text-align: center;
  flex: 1;
}

.menu-title {
  font-size: 24px;
  font-weight: 700;
  color: #333;
  margin-bottom: 12px;
}

.menu-description {
  font-size: 14px;
  color: #666;
  margin-bottom: 20px;
  line-height: 1.6;
}

.menu-features {
  display: flex;
  flex-direction: column;
  gap: 2px;
  align-items: flex-start;
  margin: 0 auto;
  max-width: 240px;
}

.feature-item {
  display: flex;
  align-items: center;
  font-size: 12px;
  color: #555;
}

.menu-arrow {
  position: absolute;
  bottom: 24px;
  right: 24px;
  transition: transform 0.3s;
}

.menu-card:hover .menu-arrow {
  transform: translateX(8px);
}

/* 입원 중인 입주자 카드 */
.hospitalized-card {
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  transition: transform 0.2s, box-shadow 0.2s;
}

.hospitalized-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
}

.hospitalized-item {
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  transition: all 0.3s ease;
}

.hospitalized-item:hover {
  border-color: #f59e0b;
  background-color: rgba(245, 158, 11, 0.02);
}

/* 모바일 반응형 */
@media (max-width: 960px) {
  .care-dashboard {
    padding: 16px;
  }
  
  .dashboard-header {
    flex-direction: column;
    gap: 16px;
  }
  
  .building-selector {
    width: 100%;
    max-width: 100%;
  }
  
  .dashboard-title {
    font-size: 24px;
  }
  
  .dashboard-subtitle {
    font-size: 14px;
  }
  
  .stat-value {
    font-size: 24px;
  }
  
  .menu-card {
    min-height: 240px;
  }
  
  .menu-card-content {
    padding: 24px 20px;
  }
  
  .menu-title {
    font-size: 20px;
  }
  
  .menu-description {
    font-size: 13px;
  }
}

@media (max-width: 600px) {
  .dashboard-title {
    font-size: 20px;
  }
  
  .stat-card .v-card-text {
    padding: 16px;
  }
  
  .stat-value {
    font-size: 20px;
  }
  
  .stat-label {
    font-size: 12px;
  }
  
  .menu-card {
    min-height: 200px;
  }
  
  .menu-icon-wrapper {
    padding: 16px;
    margin-bottom: 16px;
  }
  
  .menu-icon-wrapper .v-icon {
    font-size: 48px !important;
  }
  
  .menu-title {
    font-size: 18px;
  }
  
  .feature-item {
    font-size: 12px;
  }
}
</style>

