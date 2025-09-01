import { createApp } from 'vue'

import App from '@/App.vue'
import { registerPlugins } from '@core/utils/plugins'

// Styles
import '@core/scss/template/index.scss'
import '@layouts/styles/index.scss'

import { registerSW } from 'virtual:pwa-register'
// Create vue app
const updateSW = registerSW({
  onNeedRefresh() {},
  onOfflineReady() {},
})

const app = createApp(App)

// Register plugins
registerPlugins(app)

// Mount vue app
app.mount('#app')
