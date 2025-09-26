<template>
  <div v-if="hasPermission">
    <slot />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Permission } from '@/types/permissions'
import { canAccessPage, canUseFeature, canAccessStudentType, getCurrentUserPermission } from '@/utils/permissions'

interface Props {
  // 페이지 접근 권한 체크
  page?: string
  // 기능 사용 권한 체크
  feature?: string
  // 학생 타입 접근 권한 체크
  studentType?: string
  // 특정 권한만 허용 (단일 권한 또는 권한 배열)
  permission?: Permission | Permission[]
  // 권한이 없을 때 대체 컨텐츠 표시 여부
  showFallback?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  showFallback: false
})

// 권한 체크
const hasPermission = computed(() => {
  // 특정 권한이 지정된 경우
  if (props.permission) {
    const currentPermission = getCurrentUserPermission()
    
    // 배열인 경우 (여러 권한 중 하나라도 있으면 허용)
    if (Array.isArray(props.permission)) {
      return props.permission.includes(currentPermission) || currentPermission === 'admin'
    }
    
    // 단일 권한인 경우
    return currentPermission === props.permission || currentPermission === 'admin'
  }
  
  // 페이지 접근 권한 체크
  if (props.page) {
    return canAccessPage(props.page)
  }
  
  // 기능 사용 권한 체크
  if (props.feature) {
    return canUseFeature(props.feature)
  }
  
  // 학생 타입 접근 권한 체크
  if (props.studentType) {
    return canAccessStudentType(props.studentType)
  }
  
  // 기본적으로 권한 있음
  return true
})
</script> 