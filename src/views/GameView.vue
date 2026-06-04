<template>
  <div ref="gameScreenRef" class="game-screen game-stage-shell h-full flex flex-col gap-3 relative pt-10" :style="gameScreenStyle">
    <div class="game-stage-reference-line" aria-hidden="true"></div>
    <div class="game-screen-content game-stage-content-layer">
      <template v-if="stage === 'playing'">
        <div v-if="loadError" class="absolute inset-x-0 bottom-0 z-30 text-center text-red-700 overflow-visible">
            {{ loadError }}
            <pre v-if="rawAiError" class="mt-3 p-3 text-left text-xs bg-red-50 border border-red-200 rounded whitespace-pre-wrap break-words">{{ rawAiError }}</pre>
            <div class="mt-3">
              <button @click="retryCurrentRound" class="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">重试本轮</button>
            </div>
        </div>

        <Transition
          name="choice-panel"
          @before-enter="onChoicePanelBeforeEnter"
          @enter="onChoicePanelEnter"
          @leave="onChoicePanelLeave"
        >
          <div
            v-show="showChoicePanel && !loadError"
            class="absolute z-30 game-stage-panel-layer overlay-choice-panel-content"
            :style="choicePanelBoardStyle"
          >
            <div class="overlay-choice-panel-body">
              <div class="overlay-choice-options-absolute">
                <button
                  v-for="item in currentOptions"
                  :key="item.id"
                  class="choice-button choice-button-layered"
                  :style="getChoiceButtonLayerStyle(item.id)"
                  :disabled="replying || loading || delivering"
                  @click="pickOption(item.id)"
                >
                  <span class="choice-button-label">
                    <span class="choice-button-textbox">
                      {{ item.text }}
                    </span>
                  </span>
                </button>
              </div>
            </div>
          </div>
        </Transition>
      </template>

      <div class="comic-stage game-stage game-stage-main flex-1 min-h-0 pt-1 pb-24 relative -top-[300px]">
        <img class="comic-avatar comic-avatar-scammer game-stage-avatar-layer" :src="scammerAvatarImage" alt="坏窝瓜头像">
        <div class="comic-dialogue-layout game-stage-dialogue-layer">
          <div v-if="loading && round === 1 && visibleHistory.length === 0" class="first-round-waiting">
            坏瓜正在想坏点子ing
          </div>
          <div class="comic-dialogue-debug-layer" aria-hidden="true">
            <div class="comic-dialogue-zone comic-dialogue-zone-scammer">
              <span class="comic-dialogue-zone-label">坏蛋对话区</span>
            </div>
            <div class="comic-dialogue-zone comic-dialogue-zone-player">
              <span class="comic-dialogue-zone-label">玩家对话区</span>
            </div>
          </div>
          <div class="comic-dialogue-live-layer">
            <div class="comic-dialogue-slot comic-dialogue-slot-scammer">
              <template v-if="scammerVisibleBubble">
                <div class="comic-dialogue-entry" :class="scammerVisibleBubble.leaving ? 'bubble-leaving' : ''">
                  <template v-if="scammerVisibleBubble.voiceDurationSec">
                    <div class="voice-wrap voice-wrap-scammer">
                      <div class="comic-bubble comic-bubble-scammer">
                        <div class="voice-row voice-row-scammer">
                          <div class="voice-bubble voice-bubble-scammer">
                            <span class="voice-icon" aria-hidden="true"></span>
                            <span class="voice-gap" aria-hidden="true">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>
                            <span class="voice-duration">{{ scammerVisibleBubble.voiceDurationSec }}s</span>
                          </div>
                          <span v-if="scammerVisibleBubble.unread" class="voice-unread-dot" aria-label="未读"></span>
                        </div>
                      </div>
                      <span class="voice-transcribe voice-transcribe-outside">转文字</span>
                    </div>
                  </template>
                  <div v-else-if="scammerVisibleBubble.imageUrl" class="comic-image-card comic-image-card-scammer">
                    <img :src="scammerVisibleBubble.imageUrl" alt="内部专享票" class="scam-image" />
                    <p v-if="scammerVisibleBubble.text" class="mt-2">{{ scammerVisibleBubble.text }}</p>
                  </div>
                  <div v-else class="comic-bubble comic-bubble-scammer" :class="{ 'comic-bubble-pop': scammerVisibleBubble.popping }">
                    <div class="comic-bubble-content">{{ scammerVisibleBubble.text }}</div>
                  </div>
                </div>
              </template>
            </div>

            <div class="comic-dialogue-slot comic-dialogue-slot-user">
              <template v-if="userVisibleBubble">
                <div class="comic-dialogue-entry" :class="userVisibleBubble.leaving ? 'bubble-leaving' : ''">
                  <template v-if="userVisibleBubble.voiceDurationSec">
                    <div class="voice-wrap voice-wrap-scammer">
                      <div class="comic-bubble comic-bubble-user">
                        <div class="voice-row voice-row-scammer">
                          <div class="voice-bubble voice-bubble-scammer">
                            <span class="voice-icon" aria-hidden="true"></span>
                            <span class="voice-gap" aria-hidden="true">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>
                            <span class="voice-duration">{{ userVisibleBubble.voiceDurationSec }}s</span>
                          </div>
                          <span v-if="userVisibleBubble.unread" class="voice-unread-dot" aria-label="未读"></span>
                        </div>
                      </div>
                      <span class="voice-transcribe voice-transcribe-outside">转文字</span>
                    </div>
                  </template>
                  <div v-else-if="userVisibleBubble.imageUrl" class="comic-image-card comic-image-card-user">
                    <img :src="userVisibleBubble.imageUrl" alt="内部专享票" class="scam-image" />
                    <p v-if="userVisibleBubble.text" class="mt-2">{{ userVisibleBubble.text }}</p>
                  </div>
                  <div v-else class="comic-bubble comic-bubble-user" :class="{ 'comic-bubble-pop': userVisibleBubble.popping }">
                    <div class="comic-bubble-content">{{ userVisibleBubble.text }}</div>
                  </div>
                </div>
              </template>
            </div>
          </div>
        </div>
        <img class="comic-avatar comic-avatar-player game-stage-avatar-layer" :src="playerAvatarImage" alt="玩家头像">
      </div>
    </div>

    <div
      class="game-screen-overlay game-stage-ornament-layer"
      :style="gameScreenOverlayStyle"
      aria-hidden="true"
    ></div>

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
import { useRouter } from 'vue-router'
import introModalBackground from '../../.monkeycode-tmp-files/bde8039f-底图-改-1.png'
import gamePageBackground from '../../.monkeycode-tmp-files/4ee61b88-底图-07-1.webp'
import gamePageOverlay from '../../.monkeycode-tmp-files/88f16943-顶-1.svg'
import choicePanelBoard from '../../.monkeycode-tmp-files/288c1108-未标题-997781-09-1.webp'
import choiceButtonAImage from '../../.monkeycode-tmp-files/746701c8-1-10-1.webp'
import choiceButtonBImage from '../../.monkeycode-tmp-files/084072b5-2-10-2.webp'
import choiceButtonCImage from '../../.monkeycode-tmp-files/cd690f81-3-10-3.webp'
import choiceButtonDImage from '../../.monkeycode-tmp-files/f0536ad9-4-10-1.webp'
import playerAvatarImage from '../../.monkeycode-tmp-files/7c5e7595-小人头-1.svg'
import scammerAvatarImage from '../../.monkeycode-tmp-files/aec773bc-瓜头-2.svg'
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

const GAME_BG_WIDTH = 1532
const GAME_BG_HEIGHT = 3062
const PLAYER_LINE_Y = 1537
const GAME_STAGE_VISUAL_OFFSET = 270
const PLAYER_AVATAR_RATIO = 401.24 / 400.84
const SCAMMER_AVATAR_RATIO = 436.49 / 466.99

const gameStageAnchorVars = ref<Record<string, string>>({
  '--player-line-top': '50% ',
  '--player-avatar-top': '60%',
  '--scammer-avatar-top': '42%',
  '--player-dialogue-top': '70%',
  '--scammer-dialogue-top': '52%',
  '--player-avatar-size': 'min(35.1vw, 157px)',
  '--scammer-avatar-size': 'min(38.61vw, 172px)'
})

const introModalStyle = {
  backgroundImage: `url(${introModalBackground})`
}

const gameScreenStyle = computed(() => ({
  backgroundImage: `url(${gamePageBackground})`,
  ...gameStageAnchorVars.value
}))

const gameScreenOverlayStyle = {
  backgroundImage: `url(${gamePageOverlay})`,
  backgroundPosition: 'center calc(100% + 30px)'
}

const choicePanelBoardStyle = computed(() => ({
  backgroundImage: `url(${choicePanelBoard})`,
  backgroundPosition: 'center center',
  backgroundSize: '100% auto',
  width: '100%',
  bottom: '21px'
}))

function updateGameStageAnchors() {
  const node = gameScreenRef.value
  if (!node) return

  const width = node.clientWidth
  const height = node.clientHeight
  if (!width || !height) return

  const scale = Math.max(width / GAME_BG_WIDTH, height / GAME_BG_HEIGHT)
  const playerLineTopPx = PLAYER_LINE_Y * scale
  const playerAvatarWidthPx = Math.min(width * 0.351, 157)
  const scammerAvatarWidthPx = Math.min(width * 0.3861, 172)
  const playerAvatarHeightPx = playerAvatarWidthPx * PLAYER_AVATAR_RATIO
  const scammerAvatarHeightPx = scammerAvatarWidthPx * SCAMMER_AVATAR_RATIO
  const playerAvatarTopPx = playerLineTopPx - playerAvatarHeightPx + GAME_STAGE_VISUAL_OFFSET
  const scammerLineTopPx = playerLineTopPx - height * 0.177
  const scammerAvatarTopPx = scammerLineTopPx - scammerAvatarHeightPx + GAME_STAGE_VISUAL_OFFSET

  gameStageAnchorVars.value = {
    '--player-line-top': `${playerLineTopPx}px`,
    '--player-avatar-top': `${playerAvatarTopPx}px`,
    '--scammer-avatar-top': `${scammerAvatarTopPx}px`,
    '--player-dialogue-top': `${playerAvatarTopPx - 20}px`,
    '--scammer-dialogue-top': `${scammerAvatarTopPx - 40}px`,
    '--player-avatar-size': `${playerAvatarWidthPx}px`,
    '--scammer-avatar-size': `${scammerAvatarWidthPx}px`
  }
}

const choiceButtonImageMap: Record<string, string> = {
  A: choiceButtonAImage,
  B: choiceButtonBImage,
  C: choiceButtonCImage,
  D: choiceButtonDImage
}

const choiceButtonLayoutMap: Record<string, { left: number; top: number; width: number; height: number }> = {
  A: { left: 190.51, top: 214.32, width: 1815, height: 400 },
  B: { left: 187.15, top: 610.41, width: 1815, height: 400 },
  C: { left: 187.15, top: 966.89, width: 1815, height: 400 },
  D: { left: 187.15, top: 1351.54, width: 1815, height: 400 }
}

function getChoiceButtonLayerStyle(optionId: string) {
  const layout = choiceButtonLayoutMap[optionId] || choiceButtonLayoutMap.D
  const buttonImage = choiceButtonImageMap[optionId] || choiceButtonImageMap.D
  return {
    left: `${(layout.left / 2223) * 100}%`,
    top: `${(layout.top / 1955.75) * 100}%`,
    width: `${(layout.width / 2223) * 100}%`,
    height: `${(layout.height / 1955.75) * 100}%`,
    backgroundImage: `url(${buttonImage})`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'center center',
    backgroundSize: '100% 100%'
  }
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
  if (elapsed < 1000) {
    await sleep(1000 - elapsed)
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
  currentTheme.value = SCENARIO_THEMES[Math.floor(Math.random() * SCENARIO_THEMES.length)]
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
