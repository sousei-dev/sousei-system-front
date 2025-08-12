<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { elderlyService, type ElderlyCreateRequestV2 } from '@/services/elderly'
import { elderlyCategoriesService, type ElderlyCategory } from '@/services/elderly-categories'
import { roomService, type Room } from '@/services/room'
import { buildingService, type Building } from '@/services/building'

const router = useRouter()
const route = useRoute()

// URL 파라미터에서 건물 ID 가져오기
const buildingId = computed(() => route.query.building_id as string)

// 폼 데이터
const form = ref<ElderlyCreateRequestV2>({
  name: '',
  name_katakana: '',
  email: '',
  phone: '',
  gender: '',
  birth_date: '',
  care_level: '',
  categories_id: null,
  current_room_id: null,
  note: '',
  status: 'ACTIVE',
})

// 로딩 상태
const loading = ref(false)
const submitting = ref(false)
const error = ref<string | null>(null)
const success = ref<string | null>(null)

// 옵션 데이터
const categories = ref<ElderlyCategory[]>([])
const buildings = ref<Building[]>([])
const rooms = ref<Room[]>([])

// 방 목록에 display_name 추가
const roomsWithDisplayName = computed(() => {
  return rooms.value.map(room => ({
    ...room,
    display_name: `${room.room_number}`,
  }))
})

// 성별 옵션
const genderOptions = [
  { title: '男性', value: '男' },
  { title: '女性', value: '女' },
]

// 요양 등급 옵션
const careLevelOptions = [
  { title: '要介護1', value: '要介護1' },
  { title: '要介護2', value: '要介護2' },
  { title: '要介護3', value: '要介護3' },
  { title: '要介護4', value: '要介護4' },
  { title: '要介護5', value: '要介護5' },
]

// 상태 옵션
const statusOptions = [
  { title: 'アクティブ', value: 'ACTIVE' },
  { title: '退居予定', value: 'PENDING_RESIGNATION' },
  { title: '退居済み', value: 'RESIGNED' },
]

// 필수항목 검증
const isFormValid = computed(() => {
  return !!(
    form.value.name
    && form.value.name_katakana
    && form.value.gender
    && form.value.birth_date
    && form.value.care_level
  )
})

// 카테고리 목록 조회
const fetchCategories = async () => {
  try {
    const response = await elderlyCategoriesService.getElderlyCategories()
    categories.value = response.items
  } catch (err: any) {
    console.error('카테고리 조회 실패:', err)
  }
}

// 빌딩 목록 조회
const fetchBuildings = async () => {
  try {
    const response = await buildingService.getBuildings()
    buildings.value = response.items
  } catch (err: any) {
    console.error('빌딩 목록 조회 실패:', err)
  }
}

// 방 목록 조회 (특정 건물의 방만 또는 모든 건물의 방)
const fetchRooms = async () => {
  try {
    const allRooms: Room[] = []
    
    if (buildingId.value) {
      // 특정 건물의 방만 조회
      try {
        const response = await roomService.getRoomsByBuilding(buildingId.value)
        allRooms.push(...response.items)
      } catch (err) {
        console.error(`건물 ${buildingId.value}의 방 목록 조회 실패:`, err)
      }
    } else {
      // 모든 건물의 방 조회
      for (const building of buildings.value) {
        try {
          const response = await roomService.getRoomsByBuilding(building.id)
          allRooms.push(...response.items)
        } catch (err) {
          console.error(`건물 ${building.id}의 방 목록 조회 실패:`, err)
        }
      }
    }
    
    rooms.value = allRooms
  } catch (err: any) {
    console.error('방 목록 조회 실패:', err)
  }
}

// 폼 제출
const handleSubmit = async () => {
  if (!isFormValid.value) return

  try {
    submitting.value = true
    error.value = null
    success.value = null

    const elderlyData = {
      ...form.value,
      categories_id: form.value.categories_id || null,
      current_room_id: form.value.current_room_id || null,
    }

    await elderlyService.createElderly(elderlyData)

    success.value = '入居者情報が正常に作成されました。'
    
    // 성공 시 목록 페이지로 이동 (건물 ID 포함)
    const params = buildingId.value ? { building_id: buildingId.value } : {}
    router.push({
      path: '/elderly-list',
      query: params,
    })
  } catch (err: any) {
    error.value = err.response?.data?.message || '入居者の作成に失敗しました。'
  } finally {
    submitting.value = false
  }
}

// 취소
const handleCancel = () => {
  const params = buildingId.value ? { building_id: buildingId.value } : {}
  router.push({
    path: '/elderly-list',
    query: params,
  })
}

// 초기화
onMounted(async () => {
  loading.value = true
  try {
    await Promise.all([
      fetchCategories(),
      fetchBuildings(),
      fetchRooms(),
    ])
  } catch (err) {
    console.error('초기 데이터 로드 실패:', err)
  } finally {
    loading.value = false
  }
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

        <!-- 성공 메시지 -->
        <VCol
          v-if="success"
          cols="12"
        >
          <VAlert
            type="success"
            variant="tonal"
            class="mb-3"
          >
            {{ success }}
          </VAlert>
        </VCol>

        <!-- 필수항목 섹션 -->
        <VCol cols="12">
          <VCard variant="outlined" class="pa-4 mb-6">
            <VCardTitle class="text-h6 text-primary">
              <VIcon class="me-2">ri-asterisk</VIcon>
              必須項目
            </VCardTitle>
            <VRow>
              <VCol cols="12" md="6">
                <VTextField
                  v-model="form.name"
                  label="名前 *"
                  placeholder="名前を入力してください"
                  :disabled="loading"
                  :rules="[v => !!v || '名前は必須項目です']"
                  required
                />
              </VCol>

              <VCol cols="12" md="6">
                <VTextField
                  v-model="form.name_katakana"
                  label="カタカナ *"
                  placeholder="カタカナを入力してください"
                  :disabled="loading"
                  :rules="[v => !!v || 'カタカナは必須項目です']"
                  required
                />
              </VCol>

              <VCol cols="12" md="6">
                <VSelect
                  v-model="form.gender"
                  :items="genderOptions"
                  item-title="title"
                  item-value="value"
                  label="性別 *"
                  placeholder="性別を選択してください"
                  :disabled="loading"
                  :rules="[v => !!v || '性別は必須項目です']"
                  required
                />
              </VCol>

              <VCol cols="12" md="6">
                <VTextField
                  v-model="form.birth_date"
                  label="生年月日 *"
                  type="date"
                  :disabled="loading"
                  :rules="[v => !!v || '生年月日は必須項目です']"
                  required
                />
              </VCol>

              <VCol cols="12" md="6">
                <VSelect
                  v-model="form.care_level"
                  :items="careLevelOptions"
                  item-title="title"
                  item-value="value"
                  label="介護度 *"
                  placeholder="介護度を選択してください"
                  :disabled="loading"
                  :rules="[v => !!v || '介護度は必須項目です']"
                  required
                />
              </VCol>
            </VRow>
          </VCard>
        </VCol>

        <!-- 연락처 정보 섹션 -->
        <VCol cols="12">
          <VCard variant="outlined" class="pa-4 mb-6">
            <VCardTitle class="text-h6 text-info">
              <VIcon class="me-2">ri-contacts-line</VIcon>
              連絡先情報
            </VCardTitle>
            <VRow>
              <VCol cols="12" md="6">
                <VTextField
                  v-model="form.email"
                  label="メールアドレス"
                  placeholder="メールアドレスを入力してください"
                  type="email"
                  :disabled="loading"
                />
              </VCol>

              <VCol cols="12" md="6">
                <VTextField
                  v-model="form.phone"
                  label="電話番号"
                  placeholder="電話番号を入力してください"
                  :disabled="loading"
                />
              </VCol>
            </VRow>
          </VCard>
        </VCol>

        <!-- 입주 정보 섹션 -->
        <VCol cols="12">
          <VCard variant="outlined" class="pa-4 mb-6">
            <VCardTitle class="text-h6 text-success">
              <VIcon class="me-2">ri-home-line</VIcon>
              入居情報
            </VCardTitle>
            <VRow>
              <VCol cols="12" md="6">
                <VSelect
                  v-model="form.current_room_id"
                  :items="roomsWithDisplayName"
                  item-title="display_name"
                  item-value="id"
                  label="部屋"
                  placeholder="部屋を選択してください"
                  :disabled="loading"
                  clearable
                />
              </VCol>

              <VCol cols="12" md="6">
                <VSelect
                  v-model="form.status"
                  :items="statusOptions"
                  item-title="title"
                  item-value="value"
                  label="ステータス"
                  placeholder="ステータスを選択してください"
                  :disabled="loading"
                />
              </VCol>
            </VRow>
          </VCard>
        </VCol>

        <!-- 추가 정보 섹션 -->
        <VCol cols="12">
          <VCard variant="outlined" class="pa-4 mb-6">
            <VCardTitle class="text-h6">
              <VIcon class="me-2">ri-file-text-line</VIcon>
              追加情報
            </VCardTitle>
            <VRow>
              <VCol cols="12" md="6">
                <VSelect
                  v-model="form.categories_id"
                  :items="categories"
                  item-title="label"
                  item-value="id"
                  label="カテゴリ"
                  placeholder="カテゴリを選択してください"
                  :disabled="loading"
                  clearable
                />
              </VCol>

              <VCol cols="12">
                <VTextarea
                  v-model="form.note"
                  label="メモ"
                  placeholder="メモを入力してください"
                  rows="3"
                  :disabled="loading"
                />
              </VCol>
            </VRow>
          </VCard>
        </VCol>

        <!-- 저장 버튼 -->
        <VCol cols="12">
          <div class="d-flex gap-2">
            <VBtn
              variant="outlined"
              @click="handleCancel"
              :disabled="submitting"
            >
              キャンセル
            </VBtn>
            <VBtn
              color="primary"
              :loading="submitting"
              :disabled="!isFormValid"
              @click="handleSubmit"
            >
              保存
            </VBtn>
          </div>
        </VCol>
      </VRow>
    </VCardText>
  </VCard>
</template>

<style lang="scss" scoped>
</style> 