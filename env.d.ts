import 'vue-router'
declare module 'vue-router' {
  interface RouteMeta {
    action?: string
    subject?: string
    layoutWrapperClasses?: string
    navActiveLink?: RouteLocationRaw
    layout?: 'blank' | 'default'
    unauthenticatedOnly?: boolean
    public?: boolean
  }
}

// Badging API 타입 정의
interface Navigator {
  setAppBadge?(count?: number): Promise<void>
  clearAppBadge?(): Promise<void>
}
