<script setup lang="ts">
import { authService } from '@/services/auth'
import { useTheme } from 'vuetify'

import logo from '@images/logo.svg?raw'
import authV1MaskDark from '@images/pages/auth-v1-mask-dark.png'
import authV1MaskLight from '@images/pages/auth-v1-mask-light.png'
import authV1Tree2 from '@images/pages/auth-v1-tree-2.png'
import authV1Tree from '@images/pages/auth-v1-tree.png'

const router = useRouter()
const loading = ref(false)
const errorMessage = ref('')

const form = ref({
  email: '',
  password: '',
  remember: false,
})

const vuetifyTheme = useTheme()

const authThemeMask = computed(() => {
  return vuetifyTheme.global.name.value === 'light'
    ? authV1MaskLight
    : authV1MaskDark
})

const isPasswordVisible = ref(false)

// 로그인 함수
const handleLogin = async () => {
  try {
    loading.value = true
    errorMessage.value = ''
    
    await authService.login({
      email: form.value.email,
      password: form.value.password,
      remember: form.value.remember,
    })

    // 로그인 성공 후 권한에 따라 페이지 이동
    const userRole = authService.getUserRole()
    
    if (userRole === 'care_user') {
      router.push('/care-dashboard')
    } else {
      router.push('/')
    }
  }
  catch (error: any) {
    // 에러 메시지 처리
    errorMessage.value = error.response?.data?.message || 'ログインに失敗しました。'
  }
  finally {
    loading.value = false
  }
}

onMounted(() => {
  const savedUsername = localStorage.getItem("rememberId");
  if (savedUsername) {
    form.value.email = savedUsername
    form.value.remember = true
  }
})
</script>

<template>
  <!-- eslint-disable vue/no-v-html -->

  <div class="auth-wrapper d-flex align-center justify-center pa-4">
    <VCard
      class="auth-card pa-4 pt-7"
      max-width="448"
      width="448"
    >
      <VCardItem class="justify-center">
        <RouterLink
          to="/"
          class="d-flex align-center gap-3"
        >
          <!-- eslint-disable vue/no-v-html -->
          <div
            class="d-flex"
            v-html="logo"
          />
          <h2 class="font-weight-medium text-2xl text-uppercase">
            SOUSEI
          </h2>
        </RouterLink>
      </VCardItem>

      <VCardText class="pt-2">
        <h4 class="text-h4 mb-1">
          SOUSEIへようこそ！ 👋🏻
        </h4>
        <p class="mb-0">
          ログインしてください。
        </p>
      </VCardText>

      <VCardText>
        <VForm @submit.prevent="handleLogin">
          <VRow>
            <!-- error message -->
            <VCol
              v-if="errorMessage"
              cols="12"
            >
              <VAlert
                type="error"
                variant="tonal"
                class="mb-3"
              >
                {{ errorMessage }}
              </VAlert>
            </VCol>

            <!-- email -->
            <VCol cols="12">
              <VTextField
                v-model="form.email"
                autofocus
                label="メールアドレス"
                type="email"
                placeholder="user1@test.com"
                :disabled="loading"
                required
              />
            </VCol>

            <!-- password -->
            <VCol cols="12">
              <VTextField
                v-model="form.password"
                label="パスワード"
                :type="isPasswordVisible ? 'text' : 'password'"
                placeholder="············"
                :append-inner-icon="isPasswordVisible ? 'ri-eye-off-line' : 'ri-eye-line'"
                @click:append-inner="isPasswordVisible = !isPasswordVisible"
                :disabled="loading"
                required
              />

              <!-- remember me checkbox -->
              <div class="d-flex align-center flex-wrap justify-space-between mt-2 mb-4">
                <VCheckbox
                  v-model="form.remember"
                  label="ログイン情報を保存"
                  :disabled="loading"
                />

                <!-- <a
                  class="text-primary ms-2 mb-1"
                  href="javascript:void(0)"
                >
                  パスワードをお忘れですか？
                </a> -->
              </div>

              <!-- login button -->
              <VBtn
                block
                type="submit"
                :loading="loading"
              >
                {{ loading ? 'ログイン中...' : 'ログイン' }}
              </VBtn>
            </VCol>

            <!-- create account -->
            <VCol
              cols="12"
              class="text-center text-base"
            >
              <!-- <span>アカウントをお持ちでない方は</span> -->
              <!-- <RouterLink
                class="text-primary ms-2"
                to="/register"
              >
                新規登録
              </RouterLink> -->
            </VCol>
          </VRow>
        </VForm>
      </VCardText>
    </VCard>

    <VImg
      class="auth-footer-start-tree d-none d-md-block"
      :src="authV1Tree"
      :width="250"
    />

    <VImg
      :src="authV1Tree2"
      class="auth-footer-end-tree d-none d-md-block"
      :width="350"
    />

    <!-- bg img -->
    <VImg
      class="auth-footer-mask d-none d-md-block"
      :src="authThemeMask"
    />
  </div>
</template>

<style lang="scss">
@use "@core/scss/template/pages/page-auth";
</style>
