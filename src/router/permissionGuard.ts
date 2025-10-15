import { type NavigationGuardNext, type RouteLocationNormalized } from 'vue-router'
import { getCurrentUserPermission } from '@/utils/permissions'

// 권한별 접근 가능한 페이지 정의
const PERMISSION_PAGES = {
  manager_specified: [
    '/special-student-list',
    '/student-create',
    '/student-detail/:id',
    '/unauthorized',
  ],
  manager_general: [
    '/student-list',
    '/student-create',
    '/student-detail/:id',
    '/billing',
    '/building-list',
    '/building-create',
    '/building-detail/:id',
    '/room-create',
    '/room-detail/:id',
    '/unauthorized',
  ],
  admin: [
    // 모든 페이지 접근 가능
    '*',
  ],
  manager: [
    // 모든 페이지 접근 가능
    '/chat',
    '/unauthorized',
  ],
  user: [
    '/chat',
    '/student-list',
    '/student-detail/:id',
    '/billing',
    '/unauthorized',
  ],
  mishima_user: [
    '/dashboard',
    '/chat',
    '/care-dashboard',
    '/elderly-building-list',
    '/building-create',
    '/building-detail/:id',
    '/elderly-list',
    '/elderly-create',
    '/elderly-contact',
    '/elderly-detail/:id',
    '/care-facility-meal-record'
  ],
  care_user: [
    '/care-dashboard',
    '/elderly-list',
    '/elderly-create',
    '/elderly-contact',
    '/care-facility-meal-record',
    '/elderly-detail/:id',
    '/unauthorized',
  ],
}

// 특정 권한으로 특정 페이지에 접근 가능한지 확인
export const canAccessPage = (permission: string, path: string): boolean => {
  const allowedPages = PERMISSION_PAGES[permission as keyof typeof PERMISSION_PAGES]

  if (!allowedPages) return false

  // admin은 모든 페이지 접근 가능
  if (allowedPages.includes('*')) return true

  // 정확한 경로 매치 확인
  if (allowedPages.includes(path)) return true

  // 동적 경로 매치 확인 (예: /student-detail/:id)
  return allowedPages.some(allowedPath => {
    // 쿼리 파라미터 제거
    const pathWithoutQuery = path.split('?')[0]
    const allowedPathWithoutQuery = allowedPath.split('?')[0]

    // 정확한 매치
    if (pathWithoutQuery === allowedPathWithoutQuery) return true

    // 동적 경로 매치 (예: /student-detail/123 -> /student-detail/:id)
    if (allowedPathWithoutQuery.includes('/:')) {
      const allowedPathParts = allowedPathWithoutQuery.split('/')
      const pathParts = pathWithoutQuery.split('/')

      if (allowedPathParts.length !== pathParts.length) return false

      return allowedPathParts.every((part, index) => {
        if (part.startsWith(':')) return true // 동적 파라미터

        return part === pathParts[index]
      })
    }

    return false
  })
}

// 권한별 표시 이름
const getPermissionDisplayName = (permission: string): string => {
  const names = {
    manager_specified: '特定技能管理者',
    manager_general: '技能実習管理者',
    admin: 'システム管理者',
    user: 'ユーザー',
    mishima_user: 'ユーザー',
    care_user: '介護管理ユーザー',
  }

  return names[permission as keyof typeof names] || permission
}

// 권한 체크에서 제외할 페이지들 (모든 사용자가 접근 가능)
const PUBLIC_PAGES = [
  '/login',
  '/register',
  '/unauthorized',
  '/dashboard', // 대시보드는 기본적으로 접근 가능
]

// 전역 권한 가드
export const permissionGuard = (
  to: RouteLocationNormalized,
  from: RouteLocationNormalized,
  next: NavigationGuardNext,
) => {
  const currentPermission = getCurrentUserPermission()
  const targetPath = to.path

  // care_user가 루트 경로나 dashboard 접근 시 care-dashboard로 리다이렉트
  if (currentPermission === 'care_user') {
    if (targetPath === '/' || targetPath === '/dashboard') {
      next('/care-dashboard')
      return
    }
  }

  // 공개 페이지는 권한 체크 없이 접근 허용
  if (PUBLIC_PAGES.includes(targetPath)) {
    next()
    return
  }

  // 권한 체크
  if (canAccessPage(currentPermission, targetPath)) {
    next() // 접근 허용
  } else {
    // 권한 부족 시 unauthorized 페이지로 이동
    next({
      path: '/unauthorized',
      query: {
        requiredPermission: currentPermission,
        currentPermission,
        from: targetPath,
        message: `${getPermissionDisplayName(currentPermission)}はこのページにアクセスできません。`,
      },
    })
  }
}

