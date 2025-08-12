import type { App } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import { routes } from './routes'
import { permissionGuard } from '@/router/permissionGuard'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

// 전역 권한 가드 적용
router.beforeEach(permissionGuard)

export default function (app: App) {
  app.use(router)
}

export { router }
