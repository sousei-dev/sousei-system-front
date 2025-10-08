import { createApp } from 'vue'

import App from '@/App.vue'
import { registerPlugins } from '@core/utils/plugins'

// Styles
import '@core/scss/template/index.scss'
import '@layouts/styles/index.scss'

import { registerSW } from 'virtual:pwa-register'

// Service Worker 업데이트 감지 및 강제 새로고침
const updateSW = registerSW({
  onNeedRefresh() {
    console.log('새로운 버전이 감지되었습니다. 자동으로 업데이트합니다...')
    
    // 서비스 워커 업데이트 및 페이지 강제 새로고침
    updateSW(true)
  },
  onOfflineReady() {
    console.log('앱이 오프라인에서 사용 가능합니다.')
  },
  onRegistered(registration: any) {
    console.log('Service Worker 등록 완료')
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
