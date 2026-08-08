<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { SimpleKeyboard } from 'simple-keyboard'
import 'simple-keyboard/build/css/index.css'
import { ensureAudio, playKeyClick, playKeyFunc } from '../audio/sfx'

type LayoutName = 'default' | 'shift' | 'sym'

const props = defineProps<{
  visible: boolean
  /** Show dismiss control in the status bar (login / optional terminal). */
  dismissible?: boolean
}>()

const emit = defineEmits<{
  keypress: [key: string]
  dismiss: []
}>()

const { t, locale } = useI18n()

const container = ref<HTMLElement | null>(null)
const shell = ref<HTMLElement | null>(null)
const layoutName = ref<LayoutName>('default')
const shiftLocked = ref(false)

let keyboard: SimpleKeyboard | null = null
let lastShiftTap = 0
let bkspHoldTimer: ReturnType<typeof setTimeout> | null = null
let bkspRepeatTimer: ReturnType<typeof setInterval> | null = null
let bkspPointerActive = false

const layout = {
  default: [
    '1 2 3 4 5 6 7 8 9 0',
    'q w e r t y u i o p',
    'a s d f g h j k l',
    '{shift} z x c v b n m {bksp}',
    '{sym} / {space} - . {enter}',
  ],
  shift: [
    '! @ # $ % ^ & * ( )',
    'Q W E R T Y U I O P',
    'A S D F G H J K L',
    '{shift} Z X C V B N M {bksp}',
    '{sym} / {space} _ : {enter}',
  ],
  sym: [
    '~ ` | \\ { } [ ] < >',
    '+ = * & % # @ ? !',
    '" \' ; , . _ - $ ^',
    '{shift} ( ) / ~ ` \\ {bksp}',
    '{sym} {space} {enter}',
  ],
}

const statusLabel = computed(() => {
  if (layoutName.value === 'sym') {
    return t('keyboard.statusSym')
  }
  if (shiftLocked.value) {
    return t('keyboard.statusCaps')
  }
  return t('keyboard.status')
})

function buildDisplay(): Record<string, string> {
  const symLabel = layoutName.value === 'sym' ? t('keyboard.letters') : t('keyboard.symbols')
  return {
    '{shift}':
      '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 19V6"/><path d="M6 12l6-6 6 6"/></svg>',
    '{bksp}':
      '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 6H3l6 6-6 6h8a5 5 0 0 0 5-5v-2a5 5 0 0 0-5-5z"/><path d="M15 10l4 4M19 10l-4 4"/></svg>',
    '{enter}':
      '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h13a3 3 0 0 1 0 6h-4"/><path d="M13 8l-3 4 3 4"/></svg>',
    '{sym}': symLabel,
    '{space}': '',
  }
}

function buttonTheme(): { class: string; buttons: string }[] {
  return [
    { class: 'kb-btn-func', buttons: '{shift} {sym} {bksp}' },
    { class: 'kb-btn-enter', buttons: '{enter}' },
    { class: 'kb-btn-space', buttons: '{space}' },
  ]
}

function haptic(ms = 8): void {
  try {
    navigator.vibrate?.(ms)
  } catch {
    // unsupported
  }
}

function clearBkspTimers(): void {
  if (bkspHoldTimer !== null) {
    clearTimeout(bkspHoldTimer)
    bkspHoldTimer = null
  }
  if (bkspRepeatTimer !== null) {
    clearInterval(bkspRepeatTimer)
    bkspRepeatTimer = null
  }
}

function emitBksp(): void {
  playKeyFunc()
  haptic(6)
  emit('keypress', '\u007f')
}

function startBkspHold(): void {
  clearBkspTimers()
  // After hold threshold, repeat deletes (first delete already fired via onKeyPress)
  bkspHoldTimer = setTimeout(() => {
    let interval = 85
    const arm = (): void => {
      if (bkspRepeatTimer !== null) {
        clearInterval(bkspRepeatTimer)
      }
      bkspRepeatTimer = setInterval(() => {
        emitBksp()
        interval = Math.max(34, interval - 5)
        arm()
      }, interval)
    }
    emitBksp()
    arm()
  }, 400)
}

function setLayout(name: LayoutName): void {
  layoutName.value = name
  if (name !== 'shift') {
    shiftLocked.value = false
  }
  keyboard?.setOptions({
    layoutName: name,
    display: buildDisplay(),
    buttonTheme: buttonTheme(),
  })
}

function toggleShift(): void {
  playKeyFunc()
  haptic(10)
  const now = performance.now()
  const doubleTap = now - lastShiftTap < 320
  lastShiftTap = now

  if (layoutName.value === 'sym') {
    // From symbols: shift just flips case layer for one shot
    setLayout('shift')
    shiftLocked.value = false
    return
  }

  if (layoutName.value === 'shift') {
    if (doubleTap || shiftLocked.value) {
      // second tap while shift: lock or unlock
      if (shiftLocked.value && !doubleTap) {
        setLayout('default')
        return
      }
      shiftLocked.value = !shiftLocked.value
      if (!shiftLocked.value) {
        setLayout('default')
      } else {
        keyboard?.setOptions({ display: buildDisplay() })
      }
      return
    }
    setLayout('default')
    return
  }

  // default → shift (or caps if double)
  setLayout('shift')
  if (doubleTap) {
    shiftLocked.value = true
  }
}

function toggleSym(): void {
  playKeyFunc()
  haptic(10)
  if (layoutName.value === 'sym') {
    setLayout('default')
  } else {
    shiftLocked.value = false
    setLayout('sym')
  }
}

function onKeyPress(key: string): void {
  ensureAudio()

  if (key === '{shift}') {
    toggleShift()
    return
  }
  if (key === '{sym}') {
    toggleSym()
    return
  }
  if (key === '{bksp}') {
    // Single delete; long-press repeat is handled by pointer listeners
    emitBksp()
    return
  }
  if (key === '{enter}') {
    playKeyFunc()
    haptic(12)
    emit('keypress', '\r')
    return
  }
  if (key === '{space}') {
    playKeyClick()
    haptic(6)
    emit('keypress', ' ')
    // space from shift (non-lock) returns to default
    if (layoutName.value === 'shift' && !shiftLocked.value) {
      setLayout('default')
    }
    return
  }

  playKeyClick()
  haptic(5)
  emit('keypress', key)

  // One-shot shift: return to lowercase after character
  if (layoutName.value === 'shift' && !shiftLocked.value) {
    setLayout('default')
  }
}

function onPointerDown(event: Event): void {
  const target = event.target as HTMLElement | null
  const btn = target?.closest?.('.hg-button') as HTMLElement | null
  if (!btn) {
    return
  }
  const key = btn.getAttribute('data-skbtn')
  if (key === '{bksp}') {
    bkspPointerActive = true
    // Delay only — first character comes from onKeyPress
    startBkspHold()
  }
}

function onPointerUp(): void {
  if (bkspPointerActive) {
    clearBkspTimers()
    bkspPointerActive = false
  }
}

function bindPointer(): void {
  const el = container.value
  if (!el) {
    return
  }
  el.addEventListener('pointerdown', onPointerDown)
  window.addEventListener('pointerup', onPointerUp)
  window.addEventListener('pointercancel', onPointerUp)
}

function unbindPointer(): void {
  const el = container.value
  el?.removeEventListener('pointerdown', onPointerDown)
  window.removeEventListener('pointerup', onPointerUp)
  window.removeEventListener('pointercancel', onPointerUp)
  clearBkspTimers()
}

async function ensureKeyboard(): Promise<void> {
  if (keyboard || !container.value) {
    return
  }
  await nextTick()
  if (!container.value || keyboard) {
    return
  }

  keyboard = new SimpleKeyboard(container.value, {
    layout,
    display: buildDisplay(),
    layoutName: layoutName.value,
    onKeyPress,
    buttonTheme: buttonTheme(),
    physicalKeyboardHighlight: false,
    preventMouseDownDefault: true,
    stopMouseDownPropagation: true,
    useButtonTag: true,
    theme: 'hg-theme-default kb-theme',
  })
  bindPointer()
}

function destroyKeyboard(): void {
  unbindPointer()
  keyboard?.destroy()
  keyboard = null
  layoutName.value = 'default'
  shiftLocked.value = false
}

function onDismiss(): void {
  playKeyFunc()
  haptic(8)
  emit('dismiss')
}

watch(
  () => props.visible,
  async (visible) => {
    if (visible) {
      await ensureKeyboard()
    }
  },
  { flush: 'post', immediate: true },
)

// Refresh display labels when language changes
watch(locale, () => {
  if (keyboard) {
    keyboard.setOptions({
      display: buildDisplay(),
      buttonTheme: buttonTheme(),
    })
  }
})

onBeforeUnmount(() => {
  destroyKeyboard()
})
</script>

<template>
  <div
    v-show="visible"
    ref="shell"
    class="keyboard-shell"
    :class="{
      'is-shift': layoutName === 'shift',
      'is-sym': layoutName === 'sym',
      'is-caps': shiftLocked,
    }"
    role="group"
    :aria-label="t('keyboard.model')"
  >
    <div class="kb-bar">
      <div class="kb-meta">
        <span class="kb-model">{{ t('keyboard.model') }}</span>
        <span class="kb-status">
          <i class="kb-dot" aria-hidden="true"></i>
          {{ statusLabel }}
        </span>
      </div>
      <button
        v-if="dismissible"
        type="button"
        class="kb-dismiss"
        :aria-label="t('keyboard.dismiss')"
        @click="onDismiss"
      >
        {{ t('keyboard.dismiss') }}
      </button>
    </div>
    <div ref="container" class="simple-keyboard hg-theme-default kb-theme"></div>
  </div>
</template>

<style scoped>
.keyboard-shell {
  flex: none;
  width: 100%;
  max-width: 720px;
  margin: 0 auto;
  padding: 0 10px max(10px, env(safe-area-inset-bottom));
  background: linear-gradient(180deg, #161618 0%, #121214 100%);
  border-top: 1px solid #2a2a2e;
  box-shadow: 0 -10px 28px rgba(0, 0, 0, 0.32);
  animation: kb-enter 0.22s cubic-bezier(0.16, 1, 0.3, 1);
  user-select: none;
  -webkit-user-select: none;
}

@keyframes kb-enter {
  from {
    transform: translateY(12px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

@media (prefers-reduced-motion: reduce) {
  .keyboard-shell {
    animation: none;
  }
}

.kb-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 8px 4px 7px;
  font-family: 'Cascadia Code Variable', 'Cascadia Code', 'Cascadia Mono', Menlo, Monaco, monospace;
}

.kb-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.kb-model {
  font-size: 10px;
  letter-spacing: 0.12em;
  color: #5a5a62;
  white-space: nowrap;
}

.kb-status {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 9px;
  letter-spacing: 0.08em;
  color: #4a9a58;
  white-space: nowrap;
}

.keyboard-shell.is-caps .kb-status,
.keyboard-shell.is-sym .kb-status {
  color: #8a9a4a;
}

.kb-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #16c60c;
  opacity: 0.9;
  flex-shrink: 0;
  animation: kb-dot-pulse 2.8s ease-in-out infinite;
}

.keyboard-shell.is-caps .kb-dot,
.keyboard-shell.is-sym .kb-dot {
  background: #c4b44a;
}

@keyframes kb-dot-pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.35;
  }
}

@media (prefers-reduced-motion: reduce) {
  .kb-dot {
    animation: none;
  }
}

.kb-dismiss {
  margin: 0;
  padding: 4px 10px;
  border: 1px solid #333338;
  border-radius: 4px;
  background: #1c1c20;
  color: #8a8a92;
  font: inherit;
  font-size: 10px;
  letter-spacing: 0.06em;
  cursor: pointer;
  transition:
    color 0.12s ease,
    border-color 0.12s ease,
    background 0.12s ease;
  -webkit-tap-highlight-color: transparent;
}

.kb-dismiss:active {
  color: #c8c8ce;
  border-color: #45454c;
  background: #242428;
}

:deep(.simple-keyboard.kb-theme) {
  background: transparent;
  padding: 0 0 2px;
  width: 100%;
}

:deep(.kb-theme .hg-row) {
  display: flex;
  justify-content: center;
}

:deep(.kb-theme .hg-row:not(:last-child)) {
  margin-bottom: 6px;
}

:deep(.kb-theme .hg-row .hg-button:not(:last-child)) {
  margin-right: 5px;
}

:deep(.kb-theme .hg-button) {
  height: clamp(42px, 11.2vw, 48px);
  flex-grow: 1;
  max-width: 64px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(180deg, #3a3a40 0%, #2c2c31 100%);
  border: 1px solid rgba(255, 255, 255, 0.045);
  border-bottom-color: rgba(0, 0, 0, 0.35);
  border-radius: 9px;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.07),
    0 1px 2px rgba(0, 0, 0, 0.3);
  color: #e6e6ea;
  font-family: 'Cascadia Code Variable', 'Cascadia Code', 'Cascadia Mono', Menlo, Monaco, 'Courier New',
    monospace;
  font-size: clamp(14px, 3.8vw, 16px);
  font-weight: 500;
  line-height: 1;
  transition:
    transform 0.05s cubic-bezier(0.16, 1, 0.3, 1),
    box-shadow 0.05s ease,
    background 0.05s ease,
    border-color 0.05s ease,
    color 0.05s ease;
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
  cursor: pointer;
}

:deep(.kb-theme .hg-button:active),
:deep(.kb-theme .hg-button.hg-activeButton) {
  background: linear-gradient(180deg, #2a2a2f 0%, #242428 100%);
  border-color: rgba(22, 198, 12, 0.14);
  transform: scale(0.96) translateY(1px);
  box-shadow:
    inset 0 1px 2px rgba(0, 0, 0, 0.4),
    0 0 0 1px rgba(22, 198, 12, 0.06);
  color: #f2f2f4;
}

:deep(.kb-theme .hg-button span) {
  pointer-events: none;
}

:deep(.kb-theme .hg-button span svg) {
  display: block;
  margin: auto;
}

/* Function keys: quieter surface */
:deep(.kb-theme .hg-button.kb-btn-func) {
  max-width: 72px;
  flex-grow: 1.15;
  background: linear-gradient(180deg, #323238 0%, #27272c 100%);
  color: #b8b8c0;
  font-size: clamp(12px, 3.2vw, 13px);
}

/* Enter: subtle site green accent */
:deep(.kb-theme .hg-button.kb-btn-enter) {
  max-width: 76px;
  flex-grow: 1.2;
  background: linear-gradient(180deg, #2a3a2a 0%, #1e2c1e 100%);
  border-color: rgba(22, 198, 12, 0.18);
  color: #7dca72;
}

:deep(.kb-theme .hg-button.kb-btn-enter:active),
:deep(.kb-theme .hg-button.kb-btn-enter.hg-activeButton) {
  background: linear-gradient(180deg, #243424 0%, #1a261a 100%);
  border-color: rgba(22, 198, 12, 0.32);
  color: #9ae08f;
}

/* Space bar */
:deep(.kb-theme .hg-button.kb-btn-space) {
  max-width: none;
  flex-grow: 4.2;
  min-width: 38%;
}

:deep(.kb-theme .hg-button.kb-btn-space::after) {
  content: '';
  display: block;
  width: 28%;
  height: 3px;
  border-radius: 2px;
  background: #4a4a52;
  opacity: 0.85;
}

/* Active shift / caps */
.keyboard-shell.is-shift :deep(.kb-theme .hg-button[data-skbtn='{shift}']),
.keyboard-shell.is-caps :deep(.kb-theme .hg-button[data-skbtn='{shift}']) {
  background: linear-gradient(180deg, #3a4a3a 0%, #2a382a 100%);
  border-color: rgba(22, 198, 12, 0.28);
  color: #16c60c;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.06),
    0 0 0 1px rgba(22, 198, 12, 0.1);
}

.keyboard-shell.is-caps :deep(.kb-theme .hg-button[data-skbtn='{shift}']) {
  box-shadow:
    inset 0 0 0 1px rgba(22, 198, 12, 0.35),
    0 0 10px rgba(22, 198, 12, 0.12);
}

.keyboard-shell.is-sym :deep(.kb-theme .hg-button[data-skbtn='{sym}']) {
  background: linear-gradient(180deg, #3a3a2a 0%, #2e2e22 100%);
  border-color: rgba(196, 180, 74, 0.28);
  color: #c4b44a;
}

/* Wider phones / tablets */
@media (min-width: 480px) {
  .keyboard-shell {
    padding-left: 14px;
    padding-right: 14px;
  }

  :deep(.kb-theme .hg-row:not(:last-child)) {
    margin-bottom: 7px;
  }

  :deep(.kb-theme .hg-row .hg-button:not(:last-child)) {
    margin-right: 6px;
  }
}
</style>
