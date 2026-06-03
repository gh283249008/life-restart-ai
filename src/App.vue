<template>
  <div
    id="app"
    class="min-h-screen"
    @click.capture="handleGlobalClick"
    @keydown.capture="handleGlobalKeydown"
  >
    <main class="phone-stage">
      <BgmToggle />
      <router-view />
    </main>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import BgmToggle from '@/components/BgmToggle.vue'
import { playButtonSfx, warmupButtonSfx } from '@/services/uiSfx'

function handleGlobalClick(event: MouseEvent) {
  const interactive = getInteractiveTarget(event.target)
  if (!interactive || isDisabledInteractive(interactive)) return
  playButtonSfx()
}

function handleGlobalKeydown(event: KeyboardEvent) {
  if (event.repeat) return
  if (event.key !== 'Enter' && event.key !== ' ') return

  const interactive = getInteractiveTarget(event.target)
  if (!interactive || isDisabledInteractive(interactive)) return
  playButtonSfx()
}

function getInteractiveTarget(target: EventTarget | null) {
  if (!(target instanceof Element)) return null
  return target.closest('button, [role="button"], a, [data-button-sfx]')
}

function isDisabledInteractive(element: Element) {
  if (element instanceof HTMLButtonElement) return element.disabled
  return element.getAttribute('aria-disabled') === 'true'
}

onMounted(() => {
  warmupButtonSfx()
})
</script>
