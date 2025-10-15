// 권한 타입 정의
export type Permission = 
  | 'manager_specified'  // 特定技能 관련 권한
  | 'manager_general'    // 技能実習 관련 권한
  | 'admin'              // 관리자 권한
  | 'user'               // 일반 사용자 권한
  | 'mishima_user'       // 미시마 ユーザー 권한
  | 'care_user'          // 介護管理 권한

// 권한별 접근 가능한 페이지/기능 정의
export interface PermissionConfig {
  manager_specified: {
    pages: string[]        // 접근 가능한 페이지 경로
    features: string[]     // 접근 가능한 기능
    studentTypes: string[] // 접근 가능한 학생 타입
  }
  manager_general: {
    pages: string[]
    features: string[]
    studentTypes: string[]
  }
  admin: {
    pages: string[]
    features: string[]
    studentTypes: string[]
  }
  user: {
    pages: string[]
    features: string[]
    studentTypes: string[]
  }
  mishima_user: {
    pages: string[]
    features: string[]
    studentTypes: string[]
  }
  care_user: {
    pages: string[]
    features: string[]
    studentTypes: string[]
  }
}

// 권한별 설정
export const PERMISSION_CONFIG: PermissionConfig = {
  manager_specified: {
    pages: [
      '/special-student-list?type=SPECIFIED',
      '/student-create',
      '/student-detail',
    ],
    features: [
      'student_management',
      'billing_management',
      'building_management',
      'room_management',
      'elderly_management'
    ],
    studentTypes: ['SPECIFIED']
  },
  manager_general: {
    pages: [
      '/student-list?type=GENERAL',
      '/student-create?type=GENERAL',
      '/student-detail',
      '/billing',
      '/building-list',
      '/building-create',
      '/building-detail',
      '/room-create',
      '/room-detail'
    ],
    features: [
      'student_management',
      'billing_management',
      'building_management',
      'room_management'
    ],
    studentTypes: ['GENERAL']
  },
  admin: {
    pages: [
      '/student-list',
      '/student-create',
      '/student-detail',
      '/billing',
      '/building-list',
      '/building-create',
      '/building-detail',
      '/elderly-list',
      '/elderly-create',
      '/elderly-detail',
      '/room-create',
      '/room-detail',
      '/account-settings',
      '/tenant-management'
    ],
    features: [
      'student_management',
      'billing_management',
      'building_management',
      'room_management',
      'elderly_management',
      'user_management',
      'system_settings'
    ],
    studentTypes: ['SPECIFIED', 'GENERAL']
  },
  user: {
    pages: [
      '/student-list',
      '/student-detail',
      '/billing'
    ],
    features: [
      'student_view',
      'billing_view'
    ],
    studentTypes: ['SPECIFIED', 'GENERAL']
  },
  mishima_user: {
    pages: [
      '/chat',
      '/care-dashboard',
      '/elderly-building-list',
      '/building-create',
      '/building-detail',
      '/elderly-list',
      '/elderly-create',
      '/elderly-contact',
      '/care-facility-meal-record'
    ],
    features: [
      'chat_management',
      'care_management',
      'building_management'
    ],
    studentTypes: []
  },
  care_user: {
    pages: [
      '/care-dashboard',
      '/elderly-list',
      '/elderly-create',
      '/elderly-contact',
      '/care-facility-meal-record'
    ],
    features: [
      'elderly_management',
      'care_management'
    ],
    studentTypes: []
  }
} 