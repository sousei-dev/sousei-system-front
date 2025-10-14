<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { elderlyService, type ElderlyCreateRequestV2 } from '@/services/elderly'

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
  note: '',
})

// 로딩 상태
const loading = ref(false)
const submitting = ref(false)
const error = ref<string | null>(null)
const success = ref<string | null>(null)

// 성별 옵션
const genderOptions = [
  { title: '男性', value: '男' },
  { title: '女性', value: '女' },
]

// 요양 등급 옵션
const careLevelOptions = [
  { title: '介護1', value: '介護1' },
  { title: '介護2', value: '介護2' },
  { title: '介護3', value: '介護3' },
  { title: '介護4', value: '介護4' },
  { title: '介護5', value: '介護5' },
  { title: '要支援1', value: '要支援1' },
  { title: '要支援2', value: '要支援2' },
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

// 폼 제출
const handleSubmit = async () => {
  if (!isFormValid.value) return

  try {
    submitting.value = true
    error.value = null
    success.value = null

    await elderlyService.createElderly(form.value)

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

        <!-- 추가 정보 섹션 -->
        <VCol cols="12">
          <VCard variant="outlined" class="pa-4 mb-6">
            <VCardTitle class="text-h6">
              <VIcon class="me-2">ri-file-text-line</VIcon>
              追加情報
            </VCardTitle>
            <VRow>

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