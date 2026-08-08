<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import PowerScreen from './components/PowerScreen.vue'
import BootLog from './components/BootLog.vue'
import LoginView from './components/LoginView.vue'
import TerminalView from './components/TerminalView.vue'
import LocaleSwitcher from './components/LocaleSwitcher.vue'
import { hasCredentials } from './auth/credentials'
import { t } from './i18n'

type View = 'power' | 'boot' | 'login' | 'terminal'
type LoginMode = 'register' | 'login'

const { locale } = useI18n()
const view = ref<View>('power')
const loginMode = ref<LoginMode>('login')
const username = ref('')

onMounted(async () => {
  loginMode.value = (await hasCredentials()) ? 'login' : 'register'
})

watch(
  locale,
  () => {
    document.title = t('app.title')
  },
  { immediate: true },
)

function onPowerStart(): void {
  view.value = 'boot'
}

function onBootFinished(): void {
  view.value = 'login'
}

function onAuthenticated(name: string): void {
  username.value = name
  view.value = 'terminal'
}
</script>

<template>
  <LocaleSwitcher />
  <Transition name="fade" mode="out-in">
    <PowerScreen v-if="view === 'power'" @start="onPowerStart" />
    <BootLog v-else-if="view === 'boot'" @finished="onBootFinished" />
    <LoginView v-else-if="view === 'login'" :mode="loginMode" @authenticated="onAuthenticated" />
    <TerminalView v-else-if="view === 'terminal'" :username="username" />
  </Transition>
</template>

<style>
.fade-enter-active,
.fade-leave-active {
  transition:
    opacity 0.35s ease,
    transform 0.35s ease;
}

.fade-enter-from {
  opacity: 0;
  transform: translateY(10px);
}

.fade-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
</style>
