<template>
  <div ref="gameScreenRef" class="game-screen" :style="gameScreenStyle">

    <!-- 舞台：logo + 手机模型，整体始终全景可见 -->
    <div class="game-stage">
      <img class="game-logo" :src="gameLogoImage" alt="你这票保熟吗" />

      <div class="phone-area">
        <div class="phone-frame">
          <img class="phone-frame-image" :src="phoneFrameImage" alt="手机模型" />
          <!-- 手机屏幕容器：后续所有游戏内容放这里 -->
          <div class="phone-screen">
            <div class="phone-game-ui">
              <div class="phone-dialogue-layer">
                <div class="phone-chat-row phone-chat-row-scammer">
                  <img class="phone-avatar phone-avatar-scammer" :src="scammerAvatarImage" alt="坏瓜头像" />
                  <div
                    v-if="scammerVisibleBubble"
                    class="phone-message phone-message-scammer"
                    :class="{ 'is-leaving': scammerVisibleBubble.leaving, 'is-popping': scammerVisibleBubble.popping }"
                  >
                    <img
                      v-if="scammerVisibleBubble.imageUrl"
                      class="phone-message-image"
                      :src="scammerVisibleBubble.imageUrl"
                      alt="坏瓜发送的图片"
                    />
                    <div v-else-if="scammerVisibleBubble.voiceDurationSec" class="phone-voice">
                      <span class="phone-voice-icon"></span>
                      <span>{{ scammerVisibleBubble.voiceDurationSec }}''</span>
                      <span v-if="scammerVisibleBubble.unread" class="phone-voice-dot"></span>
                    </div>
                    <p v-else>{{ scammerVisibleBubble.text }}</p>
                  </div>
                </div>

                <div class="phone-chat-row phone-chat-row-user">
                  <div
                    v-if="userVisibleBubble"
                    class="phone-message phone-message-user"
                    :class="{ 'is-leaving': userVisibleBubble.leaving, 'is-popping': userVisibleBubble.popping }"
                  >
                    <p>{{ userVisibleBubble.text }}</p>
                  </div>
                  <img class="phone-avatar phone-avatar-player" :src="playerAvatarImage" alt="玩家头像" />
                </div>
              </div>

              <transition
                @before-enter="onChoicePanelBeforeEnter"
                @enter="onChoicePanelEnter"
                @leave="onChoicePanelLeave"
              >
                <div v-if="showChoicePanel" class="phone-choice-panel">
                  <button
                    v-for="option in displayedOptions"
                    :key="option.id"
                    type="button"
                    class="phone-choice-button"
                    :disabled="replying || loading"
                    @click="pickOption(option.id)"
                    :aria-label="`${option.displaySlot}：${option.text}`"
                  >
                    <img
                      class="phone-choice-image"
                      :src="choiceAssetMap[option.displaySlot]"
                      alt=""
                      aria-hidden="true"
                    />
                    <span class="phone-choice-text">{{ option.text }}</span>
                  </button>
                </div>
              </transition>
            </div>

            <!-- 错误提示 -->
            <div v-if="stage === 'playing' && loadError" class="phone-error">
              {{ loadError }}
              <pre v-if="rawAiError" class="phone-error-raw">{{ rawAiError }}</pre>
              <div class="mt-3">
                <button @click="retryCurrentRound" class="px-4 py-2 bg-red-600 text-white rounded">重试本轮</button>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>

    <!-- 开场弹窗（保留） -->
    <div v-if="showIntroModal" class="intro-mask">
      <div class="intro-modal" :style="introModalStyle">
        <img
          class="intro-copy-image intro-segment"
          :class="{ 'is-visible': introStage >= 1 }"
          :src="introCopyImage"
          alt="开局说明文案"
        >
        <img
          class="intro-copy-image intro-segment"
          :class="{ 'is-visible': introStage >= 2 }"
          :src="introRuleImage"
          alt="玩法说明文案"
        >
        <img
          class="intro-copy-image intro-segment"
          :class="{ 'is-visible': introStage >= 3 }"
          :src="introScoreImage"
          alt="记分说明文案"
        >
        <img
          class="intro-copy-image intro-segment"
          :class="{ 'is-visible': introStage >= 4 }"
          :src="introTipsImage"
          alt="小贴士说明文案"
        >
        <div class="intro-modal-content">
          <div class="intro-confirm-slot">
            <button
              class="intro-confirm intro-segment"
              :class="{ 'is-visible': introReady }"
              @click="confirmIntroAndStart"
              :disabled="startingFromIntro || !introReady || prefetchState === 'pending'"
              :aria-label="introButtonLabel"
            >
              <img
                class="intro-confirm-image"
                :src="introButtonImage"
                :alt="introButtonLabel"
              >
            </button>
          </div>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import gamePageBackground from '@/assets/game/background.webp'
import gameLogoImage from '@/assets/game/game-logo.webp'
import phoneFrameImage from '@/assets/game/phone-frame.webp'
import scammerAvatarImage from '@/assets/game/scammer-avatar.webp'
import playerAvatarImage from '@/assets/game/player-avatar.webp'
import optionAImage from '@/assets/game/options/option-a.webp'
import optionBImage from '@/assets/game/options/option-b.webp'
import optionCImage from '@/assets/game/options/option-c.webp'
import optionDImage from '@/assets/game/options/option-d.webp'
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
import {
  generateFinalReport,
  generateFinalScammerReply,
  generateRoundPack,
  resetRoundDiversitySession,
  RoundGenerationError,
  SCENARIO_THEMES,
  type ScenarioTheme,
  type FinalReport,
  type ScenarioOption,
  type RoundPackResult
} from '@/services/antiFraudGame'
import { resetRetrieveSession } from '@/services/ragStore'
import { startSession, recordRoundChoice, finishSession, type ChoiceCategory } from '@/services/statsStore'
import { saveGameResultSnapshot, clearGameResultSnapshot } from '@/services/gameSessionStore'
import { runBootPreload } from '@/services/bootPreload'
import { playBubbleSfx } from '@/services/uiSfx'

type ChatMessage = {
  role: 'user' | 'scammer'
  text: string
  imageUrl?: string
  voiceDurationSec?: number
  unread?: boolean
}
type VisibleMessage = ChatMessage & { uid: number; leaving?: boolean; popping?: boolean; shownAt?: number }
type DisplayedOption = ScenarioOption & { displaySlot: 'A' | 'B' | 'C' | 'D' }

const INTERNAL_TICKET_IMAGE_URL = scamInternalTicketImage
const FAKE_PAYMENT_IMAGE_URL = scamFakePaymentImage
const FAKE_CHAT_RECORD_IMAGE_URL = scamFakeChatRecordImage
const FAKE_CREDENTIAL_IMAGE_URL = scamFakeCredentialImage

type ScamImageKind = 'internal_ticket' | 'fake_payment' | 'fake_chat_record' | 'fake_credential'

const SCAM_IMAGE_POOL: Array<{ kind: ScamImageKind; url: string; narrative: string }> = [
  {
    kind: 'internal_ticket',
    url: INTERNAL_TICKET_IMAGE_URL,
    narrative: '（骗子发送了一张“内部专享票”图片，诱导私聊锁票）'
  },
  {
    kind: 'fake_payment',
    url: FAKE_PAYMENT_IMAGE_URL,
    narrative: '（骗子发送了一张“虚假支付截图”，诱导你先放票或补尾款）'
  },
  {
    kind: 'fake_chat_record',
    url: FAKE_CHAT_RECORD_IMAGE_URL,
    narrative: '（骗子发送了一张“伪造聊天记录截图”，诱导你相信交易真实发生过）'
  },
  {
    kind: 'fake_credential',
    url: FAKE_CREDENTIAL_IMAGE_URL,
    narrative: '（骗子发送了一张“伪造凭证截图”，诱导你相信自己有真实票源和转票资格）'
  }
]

const sessionId = ref(`session_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`)
const route = useRoute()
const router = useRouter()

const round = ref(1)
const score = ref(0)
const stage = ref<'playing' | 'final'>('playing')
const loading = ref(false)
const delivering = ref(false)
const replying = ref(false)
const deliveryToken = ref(0)

const chatHistory = ref<ChatMessage[]>([])
const visibleHistory = ref<VisibleMessage[]>([])
const currentOptions = ref<ScenarioOption[]>([])
const displayedOptions = ref<DisplayedOption[]>([])
const currentCorrectOptionId = ref('')
const finalReport = ref<FinalReport | null>(null)
const lastJudge = ref('')
const currentTheme = ref<ScenarioTheme | null>(null)
const roundSource = ref<'AI生成' | '检索兜底' | '前端兜底' | ''>('')
const sessionRagUsed = ref(false)
const loadError = ref('')
const rawAiError = ref('')
const typingIndicatorText = '坏瓜正在想坏点子ing'
const showChoicePanel = ref(false)
const imageScamCount = ref(0)
const shownScamImageKinds = ref<Set<ScamImageKind>>(new Set())
const funnyRoundCount = ref(0)
const showIntroModal = ref(true)
const startingFromIntro = ref(false)
const firstRoundPrefetch = ref<Promise<RoundPackResult> | null>(null)
const prefetchState = ref<'pending' | 'ready' | 'failed'>('pending')
const introStage = ref(0)
const introReady = ref(false)
let visibleUid = 0

const scammerVisibleBubble = computed(() => visibleHistory.value.find((item) => item.role === 'scammer') || null)
const userVisibleBubble = computed(() => visibleHistory.value.find((item) => item.role === 'user') || null)
const gameScreenRef = ref<HTMLElement | null>(null)
let gameScreenResizeObserver: ResizeObserver | null = null

function getInitialTheme() {
  const routeTheme = typeof route.query.theme === 'string' ? route.query.theme : ''
  return SCENARIO_THEMES.find((theme) => theme.id === routeTheme) ||
    SCENARIO_THEMES[Math.floor(Math.random() * SCENARIO_THEMES.length)]
}

const introModalStyle = {
  backgroundImage: `url(${introModalBackground})`
}

const gameScreenStyle = {
  backgroundImage: `url(${gamePageBackground})`
}

const choiceAssetMap: Record<'A' | 'B' | 'C' | 'D', string> = {
  A: optionAImage,
  B: optionBImage,
  C: optionCImage,
  D: optionDImage
}

function updateGameStageAnchors() {
  // 占位，新 UI 搭建时填充
}

function shuffleArray<T>(items: T[]) {
  const cloned = [...items]
  for (let i = cloned.length - 1; i > 0; i -= 1) {
    const randomIndex = Math.floor(Math.random() * (i + 1))
    ;[cloned[i], cloned[randomIndex]] = [cloned[randomIndex], cloned[i]]
  }
  return cloned
}

function assignDisplayedOptions(options: ScenarioOption[]) {
  const shuffled = shuffleArray(options)
  const slots: Array<'A' | 'B' | 'C' | 'D'> = ['A', 'B', 'C', 'D']
  displayedOptions.value = shuffled.map((item, index) => ({
    ...item,
    displaySlot: slots[index] || 'D'
  }))
}

function onChoicePanelBeforeEnter(el: Element) {
  const node = el as HTMLElement
  node.style.opacity = '1'
  node.style.transform = 'translateY(560px) scaleX(0.984) scaleY(0.928)'
  node.style.transformOrigin = 'center bottom'
}

function onChoicePanelEnter(el: Element, done: () => void) {
  const node = el as HTMLElement
  const animation = node.animate(
    [
      { transform: 'translateY(560px) scaleX(0.984) scaleY(0.928)' },
      { transform: 'translateY(260px) scaleX(0.988) scaleY(0.952)', offset: 0.36 },
      { transform: 'translateY(96px) scaleX(0.993) scaleY(0.978)', offset: 0.62 },
      { transform: 'translateY(-16px) scaleX(1.003) scaleY(1.008)', offset: 0.84 },
      { transform: 'translateY(7px) scaleX(0.999) scaleY(0.997)', offset: 0.9 },
      { transform: 'translateY(0) scaleX(1) scaleY(1)' }
    ],
    {
      duration: 1080,
      easing: 'cubic-bezier(0.2, 0.9, 0.24, 1)',
      fill: 'forwards'
    }
  )

  animation.onfinish = () => {
    node.style.transform = 'translateY(0) scaleX(1) scaleY(1)'
    done()
  }
  animation.oncancel = () => done()
}

function onChoicePanelLeave(el: Element, done: () => void) {
  const node = el as HTMLElement
  const animation = node.animate(
    [
      { transform: 'translateY(0) scaleX(1) scaleY(1)' },
      { transform: 'translateY(52px) scaleX(0.998) scaleY(0.992)', offset: 0.2 },
      { transform: 'translateY(360px) scaleX(0.987) scaleY(0.942)' }
    ],
    {
      duration: 520,
      easing: 'cubic-bezier(0.3, 0.08, 0.4, 1)',
      fill: 'forwards'
    }
  )

  animation.onfinish = done
  animation.oncancel = done
}

const introButtonLabel = computed(() => (
  startingFromIntro.value || prefetchState.value === 'pending'
    ? '预加载中'
    : '我知道了，开始鉴别'
))

const introButtonImage = computed(() => (
  startingFromIntro.value || prefetchState.value === 'pending'
    ? introButtonPendingImage
    : introButtonReadyImage
))

function preloadScamImages() {
  for (const item of SCAM_IMAGE_POOL) {
    const img = new Image()
    img.src = item.url
  }
}

async function waitForFontsReady(timeoutMs = 2500) {
  if (typeof document === 'undefined' || !(document as Document & { fonts?: FontFaceSet }).fonts) return
  const fonts = (document as Document & { fonts?: FontFaceSet }).fonts
  if (!fonts) return
  await Promise.race([
    fonts.ready,
    (async () => {
      await sleep(timeoutMs)
    })()
  ])
}

async function playIntroReveal() {
  introStage.value = 0
  introReady.value = false
  const totalStages = 4
  for (let i = 1; i <= totalStages; i += 1) {
    if (!showIntroModal.value) return
    introStage.value = i
    await sleep(810)
  }
  introReady.value = true
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function pushWithTyping(role: 'user' | 'scammer', fullText: string, token: number) {
  const text = String(fullText).trim()
  if (!text) return
  await pushVisibleBubble({ role, text }, token)
}

async function dismissVisibleBubble(uid: number, token: number) {
  const target = visibleHistory.value.find((item) => item.uid === uid)
  if (!target) return
  const shownAt = target.shownAt || Date.now()
  const elapsed = Date.now() - shownAt
  const minVisibleMs = target.role === 'scammer' ? 1300 : 1000
  if (elapsed < minVisibleMs) {
    await sleep(minVisibleMs - elapsed)
  }
  if (token !== deliveryToken.value) return
  target.leaving = true
  await nextTick()
  await sleep(220)
  if (token !== deliveryToken.value) return
  const idx = visibleHistory.value.findIndex((item) => item.uid === uid)
  if (idx >= 0) visibleHistory.value.splice(idx, 1)
}

async function pushVisibleBubble(message: ChatMessage, token: number): Promise<VisibleMessage | null> {
  const existing = visibleHistory.value.find((item) => item.role === message.role)
  if (existing) {
    await dismissVisibleBubble(existing.uid, token)
  }
  if (token !== deliveryToken.value) return null
  const bubble: VisibleMessage = {
    ...message,
    uid: ++visibleUid,
    leaving: false,
    popping: true,
    shownAt: Date.now()
  }
  visibleHistory.value.push(bubble)
  if (bubble.text || bubble.voiceDurationSec) {
    playBubbleSfx()
  }
  window.setTimeout(() => {
    const live = visibleHistory.value.find((item) => item.uid === bubble.uid)
    if (live) {
      live.popping = false
    }
  }, 320)
  return bubble
}

async function ensureTypingIndicator(token: number) {
  const last = visibleHistory.value[visibleHistory.value.length - 1]
  if (last?.role === 'scammer' && last.text === typingIndicatorText) return
  await pushVisibleBubble({ role: 'scammer', text: typingIndicatorText }, token)
}

async function eraseTypingIndicator(token: number) {
  const idx = visibleHistory.value.findIndex((m) => m.role === 'scammer' && m.text === typingIndicatorText)
  if (idx === -1) return
  if (token !== deliveryToken.value) return
  await dismissVisibleBubble(visibleHistory.value[idx].uid, token)
}

function clearTypingIndicator() {
  visibleHistory.value = visibleHistory.value.filter((m) => !(m.role === 'scammer' && m.text === typingIndicatorText))
}

async function eraseVisibleHistory(token: number) {
  const snapshot = [...visibleHistory.value]
  for (const current of snapshot) {
    if (token !== deliveryToken.value) return
    await dismissVisibleBubble(current.uid, token)
  }
}

async function deliverScammerMessages(messages: string[], token: number, firstMessageFast = false) {
  delivering.value = true
  try {
    let lastText = ''
    let idx = 0
    for (const message of messages) {
      if (token !== deliveryToken.value) return
      if (!(firstMessageFast && idx === 0)) {
        await sleep(320 + Math.floor(Math.random() * 460))
      }
      if (token !== deliveryToken.value) return
      const text = String(message).trim()
      if (!text || text === lastText) continue
      await pushWithTyping('scammer', text, token)
      chatHistory.value.push({ role: 'scammer', text })
      lastText = text
      idx += 1
    }
  } finally {
    if (token === deliveryToken.value) {
      delivering.value = false
    }
  }
}

function shouldInjectScamImage(): boolean {
  if (round.value < 2 || round.value > 4) return false
  if (imageScamCount.value >= 2) return false
  if (shownScamImageKinds.value.size >= SCAM_IMAGE_POOL.length) return false
  return Math.random() < 0.42
}

async function injectScamImage(token: number) {
  if (token !== deliveryToken.value) return
  await sleep(220)
  if (token !== deliveryToken.value) return

  const available = SCAM_IMAGE_POOL.filter((x) => !shownScamImageKinds.value.has(x.kind))
  if (available.length === 0) return
  const picked = available[Math.floor(Math.random() * available.length)]

  await pushVisibleBubble({
    role: 'scammer',
    text: '',
    imageUrl: picked.url
  }, token)
  chatHistory.value.push({
    role: 'scammer',
    text: picked.narrative
  })
  shownScamImageKinds.value.add(picked.kind)
  imageScamCount.value += 1
}

async function injectFinalScammerVoice(token: number) {
  if (token !== deliveryToken.value) return
  await pushVisibleBubble(
    {
      role: 'scammer',
      text: '',
      voiceDurationSec: 60,
      unread: true
    },
    token
  )
  chatHistory.value.push({ role: 'scammer', text: '（骗子发送了一条60秒语音，情绪失控输出）' })
}

async function loadRoundPack(prefetchedPack?: RoundPackResult | Promise<RoundPackResult>) {
  loading.value = true
  showChoicePanel.value = false
  const token = deliveryToken.value
  await eraseVisibleHistory(token)
  const isPrefetchedObject = !!prefetchedPack && typeof prefetchedPack === 'object' && !('then' in (prefetchedPack as object))
  const fastFirstRound = round.value === 1 && isPrefetchedObject
  const skipTypingIndicator = round.value === 1
  if (!skipTypingIndicator) {
    await ensureTypingIndicator(token)
  }
  try {
    if (!currentTheme.value) {
      currentTheme.value = SCENARIO_THEMES[Math.floor(Math.random() * SCENARIO_THEMES.length)]
    }
    let pack: RoundPackResult
    if (prefetchedPack) {
      pack = await Promise.resolve(prefetchedPack)
    } else {
      pack = await generateRoundPack(chatHistory.value, round.value, currentTheme.value)
    }
    roundSource.value = pack.source === 'ai' ? 'AI生成' : '检索兜底'
    if (pack.source === 'rag') sessionRagUsed.value = true
    loadError.value = ''
    rawAiError.value = pack.source === 'rag' ? (pack.rawContent || '[无原始正文]') : ''
    if (!skipTypingIndicator) {
      await eraseTypingIndicator(token)
    }
    await deliverScammerMessages(pack.scammerMessages, token, fastFirstRound)
    if (shouldInjectScamImage()) {
      await injectScamImage(token)
    }
    currentOptions.value = pack.options
    assignDisplayedOptions(pack.options)
    currentCorrectOptionId.value = pack.correctOptionId
    showChoicePanel.value = true
  } catch (error) {
    clearTypingIndicator()
    roundSource.value = '前端兜底'
    loadError.value = '本轮生成失败，请点击重试本轮。'
    if (error instanceof RoundGenerationError && error.rawContent) {
      loadError.value = `本轮生成失败（stage=${error.stage}, reason=${error.reason || 'unknown'}${error.status ? `, status=${error.status}` : ''}）`
      rawAiError.value = error.rawContent
    } else if (error instanceof Error) {
      rawAiError.value = error.message
    } else {
      rawAiError.value = ''
    }
  } finally {
    loading.value = false
  }
}

function prefetchFirstRound() {
  if (!currentTheme.value) {
    currentTheme.value = SCENARIO_THEMES[Math.floor(Math.random() * SCENARIO_THEMES.length)]
  }
  prefetchState.value = 'pending'
  firstRoundPrefetch.value = generateRoundPack(chatHistory.value, 1, currentTheme.value)
    .then((pack) => {
      prefetchState.value = 'ready'
      return pack
    })
    .catch((err) => {
      prefetchState.value = 'failed'
      firstRoundPrefetch.value = null
      throw err
    })
}

async function confirmIntroAndStart() {
  if (startingFromIntro.value) return
  if (prefetchState.value === 'pending') return
  startingFromIntro.value = true
  showIntroModal.value = false
  try {
    let readyPack: RoundPackResult | undefined
    if (firstRoundPrefetch.value) {
      try {
        readyPack = await firstRoundPrefetch.value
      } catch {
        readyPack = undefined
      }
    }
    await loadRoundPack(readyPack || undefined)
  } finally {
    startingFromIntro.value = false
    firstRoundPrefetch.value = null
    prefetchState.value = 'ready'
  }
}

async function retryCurrentRound() {
  await loadRoundPack()
}

async function endOrNextRound(prefetchedPack?: RoundPackResult | Promise<RoundPackResult>) {
  if (round.value >= 5) {
    stage.value = 'final'
    const reportPromise = generateFinalReport(chatHistory.value)
    const token = deliveryToken.value
    if (funnyRoundCount.value >= 4) {
      await injectFinalScammerVoice(token)
      await sleep(900)
    } else {
      try {
        const finalReply = await generateFinalScammerReply(chatHistory.value)
        await pushWithTyping('scammer', finalReply, token)
        chatHistory.value.push({ role: 'scammer', text: finalReply })
        await sleep(900)
      } catch {
        const fallbackReply = '行，这单我先撤。'
        await pushWithTyping('scammer', fallbackReply, token)
        chatHistory.value.push({ role: 'scammer', text: fallbackReply })
        await sleep(900)
      }
    }

    let report: FinalReport
    try {
      report = await reportPromise
    } catch {
      report = {
        result: score.value >= 20 ? '认输了' : '得逞了',
        playerSummary:
          score.value >= 20
            ? '这局你把流程守得很稳，坏瓜套路一层层都没能套住你。'
            : '这局出现了风险暴露点，好在现在已经复盘到位，下一次会更稳。',
        scammerSummary:
          score.value >= 20
            ? '这只坏瓜今天属于白忙活型选手，套路抡圆了，最后还是空手下班。'
            : '这只坏瓜今天差点钻到空子里，但复盘完这一局，它下次就没这么好下嘴了。',
        tips: [
          '任何“先转账后验票”都属于高风险信号。',
          '验证码、身份证、银行卡信息都不要发给陌生人。',
          '只在官方平台完成交易和验真，必要时立即举报。'
        ]
      }
    }
    finalReport.value = report
    chatHistory.value.push({ role: 'scammer', text: report.scammerSummary })
    finishSession(sessionId.value, score.value, report.result)
    saveGameResultSnapshot({
      sessionId: sessionId.value,
      score: score.value,
      finalReport: report,
      theme: currentTheme.value,
      chatHistory: chatHistory.value,
      endedAt: Date.now()
    })
    await router.replace('/result')
    return
  }

  round.value += 1
  await loadRoundPack(prefetchedPack)
}

async function pickOption(optionId: string) {
  if (replying.value || loading.value || stage.value !== 'playing') return
  const selected = currentOptions.value.find((x) => x.id === optionId)
  if (!selected) return

  showChoicePanel.value = false
  replying.value = true
  try {
    const token = deliveryToken.value
    await pushWithTyping('user', selected.text, token)
    chatHistory.value.push({ role: 'user', text: selected.text })
    if (selected.category === 'funny') {
      funnyRoundCount.value += 1
      lastJudge.value = '本轮判定：戏耍中立，积分不变'
    } else if (optionId === currentCorrectOptionId.value) {
      score.value += 10
      lastJudge.value = '本轮判定：成功反诈，+10分'
    } else {
      score.value -= 5
      lastJudge.value = '本轮判定：存在风险，-5分'
    }
    recordRoundChoice(sessionId.value, round.value, selected.category as ChoiceCategory, optionId === currentCorrectOptionId.value, currentTheme.value?.id || '', currentTheme.value?.name || '')

    let nextPackPromise: Promise<RoundPackResult> | null = null
    if (round.value < 5 && currentTheme.value) {
      const nextRound = round.value + 1
      const historySnapshot = chatHistory.value.map((x) => ({ role: x.role, text: x.text }))
      nextPackPromise = generateRoundPack(historySnapshot, nextRound, currentTheme.value)
    }

    await sleep(1500)
    await endOrNextRound(nextPackPromise || undefined)
  } finally {
    replying.value = false
  }
}

async function restartGame() {
  deliveryToken.value += 1
  clearGameResultSnapshot()
  resetRetrieveSession()
  resetRoundDiversitySession()
  sessionId.value = `session_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  round.value = 1
  score.value = 0
  stage.value = 'playing'
  delivering.value = false
  chatHistory.value = []
  visibleHistory.value = []
  currentOptions.value = []
  displayedOptions.value = []
  currentCorrectOptionId.value = ''
  finalReport.value = null
  lastJudge.value = ''
  roundSource.value = ''
  sessionRagUsed.value = false
  loadError.value = ''
  rawAiError.value = ''
  imageScamCount.value = 0
  shownScamImageKinds.value = new Set()
  funnyRoundCount.value = 0
  showIntroModal.value = true
  startingFromIntro.value = false
  firstRoundPrefetch.value = null
  prefetchState.value = 'pending'
  introStage.value = 0
  introReady.value = false
  currentTheme.value = getInitialTheme()
  showChoicePanel.value = false
  startSession(sessionId.value, currentTheme.value.id, currentTheme.value.name)
  prefetchFirstRound()
  await waitForFontsReady()
  void playIntroReveal()
}

onMounted(async () => {
  updateGameStageAnchors()
  if (typeof ResizeObserver !== 'undefined' && gameScreenRef.value) {
    gameScreenResizeObserver = new ResizeObserver(() => {
      updateGameStageAnchors()
    })
    gameScreenResizeObserver.observe(gameScreenRef.value)
  }
  await runBootPreload()
  preloadScamImages()
  restartGame()
})

onBeforeUnmount(() => {
  gameScreenResizeObserver?.disconnect()
  gameScreenResizeObserver = null
})
</script>

<style scoped>
/* 全屏底图背景 */
.game-screen {
  position: relative;
  width: 100%;
  height: 100%;
  background-position: center top;
  background-repeat: no-repeat;
  background-size: cover;
  overflow: hidden;
}

/* 舞台：logo 在上、手机模型在下，整体垂直居中，始终完整可见 */
.game-stage {
  height: 100%;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: clamp(2px, 0.6vh, 8px);
  padding: clamp(4px, 1vh, 12px) 2px;
  box-sizing: border-box;
}

/*
 * 游戏页 logo：布局占位不变（手机位置/大小不受影响），
 * 仅用 transform 视觉放大 20%，叠到手机上的碰撞按要求无视。
 */
.game-logo {
  flex: 0 0 auto;
  width: auto;
  height: auto;
  max-width: min(89%, 480px);
  max-height: 13.5%;
  object-fit: contain;
  transform: scale(1.2);
  user-select: none;
  -webkit-user-drag: none;
}

/* 手机模型可用区域：吃掉 logo 以外的剩余空间 */
.phone-area {
  flex: 1 1 auto;
  min-height: 0;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

/*
 * 手机模型容器：
 * height:100% 吃满剩余高度，aspect-ratio 据此算出宽度；
 * max-width:100% 在窄屏时反向收缩高度 —— 保证整机永远完整显示。
 */
.phone-frame {
  position: relative;
  height: 100%;
  max-height: 100%;
  max-width: 100%;
  aspect-ratio: 1098 / 1803;
}

.phone-frame-image {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: contain;
  pointer-events: none;
  user-select: none;
  -webkit-user-drag: none;
  z-index: 5;
}

/*
 * 手机屏幕内容区：映射到机身玻璃屏区域（百分比定位，随手机框等比缩放）。
 * 后续游戏内容（对话、选项等）放进这里。insets 为初步估值，可按拼图细调。
 */
.phone-screen {
  position: absolute;
  left: 6.9%;
  right: 6.9%;
  top: 4.25%;
  bottom: 4.15%;
  overflow: hidden;
  z-index: 6;
  border-radius: 24px;
  background: transparent;
}

.phone-game-ui {
  position: absolute;
  inset: 0;
  overflow: hidden;
}

.phone-dialogue-layer {
  position: absolute;
  left: 8.5%;
  right: 8.5%;
  top: 15%;
  bottom: 41%;
  z-index: 2;
}

.phone-chat-row {
  position: absolute;
  left: 0;
  right: 0;
  display: flex;
  align-items: flex-start;
  gap: 7px;
  min-height: 86px;
}

.phone-chat-row-scammer {
  top: 0;
  justify-content: flex-start;
}

.phone-chat-row-user {
  top: 50%;
  justify-content: flex-end;
}

.phone-avatar {
  position: relative;
  z-index: 2;
  display: block;
  flex: 0 0 auto;
  height: auto;
  object-fit: contain;
  pointer-events: none;
  user-select: none;
  -webkit-user-drag: none;
  transform-origin: center bottom;
}

.phone-avatar-scammer {
  width: 29%;
  animation: phone-avatar-scammer-wobble 2.7s steps(1, end) infinite;
}

.phone-avatar-player {
  width: 28%;
  transform: translateY(-48%);
  animation: phone-avatar-player-wobble 3.2s steps(1, end) infinite;
}

.phone-message {
  position: relative;
  z-index: 3;
  max-width: 50%;
  margin-top: 8px;
  padding: 7px 9px;
  border-radius: 7px;
  color: #191919;
  background: #ffffff;
  box-shadow: 0 1px 2px rgba(76, 39, 17, 0.14);
  transform-origin: center bottom;
}

.phone-message p {
  margin: 0;
  font-size: clamp(10px, 2.4vw, 12px);
  line-height: 1.38;
  word-break: break-word;
}

.phone-message-scammer {
  margin-left: 2px;
  background: #ffffff;
}

.phone-message-user {
  margin-right: 2px;
  background: #a9ea7a;
}

.phone-message-scammer::after,
.phone-message-user::after {
  position: absolute;
  top: 12px;
  width: 7px;
  height: 10px;
  content: '';
  background: inherit;
  box-shadow: inherit;
}

.phone-message-scammer::after {
  left: -4px;
  clip-path: polygon(100% 0, 0 50%, 100% 100%);
}

.phone-message-user::after {
  right: -4px;
  clip-path: polygon(0 0, 100% 50%, 0 100%);
}

.phone-message.is-popping {
  animation: phone-bubble-pop 0.32s cubic-bezier(0.2, 0.9, 0.28, 1.18);
}

.phone-message.is-leaving {
  animation: phone-bubble-leave 0.22s ease forwards;
}

.phone-message-image {
  display: block;
  width: 100%;
  max-width: 53px;
  border-radius: 6px;
}

.phone-voice {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-width: 83px;
  min-height: 27px;
  font-size: clamp(10px, 2.6vw, 13px);
  line-height: 1;
}

.phone-voice-icon {
  width: 0;
  height: 0;
  border-top: 7px solid transparent;
  border-bottom: 7px solid transparent;
  border-left: 11px solid #552513;
}

.phone-voice-dot {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: #ef4444;
}

.phone-choice-panel {
  position: absolute;
  left: 17%;
  right: 17%;
  bottom: 2%;
  z-index: 7;
  display: grid;
  gap: 4px;
}

.phone-choice-button {
  position: relative;
  width: 100%;
  aspect-ratio: 667 / 126;
  padding: 0;
  border: 0;
  background: transparent;
  -webkit-tap-highlight-color: transparent;
}

.phone-choice-button:disabled {
  opacity: 0.78;
}

.phone-choice-image {
  position: absolute;
  inset: 0;
  display: block;
  width: 100%;
  height: 100%;
  object-fit: fill;
  pointer-events: none;
}

.phone-choice-text {
  position: absolute;
  left: calc(16.8% + 10px);
  right: calc(7.8% - 10px);
  top: 50%;
  z-index: 1;
  color: #4d2c19;
  font-size: clamp(8px, 2.1vw, 10px);
  line-height: 1.18;
  text-align: left;
  word-break: break-word;
  transform: translateY(-50%);
  pointer-events: none;
}

@keyframes phone-avatar-scammer-wobble {
  0% { transform: translate3d(0, 0, 0) rotate(0deg); }
  20% { transform: translate3d(-2px, 1px, 0) rotate(-1deg); }
  42% { transform: translate3d(2px, -1px, 0) rotate(2deg); }
  66% { transform: translate3d(-1px, 2px, 0) rotate(-1deg); }
  100% { transform: translate3d(0, 0, 0) rotate(0deg); }
}

@keyframes phone-avatar-player-wobble {
  0% { transform: translate3d(0, -48%, 0) rotate(0deg); }
  28% { transform: translate3d(1px, calc(-48% - 1px), 0) rotate(1deg); }
  58% { transform: translate3d(-1px, calc(-48% + 1px), 0) rotate(-0.6deg); }
  100% { transform: translate3d(0, -48%, 0) rotate(0deg); }
}

@keyframes phone-bubble-pop {
  0% { opacity: 0; transform: scale(0.74); }
  70% { opacity: 1; transform: scale(1.05); }
  100% { opacity: 1; transform: scale(1); }
}

@keyframes phone-bubble-leave {
  to { opacity: 0; transform: translateY(-8px) scale(0.98); }
}

.phone-error {
  position: absolute;
  left: 8px;
  right: 8px;
  top: 16%;
  text-align: center;
  color: #b91c1c;
  z-index: 5;
}

.phone-error-raw {
  margin-top: 10px;
  padding: 10px;
  text-align: left;
  font-size: 11px;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 6px;
  white-space: pre-wrap;
  word-break: break-word;
}
</style>
