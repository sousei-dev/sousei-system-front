import { createApp } from 'vue'

import App from '@/App.vue'
import { registerPlugins } from '@core/utils/plugins'

// Styles
import '@core/scss/template/index.scss'
import '@layouts/styles/index.scss'

import { registerSW } from 'virtual:pwa-register'

// Service Worker 등록 (PWA 기능용)
registerSW({
  onOfflineReady() {
    console.log('앱이 오프라인에서 사용 가능합니다.')
  },
  onRegistered(registration: any) {
    console.log('Service Worker 등록 완료:', registration)
  },
  onRegisterError(error: any) {
    console.error('Service Worker 등록 실패:', error)
  },
})

const app = createApp(App)

// Register plugins
registerPlugins(app)

// Mount vue app
app.mount('#app')
