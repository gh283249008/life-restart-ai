const BUTTON_SFX_SRC = '/.monkeycode-tmp-files/6ef1c983-按钮 跳动 点击_爱给网_aigei_com-1.mp3'
const BUBBLE_SFX_SRC = '/.monkeycode-tmp-files/3f5236ec-按钮 跳动 点击_爱给网_aigei_com-1.mp3'

let audioPool: HTMLAudioElement[] = []
let bubbleAudioPool: HTMLAudioElement[] = []
let warmedUp = false

function ensurePool() {
  if (typeof window === 'undefined') return []
  if (audioPool.length > 0) return audioPool

  audioPool = Array.from({ length: 4 }, () => {
    const audio = new Audio(BUTTON_SFX_SRC)
    audio.preload = 'auto'
    return audio
  })

  return audioPool
}

function ensureBubblePool() {
  if (typeof window === 'undefined') return []
  if (bubbleAudioPool.length > 0) return bubbleAudioPool

  bubbleAudioPool = Array.from({ length: 4 }, () => {
    const audio = new Audio(BUBBLE_SFX_SRC)
    audio.preload = 'auto'
    return audio
  })

  return bubbleAudioPool
}

export function warmupButtonSfx() {
  if (warmedUp || typeof window === 'undefined') return
  warmedUp = true
  const pool = ensurePool()
  for (const audio of pool) {
    audio.load()
  }
  const bubblePool = ensureBubblePool()
  for (const audio of bubblePool) {
    audio.load()
  }
}

export function playButtonSfx() {
  const pool = ensurePool()
  const target = pool.find((audio) => audio.paused || audio.ended) || pool[0]
  if (!target) return

  try {
    target.currentTime = 0
    void target.play()
  } catch {
    // ignore playback rejection
  }
}

export function playBubbleSfx() {
  const pool = ensureBubblePool()
  const target = pool.find((audio) => audio.paused || audio.ended) || pool[0]
  if (!target) return

  try {
    target.currentTime = 0
    void target.play()
  } catch {
    // ignore playback rejection
  }
}
