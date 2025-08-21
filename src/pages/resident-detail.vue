<script setup lang="ts">
import { type Building, buildingService } from '@/services/building'
import { type Resident, residentService } from '@/services/resident'
import { type Room, roomService } from '@/services/room'
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const router = useRouter()
const route = useRoute()

// 입주자 데이터
const resident = ref<Resident | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)

// 방 및 빌딩 데이터
const room = ref<Room | null>(null)
const building = ref<Building | null>(null)

// 입주 기록 데이터
const residentHistory = ref<Resident[]>([])
const historyLoading = ref(false)
const historyError = ref<string | null>(null)

// 입주자 데이터 로드
const fetchResident = async () => {
  try {
    loading.value = true
    error.value = null

    const residentId = route.params.id as string
    const data = await residentService.getResident(residentId)

    resident.value = data

    // 방 정보 로드
    if (data.room_id) {
      const roomData = await roomService.getRoom(data.room_id)

      room.value = roomData

      // 빌딩 정보 로드
      if (roomData.building_id) {
        const buildingData = await buildingService.getBuilding(roomData.building_id)

        building.value = buildingData
      }
    }
  } catch (err: any) {
    error.value = err.response?.data?.message || '入居者の取得に失敗しました。'
  } finally {
    loading.value = false
  }
}

// 입주 기록 로드
const fetchResidentHistory = async () => {
  try {
    historyLoading.value = true
    historyError.value = null

    const residentId = route.params.id as string
    const residentType = route.query.resident_type as string

    let history
    if (residentType === 'student') {
      history = await residentService.getResidentHistoryByStudent(residentId)
    } else if (residentType === 'elderly') {
      history = await residentService.getResidentHistoryByElderly(residentId)
    } else {
      // 기본값으로 학생 API 사용
      history = await residentService.getResidentHistoryByStudent(residentId)
    }

    residentHistory.value = history.items || history
  } catch (err: any) {
    historyError.value = err.response?.data?.message || '入居記録の取得に失敗しました。'
  } finally {
    historyLoading.value = false
  }
}

// 청구 페이지로 이동
const goToBilling = () => {
  if (resident.value) {
    router.push(`/billing-create?resident_id=${resident.value.id}`)
  }
}

// 학생 상세로 이동
const goToStudentDetail = () => {
  if (resident.value?.student?.id) {
    router.push(`/student-detail/${resident.value.student.id}`)
  }
}

// 방 상세로 이동
const goToRoomDetail = () => {
  if (resident.value?.room_id) {
    router.push(`/room-detail/${resident.value.room_id}`)
  }
}

// 빌딩 상세로 이동
const goToBuildingDetail = () => {
  if (building.value) {
    router.push(`/building-detail/${building.value.id}`)
  }
}

// 날짜 포맷팅
const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('ja-JP')
}

onMounted(async () => {
  await fetchResident()
  await fetchResidentHistory()
})
</script>

<template>
  <div>
    <!-- 상단 헤더 -->
    <div class="d-flex justify-space-between align-center mb-6">
      <div>
        <h1 class="text-h4">入居者詳細</h1>
        <p class="text-body-1 text-medium-emphasis">
          {{ resident?.student?.name || '不明な技能生' }} の入居情報
        </p>
      </div>
      
      <div class="d-flex gap-2">
        <VBtn
          color="primary"
          prepend-icon="ri-money-dollar-circle-line"
          @click="goToBilling"
        >
          請求作成
        </VBtn>
      </div>
    </div>

    <!-- 에러 메시지 -->
    <VAlert
      v-if="error"
      type="error"
      class="mb-6"
    >
      {{ error }}
    </VAlert>

    <!-- 로딩 중 -->
    <div v-if="loading" class="d-flex justify-center pa-8">
      <VProgressCircular indeterminate />
    </div>

    <!-- 메인 콘텐츠 -->
    <div v-else-if="resident">
      <!-- 입주자 정보와 방 정보 -->
      <VRow>
        <!-- 왼쪽: 입주자 정보 -->
        <VCol cols="12" lg="6">
          <VCard>
            <VCardTitle class="text-h6 pa-4">
              入居者情報
            </VCardTitle>
            
            <VCardText>
              <div class="d-flex align-center mb-4">
                <VAvatar
                  v-if="resident.student?.avatar"
                  :image="resident.student.avatar"
                  size="80"
                  class="me-4"
                />
                <VAvatar
                  v-else
                  size="80"
                  class="me-4"
                >
                  {{ resident.student?.name?.charAt(0) || '?' }}
                </VAvatar>
                <div>
                  <div class="text-h5">{{ resident.student?.name || '不明な技能生' }}</div>
                  <div class="text-body-1 text-medium-emphasis">{{ resident.student?.name_katakana || '' }}</div>
                  <VChip 
                    :color="resident.is_active ? 'success' : 'default'" 
                    size="small" 
                    class="mt-1"
                  >
                    {{ resident.is_active ? '入居中' : '退去' }}
                  </VChip>
                </div>
              </div>

              <VRow>
                <VCol cols="12" md="6">
                  <div class="text-body-2 text-medium-emphasis">国籍</div>
                  <div class="text-body-1">{{ resident.student?.nationality || '-' }}</div>
                </VCol>
                
                <VCol cols="12" md="6">
                  <div class="text-body-2 text-medium-emphasis">電話番号</div>
                  <div class="text-body-1">{{ resident.student?.phone || '-' }}</div>
                </VCol>
                
                <VCol cols="12" md="6">
                  <div class="text-body-2 text-medium-emphasis">メールアドレス</div>
                  <div class="text-body-1">{{ resident.student?.email || '-' }}</div>
                </VCol>
                
                <VCol cols="12" md="6">
                  <div class="text-body-2 text-medium-emphasis">性別</div>
                  <div class="text-body-1">{{ resident.student?.gender || '-' }}</div>
                </VCol>
                
                <VCol cols="12" md="6">
                  <div class="text-body-2 text-medium-emphasis">生年月日</div>
                  <div class="text-body-1">{{ resident.student?.birth_date || '-' }}</div>
                </VCol>
                
                <VCol cols="12" md="6">
                  <div class="text-body-2 text-medium-emphasis">日本語レベル</div>
                  <div class="text-body-1">{{ resident.student?.japanese_level || '-' }}</div>
                </VCol>
                
                <VCol cols="12">
                  <div class="text-body-2 text-medium-emphasis">住所</div>
                  <div class="text-body-1">{{ resident.student?.local_address || '-' }}</div>
                </VCol>
              </VRow>

              <div class="d-flex justify-end mt-4">
                <VBtn
                  color="primary"
                  variant="outlined"
                  @click="goToStudentDetail"
                >
                  技能生詳細
                </VBtn>
              </div>
            </VCardText>
          </VCard>
        </VCol>

        <!-- 오른쪽: 입주한 곳 정보 -->
        <VCol cols="12" lg="6">
          <VCard>
            <VCardTitle class="text-h6 pa-4">
              入居先情報
            </VCardTitle>
            
            <VCardText>
              <div v-if="room && building">
                <div class="d-flex align-center mb-4">
                  <VIcon size="48" color="primary" class="me-4">ri-building-line</VIcon>
                  <div>
                    <div class="text-h5">{{ building.name }}</div>
                    <div class="text-body-1 text-medium-emphasis">{{ room.room_number }}号室</div>
                  </div>
                </div>

                <VRow>
                  <VCol cols="12" md="6">
                    <div class="text-body-2 text-medium-emphasis">建物名</div>
                    <div class="text-body-1">{{ building.name }}</div>
                  </VCol>
                  
                  <VCol cols="12" md="6">
                    <div class="text-body-2 text-medium-emphasis">部屋番号</div>
                    <div class="text-body-1">{{ room.room_number }}</div>
                  </VCol>
                  
                  <VCol cols="12" md="6">
                    <div class="text-body-2 text-medium-emphasis">階数</div>
                    <div class="text-body-1">{{ room.floor }}階</div>
                  </VCol>
                  
                  <VCol cols="12" md="6">
                    <div class="text-body-2 text-medium-emphasis">家賃</div>
                    <div class="text-body-1">¥{{ room.rent?.toLocaleString() || '-' }}</div>
                  </VCol>
                  
                  <VCol cols="12" md="6">
                    <div class="text-body-2 text-medium-emphasis">定員</div>
                    <div class="text-body-1">{{ room.capacity }}名</div>
                  </VCol>
                  
                  <VCol cols="12" md="6">
                    <div class="text-body-2 text-medium-emphasis">入居日</div>
                    <div class="text-body-1">{{ formatDate(resident.check_in_date) }}</div>
                  </VCol>
                  
                  <VCol cols="12" md="6" v-if="resident.check_out_date">
                    <div class="text-body-2 text-medium-emphasis">退去日</div>
                    <div class="text-body-1">{{ formatDate(resident.check_out_date) }}</div>
                  </VCol>
                  
                  <VCol cols="12" v-if="resident.note">
                    <div class="text-body-2 text-medium-emphasis">備考</div>
                    <div class="text-body-1">{{ resident.note }}</div>
                  </VCol>
                </VRow>

                <div class="d-flex justify-end mt-4 gap-2">
                  <VBtn
                    color="secondary"
                    variant="outlined"
                    @click="goToRoomDetail"
                  >
                    部屋詳細
                  </VBtn>
                  <VBtn
                    color="secondary"
                    variant="outlined"
                    @click="goToBuildingDetail"
                  >
                    建物詳細
                  </VBtn>
                </div>
              </div>
              
              <div v-else class="text-center pa-8">
                <VIcon size="64" color="grey" class="mb-4">ri-home-line</VIcon>
                <div class="text-h6 text-medium-emphasis">部屋情報なし</div>
                <div class="text-body-2 text-medium-emphasis">部屋情報を取得できませんでした。</div>
              </div>
            </VCardText>
          </VCard>
        </VCol>
      </VRow>

      <!-- 입주 기록 -->
      <VRow class="mt-6">
        <VCol cols="12">
          <VCard>
            <VCardTitle class="text-h6 pa-4">
              入居記録
            </VCardTitle>
            
            <VCardText>
              <div v-if="historyLoading" class="text-center py-8">
                <VProgressCircular indeterminate />
              </div>

              <div v-else-if="historyError" class="text-center py-8">
                <VAlert type="error">{{ historyError }}</VAlert>
              </div>

              <div v-else-if="residentHistory.length === 0" class="text-center py-8">
                <div class="text-body-1 text-medium-emphasis">入居記録がありません</div>
              </div>

              <div v-else>
                <VTable>
                  <thead>
                    <tr>
                      <th>部屋番号</th>
                      <th>建物名</th>
                      <th>入居日</th>
                      <th>退去日</th>
                      <th>状態</th>
                      <th>備考</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="record in residentHistory" :key="record.id">
                      <td>{{ record.room?.room_number || '-' }}</td>
                      <td>{{ record.building?.name || '-' }}</td>
                      <td>{{ formatDate(record.check_in_date) }}</td>
                      <td>{{ record.check_out_date ? formatDate(record.check_out_date) : '-' }}</td>
                      <td>
                        <VChip
                          :color="record.is_active ? 'success' : 'default'"
                          size="small"
                        >
                          {{ record.is_active ? '入居中' : '退去' }}
                        </VChip>
                      </td>
                      <td>{{ record.note || '-' }}</td>
                    </tr>
                  </tbody>
                </VTable>
              </div>
            </VCardText>
          </VCard>
        </VCol>
      </VRow>
    </div>
  </div>
</template> 
