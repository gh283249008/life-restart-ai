<template>
  <section ref="resultScreenRef" class="result-screen" :style="resultStageVars">
    <div ref="resultCaptureRef" class="result-capture-surface">
      <img class="result-screen-image" :src="resultBackgroundImage" alt="结算页背景图" />

      <div class="result-screen-content">
        <div class="result-board-layer" aria-hidden="true">
          <img class="result-board result-board-14" :src="resultBoard14Image" alt="" />
          <img class="result-board result-board-16" :src="resultBoard16Image" alt="" />
          <img class="result-board result-board-15" :src="resultBoard15Image" alt="" />
        </div>

        <div v-if="resultInsightTip" class="result-board-content-layer">
          <div v-if="resultOutcomeStickerImage" class="result-board-content result-board-content-14">
            <div class="result-outcome-summary">
              <img
                class="result-outcome-sticker"
                :class="{ 'result-outcome-sticker-success': isSuccessOutcome }"
                :src="resultOutcomeStickerImage"
                alt=""
              />
              <div class="result-outcome-copy">
                <p class="result-outcome-scene">{{ resultScenarioTitle }}</p>
                <p class="result-outcome-finish">调查完毕！</p>
              </div>
            </div>
          </div>

          <div v-if="resultVillainCard" class="result-board-content result-board-content-16">
            <p class="result-villain-card-name">{{ resultVillainCard.name }}</p>
            <p class="result-villain-card-desc">{{ resultVillainCard.desc }}</p>
            <p v-if="snapshot?.finalReport?.playerSummary" class="result-villain-card-player">玩家总结：{{ snapshot.finalReport.playerSummary }}</p>
            <p v-if="resultScammerSummary" class="result-villain-card-ai">{{ resultScammerSummary }}</p>
          </div>

          <div class="result-board-content result-board-content-15">
            <p class="result-board-tip">{{ resultInsightTip }}</p>
          </div>
        </div>

        <div v-if="resultSportsStickerVisible" class="result-sticker-layer result-sticker-layer-excluded">
          <button
            type="button"
            class="result-sticker-hitbox"
            :class="{ 'is-boing': resultStickerBoing }"
            @click="triggerResultStickerBoing"
            aria-label="体育赛事贴纸"
          >
            <img class="result-sticker result-sticker-sports" :src="resultSportsStickerImage" alt="" />
            <span v-if="resultStickerFeedbackVisible" class="result-sticker-feedback">woo~</span>
          </button>
        </div>
      </div>
    </div>

    <div class="result-screen-content">
      <div class="result-board-layer" aria-hidden="true">
        <img class="result-board result-board-14" :src="resultBoard14Image" alt="" />
        <img class="result-board result-board-16" :src="resultBoard16Image" alt="" />
        <img class="result-board result-board-15" :src="resultBoard15Image" alt="" />
      </div>

      <div v-if="resultInsightTip" class="result-board-content-layer">
        <div v-if="resultOutcomeStickerImage" class="result-board-content result-board-content-14">
          <div class="result-outcome-summary">
            <img
              class="result-outcome-sticker"
              :class="{ 'result-outcome-sticker-success': isSuccessOutcome }"
              :src="resultOutcomeStickerImage"
              alt=""
            />
            <div class="result-outcome-copy">
              <p class="result-outcome-scene">{{ resultScenarioTitle }}</p>
              <p class="result-outcome-finish">调查完毕！</p>
            </div>
          </div>
        </div>

        <div v-if="resultVillainCard" class="result-board-content result-board-content-16">
          <p class="result-villain-card-name">{{ resultVillainCard.name }}</p>
          <p class="result-villain-card-desc">{{ resultVillainCard.desc }}</p>
          <p v-if="snapshot?.finalReport?.playerSummary" class="result-villain-card-player">玩家总结：{{ snapshot.finalReport.playerSummary }}</p>
          <p v-if="resultScammerSummary" class="result-villain-card-ai">{{ resultScammerSummary }}</p>
        </div>

        <div class="result-board-content result-board-content-15">
          <p class="result-board-tip">{{ resultInsightTip }}</p>
        </div>
      </div>

      <div v-if="resultSportsStickerVisible" class="result-sticker-layer">
        <button
          type="button"
          class="result-sticker-hitbox"
          :class="{ 'is-boing': resultStickerBoing }"
          @click="triggerResultStickerBoing"
          aria-label="体育赛事贴纸"
        >
          <img class="result-sticker result-sticker-sports" :src="resultSportsStickerImage" alt="" />
          <span v-if="resultStickerFeedbackVisible" class="result-sticker-feedback">woo~</span>
        </button>
      </div>

      <div class="result-actions">
        <button class="result-action-button result-action-share" @click="handleGeneratePoster" aria-label="生成分享海报">
          <img class="result-action-image" :src="resultShareButtonImage" alt="生成分享海报" />
        </button>
        <p v-if="resultActionTip" class="result-action-tip">{{ resultActionTip }}</p>
      </div>
    </div>

    <div v-if="resultPosterPreviewUrl" class="result-poster-modal" @click.self="closePosterPreview">
      <div class="result-poster-shell">
        <div class="result-poster-dialog">
          <button type="button" class="result-poster-close" @click="closePosterPreview" aria-label="关闭预览">×</button>
          <img class="result-poster-preview-image" :src="resultPosterPreviewUrl" alt="结算页分享海报预览" />
        </div>
        <button type="button" class="result-poster-share-button" @click="shareToXiaohongshu" aria-label="分享到小红书">
          <img class="result-poster-share-image" :src="resultShareToXhsButtonImage" alt="分享到小红书" />
        </button>
        <p v-if="posterShareTip" class="result-poster-share-tip">{{ posterShareTip }}</p>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { loadGameResultSnapshot } from '@/services/gameSessionStore'
import resultBackgroundImage from '../../.monkeycode-tmp-files/8612a3e0-底图-07(2)-1.webp'
import resultBoard16Image from '../../.monkeycode-tmp-files/8f2caddf-板子-16-1.webp'
import resultBoard15Image from '../../.monkeycode-tmp-files/b13d1ff4-板子-15(1)-2.webp'
import resultBoard14Image from '../../.monkeycode-tmp-files/caa5ba8a-板子-14-3.webp'
import resultShareButtonImage from '../../.monkeycode-tmp-files/88bd230f-分享按钮-17(1)-1.webp'
import resultSportsStickerImage from '../../.monkeycode-tmp-files/d4641f41-体育赛事贴纸-50dpi.webp'
import resultSuccessStickerImage from '../../.monkeycode-tmp-files/11930f20-成功-16(1)-1.webp'
import resultFailureStickerImage from '../../.monkeycode-tmp-files/c513f57e-失败-16(1)-2.webp'
import resultShareToXhsButtonImage from '../../.monkeycode-tmp-files/55a9c3f8-分享到小红书-1.png'

const RESULT_BG_WIDTH = 2223
const RESULT_BG_HEIGHT = 1955.75
const snapshot = loadGameResultSnapshot()

const SCENARIO_RESULT_TIP_MAP: Record<string, string> = {
  star_concert: '明星演唱会票务里，所谓“内部票、员工票、关系票”往往就是引你脱离平台私聊转账的第一步。',
  music_festival: '音乐节套票最怕“先付定金帮你锁票”，真交易走平台，假骗子才一直催你先打钱。',
  school_show: '校园拼团票最容易被“熟人氛围”麻痹，越是群里统一收款，越要先核身份、核渠道。',
  last_minute: '开场前捡漏最常见的坑就是拿“最后一张”施压，越急越要先验真，别被倒计时带着走。',
  fan_group: '粉丝群代抢一旦开始要账号、验证码、登录信息，本质就已经从买票变成骗号了。',
  overseas_show: '海外场次代购最爱加收“税费、清关费、手续费”，凡是层层补款的基本都要提高警惕。',
  sports_event: '热门赛事票源越紧张，越要坚持平台验真；敢让你私下先款后票的，多半就是赌你着急。',
  scalper_ticket: '黄牛口中的“保真票源”没有平台担保就没有可信度，越强调稳，越要看验真链路。',
  fake_platform: '仿冒票务平台最危险的点不是票，而是账号和支付信息；入口不对，后面每一步都不对。',
  refund_scam: '退票诈骗最爱借“客服流程”要验证码或开屏幕共享，正规退款不会让你把安全权限交出去。'
}

const SCENARIO_VILLAIN_CARD_MAP: Record<string, { name: string; desc: string }> = {
  star_concert: { name: '假票瓜', desc: '票是P的，码是假的，人是跑路的。' },
  music_festival: { name: '缩水瓜', desc: '三天通票变单日，比泡面包装还能缩。' },
  school_show: { name: '拼单瓜', desc: '群里喊拼单，最后只有群主拼到了钱。' },
  last_minute: { name: '捡漏瓜', desc: '你以为是捡漏，其实是捡了个坑。' },
  fan_group: { name: '代抢瓜', desc: '帮你抢票是假，帮你花钱是真。' },
  overseas_show: { name: '海淘瓜', desc: '“我在海外帮你买”，IP一查在隔壁县。' },
  sports_event: { name: '假赛瓜', desc: '赛事还没官宣，他的票已经印好了。' },
  scalper_ticket: { name: '黄牛瓜', desc: '加价三倍，检票口一照——无效。' },
  fake_platform: { name: '山寨瓜', desc: '网页和官方一模一样，除了收款人。' },
  refund_scam: { name: '连环瓜', desc: '票没了，手续费也没了，人也没了。' },
  world_cup: { name: '赌球瓜', desc: '票没买到，倒先输了一套房。' }
}

const resultScreenRef = ref<HTMLElement | null>(null)
const resultCaptureRef = ref<HTMLElement | null>(null)
const resultStageVars = ref<Record<string, string>>({
  '--result-bg-left': '0px',
  '--result-bg-top': '0px',
  '--result-bg-width': '100%',
  '--result-bg-height': '100%',
  '--result-board-offset-x': '0px'
})

let resultResizeObserver: ResizeObserver | null = null
const resultSportsStickerVisible = snapshot?.theme?.id === 'sports_event'
const resultStickerBoing = ref(false)
const resultStickerFeedbackVisible = ref(false)
const resultPosterPreviewUrl = ref('')
const resultPosterFile = ref<File | null>(null)
const posterShareTip = ref('')
const resultActionTip = ref('')
let resultStickerBoingTimer = 0
let resultStickerFeedbackTimer = 0
let posterShareTimer = 0
const XHS_PUBLISH_DEEPLINK =
  'xhsdiscover://post_new_note?page=photo_publish&attach=%7B%22topics%22%3A%5B%7B%22page_id%22%3A%22695a6dae0017000000000002%22%7D%5D%7D&config=%7B%7D'

const resultInsightTip =
  (snapshot?.theme?.id && SCENARIO_RESULT_TIP_MAP[snapshot.theme.id]) ||
  snapshot?.finalReport?.tips?.[0] ||
  ''

const resultVillainCard =
  (snapshot?.theme?.id && SCENARIO_VILLAIN_CARD_MAP[snapshot.theme.id]) ||
  null

const resultOutcomeStickerImage =
  snapshot?.finalReport?.result === '认输了' ? resultSuccessStickerImage : resultFailureStickerImage

const isSuccessOutcome = snapshot?.finalReport?.result === '认输了'

const resultScenarioTitle = snapshot?.theme?.name || '本局情景'

function limitTextLength(text: string, maxLength: number) {
  return Array.from(text || '').slice(0, maxLength).join('')
}

const resultScammerSummary = limitTextLength(snapshot?.finalReport?.scammerSummary || '', 40)

function updateResultStageVars() {
  const node = resultScreenRef.value
  if (!node) return

  const width = node.clientWidth
  const height = node.clientHeight
  if (!width || !height) return

  const scale = Math.max(width / RESULT_BG_WIDTH, height / RESULT_BG_HEIGHT)
  const renderedWidth = RESULT_BG_WIDTH * scale
  const renderedHeight = RESULT_BG_HEIGHT * scale
  const offsetX = (width - renderedWidth) / 2

  resultStageVars.value = {
    '--result-bg-left': `${offsetX}px`,
    '--result-bg-top': '0px',
    '--result-bg-width': `${renderedWidth}px`,
    '--result-bg-height': `${renderedHeight}px`,
    '--result-board-offset-x': `${renderedWidth * 0.25}px`
  }
}

onMounted(async () => {
  await nextTick()
  updateResultStageVars()

  if (typeof ResizeObserver !== 'undefined') {
    resultResizeObserver = new ResizeObserver(() => {
      updateResultStageVars()
    })
    if (resultScreenRef.value) {
      resultResizeObserver.observe(resultScreenRef.value)
    }
  }

  window.addEventListener('resize', updateResultStageVars)
})

onBeforeUnmount(() => {
  resultResizeObserver?.disconnect()
  resultResizeObserver = null
  window.removeEventListener('resize', updateResultStageVars)
  window.clearTimeout(resultStickerBoingTimer)
  window.clearTimeout(resultStickerFeedbackTimer)
  window.clearTimeout(posterShareTimer)
  if (resultPosterPreviewUrl.value) {
    URL.revokeObjectURL(resultPosterPreviewUrl.value)
  }
  resultPosterFile.value = null
})

function triggerResultStickerBoing() {
  resultStickerBoing.value = false
  resultStickerFeedbackVisible.value = true
  window.clearTimeout(resultStickerBoingTimer)
  window.clearTimeout(resultStickerFeedbackTimer)

  requestAnimationFrame(() => {
    resultStickerBoing.value = true
  })

  resultStickerBoingTimer = window.setTimeout(() => {
    resultStickerBoing.value = false
  }, 460)

  resultStickerFeedbackTimer = window.setTimeout(() => {
    resultStickerFeedbackVisible.value = false
  }, 1100)
}

async function handleGeneratePoster() {
  const node = resultCaptureRef.value
  if (!node) {
    resultActionTip.value = '未找到可截图区域，请重试。'
    return
  }

  resultActionTip.value = '正在生成图片...'

  try {
    const imageBlob = await captureNodeAsPng(node)
    if (!imageBlob) {
      resultActionTip.value = '生成图片失败，请重试。'
      return
    }

    if (resultPosterPreviewUrl.value) {
      URL.revokeObjectURL(resultPosterPreviewUrl.value)
    }

    const objectUrl = URL.createObjectURL(imageBlob)
    resultPosterFile.value = new File([imageBlob], `票务反诈结算页-${Date.now()}.png`, { type: 'image/png' })
    resultPosterPreviewUrl.value = objectUrl
    const savedToAlbum = await trySavePosterToAlbum()
    if (savedToAlbum) {
      resultActionTip.value = '已打开系统分享面板，请保存到相册。'
    } else {
      autoDownloadPoster(objectUrl)
      resultActionTip.value = '已生成图片，请长按预览图保存到相册。'
    }
  } catch (error) {
    resultActionTip.value = error instanceof Error ? `生成图片失败：${error.message}` : '生成图片失败，请重试。'
  }
}

function autoDownloadPoster(url: string) {
  const link = document.createElement('a')
  link.href = url
  link.download = `票务反诈结算页-${Date.now()}.png`
  document.body.appendChild(link)
  link.click()
  link.remove()
}

async function trySavePosterToAlbum() {
  const posterFile = resultPosterFile.value
  if (!posterFile) return false

  if (typeof navigator === 'undefined' || typeof navigator.share !== 'function') {
    return false
  }

  try {
    if (typeof navigator.canShare === 'function' && !navigator.canShare({ files: [posterFile] })) {
      return false
    }

    await navigator.share({
      files: [posterFile],
      title: '票务反诈结算页',
      text: '保存这张图片到相册'
    })
    return true
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      return false
    }
    return false
  }
}

async function captureNodeAsPng(sourceNode: HTMLElement) {
  const width = sourceNode.clientWidth
  const height = sourceNode.clientHeight
  if (!width || !height) {
    throw new Error('截图区域尺寸异常')
  }

  if ('fonts' in document) {
    await document.fonts.ready
  }

  const canvas = document.createElement('canvas')
  const exportScale = Math.min(window.devicePixelRatio || 1, 2)
  canvas.width = Math.round(width * exportScale)
  canvas.height = Math.round(height * exportScale)
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new Error('画布初始化失败')
  }

  ctx.setTransform(exportScale, 0, 0, exportScale, 0, 0)
  ctx.clearRect(0, 0, width, height)

  const rootRect = sourceNode.getBoundingClientRect()
  const images = Array.from(sourceNode.querySelectorAll('img'))
  for (const image of images) {
    await ensureImageReady(image)
    drawImageElement(ctx, image, rootRect)
  }

  const texts = Array.from(sourceNode.querySelectorAll('p'))
  for (const textNode of texts) {
    drawTextElement(ctx, textNode, rootRect)
  }

  return await new Promise<Blob | null>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('PNG 导出失败'))
        return
      }
      resolve(blob)
    }, 'image/png', 1)
  })
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    image.crossOrigin = 'anonymous'
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('图片生成失败'))
    image.src = src
  })
}

async function ensureImageReady(image: HTMLImageElement) {
  if (image.complete && image.naturalWidth > 0) {
    if ('decode' in image) {
      try {
        await image.decode()
      } catch {
      }
    }
    return
  }

  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve()
    image.onerror = () => reject(new Error('图片资源加载失败'))
  })
}

function drawImageElement(ctx: CanvasRenderingContext2D, image: HTMLImageElement, rootRect: DOMRect) {
  const rect = image.getBoundingClientRect()
  if (!rect.width || !rect.height) return

  const x = rect.left - rootRect.left
  const y = rect.top - rootRect.top
  const computed = window.getComputedStyle(image)
  const transform = computed.transform

  if (!transform || transform === 'none') {
    ctx.drawImage(image, x, y, rect.width, rect.height)
    return
  }

  const origin = parseTransformOrigin(computed.transformOrigin, rect.width, rect.height)
  const matrix = new DOMMatrixReadOnly(transform)

  ctx.save()
  ctx.translate(x + origin.x, y + origin.y)
  ctx.transform(matrix.a, matrix.b, matrix.c, matrix.d, matrix.e, matrix.f)
  ctx.drawImage(image, -origin.x, -origin.y, rect.width, rect.height)
  ctx.restore()
}

function drawTextElement(ctx: CanvasRenderingContext2D, element: HTMLElement, rootRect: DOMRect) {
  const text = element.textContent?.trim()
  if (!text) return

  const rect = element.getBoundingClientRect()
  if (!rect.width || !rect.height) return

  const computed = window.getComputedStyle(element)
  const x = rect.left - rootRect.left
  const y = rect.top - rootRect.top
  const fontSize = parseFloat(computed.fontSize) || 14
  const lineHeight = parseCssLength(computed.lineHeight, fontSize * 1.2)
  const letterSpacing = parseCssLength(computed.letterSpacing, 0)
  const maxLines = Math.max(1, Math.round(rect.height / lineHeight))

  ctx.save()
  ctx.font = buildCanvasFont(computed)
  ctx.fillStyle = computed.color
  ctx.textBaseline = 'top'
  ctx.textAlign = 'left'

  const lines = wrapTextByWidth(ctx, text, rect.width, letterSpacing)
  const outputLines = lines.slice(0, maxLines)

  outputLines.forEach((line, index) => {
    drawTextLine(ctx, line, x, y + index * lineHeight, letterSpacing)
  })

  ctx.restore()
}

function buildCanvasFont(computed: CSSStyleDeclaration) {
  const fontStyle = computed.fontStyle || 'normal'
  const fontVariant = computed.fontVariant || 'normal'
  const fontWeight = computed.fontWeight || '400'
  const fontSize = computed.fontSize || '14px'
  const fontFamily = computed.fontFamily || 'sans-serif'
  return `${fontStyle} ${fontVariant} ${fontWeight} ${fontSize} ${fontFamily}`
}

function wrapTextByWidth(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, letterSpacing: number) {
  const chars = Array.from(text)
  const lines: string[] = []
  let current = ''

  for (const char of chars) {
    const candidate = current + char
    if (current && measureTextWidth(ctx, candidate, letterSpacing) > maxWidth) {
      lines.push(current)
      current = char
      continue
    }
    current = candidate
  }

  if (current) {
    lines.push(current)
  }

  return lines
}

function drawTextLine(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, letterSpacing: number) {
  if (!letterSpacing) {
    ctx.fillText(text, x, y)
    return
  }

  let cursor = x
  for (const char of Array.from(text)) {
    ctx.fillText(char, cursor, y)
    cursor += ctx.measureText(char).width + letterSpacing
  }
}

function measureTextWidth(ctx: CanvasRenderingContext2D, text: string, letterSpacing: number) {
  if (!text) return 0
  const baseWidth = ctx.measureText(text).width
  return baseWidth + Math.max(0, text.length - 1) * letterSpacing
}

function parseCssLength(value: string, fallback: number) {
  if (!value || value === 'normal') return fallback
  const parsed = parseFloat(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function parseTransformOrigin(value: string, width: number, height: number) {
  const [rawX = '50%', rawY = '50%'] = value.split(' ')
  return {
    x: parseOriginAxis(rawX, width),
    y: parseOriginAxis(rawY, height)
  }
}

function parseOriginAxis(value: string, size: number) {
  if (value.endsWith('%')) {
    return (parseFloat(value) / 100) * size
  }
  const parsed = parseFloat(value)
  return Number.isFinite(parsed) ? parsed : size / 2
}

function closePosterPreview() {
  if (resultPosterPreviewUrl.value) {
    URL.revokeObjectURL(resultPosterPreviewUrl.value)
  }
  resultPosterPreviewUrl.value = ''
  resultPosterFile.value = null
  posterShareTip.value = ''
}

function shareToXiaohongshu() {
  posterShareTip.value = '正在打开小红书发布页...'
  const startedAt = Date.now()

  window.clearTimeout(posterShareTimer)
  posterShareTimer = window.setTimeout(() => {
    if (Date.now() - startedAt < 1300) return
    posterShareTip.value = '未检测到小红书客户端，请确认已安装后重试。'
  }, 1500)

  const onVisibilityChange = () => {
    if (document.hidden) {
      window.clearTimeout(posterShareTimer)
      posterShareTip.value = ''
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }

  document.addEventListener('visibilitychange', onVisibilityChange)

  const iframe = document.createElement('iframe')
  iframe.style.display = 'none'
  iframe.setAttribute('aria-hidden', 'true')
  iframe.src = XHS_PUBLISH_DEEPLINK
  document.body.appendChild(iframe)

  window.setTimeout(() => {
    iframe.remove()
  }, 1200)

  window.setTimeout(() => {
    window.location.href = XHS_PUBLISH_DEEPLINK
  }, 80)
}
</script>
