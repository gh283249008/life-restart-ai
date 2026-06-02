<template>
  <div id="app" class="min-h-screen">
    <main class="phone-stage">
      <BgmToggle />
      <router-view />
    </main>
  </div>
</template>

<script setup lang="ts">
import BgmToggle from '@/components/BgmToggle.vue'
</script>
