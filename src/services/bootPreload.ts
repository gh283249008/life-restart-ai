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
import scamInternalTicketImage from '../../.monkeycode-tmp-files/05d317e1-未标题-1-01(1)-1.webp'
import scamFakePaymentImage from '../../.monkeycode-tmp-files/67ab8e05-未标题-4-01-1.webp'
import scamFakeChatRecordImage from '../../.monkeycode-tmp-files/fff34ff0-未标题-3-01(1)-2.webp'
import scamFakeCredentialImage from '../../.monkeycode-tmp-files/fe9b0a65-未标题-3-01(1)-1.webp'
import resultBackgroundImage from '../../.monkeycode-tmp-files/8612a3e0-底图-07(2)-1.webp'
import resultSportsStickerImage from '../../.monkeycode-tmp-files/d4641f41-体育赛事贴纸-50dpi.webp'
import resultSuccessStickerImage from '../../.monkeycode-tmp-files/11930f20-成功-16(1)-1.webp'
import resultFailureStickerImage from '../../.monkeycode-tmp-files/c513f57e-失败-16(1)-2.webp'
import lobbyBackgroundImage from '../../.monkeycode-tmp-files/a8653301-底图50dpi-12-1.webp'
import followSafeShuButtonImage from '../../.monkeycode-tmp-files/0c6936ab-关注安全薯-1.svg'
import startGameButtonImage from '../../.monkeycode-tmp-files/c8908c74-未标题-997781(2)-1.svg'
import startGameButtonDisabledImage from '../../.monkeycode-tmp-files/8652a2d7-灰色-2.svg'
import fingerCursorImage from '../../.monkeycode-tmp-files/5202eb90-小手-1.svg'
import playerAvatarImage from '../../.monkeycode-tmp-files/7c5e7595-小人头-1.svg'
import scammerAvatarImage from '../../.monkeycode-tmp-files/aec773bc-瓜头-2.svg'

const BGM_SRC = '/.monkeycode-tmp-files/6e43e86b-BGM_loop-1.ogg'
const BUTTON_SFX_SRC = '/.monkeycode-tmp-files/6ef1c983-按钮 跳动 点击_爱给网_aigei_com-1.mp3'
const BUBBLE_SFX_SRC = '/.monkeycode-tmp-files/3f5236ec-按钮 跳动 点击_爱给网_aigei_com-1.mp3'
const INTERNAL_TICKET_IMAGE_URL = scamInternalTicketImage
const FAKE_PAYMENT_IMAGE_URL = scamFakePaymentImage
const FAKE_CHAT_RECORD_IMAGE_URL = scamFakeChatRecordImage
const FAKE_CREDENTIAL_IMAGE_URL = scamFakeCredentialImage
const BOOT_PRELOAD_CACHE = 'boot-preload-v2'

const preloadImageAssets = [
  lobbyBackgroundImage,
  resultBackgroundImage,
  resultSportsStickerImage,
  resultSuccessStickerImage,
  resultFailureStickerImage,
  followSafeShuButtonImage,
  startGameButtonImage,
  startGameButtonDisabledImage,
  fingerCursorImage,
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
  FAKE_PAYMENT_IMAGE_URL,
  FAKE_CHAT_RECORD_IMAGE_URL,
  FAKE_CREDENTIAL_IMAGE_URL
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

async function cacheResponse(src: string, response: Response) {
  if (typeof window === 'undefined' || !('caches' in window)) return
  try {
    const cache = await caches.open(BOOT_PRELOAD_CACHE)
    await cache.put(src, response)
  } catch {
    // ignore cache storage failures
  }
}

async function fetchAsset(src: string) {
  const response = await fetch(src, {
    cache: 'force-cache',
    credentials: 'same-origin'
  })
  if (!response.ok) {
    throw new Error(`Failed to preload asset: ${src}`)
  }
  await cacheResponse(src, response.clone())
  return response.blob()
}

function preloadImageFromBlob(blob: Blob) {
  return new Promise<void>((resolve) => {
    const objectUrl = URL.createObjectURL(blob)
    const img = new Image()
    img.decoding = 'async'
    const cleanup = () => {
      URL.revokeObjectURL(objectUrl)
    }
    img.onload = () => {
      cleanup()
      resolve()
    }
    img.onerror = () => {
      cleanup()
      resolve()
    }
    img.src = objectUrl
  })
}

function preloadAudioFromBlob(blob: Blob) {
  return new Promise<void>((resolve) => {
    const objectUrl = URL.createObjectURL(blob)
    const audio = new Audio()
    const cleanup = () => {
      URL.revokeObjectURL(objectUrl)
      audio.removeEventListener('canplaythrough', handleDone)
      audio.removeEventListener('loadeddata', handleDone)
      audio.removeEventListener('error', handleDone)
    }
    const handleDone = () => {
      cleanup()
      resolve()
    }
    audio.preload = 'auto'
    audio.src = objectUrl
    audio.addEventListener('canplaythrough', handleDone, { once: true })
    audio.addEventListener('loadeddata', handleDone, { once: true })
    audio.addEventListener('error', handleDone, { once: true })
    audio.load()
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
  return fetchAsset(src).then((blob) => preloadAudioFromBlob(blob))
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
    ...preloadImageAssets.map((src) => async () => {
      const blob = await fetchAsset(src)
      await preloadImageFromBlob(blob)
    }),
    () => preloadAudio(BGM_SRC),
    () => preloadAudio(BUTTON_SFX_SRC),
    () => preloadAudio(BUBBLE_SFX_SRC),
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
