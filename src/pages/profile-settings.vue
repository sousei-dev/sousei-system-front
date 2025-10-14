<script lang="ts" setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { authService } from '@/services/auth'
import { userService } from '@/services/users'
import avatar1 from '@images/avatars/avatar-1.png'

const router = useRouter()

// 상태 관리
const loading = ref(false)
const error = ref<string | null>(null)
const success = ref<string | null>(null)

// 사용자 정보 가져오기
const userInfo = computed(() => authService.getUserInfo())

// 프로필 데이터
const profileData = ref({
  name: '',
  email: '',
  department: '',
  position: '',
  avatar: avatar1,
})

// 비밀번호 변경 데이터
const passwordData = ref({
  current_password: '',
  new_password: '',
  confirm_password: '',
})

// 비밀번호 보기 상태
const showCurrentPassword = ref(false)
const showNewPassword = ref(false)
const showConfirmPassword = ref(false)

// 파일 업로드 관련
const fileInput = ref<HTMLInputElement>()
const selectedFile = ref<File | null>(null)
const previewImage = ref<string | null>(null)

// 파일 선택 처리
const handleFileSelect = (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]

  if (file) {
    // 파일 크기 체크 (5MB 제한)
    if (file.size > 5 * 1024 * 1024) {
      error.value = 'ファイルサイズは5MB以下にしてください。'
      return
    }

    // 이미지 파일 체크
    if (!file.type.startsWith('image/')) {
      error.value = '画像ファイルを選択してください。'
      return
    }

    selectedFile.value = file

    // 미리보기 이미지 생성
    const reader = new FileReader()
    reader.onload = (e) => {
      previewImage.value = e.target?.result as string
    }
    reader.readAsDataURL(file)
  }
}

// 아바타 업로드 버튼 클릭
const handleAvatarUpload = () => {
  fileInput.value?.click()
}

// 프로필 업데이트
const updateProfile = async () => {
  try {
    loading.value = true
    error.value = null
    success.value = null

    // 아바타 업로드가 있는 경우
    if (selectedFile.value) {
      const avatarResponse = await userService.uploadAvatar(selectedFile.value)
      profileData.value.avatar = avatarResponse.avatar
    }

    // 프로필 업데이트
    const updateData: any = {
      name: profileData.value.name,
    }

    if (selectedFile.value) {
      updateData.avatar = profileData.value.avatar
    }

    await userService.updateProfile(updateData)

    // localStorage의 사용자 정보 업데이트
    if (profileData.value.name !== userInfo.value.name) {
      authService.updateUserName(profileData.value.name)
    }

    if (selectedFile.value) {
      authService.updateUserAvatar(profileData.value.avatar)
    }

    success.value = 'プロフィールが正常に更新されました。'
    
    // 화면을 맨 위로 스크롤
    window.scrollTo({ top: 0, behavior: 'smooth' })
    
    selectedFile.value = null
    previewImage.value = null

    // 파일 입력 초기화
    if (fileInput.value) {
      fileInput.value.value = ''
    }
  }
  catch (err: any) {
    error.value = err.response?.data?.message || 'プロフィールの更新に失敗しました。'
    // 에러 발생 시에도 화면을 맨 위로 스크롤
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  finally {
    loading.value = false
  }
}

// 비밀번호 변경
const changePassword = async () => {
  try {
    loading.value = true
    error.value = null
    success.value = null

    // 유효성 검증
    if (!passwordData.value.current_password) {
      error.value = '現在のパスワードを入力してください。'
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }

    if (!passwordData.value.new_password) {
      error.value = '新しいパスワードを入力してください。'
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }

    if (passwordData.value.new_password.length < 8) {
      error.value = 'パスワードは8文字以上にしてください。'
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }

    if (passwordData.value.new_password !== passwordData.value.confirm_password) {
      error.value = 'パスワードが一致しません。'
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }

    if (passwordData.value.current_password === passwordData.value.new_password) {
      error.value = '新しいパスワードは現在のパスワードと異なる必要があります。'
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }

    // API 호출
    await authService.changePassword(
      passwordData.value.current_password,
      passwordData.value.new_password
    )

    success.value = 'パスワードが正常に変更されました。'
    
    // 화면을 맨 위로 스크롤
    window.scrollTo({ top: 0, behavior: 'smooth' })
    
    // 폼 초기화
    passwordData.value = {
      current_password: '',
      new_password: '',
      confirm_password: '',
    }
    
    // 비밀번호 보기 상태 초기화
    showCurrentPassword.value = false
    showNewPassword.value = false
    showConfirmPassword.value = false
  }
  catch (err: any) {
    error.value = err.response?.data?.detail || err.response?.data?.message || 'パスワードの変更に失敗しました。'
    // 에러 발생 시에도 화면을 맨 위로 스크롤
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  finally {
    loading.value = false
  }
}

// 취소
const handleCancel = () => {
  router.back()
}

onMounted(() => {
  // 사용자 정보를 프로필 데이터에 설정
  const currentUserInfo = userInfo.value
  profileData.value = {
    name: currentUserInfo.name || '',
    email: currentUserInfo.email || '',
    department: currentUserInfo.department || '',
    position: currentUserInfo.position || '',
    avatar: currentUserInfo.avatar || avatar1,
  }
})
</script>

<template>
  <div>
    <!-- 에러 메시지 -->
    <VAlert
      v-if="error"
      type="error"
      variant="tonal"
      class="mb-4"
    >
      {{ error }}
    </VAlert>

    <!-- 성공 메시지 -->
    <VAlert
      v-if="success"
      type="success"
      variant="tonal"
      class="mb-4"
    >
      {{ success }}
    </VAlert>
    <!-- 프로필 수정 폼 -->
    <VCard>
      <VCardTitle class="text-h5 d-flex align-center">
        <VIcon class="me-2">ri-user-line</VIcon>
        プロフィール設定
      </VCardTitle>
      <VCardText>
        <VForm @submit.prevent="updateProfile">
          <VRow>
            <!-- 프로필 사진 섹션 -->
            <VCol cols="12" md="4">
              <VCard
                variant="outlined"
                class="text-center pa-6"
                height="100%"
              >
                <VCardText class="pa-0">
                  <!-- 프로필 아바타 -->
                  <div class="mb-4">
                    <VAvatar
                      size="140"
                      class="mb-4"
                      color="primary"
                      variant="tonal"
                    >
                      <VImg
                        v-if="previewImage"
                        :src="previewImage"
                        alt="Profile Preview"
                      />
                      <VImg
                        v-else
                        :src="profileData.avatar"
                        alt="Current Profile"
                      />
                    </VAvatar>
                  </div>

                  <!-- 업로드 버튼 -->
                  <VBtn
                    color="primary"
                    variant="outlined"
                    prepend-icon="ri-upload-line"
                    class="mb-3"
                    @click="handleAvatarUpload"
                  >
                    プロフィール画像を変更
                  </VBtn>

                  <!-- 파일 입력 (숨김) -->
                  <input
                    ref="fileInput"
                    type="file"
                    accept="image/*"
                    style="display: none"
                    @change="handleFileSelect"
                  >

                  <!-- 안내 텍스트 -->
                  <div class="text-caption text-medium-emphasis">
                    <div class="mb-1">
                      <VIcon size="16" class="me-1">ri-image-line</VIcon>
                      推奨サイズ: 200x200px
                    </div>
                    <div>
                      <VIcon size="16" class="me-1">ri-file-line</VIcon>
                      最大ファイルサイズ: 5MB
                    </div>
                  </div>
                </VCardText>
              </VCard>
            </VCol>

            <!-- 프로필 정보 섹션 -->
            <VCol cols="12" md="8">
              <VCard
                variant="outlined"
                height="100%"
              >
                <VCardTitle class="text-h6 pa-4 pb-2">
                  <VIcon class="me-2">ri-user-line</VIcon>
                  基本情報
                </VCardTitle>
                
                <VCardText class="pt-0">
                  <VRow>
                    <!-- 이름 (수정 가능) -->
                    <VCol cols="12">
                      <VTextField 
                        v-model="profileData.name"
                        label="名前"
                        placeholder="名前を入力してください"
                        variant="outlined"
                        prepend-inner-icon="ri-user-line"
                        required
                      />
                    </VCol>

                    <!-- 로그인 이메일 (읽기 전용) -->
                    <VCol cols="12">
                      <VTextField
                        :model-value="profileData.email"
                        label="ログインメールアドレス"
                        variant="outlined"
                        prepend-inner-icon="ri-mail-line"
                        disabled
                      />
                    </VCol>

                    <!-- 부서 (읽기 전용) -->
                    <VCol cols="12">
                      <VTextField
                        :model-value="profileData.department"
                        label="部署"
                        variant="outlined"
                        prepend-inner-icon="ri-building-line"
                        disabled
                      />
                    </VCol>

                    <!-- 직책 (읽기 전용) -->
                    <VCol cols="12">
                      <VTextField
                        :model-value="profileData.position"
                        label="職位"
                        variant="outlined"
                        prepend-inner-icon="ri-user-star-line"
                        disabled
                      />
                    </VCol>
                  </VRow>
                </VCardText>
              </VCard>
            </VCol>
          </VRow>

          <!-- プロフィール保存ボタン -->
          <VDivider class="my-4" />

          <div class="d-flex justify-end">
            <VBtn
              type="submit"
              color="primary"
              :loading="loading"
              prepend-icon="ri-save-line"
            >
              プロフィール保存
            </VBtn>
          </div>
        </VForm>
      </VCardText>
    </VCard>

    <!-- 비밀번호 변경 섹션 -->
    <VCard class="mt-6">
      <VCardTitle class="text-h5 d-flex align-center">
        <VIcon class="me-2">ri-lock-password-line</VIcon>
        パスワード変更
      </VCardTitle>
      <VCardText>
        <VForm @submit.prevent="changePassword">
          <VRow>
            <!-- 현재 비밀번호 -->
            <VCol cols="12">
              <VTextField
                v-model="passwordData.current_password"
                label="現在のパスワード"
                placeholder="現在のパスワードを入力してください"
                variant="outlined"
                prepend-inner-icon="ri-lock-line"
                :type="showCurrentPassword ? 'text' : 'password'"
                :append-inner-icon="showCurrentPassword ? 'ri-eye-off-line' : 'ri-eye-line'"
                @click:append-inner="showCurrentPassword = !showCurrentPassword"
                required
              />
            </VCol>

            <!-- 새 비밀번호 -->
            <VCol cols="12">
              <VTextField
                v-model="passwordData.new_password"
                label="新しいパスワード"
                placeholder="新しいパスワードを入力してください (8文字以上)"
                variant="outlined"
                prepend-inner-icon="ri-lock-line"
                :type="showNewPassword ? 'text' : 'password'"
                :append-inner-icon="showNewPassword ? 'ri-eye-off-line' : 'ri-eye-line'"
                @click:append-inner="showNewPassword = !showNewPassword"
                required
              />
            </VCol>

            <!-- 새 비밀번호 확인 -->
            <VCol cols="12">
              <VTextField
                v-model="passwordData.confirm_password"
                label="新しいパスワード確認"
                placeholder="新しいパスワードを再入力してください"
                variant="outlined"
                prepend-inner-icon="ri-lock-line"
                :type="showConfirmPassword ? 'text' : 'password'"
                :append-inner-icon="showConfirmPassword ? 'ri-eye-off-line' : 'ri-eye-line'"
                @click:append-inner="showConfirmPassword = !showConfirmPassword"
                required
              />
            </VCol>

            <!-- 비밀번호 규칙 안내 -->
            <VCol cols="12">
              <VAlert
                type="info"
                variant="tonal"
                density="compact"
              >
                <div class="d-flex flex-column gap-1">
                  <div class="text-caption">
                    <VIcon size="14" class="me-1">ri-information-line</VIcon>
                    パスワードは8文字以上にしてください
                  </div>
                  <div class="text-caption">
                    <VIcon size="14" class="me-1">ri-shield-check-line</VIcon>
                    英字、数字、特殊文字を組み合わせることを推奨します
                  </div>
                </div>
              </VAlert>
            </VCol>
          </VRow>

          <!-- 비밀번호 변경 버튼 -->
          <VDivider class="my-4" />

          <div class="d-flex justify-end">
            <VBtn
              type="submit"
              color="warning"
              :loading="loading"
              prepend-icon="ri-key-line"
            >
              パスワード変更
            </VBtn>
          </div>
        </VForm>
      </VCardText>
    </VCard>

    <!-- 페이지 액션 버튼 -->
    <VCard class="mt-6">
      <VCardText>
        <div class="d-flex justify-end gap-4">
          <VBtn
            color="secondary"
            variant="outlined"
            prepend-icon="ri-arrow-left-line"
            @click="handleCancel"
          >
            戻る
          </VBtn>
        </div>
      </VCardText>
    </VCard>
  </div>
</template>

<style scoped>
.gap-4 {
  gap: 1rem;
}

/* 프로필 아바타 섹션 스타일링 */
.v-avatar {
  border: 3px solid rgb(var(--v-theme-primary));
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

/* 카드 높이 통일 */
.v-card {
  min-height: 100%;
}

/* 텍스트 필드 아이콘 스타일링 */
.v-field__prepend-inner {
  color: rgb(var(--v-theme-primary));
}

</style> 
