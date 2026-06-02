<template>
  <button
    type="button"
    class="bgm-toggle"
    :aria-pressed="isBgmEnabled"
    :aria-label="isBgmEnabled ? '关闭背景音乐' : '开启背景音乐'"
    @click="handleToggle"
  >
    <span class="bgm-toggle-icon" aria-hidden="true">{{ isBgmEnabled ? 'BGM ON' : 'BGM OFF' }}</span>
  </button>
</template>

<script setup lang="ts">
import { useBgm } from '@/services/bgm'

const { isBgmEnabled, toggleBgm } = useBgm()

async function handleToggle() {
  await toggleBgm()
}
</script>
