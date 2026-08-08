import '@fontsource-variable/cascadia-code'
import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import { applyDocumentLang, i18n, t } from './i18n'
import { setupPwa } from './pwa'

const app = createApp(App)

app.use(createPinia())
app.use(i18n)

applyDocumentLang()
document.title = t('app.title')

app.mount('#app')
setupPwa()

