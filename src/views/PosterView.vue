<template>
  <section class="poster-screen" aria-label="分享海报">
    <PosterCanvas />
  </section>
</template>

<script setup lang="ts">
import PosterCanvas from '@/components/PosterCanvas.vue'
</script>

<style scoped>
.poster-screen {
  position: relative;
  width: 100%;
  min-height: 100%;
  height: auto;
  overflow: visible;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  background: #1f1411;
}
</style>
