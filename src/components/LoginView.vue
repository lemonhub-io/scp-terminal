<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { register, verify } from '../auth/credentials'
import type { CredentialsError } from '../auth/credentials'
import CustomKeyboard from './CustomKeyboard.vue'
import { useIsCoarse } from '../composables/useTouch'

const { t } = useI18n()
const isCoarse = useIsCoarse()

const props = defineProps<{
  mode: 'register' | 'login'
}>()

const emit = defineEmits<{
  authenticated: [username: string]
}>()

const username = ref('')
const error = ref('')
const busy = ref(false)
const activeField = ref<'username' | null>(null)
const loginBox = ref<HTMLElement | null>(null)
const screenEl = ref<HTMLElement | null>(null)

function focusField(): void {
  activeField.value = 'username'
}

onMounted(() => {
  setTimeout(() => {
    const el = screenEl.value
    if (el && getComputedStyle(el).opacity === '0') {
      el.style.opacity = '1'
      el.style.transform = 'none'
    }
  }, 600)
})

watch(activeField, async (field) => {
  if (field) {
    await nextTick()
    loginBox.value?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }
})

const title = computed(() =>
  props.mode === 'register' ? t('login.registerTitle') : t('login.loginTitle'),
)
const subtitle = computed(() =>
  props.mode === 'register' ? t('login.registerSubtitle') : t('login.loginSubtitle'),
)

function onKeyboardInput(key: string): void {
  if (activeField.value !== 'username') {
    return
  }
  if (key === '\u007f') {
    username.value = username.value.slice(0, -1)
    return
  }
  if (key === '\r') {
    activeField.value = null
    void submit()
    return
  }
  username.value += key
}

async function submit(): Promise<void> {
  error.value = ''
  busy.value = true
  try {
    const name = username.value.trim()
    if (props.mode === 'register') {
      await register(name)
      emit('authenticated', name)
    } else {
      const ok = await verify(name)
      if (ok) {
        emit('authenticated', name)
      } else {
        error.value = t('login.invalidCredentials')
      }
    }
  } catch (err) {
    error.value = err instanceof Error ? (err as CredentialsError).message : String(err)
  } finally {
    busy.value = false
  }
}

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Enter') {
    void submit()
  }
}
</script>

<template>
  <div ref="screenEl" class="login-screen">
    <div class="login-scroll">
      <div ref="loginBox" class="login-box">
        <h1 class="title">{{ t('login.title') }}</h1>
        <p class="subtitle">{{ subtitle }}</p>

        <label class="field">
          <span class="label">{{ t('login.username') }}</span>
          <input
            v-model="username"
            class="input"
            type="text"
            autocomplete="username"
            :placeholder="t('login.usernamePlaceholder')"
            :readonly="isCoarse"
            :disabled="busy"
            @click="focusField"
            @focus="focusField"
            @keydown="onKeydown"
          />
        </label>

        <p v-if="error" class="error">{{ error }}</p>

        <button class="submit" type="button" :disabled="busy" @click="submit">
          {{ busy ? t('login.working') : title }}
        </button>
      </div>
    </div>
    <CustomKeyboard
      v-if="isCoarse"
      :visible="activeField !== null"
      dismissible
      @keypress="onKeyboardInput"
      @dismiss="activeField = null"
    />
  </div>
</template>

<style scoped>
.login-screen {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #0c0c0c;
  color: #f2f2f2;
  font-family: 'Cascadia Code', 'Cascadia Mono', Menlo, Monaco, 'Courier New', monospace;
}

.login-scroll {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  display: flex;
  padding: 20px 0;
}

.login-box {
  width: 340px;
  max-width: calc(100vw - 32px);
  margin: auto;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 28px;
  border: 1px solid #4a4a4a;
  border-radius: 6px;
  background: #1a1a1a;
}

.title {
  margin: 0;
  font-size: 20px;
  font-weight: bold;
  color: #f2f2f2;
}

.subtitle {
  margin: 0;
  font-size: 13px;
  color: #9a9a9a;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.label {
  font-size: 12px;
  color: #bdbdbd;
}

.input {
  background: #222222;
  border: 1px solid #555;
  border-radius: 4px;
  color: #f2f2f2;
  font-family: inherit;
  font-size: 14px;
  padding: 8px 10px;
  outline: none;
}

.input:focus {
  border-color: #8a8a8a;
}

.error {
  margin: 0;
  font-size: 13px;
  color: #e74856;
}

.submit {
  margin-top: 6px;
  padding: 9px 0;
  background: #2c2c2c;
  border: 1px solid #5a5a5a;
  border-radius: 4px;
  color: #f2f2f2;
  font-family: inherit;
  font-size: 14px;
  cursor: pointer;
}

.submit:hover:not(:disabled) {
  background: #3a3a3a;
}

.submit:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
