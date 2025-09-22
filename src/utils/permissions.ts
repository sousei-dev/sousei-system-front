import type { Permission } from '@/types/permissions'
import { PERMISSION_CONFIG } from '@/types/permissions'
import { authService } from '@/services/auth'

// 현재 사용자의 권한을 가져오는 함수 (실제로는 API나 store에서 가져와야 함)
export const getCurrentUserPermission = (): Permission => {
  // TODO: 실제 사용자 권한을 가져오는 로직 구현
  // 예: localStorage, Vuex store, API 등에서 가져오기
  const storedPermission = authService.getUserRole()
  
  if (storedPermission && isValidPermission(storedPermission)) {
    return storedPermission as Permission
  }
  
  // 기본값은 user
  return 'user'
}

// 권한이 유효한지 확인하는 함수
export const isValidPermission = (permission: string): permission is Permission => {
  return ['manager_specified', 'manager_general', 'admin', 'user'].includes(permission)
}

// 특정 페이지에 접근 가능한지 확인하는 함수
export const canAccessPage = (pagePath: string, permission?: Permission): boolean => {
  const userPermission = permission || getCurrentUserPermission()
  const config = PERMISSION_CONFIG[userPermission]
  
  // admin은 모든 페이지 접근 가능
  if (userPermission === 'admin') return true
  
  // 현재 경로가 권한에 포함되어 있는지 확인
  return config.pages.some(allowedPath => {
    // 쿼리 파라미터가 있는 경우 정확히 매치
    if (allowedPath.includes('?')) {
      return pagePath === allowedPath
    }
    
    // 쿼리 파라미터가 없는 경우 경로만 매치
    const pathWithoutQuery = pagePath.split('?')[0]
    return pathWithoutQuery === allowedPath
  })
}

// 특정 기능을 사용할 수 있는지 확인하는 함수
export const canUseFeature = (feature: string, permission?: Permission): boolean => {
  const userPermission = permission || getCurrentUserPermission()
  const config = PERMISSION_CONFIG[userPermission]
  
  // admin은 모든 기능 사용 가능
  if (userPermission === 'admin') return true
  
  return config.features.includes(feature)
}

// 특정 학생 타입에 접근 가능한지 확인하는 함수
export const canAccessStudentType = (studentType: string, permission?: Permission): boolean => {
  const userPermission = permission || getCurrentUserPermission()
  const config = PERMISSION_CONFIG[userPermission]
  
  // admin은 모든 학생 타입 접근 가능
  if (userPermission === 'admin') return true
  
  return config.studentTypes.includes(studentType)
}

// 현재 사용자의 권한을 설정하는 함수
export const setUserPermission = (permission: Permission): void => {
  if (isValidPermission(permission)) {
    localStorage.setItem('user_permission', permission)
  }
}

// 사용자 권한을 제거하는 함수 (로그아웃 시)
export const clearUserPermission = (): void => {
  localStorage.removeItem('user_permission')
}

// 권한별 표시 이름을 가져오는 함수
export const getPermissionDisplayName = (permission: Permission): string => {
  const names = {
    manager_specified: '特定技能管理者',
    manager_general: '技能実習管理者',
    admin: 'システム管理者',
    user: '一般ユーザー'
  }
  
  return names[permission]
} 