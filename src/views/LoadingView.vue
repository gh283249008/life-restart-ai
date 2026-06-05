<template>
  <div class="loading-screen">
    <img class="loading-screen-image" :src="loadingBackground" alt="" aria-hidden="true">
    <div class="loading-screen-mask"></div>
    <div class="loading-screen-content">
      <div class="loading-progress-track" aria-label="加载进度">
        <div class="loading-progress-fill" :style="loadingProgressStyle"></div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import loadingBackground from '../../.monkeycode-tmp-files/68aa6126-未标题-997781-12-1.webp'
import { runBootPreload, stopBootPreloadProgress } from '@/services/bootPreload'

const router = useRouter()
const progress = ref(0)
const MIN_LOADING_VISIBLE_MS = 900

const loadingProgressStyle = computed(() => ({
  width: `${Math.max(6, Math.round(progress.value * 100))}%`
}))

function handleProgress(value: number) {
  progress.value = value
}

function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms))
}

function waitForPaintFrame() {
  return new Promise<void>((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve())
    })
  })
}

onMounted(async () => {
  await nextTick()
  await waitForPaintFrame()
  progress.value = 0.08

  const preloadTask = runBootPreload(handleProgress).catch(() => undefined)
  await Promise.all([
    wait(MIN_LOADING_VISIBLE_MS),
    preloadTask
  ])

  progress.value = 1
  await wait(80)
  await router.replace('/lobby')
})

onUnmounted(() => {
  stopBootPreloadProgress(handleProgress)
})
</script>
