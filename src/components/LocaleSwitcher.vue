<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { AppLocale } from '../i18n/types'
import { setLocale } from '../i18n'

const { t, locale } = useI18n()

const current = computed(() => locale.value as AppLocale)

function select(next: AppLocale): void {
  if (next === current.value) {
    return
  }
  setLocale(next)
}
</script>

<template>
  <div class="locale-switcher" role="group" :aria-label="t('locale.label')">
    <button
      type="button"
      class="locale-btn"
      :class="{ active: current === 'en' }"
      :aria-pressed="current === 'en'"
      @click="select('en')"
    >
      {{ t('locale.en') }}
    </button>
    <span class="sep" aria-hidden="true">/</span>
    <button
      type="button"
      class="locale-btn"
      :class="{ active: current === 'zh-CN' }"
      :aria-pressed="current === 'zh-CN'"
      @click="select('zh-CN')"
    >
      {{ t('locale.zhCN') }}
    </button>
  </div>
</template>

<style scoped>
.locale-switcher {
  position: fixed;
  top: max(10px, env(safe-area-inset-top));
  right: max(12px, env(safe-area-inset-right));
  z-index: 10000;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 9px;
  border: 1px solid #333338;
  border-radius: 4px;
  background: rgba(18, 18, 20, 0.82);
  backdrop-filter: blur(8px);
  font-family: 'Cascadia Code', 'Cascadia Mono', Menlo, Monaco, 'Courier New', monospace;
  pointer-events: auto;
  transition: border-color 0.15s ease, background 0.15s ease;
}

.locale-switcher:hover {
  border-color: #45454c;
  background: rgba(22, 22, 24, 0.9);
}

.locale-btn {
  margin: 0;
  padding: 2px 4px;
  border: none;
  background: transparent;
  color: #767676;
  font: inherit;
  font-size: 11px;
  letter-spacing: 0.06em;
  cursor: pointer;
}

.locale-btn.active {
  color: #16c60c;
}

.locale-btn:hover:not(.active) {
  color: #bdbdbd;
}

.sep {
  color: #4a4a4a;
  font-size: 11px;
  user-select: none;
}
</style>
