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

const isCoarse = useIsCoarse()
const keyboardVisible = ref(false)

const container = ref<HTMLElement | null>(null)

const props = defineProps<{
  username: string
}>()

let term: Terminal | null = null
let fitAddon: FitAddon | null = null

let fs: FsBackend | null = null
let cwd = HOME_DIR
let lineBuffer = ''
const history: string[] = []
let historyIndex = 0
let commandQueue: Promise<void> = Promise.resolve()

const HOST = 'localhost'

function formatCwd(): string {
  return cwd === HOME_DIR ? '~' : cwd.replace(HOME_DIR, '~')
}

function promptText(): string {
  return `${props.username}@${HOST}:\x1b[96m${formatCwd()}\x1b[0m\x1b[97m$\x1b[0m `
}

function prompt(): string {
  return `\r\n${promptText()}`
}

function write(text: string): void {
  term?.write(text.replace(/\n/g, '\r\n'))
}

function stream(text: string): Promise<void> {
  const lines = text.split('\n')
  return new Promise((resolve) => {
    let index = 0
    const tick = (): void => {
      if (index >= lines.length) {
        resolve()
        return
      }
      const line = lines[index]!
      term?.write(index === lines.length - 1 ? line.replace(/\n/g, '\r\n') : `${line.replace(/\n/g, '\r\n')}\r\n`)
      index++
      const pause = line.includes('[ WARN ]') || line.includes('[ ANOMALY ]') ? 140 : 30 + Math.random() * 40
      setTimeout(tick, pause)
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
  }

  commandQueue = commandQueue.then(async () => {
    if (!fs) {
      write('Storage backend not ready')
      printPrompt()
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
    printPrompt()
  })
}

function handleData(data: string): void {
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
  if (data === '\u0003') {
    lineBuffer = ''
    term?.write('^C')
    printPrompt()
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

  lineBuffer += data
  const isCommandSegment = !lineBuffer.includes(' ')
  term?.write(isCommandSegment ? `\x1b[93m${data}\x1b[0m` : data)
}

function colorizeLine(text: string): string {
  const space = text.indexOf(' ')
  if (space === -1) {
    return `\x1b[93m${text}\x1b[0m`
  }
  return `\x1b[93m${text.slice(0, space)}\x1b[0m${text.slice(space)}`
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
      foreground: '#CCCCCC',
      cursor: '#FFFFFF',
      cursorAccent: '#0C0C0C',
      selectionBackground: '#264F78',
      black: '#0C0C0C',
      red: '#C50F1F',
      green: '#13A10E',
      yellow: '#C19C00',
      blue: '#0037DA',
      magenta: '#881798',
      cyan: '#3A96DD',
      white: '#CCCCCC',
      brightBlack: '#767676',
      brightRed: '#E74856',
      brightGreen: '#16C60C',
      brightYellow: '#F9F1A5',
      brightBlue: '#3B78FF',
      brightMagenta: '#B4009E',
      brightCyan: '#61D6D6',
      brightWhite: '#F2F2F2',
    },
    fontFamily: '"Cascadia Code", Menlo, Monaco, "Courier New", monospace',
    fontSize: 14,
    lineHeight: 1.15,
    letterSpacing: 0,
    cursorBlink: true,
    convertEol: true,
  })

  fitAddon = new FitAddon()
  term.loadAddon(fitAddon)
  term.open(container.value)
  fitAddon.fit()

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

  const resizeObserver = new ResizeObserver(onResize)
  resizeObserver.observe(container.value)

  createBackend()
    .then((backend) => {
      fs = backend
      term?.write(promptText())
    })
    .catch((error: unknown) => {
      term?.writeln(`\x1b[91mFailed to initialize storage: ${error instanceof Error ? error.message : String(error)}\x1b[0m`)
      term?.write(promptText())
    })
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', onResize)
  term?.dispose()
  term = null
})
</script>

<template>
  <div class="terminal-layout">
    <div ref="container" class="terminal-container"></div>
    <CustomKeyboard v-if="isCoarse" :visible="keyboardVisible" @keypress="onKeyboardInput" />
  </div>
</template>

<style scoped>
.terminal-layout {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #0c0c0c;
}

.terminal-container {
  flex: 1;
  min-height: 0;
  background: #0c0c0c;
  padding: 10px;
  box-sizing: border-box;
}

:global(.xterm-viewport) {
  scrollbar-width: thin;
  scrollbar-color: #3a3a3a transparent;
}

:global(.xterm-viewport::-webkit-scrollbar) {
  width: 8px;
}

:global(.xterm-viewport::-webkit-scrollbar-track) {
  background: transparent;
}

:global(.xterm-viewport::-webkit-scrollbar-thumb) {
  background: #2a2a2a;
  border-radius: 4px;
}

:global(.xterm-viewport::-webkit-scrollbar-thumb:hover) {
  background: #3a3a3a;
}
</style>
