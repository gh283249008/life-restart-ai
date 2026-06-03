<template>
  <div class="loading-screen" :style="loadingScreenStyle">
    <div class="loading-screen-mask"></div>
    <div class="loading-screen-content">
      <div class="loading-progress-wrap">
        <div class="loading-progress-track" aria-label="加载进度">
          <div class="loading-progress-fill" :style="loadingProgressStyle"></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import loadingBackground from '../../.monkeycode-tmp-files/68aa6126-未标题-997781-12-1.webp'
import { runBootPreload, stopBootPreloadProgress } from '@/services/bootPreload'

const router = useRouter()
const progress = ref(0)

const loadingScreenStyle = {
  backgroundImage: `url(${loadingBackground})`
}

const loadingProgressStyle = computed(() => ({
  width: `${Math.max(6, Math.round(progress.value * 100))}%`
}))

function handleProgress(value: number) {
  progress.value = value
}

onMounted(async () => {
  await runBootPreload(handleProgress)
  await router.replace('/lobby')
})

onUnmounted(() => {
  stopBootPreloadProgress(handleProgress)
})
</script>
