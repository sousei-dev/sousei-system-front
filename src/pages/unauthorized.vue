<template>
  <div class="d-flex align-center justify-center" style="min-height: 80vh;">
    <VCard class="text-center pa-8" max-width="500">
      <VCardTitle class="text-h4 mb-4">
        <VIcon size="64" color="error" class="mb-4">ri-lock-line</VIcon>
        <div>アクセス権限がありません</div>
      </VCardTitle>
      
      <VCardText class="text-body-1 mb-6">
        <p class="mb-4">
          申し訳ございませんが、このページにアクセスする権限がありません。
        </p>
        
        <div v-if="requiredPermission" class="mb-4">
          <p><strong>必要な権限:</strong> {{ getPermissionDisplayName(requiredPermission) }}</p>
          <p><strong>現在の権限:</strong> {{ getPermissionDisplayName(currentPermission) }}</p>
        </div>
        
        <div v-if="route.query.message" class="mb-4">
          <VAlert type="info" variant="tonal">
            {{ route.query.message }}
          </VAlert>
        </div>
        
        <p class="text-medium-emphasis">
          適切な権限を持つアカウントでログインするか、管理者にお問い合わせください。
        </p>
      </VCardText>
      
      <VCardActions class="justify-center">
        <VBtn
          color="primary"
          variant="tonal"
          @click="goBack"
          class="me-3"
        >
          前のページに戻る
        </VBtn>
        
        <VBtn
          color="primary"
          @click="goToDashboard"
        >
          ダッシュボードへ
        </VBtn>
      </VCardActions>
    </VCard>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getCurrentUserPermission, getPermissionDisplayName } from '@/utils/permissions'
import type { Permission } from '@/types/permissions'

const route = useRoute()
const router = useRouter()

// 현재 사용자 권한
const currentPermission = computed(() => getCurrentUserPermission())

// 필요한 권한 (URL 쿼리에서 가져옴)
const requiredPermission = computed(() => {
  const permission = route.query.requiredPermission as string
  if (permission && ['manager_specified', 'manager_general', 'admin', 'user'].includes(permission)) {
    return permission as Permission
  }
  return null
})

// 이전 페이지로 돌아가기
const goBack = () => {
  if (window.history.length > 1) {
    router.back()
  } else {
    router.push('/dashboard')
  }
}

// 대시보드로 이동
const goToDashboard = () => {
  router.push('/dashboard')
}

// 페이지 제목 설정
onMounted(() => {
  document.title = 'アクセス権限がありません - システム'
})
</script> 