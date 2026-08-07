<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { SimpleKeyboard } from 'simple-keyboard'
import 'simple-keyboard/build/css/index.css'
import { playKeyClick, playKeyFunc } from '../audio/sfx'

const props = defineProps<{
  visible: boolean
}>()

const emit = defineEmits<{
  keypress: [key: string]
}>()

const container = ref<HTMLElement | null>(null)
let keyboard: SimpleKeyboard | null = null

const layout = {
  default: [
    '1 2 3 4 5 6 7 8 9 0',
    'q w e r t y u i o p',
    'a s d f g h j k l',
    '{shift} z x c v b n m {bksp}',
    '{sym} {space} {enter}',
  ],
  shift: [
    '! @ # $ % ^ & * ( )',
    'Q W E R T Y U I O P',
    'A S D F G H J K L',
    '{shift} Z X C V B N M {bksp}',
    '{sym} {space} {enter}',
  ],
  sym: [
    '~ ` | \\ / . , ; : - _',
    '+ = < > [ ] { } ( )',
    '" \' % & * ? ! $ # @',
    '{sym} {space} {bksp} {enter}',
  ],
}

const display = {
  '{shift}':
    '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V6"/><path d="M6 12l6-6 6 6"/></svg>',
  '{bksp}':
    '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 6H3l6 6-6 6h8a5 5 0 0 0 5-5v-2a5 5 0 0 0-5-5z"/><path d="M15 10l4 4M19 10l-4 4"/></svg>',
  '{enter}':
    '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h13a3 3 0 0 1 0 6h-4"/><path d="M13 8l-3 4 3 4"/></svg>',
  '{sym}': '123',
  '{space}': ' ',
}

function onKeyPress(key: string): void {
  if (key === '{shift}' || key === '{sym}') {
    playKeyFunc()
    return
  }
  if (key === '{bksp}') {
    playKeyFunc()
    emit('keypress', '\u007f')
    return
  }
  if (key === '{enter}') {
    playKeyFunc()
    emit('keypress', '\r')
    return
  }
  if (key === '{space}') {
    playKeyClick()
    emit('keypress', ' ')
    return
  }
  playKeyClick()
  emit('keypress', key)
}

watch(
  () => props.visible,
  async (visible) => {
    if (visible && !keyboard) {
      await nextTick()
      keyboard = new SimpleKeyboard(container.value!, {
        layout,
        display,
        layoutName: 'default',
        onKeyPress,
        physicalKeyboardHighlight: false,
        preventMouseDownDefault: true,
      })
    }
  },
  { flush: 'post' },
)

onBeforeUnmount(() => {
  keyboard?.destroy()
  keyboard = null
})
</script>

<template>
  <div v-show="visible" class="keyboard-shell">
    <div class="kb-bar">
      <span class="kb-model">SITE19-KBD-01</span>
      <span class="kb-status"><i class="kb-dot"></i>LINK ACTIVE</span>
    </div>
    <div ref="container" class="simple-keyboard hg-theme-default"></div>
  </div>
</template>

<style scoped>
.keyboard-shell {
  flex: none;
  padding: 0 8px max(8px, env(safe-area-inset-bottom));
  background: #1b1b1f;
  border-top: 1px solid #2c2c31;
  animation: kb-enter 0.22s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes kb-enter {
  from {
    transform: translateY(14px);
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
  padding: 8px 4px 7px;
  font-family: 'Cascadia Code', 'Cascadia Mono', Menlo, Monaco, monospace;
}

.kb-model {
  font-size: 10px;
  letter-spacing: 0.14em;
  color: #6e6e76;
}

.kb-status {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 9px;
  letter-spacing: 0.1em;
  color: #59c46e;
}

.kb-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #16c60c;
  animation: kb-dot-pulse 2.4s ease-in-out infinite;
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

:deep(.simple-keyboard) {
  background: transparent;
  padding: 0;
}

:deep(.hg-theme-default .hg-row:not(:last-child)) {
  margin-bottom: 8px;
}

:deep(.hg-theme-default .hg-row .hg-button:not(:last-child)) {
  margin-right: 7px;
}

:deep(.hg-theme-default .hg-button) {
  height: 46px;
  background: linear-gradient(180deg, #3e3e44 0%, #323237 100%);
  border: none;
  border-radius: 11px;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.1),
    0 1px 3px rgba(0, 0, 0, 0.35);
  color: #f1f1f3;
  font-family: 'Cascadia Code', 'Cascadia Mono', Menlo, Monaco, 'Courier New', monospace;
  font-size: 16px;
  transition:
    transform 0.07s cubic-bezier(0.16, 1, 0.3, 1),
    box-shadow 0.07s ease,
    background 0.07s ease;
}

:deep(.hg-theme-default .hg-button:active),
:deep(.hg-theme-default .hg-button.hg-activeButton) {
  background: linear-gradient(180deg, #303036 0%, #2a2a2f 100%);
  transform: scale(0.96);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.05),
    0 0 2px rgba(0, 0, 0, 0.3);
}

:deep(.hg-theme-default .hg-button span svg) {
  display: block;
  margin: auto;
}

:deep(.hg-theme-default .hg-button.hg-selectedButton) {
  background: linear-gradient(180deg, #4a4a52 0%, #3d3d44 100%);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.14),
    0 1px 3px rgba(0, 0, 0, 0.35);
}

:deep(.hg-theme-default .hg-button[data-skbtn='{space}']) {
  max-width: 62%;
  margin-left: auto;
  margin-right: auto;
}
</style>
