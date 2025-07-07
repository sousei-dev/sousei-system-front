<script setup lang="ts">
import { roomService } from '@/services/room'
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const router = useRouter()
const route = useRoute()

// 폼 데이터
const form = ref({
  room_number: '',
  rent: undefined as number | undefined,
  floor: undefined as number | undefined,
  capacity: undefined as number | undefined,
  is_available: true,
  note: ''
})

const loading = ref(false)
const error = ref<string | null>(null)

// 빌딩 ID
const buildingId = ref<string>('')

// 빌딩 ID 설정
onMounted(() => {
  buildingId.value = route.query.building_id as string
  if (!buildingId.value) {
    error.value = '建物IDが指定されていません。'
  }
})

// 방 생성
const handleSubmit = async () => {
  if (!buildingId.value) {
    error.value = '建物IDが指定されていません。'
    return
  }

  try {
    loading.value = true
    error.value = null
    
    await roomService.createRoom({
      building_id: buildingId.value,
      room_number: form.value.room_number,
      rent: form.value.rent,
      floor: form.value.floor,
      capacity: form.value.capacity,
      is_available: form.value.is_available,
      note: form.value.note || undefined
    })
    
    // 성공 시 빌딩 상세 페이지로 이동
    router.push(`/building-detail/${buildingId.value}`)
  } catch (err: any) {
    error.value = err.response?.data?.message || '部屋の作成に失敗しました。'
  } finally {
    loading.value = false
  }
}

// 취소
const handleCancel = () => {
  if (buildingId.value) {
    router.push(`/building-detail/${buildingId.value}`)
  } else {
    router.push('/building-list')
  }
}
</script>

<template>
  <VRow>
    <VCol cols="12">
      <VCard>
        <VCardTitle class="text-h5 pa-4">
          部屋追加
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

          <VForm @submit.prevent="handleSubmit">
            <VRow>
              <VCol cols="12" md="6">
                <VTextField
                  v-model="form.room_number"
                  label="部屋番号"
                  placeholder="部屋番号を入力"
                  required
                  hide-details="auto"
                  prepend-inner-icon="ri-home-line"
                />
              </VCol>
              
              <VCol cols="12" md="6">
                <VTextField
                  v-model="form.floor"
                  label="階数"
                  placeholder="階数を入力"
                  type="number"
                  min="0"
                  hide-details="auto"
                  prepend-inner-icon="ri-building-line"
                />
              </VCol>
              
              <VCol cols="12" md="6">
                <VTextField
                  v-model="form.rent"
                  label="家賃"
                  placeholder="家賃を入力"
                  type="number"
                  min="0"
                  hide-details="auto"
                  prepend-inner-icon="ri-money-dollar-circle-line"
                />
              </VCol>
              
              <VCol cols="12" md="6">
                <VTextField
                  v-model="form.capacity"
                  label="定員"
                  placeholder="定員を入力"
                  type="number"
                  min="1"
                  hide-details="auto"
                  prepend-inner-icon="ri-user-line"
                />
              </VCol>
              
              <VCol cols="12" md="6">
                <VSelect
                  v-model="form.is_available"
                  label="利用可能"
                  :items="[
                    { title: '利用可能', value: true },
                    { title: '利用中', value: false }
                  ]"
                  hide-details="auto"
                  prepend-inner-icon="ri-checkbox-circle-line"
                />
              </VCol>
              
              <VCol cols="12">
                <VTextarea
                  v-model="form.note"
                  label="メモ"
                  placeholder="メモを入力"
                  rows="3"
                  hide-details="auto"
                  prepend-inner-icon="ri-file-text-line"
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
            @click="handleCancel"
          >
            キャンセル
          </VBtn>
          <VBtn
            color="primary"
            :loading="loading"
            @click="handleSubmit"
          >
            作成
          </VBtn>
        </VCardActions>
      </VCard>
    </VCol>
  </VRow>
</template> 
