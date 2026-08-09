<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import '@xterm/xterm/css/xterm.css'
import { HOME_DIR } from '../terminal/fs/paths'
import { createBackend } from '../terminal/fs/createBackend'
import type { FsBackend } from '../terminal/fs/types'
import { executeCommand } from '../terminal/shell'
import type { CommandContext } from '../terminal/shell'
import CustomKeyboard from './CustomKeyboard.vue'
import { useIsCoarse } from '../composables/useTouch'
import { t } from '../i18n'
import { SITE } from '../site/identity'

const isCoarse = useIsCoarse()
const keyboardVisible = ref(false)
const ready = ref(false)

const container = ref<HTMLElement | null>(null)

const props = defineProps<{
  username: string
}>()

let term: Terminal | null = null
let fitAddon: FitAddon | null = null
let resizeObserver: ResizeObserver | null = null
let streamTimer: ReturnType<typeof setTimeout> | null = null
let streamAbort = false

let fs: FsBackend | null = null
let cwd = HOME_DIR
let lineBuffer = ''
const history: string[] = []
let historyIndex = 0
let commandQueue: Promise<void> = Promise.resolve()
/** True while a command is executing (blocks typing, allows Ctrl+C). */
let busy = false

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function formatCwd(): string {
  return cwd === HOME_DIR ? '~' : cwd.replace(HOME_DIR, '~')
}

function promptText(): string {
  // user@host dim · path cyan · prompt soft white
  return `\x1b[38;2;140;140;140m${props.username}@${SITE.hostname}\x1b[0m:\x1b[96m${formatCwd()}\x1b[0m\x1b[38;2;220;220;220m$\x1b[0m `
}

function prompt(): string {
  return `\r\n${promptText()}`
}

function write(text: string): void {
  term?.write(text.replace(/\n/g, '\r\n'))
}

function clearStreamTimer(): void {
  if (streamTimer !== null) {
    clearTimeout(streamTimer)
    streamTimer = null
  }
}

function stream(text: string): Promise<void> {
  const lines = text.split('\n')
  streamAbort = false
  return new Promise((resolve) => {
    let index = 0
    const tick = (): void => {
      if (streamAbort || !term) {
        resolve()
        return
      }
      if (index >= lines.length) {
        resolve()
        return
      }
      const line = lines[index]!
      term.write(index === lines.length - 1 ? line.replace(/\n/g, '\r\n') : `${line.replace(/\n/g, '\r\n')}\r\n`)
      index++
      if (prefersReducedMotion()) {
        tick()
        return
      }
      const isWarn = line.includes('[ WARN ]') || line.includes('[ ANOMALY ]')
      const isOk = line.includes('[ OK ]')
      const pause = isWarn ? 110 : isOk ? 55 : 18 + Math.random() * 28
      streamTimer = setTimeout(tick, pause)
    }
    tick()
  })
}

function printPrompt(): void {
  term?.write(prompt())
}

function runCommand(): void {
  const line = lineBuffer
  lineBuffer = ''

  if (line.trim()) {
    history.push(line)
    historyIndex = history.length
    write('\r\n')
  } else {
    // Empty enter: just a fresh prompt line, no command work
    printPrompt()
    return
  }

  busy = true
  commandQueue = commandQueue.then(async () => {
    try {
      if (!fs) {
        write(`\x1b[91m${t('terminal.storageInitFailed', { error: 'not ready' })}\x1b[0m`)
        return
      }

      const ctx: CommandContext = {
        fs,
        cwd,
        user: props.username,
        stdin: '',
        stdout: write,
        stderr: (text) => write(`\x1b[91m${text}\x1b[0m`),
        stream,
        clear: () => term?.clear(),
      }

      await executeCommand(line, ctx)
      cwd = ctx.cwd
    } finally {
      busy = false
      streamAbort = false
      printPrompt()
    }
  })
}

function handleData(data: string): void {
  // Allow Ctrl+C even while busy
  if (data === '\u0003') {
    streamAbort = true
    clearStreamTimer()
    lineBuffer = ''
    busy = false
    term?.write('^C')
    printPrompt()
    return
  }

  if (busy) {
    return
  }

  if (data === '\r') {
    runCommand()
    return
  }
  if (data === '\u007f') {
    if (lineBuffer.length > 0) {
      lineBuffer = lineBuffer.slice(0, -1)
      term?.write('\b \b')
    }
    return
  }
  if (data === '\u001b[A') {
    if (historyIndex > 0) {
      historyIndex--
      replaceLine(history[historyIndex] ?? '')
    }
    return
  }
  if (data === '\u001b[B') {
    if (historyIndex < history.length) {
      historyIndex++
      replaceLine(history[historyIndex] ?? '')
    }
    return
  }

  // Ignore most control chars / paste noise that isn't printable
  if (data.length === 1 && data.charCodeAt(0) < 32 && data !== '\t') {
    return
  }

  lineBuffer += data
  const isCommandSegment = !lineBuffer.includes(' ')
  // Command token: soft amber; rest of line stays default
  term?.write(isCommandSegment ? `\x1b[38;2;200;175;80m${data}\x1b[0m` : data)
}

function colorizeLine(text: string): string {
  const space = text.indexOf(' ')
  if (space === -1) {
    return `\x1b[38;2;200;175;80m${text}\x1b[0m`
  }
  return `\x1b[38;2;200;175;80m${text.slice(0, space)}\x1b[0m${text.slice(space)}`
}

function replaceLine(text: string): void {
  const backspaces = '\b \b'.repeat(lineBuffer.length)
  term?.write(backspaces)
  lineBuffer = text
  term?.write(colorizeLine(text))
}

function onResize(): void {
  fitAddon?.fit()
}

function onKeyboardInput(key: string): void {
  term?.input(key)
}

function hideKeyboard(): void {
  keyboardVisible.value = false
  // Refit after keyboard leaves so rows expand
  requestAnimationFrame(() => {
    fitAddon?.fit()
    term?.focus()
  })
}

function showKeyboard(): void {
  keyboardVisible.value = true
  requestAnimationFrame(() => {
    fitAddon?.fit()
    term?.focus()
  })
}

function focusTerminal(): void {
  term?.focus()
}

function resolveFontSize(): number {
  if (typeof window === 'undefined') {
    return 14
  }
  const w = window.innerWidth
  if (w < 380) {
    return 12
  }
  if (w < 480) {
    return 13
  }
  return 14
}

onMounted(async () => {
  if (!container.value) {
    return
  }

  if (document.fonts) {
    await document.fonts.ready
  }

  term = new Terminal({
    theme: {
      background: '#0C0C0C',
      foreground: '#C8C8C8',
      cursor: '#16C60C',
      cursorAccent: '#0C0C0C',
      selectionBackground: '#1E3A5F',
      selectionForeground: '#F2F2F2',
      selectionInactiveBackground: '#1A2A40',
      black: '#0C0C0C',
      red: '#C50F1F',
      green: '#13A10E',
      yellow: '#C19C00',
      blue: '#3A78C8',
      magenta: '#881798',
      cyan: '#3A96DD',
      white: '#C8C8C8',
      brightBlack: '#6E6E6E',
      brightRed: '#E74856',
      brightGreen: '#16C60C',
      brightYellow: '#E8D48A',
      brightBlue: '#5B8DEF',
      brightMagenta: '#B4009E',
      brightCyan: '#61D6D6',
      brightWhite: '#E8E8E8',
    },
    fontFamily: '"Cascadia Code Variable", "Cascadia Code", Menlo, Monaco, "Courier New", monospace',
    fontSize: resolveFontSize(),
    lineHeight: 1.22,
    letterSpacing: 0.2,
    cursorBlink: true,
    cursorStyle: 'block',
    cursorWidth: 1,
    convertEol: true,
    scrollback: 5000,
    smoothScrollDuration: prefersReducedMotion() ? 0 : 80,
    allowTransparency: false,
    drawBoldTextInBrightColors: true,
    minimumContrastRatio: 1,
  })

  fitAddon = new FitAddon()
  term.loadAddon(fitAddon)
  term.open(container.value)
  fitAddon.fit()
  term.focus()

  term.onData(handleData)
  window.addEventListener('resize', onResize)

  if (isCoarse.value) {
    const helper = term.element?.querySelector<HTMLTextAreaElement>('.xterm-helper-textarea')
    const preventSystemKeyboard = (event: Event): void => event.preventDefault()
    helper?.addEventListener('touchstart', preventSystemKeyboard)
    helper?.addEventListener('touchend', preventSystemKeyboard)
    helper?.addEventListener('mousedown', preventSystemKeyboard)
    if (helper) {
      helper.readOnly = true
    }
    keyboardVisible.value = true
  }

  resizeObserver = new ResizeObserver(onResize)
  resizeObserver.observe(container.value)

  createBackend()
    .then((backend) => {
      fs = backend
      term?.write(promptText())
      ready.value = true
    })
    .catch((error: unknown) => {
      const detail = error instanceof Error ? error.message : String(error)
      term?.writeln(`\x1b[91m${t('terminal.storageInitFailed', { error: detail })}\x1b[0m`)
      term?.write(promptText())
      ready.value = true
    })
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', onResize)
  resizeObserver?.disconnect()
  resizeObserver = null
  streamAbort = true
  clearStreamTimer()
  term?.dispose()
  term = null
})
</script>

<template>
  <div class="terminal-layout" :class="{ ready }" @click="focusTerminal">
    <div ref="container" class="terminal-container" role="application" aria-label="SCP Terminal"></div>
    <button
      v-if="isCoarse && !keyboardVisible"
      type="button"
      class="kb-show"
      :aria-label="t('terminal.showKeyboard')"
      @click.stop="showKeyboard"
    >
      {{ t('terminal.showKeyboard') }}
    </button>
    <CustomKeyboard
      v-if="isCoarse"
      :visible="keyboardVisible"
      dismissible
      @keypress="onKeyboardInput"
      @dismiss="hideKeyboard"
    />
  </div>
</template>

<style scoped>
.terminal-layout {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 100dvh;
  background: #0c0c0c;
  opacity: 0;
  transition: opacity 0.28s ease;
}

.terminal-layout.ready {
  opacity: 1;
}

@media (prefers-reduced-motion: reduce) {
  .terminal-layout {
    opacity: 1;
    transition: none;
  }
}

.terminal-container {
  flex: 1;
  min-height: 0;
  background: #0c0c0c;
  padding: 12px 14px 10px;
  box-sizing: border-box;
  /* Soft breathing room on large displays without shrinking columns too much */
  padding-left: max(14px, env(safe-area-inset-left));
  padding-right: max(14px, env(safe-area-inset-right));
  padding-top: max(12px, env(safe-area-inset-top));
}

.terminal-container :deep(.xterm) {
  height: 100%;
  padding: 0;
}

.terminal-container :deep(.xterm-viewport) {
  scrollbar-width: thin;
  scrollbar-color: #2e2e2e transparent;
}

.terminal-container :deep(.xterm-viewport::-webkit-scrollbar) {
  width: 7px;
}

.terminal-container :deep(.xterm-viewport::-webkit-scrollbar-track) {
  background: transparent;
}

.terminal-container :deep(.xterm-viewport::-webkit-scrollbar-thumb) {
  background: #2a2a2a;
  border-radius: 4px;
  border: 2px solid transparent;
  background-clip: padding-box;
}

.terminal-container :deep(.xterm-viewport::-webkit-scrollbar-thumb:hover) {
  background: #3c3c3c;
  background-clip: padding-box;
}

.terminal-container :deep(.xterm-screen) {
  -webkit-font-smoothing: antialiased;
}

.kb-show {
  position: fixed;
  right: max(12px, env(safe-area-inset-right));
  bottom: max(14px, env(safe-area-inset-bottom));
  z-index: 20;
  margin: 0;
  padding: 8px 12px;
  border: 1px solid #333338;
  border-radius: 6px;
  background: rgba(18, 18, 20, 0.9);
  color: #8a8a92;
  font-family: 'Cascadia Code Variable', 'Cascadia Code', Menlo, Monaco, monospace;
  font-size: 11px;
  letter-spacing: 0.04em;
  cursor: pointer;
  backdrop-filter: blur(8px);
  -webkit-tap-highlight-color: transparent;
  transition:
    color 0.12s ease,
    border-color 0.12s ease,
    background 0.12s ease;
}

.kb-show:active {
  color: #16c60c;
  border-color: rgba(22, 198, 12, 0.35);
  background: rgba(22, 28, 22, 0.95);
}
</style>
