<script setup lang="ts">
import { buildingService } from '@/services/building'
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

// 폼 데이터
const form = ref({
  name: '',
  address: '',
  building_type: 'mansion',
  total_rooms: undefined as number | undefined,
  note: ''
})

// 건물 타입 옵션
const buildingTypeOptions = [
  { title: 'マンション', value: 'mansion' },
  { title: '一戸建て', value: 'house' }
]

const loading = ref(false)
const error = ref<string | null>(null)

// 빌딩 생성
const handleSubmit = async () => {
  try {
    loading.value = true
    error.value = null
    
    await buildingService.createBuilding({
      name: form.value.name,
      address: form.value.address || undefined,
      building_type: form.value.building_type || undefined,
      total_rooms: form.value.total_rooms,
      note: form.value.note || undefined,
      resident_type: 'student',
    })
    
    // 성공 시 목록 페이지로 이동
    router.push('/building-list?type=student')
  } catch (err: any) {
    error.value = err.response?.data?.message || '建物の作成に失敗しました。'
  } finally {
    loading.value = false
  }
}

// 취소
const handleCancel = () => {
  router.push('/building-list')
}
</script>

<template>
  <VRow>
    <VCol cols="12">
      <VCard>
        <VCardTitle class="text-h5 pa-4">
          建物追加
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
                  v-model="form.name"
                  label="建物名"
                  placeholder="建物名を入力"
                  required
                  hide-details="auto"
                  prepend-inner-icon="ri-building-line"
                />
              </VCol>
              
              <VCol cols="12" md="6">
                <VTextField
                  v-model="form.address"
                  label="住所"
                  placeholder="住所を入力"
                  hide-details="auto"
                  prepend-inner-icon="ri-map-pin-line"
                />
              </VCol>
              
              <VCol cols="12" md="6">
                <VSelect
                  v-model="form.building_type"
                  :items="buildingTypeOptions"
                  label="建物タイプ"
                  placeholder="建物タイプを選択"
                  hide-details="auto"
                  prepend-inner-icon="ri-building-line"
                />
              </VCol>
              
              <VCol cols="12" md="6">
                <VTextField
                  v-model="form.total_rooms"
                  label="総部屋数"
                  placeholder="部屋数を入力"
                  type="number"
                  min="0"
                  hide-details="auto"
                  prepend-inner-icon="ri-home-line"
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
