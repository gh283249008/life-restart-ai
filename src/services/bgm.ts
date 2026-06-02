import { computed, ref } from 'vue'

const BGM_ENABLED_KEY = 'bgm_enabled'
const BGM_SRC = '/BGM_loop.wav'

const isEnabled = ref(localStorage.getItem(BGM_ENABLED_KEY) !== '0')

let audio: HTMLAudioElement | null = null
let bootstrapped = false

function ensureAudio() {
  if (typeof window === 'undefined') return null
  if (audio) return audio
  audio = new Audio(BGM_SRC)
  audio.loop = true
  audio.preload = 'auto'
  return audio
}

async function syncPlayback() {
  const target = ensureAudio()
  if (!target) return
  if (isEnabled.value) {
    try {
      await target.play()
    } catch {
      // wait for user gesture
    }
    return
  }
  target.pause()
}

export function initBgm() {
  if (bootstrapped || typeof window === 'undefined') return
  bootstrapped = true
  const resume = async () => {
    await syncPlayback()
    if (audio && !audio.paused) {
      window.removeEventListener('pointerdown', resume)
      window.removeEventListener('keydown', resume)
    }
  }
  window.addEventListener('pointerdown', resume)
  window.addEventListener('keydown', resume)
  void syncPlayback()
}

export async function toggleBgm() {
  isEnabled.value = !isEnabled.value
  localStorage.setItem(BGM_ENABLED_KEY, isEnabled.value ? '1' : '0')
  await syncPlayback()
}

export function useBgm() {
  return {
    isBgmEnabled: computed(() => isEnabled.value),
    toggleBgm
  }
}
