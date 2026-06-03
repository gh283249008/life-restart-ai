<template>
  <button
    type="button"
    class="bgm-toggle"
    :aria-pressed="isBgmEnabled"
    :aria-label="isBgmEnabled ? '关闭背景音乐' : '开启背景音乐'"
    @click="handleToggle"
  >
    <img
      class="bgm-toggle-image"
      :src="isBgmEnabled ? bgmOnImage : bgmOffImage"
      :alt="isBgmEnabled ? '背景音乐开启' : '背景音乐关闭'"
      aria-hidden="true"
    >
  </button>
</template>

<script setup lang="ts">
import bgmOffImage from '../../.monkeycode-tmp-files/9933248b-2-11-1.webp'
import bgmOnImage from '../../.monkeycode-tmp-files/71ae6483-1-11-2.webp'
import { useBgm } from '@/services/bgm'

const { isBgmEnabled, toggleBgm } = useBgm()

async function handleToggle() {
  await toggleBgm()
}
</script>
