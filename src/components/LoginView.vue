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
const password = ref('')
const error = ref('')
const busy = ref(false)
const activeField = ref<'username' | 'password' | null>(null)
const loginBox = ref<HTMLElement | null>(null)
const screenEl = ref<HTMLElement | null>(null)

function focusField(field: 'username' | 'password'): void {
  activeField.value = field
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
  if (!activeField.value) {
    return
  }
  const target = activeField.value === 'username' ? username : password
  if (key === '\u007f') {
    target.value = target.value.slice(0, -1)
    return
  }
  if (key === '\r') {
    if (activeField.value === 'password') {
      activeField.value = null
      void submit()
    } else {
      activeField.value = 'password'
    }
    return
  }
  target.value += key
}

async function submit(): Promise<void> {
  error.value = ''
  busy.value = true
  try {
    if (props.mode === 'register') {
      await register(username.value, password.value)
      emit('authenticated', username.value.trim())
    } else {
      const ok = await verify(username.value, password.value)
      if (ok) {
        emit('authenticated', username.value.trim())
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
            @click="focusField('username')"
            @focus="focusField('username')"
            @keydown="onKeydown"
          />
        </label>

        <label class="field">
          <span class="label">{{ t('login.password') }}</span>
          <input
            v-model="password"
            class="input"
            type="password"
            autocomplete="current-password"
            placeholder="••••••••"
            :readonly="isCoarse"
            :disabled="busy"
            @click="focusField('password')"
            @focus="focusField('password')"
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
  color: #fff;
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
  color: #fff;
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
