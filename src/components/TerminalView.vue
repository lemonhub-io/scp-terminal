<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import '@xterm/xterm/css/xterm.css'
import { HOME_DIR } from '../terminal/fs/paths'
import { createBackend } from '../terminal/fs/createBackend'
import type { FsBackend } from '../terminal/fs/types'
import { executeCommand, getCommandNames } from '../terminal/shell'
import type { CommandContext } from '../terminal/shell'
import { completeLine } from '../terminal/completion'
import { loadHistory, pushHistory, saveHistory } from '../terminal/historyStore'
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
let fitRaf = 0
let lastFitW = 0
let lastFitH = 0
let touchScrollY: number | null = null
let detachScrollHandlers: (() => void) | null = null

let fs: FsBackend | null = null
let cwd = HOME_DIR
let lineBuffer = ''
let history: string[] = []
let historyIndex = 0
let commandQueue: Promise<void> = Promise.resolve()
/** True while a command is executing (blocks typing, allows Ctrl+C). */
let busy = false
/** Reverse-i-search (Ctrl+R) state */
let reverseSearch: { query: string; match: string } | null = null
let tabPending = false

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

function persistHistory(): void {
  if (!fs) {
    return
  }
  void saveHistory(fs, history)
}

function exitReverseSearch(apply: boolean): void {
  if (!reverseSearch) {
    return
  }
  const match = reverseSearch.match
  reverseSearch = null
  // Clear the (reverse-i-search) line by redrawing prompt + buffer
  term?.write('\r\x1b[2K')
  term?.write(promptText())
  if (apply && match) {
    lineBuffer = match
    term?.write(colorizeLine(match))
  } else {
    term?.write(colorizeLine(lineBuffer))
  }
}

function paintReverseSearch(): void {
  if (!reverseSearch) {
    return
  }
  const label = t('terminal.reverseSearch', { query: reverseSearch.query })
  const shown = reverseSearch.match || t('terminal.reverseSearchEmpty')
  term?.write(`\r\x1b[2K\x1b[33m${label}\x1b[0m ${shown}`)
}

function updateReverseSearch(query: string): void {
  if (!reverseSearch) {
    return
  }
  reverseSearch.query = query
  if (!query) {
    reverseSearch.match = ''
    paintReverseSearch()
    return
  }
  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i]!.includes(query)) {
      reverseSearch.match = history[i]!
      paintReverseSearch()
      return
    }
  }
  reverseSearch.match = ''
  paintReverseSearch()
}

function runCommand(): void {
  if (reverseSearch) {
    exitReverseSearch(true)
  }
  const line = lineBuffer
  lineBuffer = ''
  tabPending = false

  if (line.trim()) {
    history = pushHistory(history, line)
    historyIndex = history.length
    persistHistory()
    write('\r\n')
  } else {
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
        history,
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

async function handleTab(): Promise<void> {
  if (!fs || busy) {
    return
  }
  const result = await completeLine(lineBuffer, cwd, fs, getCommandNames())
  if (result.candidates.length > 1 && result.line === lineBuffer && tabPending) {
    write('\r\n' + result.candidates.join('  ') + '\r\n')
    term?.write(promptText())
    term?.write(colorizeLine(lineBuffer))
    tabPending = false
    return
  }
  if (result.line !== lineBuffer) {
    replaceLine(result.line)
    tabPending = result.candidates.length > 1
    return
  }
  if (result.candidates.length > 1) {
    tabPending = true
  }
}

function handleData(data: string): void {
  // Allow Ctrl+C even while busy
  if (data === '\u0003') {
    streamAbort = true
    clearStreamTimer()
    if (reverseSearch) {
      reverseSearch = null
    }
    lineBuffer = ''
    busy = false
    tabPending = false
    term?.write('^C')
    printPrompt()
    return
  }

  if (busy) {
    return
  }

  // Ctrl+R reverse search
  if (data === '\u0012') {
    if (!reverseSearch) {
      reverseSearch = { query: '', match: '' }
      paintReverseSearch()
    } else if (reverseSearch.query) {
      // Find older match
      const q = reverseSearch.query
      const current = reverseSearch.match
      let found = false
      for (let i = history.length - 1; i >= 0; i--) {
        if (history[i] === current) {
          for (let j = i - 1; j >= 0; j--) {
            if (history[j]!.includes(q)) {
              reverseSearch.match = history[j]!
              found = true
              break
            }
          }
          break
        }
      }
      if (!found) {
        updateReverseSearch(q)
      } else {
        paintReverseSearch()
      }
    }
    return
  }

  if (reverseSearch) {
    if (data === '\r') {
      exitReverseSearch(true)
      return
    }
    if (data === '\u001b' || data === '\u001b[A' || data === '\u001b[B') {
      exitReverseSearch(false)
      return
    }
    if (data === '\u007f') {
      updateReverseSearch(reverseSearch.query.slice(0, -1))
      return
    }
    if (data.length === 1 && data.charCodeAt(0) >= 32) {
      updateReverseSearch(reverseSearch.query + data)
    }
    return
  }

  if (data === '\r') {
    runCommand()
    return
  }
  if (data === '\t') {
    void handleTab()
    return
  }
  if (data === '\u007f') {
    tabPending = false
    if (lineBuffer.length > 0) {
      lineBuffer = lineBuffer.slice(0, -1)
      term?.write('\b \b')
    }
    return
  }
  if (data === '\u001b[A') {
    tabPending = false
    if (historyIndex > 0) {
      historyIndex--
      replaceLine(history[historyIndex] ?? '')
    }
    return
  }
  if (data === '\u001b[B') {
    tabPending = false
    if (historyIndex < history.length) {
      historyIndex++
      replaceLine(history[historyIndex] ?? '')
    }
    return
  }

  // Ignore most control chars / paste noise that isn't printable
  if (data.length === 1 && data.charCodeAt(0) < 32) {
    return
  }

  tabPending = false
  lineBuffer += data
  const isCommandSegment = !lineBuffer.includes(' ')
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

/**
 * Debounced fit — avoids ResizeObserver ↔ xterm fit feedback loops that
 * make the custom keyboard appear to bounce vertically on tablets.
 */
function scheduleFit(force = false): void {
  if (fitRaf) {
    cancelAnimationFrame(fitRaf)
  }
  fitRaf = requestAnimationFrame(() => {
    fitRaf = 0
    const el = container.value
    if (!el || !fitAddon) {
      return
    }
    const w = Math.round(el.clientWidth)
    const h = Math.round(el.clientHeight)
    // Ignore sub-pixel / 1–2px thrash from scrollbars or visualViewport chrome
    if (!force && Math.abs(w - lastFitW) < 3 && Math.abs(h - lastFitH) < 3) {
      return
    }
    lastFitW = w
    lastFitH = h
    fitAddon.fit()
  })
}

function onResize(): void {
  scheduleFit()
}

function onKeyboardInput(key: string): void {
  term?.input(key)
}

/**
 * xterm v6 relies on SmoothScrollableElement for wheel; under flex + custom
 * keyboard layouts it often stops receiving events. Drive scrollLines ourselves.
 */
function attachScrollHandlers(...els: HTMLElement[]): void {
  const onWheel = (ev: WheelEvent): void => {
    if (!term || ev.ctrlKey) {
      return
    }
    if (ev.deltaY === 0 && ev.deltaX === 0) {
      return
    }
    const delta = Math.abs(ev.deltaY) >= Math.abs(ev.deltaX) ? ev.deltaY : 0
    if (delta === 0) {
      return
    }
    let lines: number
    if (ev.deltaMode === WheelEvent.DOM_DELTA_LINE) {
      lines = Math.trunc(delta) || (delta > 0 ? 1 : -1)
    } else if (ev.deltaMode === WheelEvent.DOM_DELTA_PAGE) {
      lines = Math.trunc(delta * (term.rows || 24)) || (delta > 0 ? 1 : -1)
    } else {
      lines = Math.trunc(delta / 18) || (delta > 0 ? 1 : -1)
    }
    // deltaY > 0 → scroll toward newer lines (down)
    term.scrollLines(lines)
    ev.preventDefault()
    ev.stopPropagation()
  }

  const onTouchStart = (ev: TouchEvent): void => {
    if (ev.touches.length !== 1) {
      touchScrollY = null
      return
    }
    touchScrollY = ev.touches[0]!.clientY
  }

  const onTouchMove = (ev: TouchEvent): void => {
    if (!term || touchScrollY == null || ev.touches.length !== 1) {
      return
    }
    const y = ev.touches[0]!.clientY
    const dy = touchScrollY - y
    // finger moving up → reveal older lines above → scrollLines negative
    const threshold = 10
    if (Math.abs(dy) < threshold) {
      return
    }
    const lines = Math.round(dy / threshold)
    if (lines !== 0) {
      term.scrollLines(lines)
      touchScrollY = y
      ev.preventDefault()
    }
  }

  const onTouchEnd = (): void => {
    touchScrollY = null
  }

  const targets = [...new Set(els.filter(Boolean))]
  for (const el of targets) {
    el.addEventListener('wheel', onWheel, { passive: false, capture: true })
    el.addEventListener('touchstart', onTouchStart, { passive: true })
    el.addEventListener('touchmove', onTouchMove, { passive: false })
    el.addEventListener('touchend', onTouchEnd, { passive: true })
    el.addEventListener('touchcancel', onTouchEnd, { passive: true })
  }

  detachScrollHandlers = () => {
    for (const el of targets) {
      el.removeEventListener('wheel', onWheel, true)
      el.removeEventListener('touchstart', onTouchStart)
      el.removeEventListener('touchmove', onTouchMove)
      el.removeEventListener('touchend', onTouchEnd)
      el.removeEventListener('touchcancel', onTouchEnd)
    }
    detachScrollHandlers = null
  }
}

function hideKeyboard(): void {
  keyboardVisible.value = false
  // One refit after dock collapses (not every frame)
  requestAnimationFrame(() => {
    scheduleFit(true)
    term?.focus()
  })
}

function showKeyboard(): void {
  keyboardVisible.value = true
  requestAnimationFrame(() => {
    scheduleFit(true)
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
    // Smooth scroll + custom dock layout was unreliable; keep wheel responsive
    smoothScrollDuration: 0,
    scrollSensitivity: 1,
    fastScrollSensitivity: 5,
    allowTransparency: false,
    drawBoldTextInBrightColors: true,
    minimumContrastRatio: 1,
  })

  fitAddon = new FitAddon()
  term.loadAddon(fitAddon)
  term.open(container.value)
  scheduleFit(true)
  term.focus()

  if (term.element) {
    // Container + xterm root so wheel/touch work over padding and canvas
    attachScrollHandlers(container.value, term.element)
  }

  term.attachCustomKeyEventHandler((ev) => {
    if (ev.type !== 'keydown' || !term || busy || reverseSearch) {
      return true
    }
    if (ev.key === 'PageUp') {
      term.scrollLines(-(Math.max(1, term.rows - 2)))
      return false
    }
    if (ev.key === 'PageDown') {
      term.scrollLines(Math.max(1, term.rows - 2))
      return false
    }
    return true
  })

  term.onData(handleData)
  window.addEventListener('resize', onResize)
  // visualViewport changes (browser chrome) used to thrash fit() → keyboard bounce
  window.visualViewport?.addEventListener('resize', onResize)

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
    // Fit once after keyboard paints into flex layout
    requestAnimationFrame(() => scheduleFit(true))
  }

  resizeObserver = new ResizeObserver(onResize)
  resizeObserver.observe(container.value)

  createBackend()
    .then(async (backend) => {
      fs = backend
      history = await loadHistory(backend)
      historyIndex = history.length
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
  window.visualViewport?.removeEventListener('resize', onResize)
  if (fitRaf) {
    cancelAnimationFrame(fitRaf)
    fitRaf = 0
  }
  detachScrollHandlers?.()
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
  max-height: 100dvh;
  overflow: hidden;
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
  padding-left: max(14px, env(safe-area-inset-left));
  padding-right: max(14px, env(safe-area-inset-right));
  padding-top: max(12px, env(safe-area-inset-top));
  /* Allow wheel/touch on this flex child */
  touch-action: pan-y;
  overflow: hidden;
  position: relative;
}

.terminal-container :deep(.xterm) {
  height: 100%;
  width: 100%;
  padding: 0;
  touch-action: pan-y;
}

/* xterm v6 custom scrollbar host */
.terminal-container :deep(.xterm-scrollable-element) {
  width: 100% !important;
  height: 100% !important;
  touch-action: pan-y;
}

.terminal-container :deep(.xterm-viewport) {
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  touch-action: pan-y;
  scrollbar-width: thin;
  scrollbar-color: #2e2e2e transparent;
}

.terminal-container :deep(.xterm-viewport::-webkit-scrollbar) {
  width: 8px;
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
  touch-action: pan-y;
}

/* Custom scrollbar slider (xterm v6) */
.terminal-container :deep(.xterm-scrollable-element > .scrollbar) {
  cursor: pointer;
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
