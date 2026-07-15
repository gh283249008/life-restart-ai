<template>
  <section ref="resultScreenRef" class="result-screen" :style="resultStageVars">
    <div ref="resultCaptureRef" class="result-capture-surface">
      <img class="result-screen-image" :src="resultBackgroundImage" alt="结算页背景图" />
      <div class="result-screen-content result-compose-layer">
        <div class="result-main-board">
          <img class="result-main-board-image" :src="resultBoardMainImage" alt="结算完成" />
          <div class="result-inner-board-group">
            <img class="result-inner-board result-inner-board-top" :src="resultBoardTopImage" alt="" />
            <div class="result-top-board-copy">
              <p class="result-top-board-scenario">{{ resultScenarioTitle }}</p>
              <p class="result-top-board-finish">调查完成！</p>
            </div>
            <img class="result-inner-board result-inner-board-middle" :src="resultBoardMiddleImage" alt="" />
            <div class="result-middle-board-copy">
              <p class="result-villain-name">{{ resultVillainCard.name }}</p>
              <p class="result-villain-body">{{ resultVillainCard.desc }}</p>
              <p class="result-villain-review">{{ resultPlayerSummary }}</p>
            </div>
            <img class="result-inner-board result-inner-board-bottom" :src="resultBoardBottomImage" alt="" />
            <div class="result-bottom-board-copy">
              <p v-for="tip in resultTips" :key="tip">{{ tip }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="result-screen-content result-compose-layer result-compose-interactive">
      <div class="result-main-board">
        <img class="result-main-board-image" :src="resultBoardMainImage" alt="结算完成" />
        <div class="result-inner-board-group">
          <img class="result-inner-board result-inner-board-top" :src="resultBoardTopImage" alt="" />
          <div class="result-top-board-copy">
            <p class="result-top-board-scenario">{{ resultScenarioTitle }}</p>
            <p class="result-top-board-finish">调查完成！</p>
          </div>
          <img class="result-inner-board result-inner-board-middle" :src="resultBoardMiddleImage" alt="" />
          <div class="result-middle-board-copy">
            <p class="result-villain-name">{{ resultVillainCard.name }}</p>
            <p class="result-villain-body">{{ resultVillainCard.desc }}</p>
            <p class="result-villain-review">{{ resultPlayerSummary }}</p>
          </div>
          <img class="result-inner-board result-inner-board-bottom" :src="resultBoardBottomImage" alt="" />
          <div class="result-bottom-board-copy">
            <p v-for="tip in resultTips" :key="tip">{{ tip }}</p>
          </div>
        </div>
      </div>

      <div class="result-bottom-actions">
        <button type="button" class="result-bottom-action" @click="handleGeneratePoster" aria-label="生成分享海报">
          <img class="result-bottom-action-image" :src="resultSharePosterButtonImage" alt="生成分享海报" />
        </button>
        <button type="button" class="result-bottom-action" @click="openSafeShuProfile" aria-label="关注安全薯">
          <img class="result-bottom-action-image" :src="resultFollowSafeShuButtonImage" alt="关注安全薯" />
        </button>
      </div>
    </div>

    <div ref="resultPosterCaptureRef" class="result-poster-capture-source" aria-hidden="true">
      <PosterCanvas />
    </div>

    <div v-if="resultPosterPreviewUrl" class="result-poster-modal" @click.self="closePosterPreview">
      <div class="result-poster-shell">
        <div class="result-poster-dialog">
          <button type="button" class="result-poster-close" @click="closePosterPreview" aria-label="关闭预览">×</button>
          <a
            class="result-poster-preview-link"
            :href="getPosterDownloadUrl(resultPosterPreviewUrl)"
            download="票务反诈分享海报.png"
            rel="noopener"
            aria-label="保存分享海报"
            @click.prevent="downloadPosterImage"
          >
            <img class="result-poster-preview-image" :src="resultPosterPreviewUrl" alt="结算页分享海报预览" />
          </a>
        </div>
        <p class="result-poster-save-hint">点击图片下载，或长按图片保存到相册</p>
        <button type="button" class="result-poster-share-button" @click="openXhsPublish" aria-label="分享到小红书">
          <img class="result-poster-share-image" :src="resultShareToXhsButtonImage" alt="分享到小红书" @error="handleShareButtonImageError" />
          <span v-if="shareButtonImageBroken" class="result-poster-share-fallback">分享到小红书</span>
        </button>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { loadGameResultSnapshot } from '@/services/gameSessionStore'
import PosterCanvas from '@/components/PosterCanvas.vue'
import resultBackgroundImage from '@/assets/game/result-background.webp'
import resultBoardMainImage from '@/assets/game/result-board-main.webp'
import resultBoardTopImage from '@/assets/game/result-board-top.webp'
import resultBoardMiddleImage from '@/assets/game/result-board-middle.webp'
import resultBoardBottomImage from '@/assets/game/result-board-bottom.webp'
import resultSharePosterButtonImage from '@/assets/game/result-share-poster-button.webp'
import resultFollowSafeShuButtonImage from '@/assets/game/result-follow-safe-shu-button.webp'
import { openSafeShuProfile } from '@/services/safeShuLink'
import resultShareToXhsButtonImage from '../../.monkeycode-tmp-files/share-to-xhs-button-v3.webp'

const RESULT_BG_WIDTH = 770
const RESULT_BG_HEIGHT = 1531
const RESULT_MAIN_BOARD_WIDTH = 1108
const RESULT_MAIN_BOARD_HEIGHT = 2205
const snapshot = loadGameResultSnapshot()
const resultScenarioTitle = snapshot?.theme?.name || '本局情景'
const SCENARIO_VILLAIN_CARD_MAP: Record<string, { name: string; desc: string }> = {
  star_concert: { name: '假票瓜', desc: '票是P的，码是假的，人是跑路的。' },
  music_festival: { name: '缩水瓜', desc: '三天通票变单日，比泡面包装还能缩。' },
  school_show: { name: '拼单瓜', desc: '群里喊拼单，最后只有群主拼到了钱。' },
  last_minute: { name: '捡漏瓜', desc: '你以为是捡漏，其实是捡了个坑。' },
  fan_group: { name: '代抢瓜', desc: '帮你抢票是假，帮你花钱是真。' },
  overseas_show: { name: '海淘瓜', desc: '“我在海外帮你买”，IP一查在隔壁县。' },
  sports_event: { name: '假赛瓜', desc: '赛事还没官宣，它的票已经印好了。' },
  scalper_ticket: { name: '黄牛瓜', desc: '加价三倍，检票口一照，无效。' },
  fake_platform: { name: '山寨瓜', desc: '网页和官方一模一样，除了收款人。' },
  refund_scam: { name: '连环瓜', desc: '票没了，手续费也没了，人也没了。' },
  world_cup: { name: '赌球瓜', desc: '票没买到，倒先输了一套房。' }
}
const resultVillainCard =
  (snapshot?.theme?.id && SCENARIO_VILLAIN_CARD_MAP[snapshot.theme.id]) ||
  { name: '坏瓜', desc: '套路很多，但破绽也很明显。' }
const resultPlayerSummary =
  snapshot?.finalReport?.playerSummary ||
  '这局你完成了关键识别，记住所有绕开平台、催促转账、索要隐私的行为都要提高警惕。'
const resultTips = (
  snapshot?.finalReport?.tips?.length
    ? snapshot.finalReport.tips
    : [
        '坚持平台担保交易，不私下转账。',
        '验证码、身份证、银行卡信息不要发给陌生人。',
        '遇到催促付款、绕开验真的话术，先停下来核实。'
      ]
).slice(0, 2)

const resultScreenRef = ref<HTMLElement | null>(null)
const resultCaptureRef = ref<HTMLElement | null>(null)
const resultPosterCaptureRef = ref<HTMLElement | null>(null)
const resultStageVars = ref<Record<string, string>>({
  '--result-bg-left': '0px',
  '--result-bg-top': '0px',
  '--result-bg-width': '100%',
  '--result-bg-height': '100%',
  '--result-board-offset-x': '0px',
  '--result-main-board-width': '0px',
  '--result-main-board-height': '0px'
})

let resultResizeObserver: ResizeObserver | null = null
const resultPosterPreviewUrl = ref('')
const shareButtonImageBroken = ref(false)
const XHS_PUBLISH_PATH =
  'post_new_note?page=photo_publish&attach=%7B%22topics%22%3A%5B%7B%22page_id%22%3A%22695a6dae0017000000000002%22%7D%5D%7D&config=%7B%7D'
const XHS_PUBLISH_DEEPLINK = `xhsdiscover://${XHS_PUBLISH_PATH}`

function openXhsPublish() {
  window.location.href = XHS_PUBLISH_DEEPLINK
}

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
  const boardScale = Math.min(
    (width * 0.96) / RESULT_MAIN_BOARD_WIDTH,
    (height * 0.96) / RESULT_MAIN_BOARD_HEIGHT
  )
  const mainBoardWidth = RESULT_MAIN_BOARD_WIDTH * boardScale
  const mainBoardHeight = RESULT_MAIN_BOARD_HEIGHT * boardScale

  resultStageVars.value = {
    '--result-bg-left': `${offsetX}px`,
    '--result-bg-top': '0px',
    '--result-bg-width': `${renderedWidth}px`,
    '--result-bg-height': `${renderedHeight}px`,
    '--result-board-offset-x': `${renderedWidth * 0.25}px`,
    '--result-main-board-width': `${mainBoardWidth}px`,
    '--result-main-board-height': `${mainBoardHeight}px`
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

  window.addEventListener('resize', handleResultResize)
})

onBeforeUnmount(() => {
  resultResizeObserver?.disconnect()
  resultResizeObserver = null
  window.removeEventListener('resize', handleResultResize)
  revokePosterPreviewUrl()
})

function handleResultResize() {
  updateResultStageVars()
}

async function handleGeneratePoster() {
  const node = resultPosterCaptureRef.value
  if (!node) {
    return
  }

  try {
    const imageBlob = await captureNodeAsPng(node)
    if (!imageBlob) {
      return
    }

    revokePosterPreviewUrl()

    const imageDataUrl = await blobToDataUrl(imageBlob)
    resultPosterPreviewUrl.value = await uploadPosterImage(imageDataUrl) || imageDataUrl
    shareButtonImageBroken.value = false
  } catch (error) {
    console.warn('Failed to generate poster', error)
  }
}

function autoDownloadPoster(url: string) {
  const link = document.createElement('a')
  link.href = url
  link.download = `票务反诈分享海报-${Date.now()}.png`
  document.body.appendChild(link)
  link.click()
  link.remove()
}

function getPosterDownloadUrl(url: string) {
  if (!url || url.startsWith('data:') || url.startsWith('blob:')) return url
  return url.includes('?') ? `${url}&download=1` : `${url}?download=1`
}

function downloadPosterImage() {
  const url = getPosterDownloadUrl(resultPosterPreviewUrl.value)
  if (!url) return
  autoDownloadPoster(url)
}

function blobToDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(new Error('图片预览生成失败'))
    reader.readAsDataURL(blob)
  })
}

function revokePosterPreviewUrl() {
  if (resultPosterPreviewUrl.value.startsWith('blob:')) {
    URL.revokeObjectURL(resultPosterPreviewUrl.value)
  }
}

async function uploadPosterImage(imageDataUrl: string) {
  try {
    const response = await fetch('/api/posters', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageDataUrl })
    })
    if (!response.ok) return ''
    const payload = await response.json() as { url?: string }
    return payload.url || ''
  } catch {
    return ''
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
  const objectFit = computed.objectFit || 'fill'
  const objectPosition = computed.objectPosition || '50% 50%'

  if (!transform || transform === 'none') {
    drawImageWithObjectFit(ctx, image, x, y, rect.width, rect.height, objectFit, objectPosition)
    return
  }

  const origin = parseTransformOrigin(computed.transformOrigin, rect.width, rect.height)
  const matrix = new DOMMatrixReadOnly(transform)

  ctx.save()
  ctx.translate(x + origin.x, y + origin.y)
  ctx.transform(matrix.a, matrix.b, matrix.c, matrix.d, matrix.e, matrix.f)
  drawImageWithObjectFit(ctx, image, -origin.x, -origin.y, rect.width, rect.height, objectFit, objectPosition)
  ctx.restore()
}

function drawImageWithObjectFit(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  dx: number,
  dy: number,
  dWidth: number,
  dHeight: number,
  objectFit: string,
  objectPosition: string
) {
  const naturalWidth = image.naturalWidth || dWidth
  const naturalHeight = image.naturalHeight || dHeight

  if (!naturalWidth || !naturalHeight) {
    ctx.drawImage(image, dx, dy, dWidth, dHeight)
    return
  }

  if (objectFit === 'fill') {
    ctx.drawImage(image, dx, dy, dWidth, dHeight)
    return
  }

  const fitMode = objectFit === 'contain' ? 'contain' : 'cover'
  const scale = fitMode === 'contain'
    ? Math.min(dWidth / naturalWidth, dHeight / naturalHeight)
    : Math.max(dWidth / naturalWidth, dHeight / naturalHeight)

  const renderWidth = naturalWidth * scale
  const renderHeight = naturalHeight * scale
  const [positionX, positionY] = parseObjectPosition(objectPosition)
  const offsetX = (dWidth - renderWidth) * positionX
  const offsetY = (dHeight - renderHeight) * positionY

  ctx.drawImage(image, dx + offsetX, dy + offsetY, renderWidth, renderHeight)
}

function parseObjectPosition(value: string) {
  const parts = value.trim().split(/\s+/)
  const rawX = parts[0] || '50%'
  const rawY = parts[1] || '50%'
  return [parseObjectPositionAxis(rawX), parseObjectPositionAxis(rawY)]
}

function parseObjectPositionAxis(value: string) {
  if (value === 'left' || value === 'top') return 0
  if (value === 'center') return 0.5
  if (value === 'right' || value === 'bottom') return 1
  if (value.endsWith('%')) {
    return parseFloat(value) / 100
  }
  return 0.5
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
  const textIndent = parseCssLength(computed.textIndent, 0)
  const maxLines = Math.max(1, Math.round(rect.height / lineHeight))
  const shouldWrap = computed.whiteSpace !== 'nowrap'

  ctx.save()
  ctx.font = buildCanvasFont(computed)
  ctx.fillStyle = computed.color
  ctx.textBaseline = 'top'
  ctx.textAlign = 'left'

  const lines = shouldWrap ? wrapTextByWidth(ctx, text, rect.width - textIndent, letterSpacing) : [text]
  const outputLines = lines.slice(0, maxLines)

  outputLines.forEach((line, index) => {
    const indent = index === 0 ? textIndent : 0
    const lineWidth = measureTextWidth(ctx, line, letterSpacing)
    let lineX = x + indent
    if (computed.textAlign === 'center') {
      lineX = x + (rect.width - lineWidth) / 2
    } else if (computed.textAlign === 'right' || computed.textAlign === 'end') {
      lineX = x + rect.width - lineWidth
    }
    drawTextLine(ctx, line, lineX, y + index * lineHeight, letterSpacing)
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
  revokePosterPreviewUrl()
  resultPosterPreviewUrl.value = ''
  shareButtonImageBroken.value = false
}

function handleShareButtonImageError() {
  shareButtonImageBroken.value = true
}
</script>

<style scoped>
.result-compose-layer {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.result-compose-interactive {
  z-index: 5;
  pointer-events: auto;
}

.result-poster-capture-source {
  position: fixed;
  left: -10000px;
  top: 0;
  z-index: -1;
  width: 768px;
  height: 1371px;
  overflow: hidden;
  pointer-events: none;
}

.result-main-board {
  position: absolute;
  left: 50%;
  top: 50%;
  width: var(--result-main-board-width);
  height: var(--result-main-board-height);
  transform: translate(-50%, -50%);
  pointer-events: none;
  user-select: none;
  -webkit-user-drag: none;
}

.result-main-board-image,
.result-inner-board-group,
.result-inner-board {
  position: absolute;
  display: block;
  user-select: none;
  -webkit-user-drag: none;
  pointer-events: none;
}

.result-main-board-image {
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.result-inner-board-group {
  inset: 0;
  transform: translateY(-1.35%);
}

.result-inner-board {
  left: 50%;
  width: 94.4%;
  height: auto;
  transform: translateX(-50%);
}

.result-inner-board-top {
  top: 17.9%;
}

.result-inner-board-middle {
  top: 43.8%;
}

.result-inner-board-bottom {
  top: 60.4%;
}

.result-top-board-copy {
  position: absolute;
  left: 50%;
  top: 21.25%;
  z-index: 2;
  width: 68%;
  height: 21.8%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #4a2712;
  text-align: center;
  transform: translateX(-50%);
  pointer-events: none;
}

.result-top-board-copy p {
  margin: 0;
  font-weight: 600;
  letter-spacing: 0;
}

.result-top-board-scenario {
  font-size: clamp(28px, calc(var(--result-main-board-width) * 0.074), 48px);
  line-height: 1.08;
  white-space: nowrap;
  overflow: visible;
}

.result-top-board-finish {
  margin-top: 5px !important;
  font-size: clamp(24px, calc(var(--result-main-board-width) * 0.066), 42px);
  line-height: 1.08;
  white-space: nowrap;
}

.result-middle-board-copy {
  position: absolute;
  left: 50%;
  top: 46.2%;
  z-index: 2;
  width: 73%;
  height: 14.2%;
  color: #4a2712;
  transform: translateX(-50%);
  pointer-events: none;
}

.result-villain-name {
  position: absolute;
  right: calc(2% - 28px);
  top: 7px;
  margin: 0;
  color: #c7382b;
  font-size: clamp(24px, calc(var(--result-main-board-width) * 0.071), 46px);
  line-height: 1;
  font-weight: 800;
  letter-spacing: 0;
  text-shadow:
    1px 1px 0 #fff0c8,
    2px 2px 0 rgba(83, 39, 15, 0.22);
  transform: rotate(45deg);
  transform-origin: center center;
  white-space: nowrap;
}

.result-villain-body,
.result-villain-review {
  margin: 0;
  width: 100%;
  color: #4a2712;
  font-size: clamp(12px, calc(var(--result-main-board-width) * 0.032), 20px);
  line-height: 1.32;
  font-weight: 200;
  letter-spacing: 0;
  word-break: break-word;
}

.result-villain-body {
  padding-top: 13%;
}

.result-villain-review {
  margin-top: 2.2%;
}

.result-bottom-board-copy {
  position: absolute;
  left: 50%;
  top: 67.9%;
  z-index: 2;
  width: 75%;
  height: 19%;
  color: #4a2712;
  transform: translateX(-50%);
  pointer-events: none;
}

.result-bottom-board-copy p {
  margin: 0 0 3.2%;
  font-size: clamp(12px, calc(var(--result-main-board-width) * 0.033), 21px);
  line-height: 1.36;
  font-weight: 200;
  letter-spacing: 0;
  word-break: break-word;
}

.result-bottom-actions {
  position: absolute;
  left: 50%;
  bottom: 2.2%;
  z-index: 10;
  display: grid;
  width: min(54.4%, 229px);
  gap: 6px;
  transform: translateX(-50%);
  pointer-events: auto;
}

.result-bottom-action {
  width: 100%;
  padding: 0;
  border: 0;
  background: transparent;
  -webkit-tap-highlight-color: transparent;
}

.result-bottom-action:active {
  transform: translateY(1px);
}

.result-bottom-action-image {
  display: block;
  width: 100%;
  height: auto;
  pointer-events: none;
  user-select: none;
  -webkit-user-drag: none;
}
</style>
