<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue'
import { useRouter } from 'vue-router'
import { buildingService, type MyBuildingItem } from '@/services/building'

const router = useRouter()

// 페이지 로딩 상태
const isLoading = ref(false)

// 빌딩 관련 상태
const myBuildings = ref<MyBuildingItem[]>([])
const selectedBuilding = ref<MyBuildingItem | null>(null)
const buildingsLoading = ref(false)

// 통계 데이터 (선택된 빌딩 기반)
const stats = computed(() => {
  if (!selectedBuilding.value) {
    return {
      totalElderly: 0,
      hospitalized: 0,
      pendingRecords: 0,
      emptyRooms: 0,
      occupancyRate: 0
    }
  }
  
  const building = selectedBuilding.value
  const emptyRooms = building.total_rooms - building.active_residents_count
  const occupancyRate = building.total_rooms > 0 
    ? Math.round((building.active_residents_count / building.total_rooms) * 100) 
    : 0
  
  return {
    totalElderly: building.active_residents_count,
    hospitalized: 0, // TODO: API 연동
    pendingRecords: 0, // TODO: API 연동
    emptyRooms: emptyRooms,
    occupancyRate: occupancyRate
  }
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

// 연락 작성으로 이동
const goToContact = () => {
  router.push('/elderly-contact')
}

onMounted(() => {
  fetchMyBuildings()
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
        <VCol cols="12" sm="6" md="4" lg="2-4">
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

        <VCol cols="12" sm="6" md="4" lg="2-4">
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

        <VCol cols="12" sm="6" md="4" lg="2-4">
          <VCard class="stat-card">
            <VCardText>
              <div class="stat-icon-wrapper warning">
                <VIcon size="32" color="white">ri-file-list-line</VIcon>
              </div>
              <div class="stat-info">
                <div class="stat-label">未完了記録</div>
                <div class="stat-value">{{ stats.pendingRecords }}</div>
              </div>
            </VCardText>
          </VCard>
        </VCol>

        <VCol cols="12" sm="6" md="4" lg="2-4">
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

        <VCol cols="12" sm="6" md="4" lg="2-4">
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
            class="menu-card meal-card"
            hover
            @click="goToMealRecord"
          >
            <VCardText class="menu-card-content">
              <div class="menu-icon-wrapper">
                <VIcon size="64" color="success">ri-receipt-line</VIcon>
              </div>
              <div class="menu-info">
                <h2 class="menu-title">請求管理</h2>
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
              <VIcon class="menu-arrow" size="32" color="success">ri-arrow-right-line</VIcon>
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

