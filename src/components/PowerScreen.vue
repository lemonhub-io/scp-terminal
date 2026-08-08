<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { playPowerOn } from '../audio/sfx'

const { t } = useI18n()

const emit = defineEmits<{
  start: []
}>()

function enterFullscreen(): void {
  const el = document.documentElement
  const doc = document as Document & {
    webkitRequestFullscreen?: () => void
    webkitExitFullscreen?: () => void
    webkitFullscreenElement?: Element | null
  }
  const request = el.requestFullscreen?.bind(el) ?? doc.webkitRequestFullscreen?.bind(el)
  if (!request) {
    return
  }
  try {
    const result = request() as unknown
    if (result && typeof (result as Promise<void>).catch === 'function') {
      void (result as Promise<void>).catch(() => {})
    }
  } catch {
    // fullscreen unavailable
  }
}

function onStart(): void {
  playPowerOn()
  enterFullscreen()
  emit('start')
}
</script>

<template>
  <div class="power-screen">
    <div class="power-inner">
      <p class="brand">{{ t('app.brand') }}</p>
      <button class="start-btn" type="button" @click="onStart">
        <svg
          class="power-icon"
          viewBox="0 0 24 24"
          width="22"
          height="22"
          fill="none"
          stroke="currentColor"
          stroke-width="1.8"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M12 3v9" />
          <path d="M18.4 6.6a9 9 0 1 1-12.8 0" />
        </svg>
        <span>{{ t('power.start') }}</span>
      </button>
      <p class="hint">{{ t('power.hint') }}</p>
    </div>
  </div>
</template>

<style scoped>
.power-screen {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  background: #0c0c0c;
  color: #fff;
  font-family: 'Cascadia Code', 'Cascadia Mono', Menlo, Monaco, 'Courier New', monospace;
}

.power-inner {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 34px;
  padding-bottom: 8vh;
}

.brand {
  margin: 0;
  font-size: 11px;
  letter-spacing: 0.42em;
  text-indent: 0.42em;
  color: #5c5c63;
  text-transform: uppercase;
  user-select: none;
}

.start-btn {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  padding: 15px 44px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 999px;
  background: linear-gradient(180deg, #2f2f34 0%, #232327 100%);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.1),
    0 4px 18px rgba(0, 0, 0, 0.45);
  color: #f2f2f4;
  font-family: inherit;
  font-size: 13px;
  letter-spacing: 0.32em;
  text-indent: 0.32em;
  cursor: pointer;
  transition:
    transform 0.12s cubic-bezier(0.16, 1, 0.3, 1),
    background 0.12s ease,
    box-shadow 0.12s ease;
  animation: btn-breathe 3.4s ease-in-out infinite;
}

.start-btn:hover {
  background: linear-gradient(180deg, #36363c 0%, #2a2a2e 100%);
}

.start-btn:active {
  transform: scale(0.96);
  background: linear-gradient(180deg, #26262a 0%, #202024 100%);
}

.power-icon {
  flex-shrink: 0;
}

@keyframes btn-breathe {
  0%,
  100% {
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.1),
      0 4px 18px rgba(0, 0, 0, 0.45),
      0 0 0 rgba(255, 255, 255, 0);
  }
  50% {
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.12),
      0 4px 18px rgba(0, 0, 0, 0.45),
      0 0 26px rgba(255, 255, 255, 0.06);
  }
}

@media (prefers-reduced-motion: reduce) {
  .start-btn {
    animation: none;
  }
}

.hint {
  margin: 0;
  font-size: 10px;
  letter-spacing: 0.3em;
  text-indent: 0.3em;
  color: #3f3f45;
  text-transform: uppercase;
  user-select: none;
}
</style>
