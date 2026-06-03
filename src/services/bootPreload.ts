import choicePanelBoard from '../../.monkeycode-tmp-files/288c1108-未标题-997781-09-1.webp'
import choiceButtonAImage from '../../.monkeycode-tmp-files/746701c8-1-10-1.webp'
import choiceButtonBImage from '../../.monkeycode-tmp-files/084072b5-2-10-2.webp'
import choiceButtonCImage from '../../.monkeycode-tmp-files/cd690f81-3-10-3.webp'
import choiceButtonDImage from '../../.monkeycode-tmp-files/f0536ad9-4-10-1.webp'
import gamePageBackground from '../../.monkeycode-tmp-files/4ee61b88-底图-07-1.webp'
import gamePageOverlay from '../../.monkeycode-tmp-files/88f16943-顶-1.svg'
import introModalBackground from '../../.monkeycode-tmp-files/bde8039f-底图-改-1.png'
import introCopyImage from '../../.monkeycode-tmp-files/c293db87-未标题、-1.svg'
import introRuleImage from '../../.monkeycode-tmp-files/07da2bf2-玩法(2)-1.svg'
import introScoreImage from '../../.monkeycode-tmp-files/5d1ec481-记分-1.svg'
import introTipsImage from '../../.monkeycode-tmp-files/eded9ce0-小贴士(1)-2.svg'
import introButtonPendingImage from '../../.monkeycode-tmp-files/7bf2b27d-微信图片_20260602132054_1218_393-1.png'
import introButtonReadyImage from '../../.monkeycode-tmp-files/28b89bf9-微信图片_20260602131542_1217_393-2.png'
import playerAvatarImage from '../../.monkeycode-tmp-files/7c5e7595-小人头-1.svg'
import scammerAvatarImage from '../../.monkeycode-tmp-files/aec773bc-瓜头-2.svg'

const BGM_SRC = '/.monkeycode-tmp-files/6e43e86b-BGM_loop-1.ogg'
const INTERNAL_TICKET_IMAGE_URL = '/images/scam-internal-ticket.jpg'
const FAKE_PAYMENT_IMAGE_URL = '/images/scam-fake-payment.jpg'

const preloadImageAssets = [
  introModalBackground,
  introCopyImage,
  introRuleImage,
  introScoreImage,
  introTipsImage,
  introButtonPendingImage,
  introButtonReadyImage,
  gamePageBackground,
  gamePageOverlay,
  choicePanelBoard,
  choiceButtonAImage,
  choiceButtonBImage,
  choiceButtonCImage,
  choiceButtonDImage,
  playerAvatarImage,
  scammerAvatarImage,
  INTERNAL_TICKET_IMAGE_URL,
  FAKE_PAYMENT_IMAGE_URL
]

type ProgressListener = (progress: number) => void

let bootPreloadPromise: Promise<void> | null = null
let bootPreloadFinished = false
let bootPreloadProgress = 0
const listeners = new Set<ProgressListener>()

function emitProgress(progress: number) {
  bootPreloadProgress = progress
  for (const listener of listeners) {
    listener(progress)
  }
}

function preloadImage(src: string) {
  return new Promise<void>((resolve) => {
    const img = new Image()
    img.decoding = 'async'
    img.onload = () => resolve()
    img.onerror = () => resolve()
    img.src = src
  })
}

function withTimeout(task: Promise<void>, timeoutMs: number) {
  return Promise.race([
    task,
    new Promise<void>((resolve) => {
      window.setTimeout(resolve, timeoutMs)
    })
  ])
}

function preloadAudio(src: string) {
  return new Promise<void>((resolve) => {
    const audio = new Audio()
    const cleanup = () => {
      audio.removeEventListener('canplaythrough', handleDone)
      audio.removeEventListener('loadeddata', handleDone)
      audio.removeEventListener('error', handleDone)
    }
    const handleDone = () => {
      cleanup()
      resolve()
    }
    audio.preload = 'auto'
    audio.src = src
    audio.addEventListener('canplaythrough', handleDone, { once: true })
    audio.addEventListener('loadeddata', handleDone, { once: true })
    audio.addEventListener('error', handleDone, { once: true })
    audio.load()
  })
}

function waitForFontsReady(timeoutMs = 2500) {
  if (typeof document === 'undefined' || !(document as Document & { fonts?: FontFaceSet }).fonts) {
    return Promise.resolve()
  }
  const fonts = (document as Document & { fonts?: FontFaceSet }).fonts
  if (!fonts) return Promise.resolve()
  return Promise.race([
    fonts.ready.then(() => undefined),
    new Promise<void>((resolve) => {
      window.setTimeout(resolve, timeoutMs)
    })
  ])
}

async function executeBootPreload() {
  const tasks: Array<() => Promise<void>> = [
    ...preloadImageAssets.map((src) => () => preloadImage(src)),
    () => preloadAudio(BGM_SRC),
    () => waitForFontsReady()
  ]

  const total = tasks.length
  let doneCount = 0
  emitProgress(0)

  await Promise.all(
    tasks.map(async (task) => {
      await withTimeout(task(), 2200)
      doneCount += 1
      emitProgress(doneCount / total)
    })
  )

  bootPreloadFinished = true
}

export function runBootPreload(onProgress?: ProgressListener) {
  if (onProgress) {
    listeners.add(onProgress)
    onProgress(bootPreloadProgress)
  }

  if (bootPreloadFinished) {
    emitProgress(1)
    return Promise.resolve()
  }

  if (!bootPreloadPromise) {
    bootPreloadPromise = executeBootPreload().finally(() => {
      emitProgress(1)
    })
  }

  return bootPreloadPromise
}

export function stopBootPreloadProgress(onProgress: ProgressListener) {
  listeners.delete(onProgress)
}

export function isBootPreloadReady() {
  return bootPreloadFinished
}
