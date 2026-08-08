<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { getBootLines } from '../boot/bootLog'
import type { BootLine } from '../boot/bootLog'
import { playBootDone, playTick } from '../audio/sfx'

const { t } = useI18n()

const emit = defineEmits<{
  finished: []
}>()

const bootLines = getBootLines()
const visible = ref<BootLine[]>([])
const done = ref(false)
const exiting = ref(false)
const logEl = ref<HTMLElement | null>(null)
let skip = false
let timer: ReturnType<typeof setTimeout> | null = null
let index = 0
let finished = false

watch(
  () => visible.value.length,
  () => {
    void nextTick(() => {
      if (logEl.value) {
        logEl.value.scrollTop = logEl.value.scrollHeight
      }
    })
  },
)

function advance(): void {
  if (skip) {
    return
  }
  if (index < bootLines.length) {
    visible.value.push(bootLines[index]!)
    playTick()
    index++
    timer = setTimeout(advance, 20 + Math.random() * 60)
    return
  }
  if (!finished) {
    done.value = true
    timer = setTimeout(startExit, 900)
  }
}

function startExit(): void {
  if (finished || exiting.value) {
    return
  }
  exiting.value = true
  playBootDone()
}

function onAnimationEnd(): void {
  if (exiting.value) {
    finish()
  }
}

function finish(): void {
  if (!finished) {
    finished = true
  }
  emit('finished')
}

function onKeydown(): void {
  if (!finished) {
    skip = true
    clearTimer()
    visible.value = [...bootLines]
    done.value = true
    timer = setTimeout(startExit, 250)
  }
}

function clearTimer(): void {
  if (timer) {
    clearTimeout(timer)
    timer = null
  }
}

onMounted(() => {
  window.addEventListener('keydown', onKeydown)
  advance()
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)
  clearTimer()
})

const kernelVersion = computed(() => '6.8.0-scp')

const LOGO = [
  ' ____   ____ ____    _____ _____ ____  __  __ ___ _   _    _    _',
  '/ ___| / ___|  _ \\  |_   _| ____|  _ \\|  \\/  |_ _| \\ | |  / \\  | |',
  '\\___ \\| |   | |_) |   | | |  _| | |_) | |\\/| || ||  \\| | / _ \\ | |',
  ' ___) | |___|  __/    | | | |___|  _ <| |  | || || |\\  |/ ___ \\| |___',
  '|____/ \\____|_|       |_| |_____|_| \\_\\_|  |_|___|_| \\_/_/   \\_\\_____|',
].join('\n')
</script>

<template>
  <div class="boot-screen" :class="{ leaving: exiting }" @animationend="onAnimationEnd">
    <pre class="logo">{{ LOGO }}</pre>
    <p class="version">{{ t('boot.version', { version: kernelVersion }) }}</p>

    <div ref="logEl" class="log">
      <div
        v-for="(line, i) in visible"
        :key="`${i}-${line.text}`"
        class="line"
        :class="line.kind"
      >
        <span class="stamp">[ {{ String(i).padStart(4, '0') }}.000000 ]</span>
        <span class="text">{{ line.text }}</span>
      </div>
      <div v-if="done" class="line prompt-line">
        <span class="stamp">[ 0000.000000 ]</span>
        <span class="text">{{ bootLines[bootLines.length - 1]!.text }}</span>
        <span class="cursor">█</span>
      </div>
    </div>

    <p class="skip-hint">{{ t('boot.skipHint') }}</p>
  </div>
</template>

<style scoped>
.boot-screen {
  height: 100%;
  background: #0c0c0c;
  color: #cccccc;
  font-family: 'Cascadia Code', 'Cascadia Mono', Menlo, Monaco, 'Courier New', monospace;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 24px;
  box-sizing: border-box;
  overflow: hidden;
}

.boot-screen.leaving {
  animation: scroll-out 0.55s ease-in forwards;
}

@keyframes scroll-out {
  from {
    transform: translateY(0);
    opacity: 1;
  }
  to {
    transform: translateY(-100%);
    opacity: 0.4;
  }
}

.logo {
  margin: 0 0 4px 0;
  color: #16c60c;
  font-size: clamp(5px, calc((100vw - 48px) / 44), 14px);
  line-height: 1.15;
  text-align: center;
  text-shadow: 0 0 8px rgba(22, 198, 12, 0.45);
  animation: logo-glow 2.2s ease-in-out infinite;
}

@keyframes logo-glow {
  0%,
  100% {
    text-shadow: 0 0 8px rgba(22, 198, 12, 0.45);
  }
  50% {
    text-shadow: 0 0 18px rgba(22, 198, 12, 0.85);
  }
}

.version {
  margin: 0 0 18px 0;
  font-size: 11px;
  color: #767676;
  text-align: center;
}

.log {
  width: 100%;
  max-width: 860px;
  flex: 1;
  overflow: hidden;
  font-size: 13px;
  line-height: 1.55;
}

.line {
  display: flex;
  gap: 12px;
  animation: line-in 180ms ease-out both;
  white-space: nowrap;
}

@keyframes line-in {
  from {
    opacity: 0;
    transform: translateY(-4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.stamp {
  color: #565656;
  flex-shrink: 0;
}

.text {
  overflow: hidden;
  text-overflow: ellipsis;
}

.line.kernel .text {
  color: #9a9a9a;
}

.line.info .text {
  color: #8a8a8a;
}

.line.redacted .text {
  color: #c8c8c8;
  text-shadow: 0 0 3px rgba(200, 200, 200, 0.3);
}

.line.ok .text {
  color: #ffffff;
}

.line.ok .stamp {
  color: #16c60c;
}

.line.target .text {
  color: #61d6d6;
}

.line.target .stamp {
  color: #3a96dd;
}

.line.fail .text {
  color: #e74856;
  animation: fail-blink 300ms steps(2, start) infinite;
}

@keyframes fail-blink {
  to {
    visibility: hidden;
  }
}

.prompt-line {
  margin-top: 8px;
}

.prompt-line .text {
  color: #16c60c;
}

.cursor {
  color: #16c60c;
  animation: cursor-blink 900ms steps(2, start) infinite;
}

@keyframes cursor-blink {
  to {
    visibility: hidden;
  }
}

.skip-hint {
  margin: 14px 0 0 0;
  font-size: 11px;
  color: #565656;
}
</style>
