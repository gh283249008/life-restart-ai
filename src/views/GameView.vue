<template>
  <div class="h-full flex flex-col gap-3 relative">
    <div v-if="showIntroModal" class="intro-mask">
      <div class="intro-modal game-card">
        <h3 class="intro-title intro-segment" :class="{ 'is-visible': introStage >= 1 }">开局说明</h3>
        <p class="intro-lead intro-segment" :class="{ 'is-visible': introStage >= 2 }">邪恶的坏窝瓜总爱伪装成票务卖家，专门套取隐私和转账。你将化身反诈小侦探，在 5 轮交锋里识破它的计谋。</p>
        <div class="intro-steps">
          <p class="intro-segment" :class="{ 'is-visible': introStage >= 3 }">玩法：每轮 4 个选项，尽量选择不转账、不泄露隐私、要求平台验真的回复。</p>
          <p class="intro-segment" :class="{ 'is-visible': introStage >= 4 }">计分：选中正确反诈动作 +10，风险选择 -5，整活为中立。</p>
        </div>
        <div class="intro-tips intro-segment" :class="{ 'is-visible': introStage >= 5 }">
          <p class="intro-tips-title">反诈小贴士</p>
          <ul>
            <li class="intro-segment" :class="{ 'is-visible': introStage >= 6 }">任何“先转账后验票”都高风险。</li>
            <li class="intro-segment" :class="{ 'is-visible': introStage >= 7 }">验证码、身份证、银行卡信息都不能给陌生人。</li>
            <li class="intro-segment" :class="{ 'is-visible': introStage >= 8 }">只走官方平台交易与验真流程。</li>
          </ul>
        </div>
        <div class="intro-confirm-slot">
          <button
            class="intro-confirm intro-segment"
            :class="{ 'is-visible': introReady }"
            @click="confirmIntroAndStart"
            :disabled="startingFromIntro || !introReady || prefetchState === 'pending'"
          >
          {{ startingFromIntro ? '加载中...' : prefetchState === 'pending' ? '预加载中...' : '我知道了，开始鉴别' }}
          </button>
        </div>
      </div>
    </div>

    <template v-if="stage === 'playing'">
      <div class="absolute inset-x-0 bottom-0 z-30 px-1 pb-1">
        <div v-if="loadError" class="game-card text-center text-red-700">
          {{ loadError }}
          <pre v-if="rawAiError" class="mt-3 p-3 text-left text-xs bg-red-50 border border-red-200 rounded whitespace-pre-wrap break-words">{{ rawAiError }}</pre>
          <div class="mt-3">
            <button @click="retryCurrentRound" class="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">重试本轮</button>
          </div>
        </div>

        <Transition name="choice-panel">
          <div v-if="showChoicePanel && !loadError" class="game-card overlay-choice-panel">
            <h4 class="text-gray-800 mb-2 text-sm">选择回复</h4>
            <div class="overlay-choice-options">
              <button
                v-for="item in currentOptions"
                :key="`${round}-${item.id}-${item.text}`"
                class="choice-button"
                :disabled="replying || loading || delivering"
                @click="pickOption(item.id)"
              >
                <span class="mr-2">{{ item.id }}.</span>{{ item.text }}
              </button>
            </div>
          </div>
        </Transition>
      </div>
    </template>

    <div class="comic-stage flex-1 min-h-0 pt-1 pb-24 relative -top-[200px]">
      <div class="comic-portrait comic-portrait-left">
        <div class="comic-figure">神秘网友立绘位</div>
      </div>
      <div class="comic-dialogue-stage">
        <div v-if="loading && round === 1 && visibleHistory.length === 0" class="first-round-waiting">
          坏窝瓜正在想坏点子……
        </div>
        <div class="h-full space-y-3 px-3 pb-2 pt-1 overflow-hidden">
          <div
            v-for="item in visibleHistory"
            :key="item.uid"
            class="flex items-end"
            :class="[item.role === 'user' ? 'justify-end' : 'justify-start', item.leaving ? 'bubble-leaving' : '']"
          >
            <template v-if="item.voiceDurationSec">
              <div class="voice-wrap voice-wrap-scammer">
                <div class="comic-bubble" :class="item.role === 'user' ? 'comic-bubble-user' : 'comic-bubble-scammer'">
                  <div class="voice-row voice-row-scammer">
                    <div class="voice-bubble voice-bubble-scammer">
                      <span class="voice-icon" aria-hidden="true"></span>
                      <span class="voice-gap" aria-hidden="true">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>
                      <span class="voice-duration">{{ item.voiceDurationSec }}s</span>
                    </div>
                    <span v-if="item.unread" class="voice-unread-dot" aria-label="未读"></span>
                  </div>
                </div>
                <span class="voice-transcribe voice-transcribe-outside">转文字</span>
              </div>
            </template>
            <div v-else class="comic-bubble" :class="item.role === 'user' ? 'comic-bubble-user' : 'comic-bubble-scammer'">
              <template v-if="item.imageUrl">
                <img :src="item.imageUrl" alt="内部专享票" :class="['scam-image', item.imageUrl?.includes('scam-fake-payment') ? 'scam-image-fake-payment' : '']" />
                <p v-if="item.text" class="mt-2">{{ item.text }}</p>
              </template>
              <template v-else>
                {{ item.text }}
              </template>
            </div>
          </div>
        </div>
      </div>
      <div class="comic-portrait comic-portrait-right">
        <div class="comic-figure">玩家立绘位</div>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { nextTick, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
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

type ChatMessage = {
  role: 'user' | 'scammer'
  text: string
  imageUrl?: string
  voiceDurationSec?: number
  unread?: boolean
}
type VisibleMessage = ChatMessage & { uid: number; leaving?: boolean }

const INTERNAL_TICKET_IMAGE_URL = '/images/scam-internal-ticket.jpg'
const FAKE_PAYMENT_IMAGE_URL = '/images/scam-fake-payment.jpg'

type ScamImageKind = 'internal_ticket' | 'fake_payment'

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
const typingIndicatorText = '神秘网友正在输入...'
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
  const totalStages = 8
  for (let i = 1; i <= totalStages; i += 1) {
    if (!showIntroModal.value) return
    introStage.value = i
    await sleep(540)
  }
  introReady.value = true
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function pushWithTyping(role: 'user' | 'scammer', fullText: string, token: number) {
  const text = String(fullText).trim()
  if (!text) return
  const bubble = await pushVisibleBubble({ role, text: '' }, token)
  if (!bubble) return

  for (let i = 0; i < text.length; i += 1) {
    if (token !== deliveryToken.value) return
    const msgIndex = visibleHistory.value.findIndex((x) => x.uid === bubble.uid)
    if (msgIndex === -1) return
    visibleHistory.value[msgIndex].text = text.slice(0, i + 1)
    await nextTick()
    await sleep(28 + Math.floor(Math.random() * 36))
  }
}

async function shrinkTopBubble(token: number) {
  if (visibleHistory.value.length < 2) return
  const top = visibleHistory.value[0]
  if (!top) return
  top.leaving = true
  await nextTick()
  await sleep(220)
  if (token !== deliveryToken.value) return
  if (visibleHistory.value[0]?.uid === top.uid) {
    visibleHistory.value.shift()
  } else {
    const idx = visibleHistory.value.findIndex((x) => x.uid === top.uid)
    if (idx >= 0) visibleHistory.value.splice(idx, 1)
  }
}

async function pushVisibleBubble(message: ChatMessage, token: number): Promise<VisibleMessage | null> {
  if (visibleHistory.value.length >= 2) {
    await shrinkTopBubble(token)
  }
  if (token !== deliveryToken.value) return null
  const bubble: VisibleMessage = {
    ...message,
    uid: ++visibleUid,
    leaving: false
  }
  visibleHistory.value.push(bubble)
  return bubble
}

async function ensureTypingIndicator(token: number) {
  const last = visibleHistory.value[visibleHistory.value.length - 1]
  if (last?.role === 'scammer' && last.text === typingIndicatorText) return
  const bubble = await pushVisibleBubble({ role: 'scammer', text: '' }, token)
  if (!bubble) return
  for (let i = 0; i < typingIndicatorText.length; i += 1) {
    if (token !== deliveryToken.value) return
    const idx = visibleHistory.value.findIndex((x) => x.uid === bubble.uid)
    if (idx === -1) return
    visibleHistory.value[idx].text = typingIndicatorText.slice(0, i + 1)
    await nextTick()
    await sleep(22)
  }
}

async function eraseTypingIndicator(token: number) {
  const idx = visibleHistory.value.findIndex((m) => m.role === 'scammer' && m.text === typingIndicatorText)
  if (idx === -1) return
  for (let i = typingIndicatorText.length; i >= 0; i -= 1) {
    if (token !== deliveryToken.value) return
    visibleHistory.value[idx].text = typingIndicatorText.slice(0, i)
    await nextTick()
    await sleep(16)
  }
  if (token !== deliveryToken.value) return
  visibleHistory.value.splice(idx, 1)
}

function clearTypingIndicator() {
  visibleHistory.value = visibleHistory.value.filter((m) => !(m.role === 'scammer' && m.text === typingIndicatorText))
}

async function eraseVisibleHistory(token: number) {
  for (let msgIdx = visibleHistory.value.length - 1; msgIdx >= 0; msgIdx -= 1) {
    if (token !== deliveryToken.value) return
    const current = visibleHistory.value[msgIdx]
    const full = current?.text || ''
    for (let i = full.length; i >= 0; i -= 1) {
      if (token !== deliveryToken.value) return
      if (!visibleHistory.value[msgIdx]) break
      visibleHistory.value[msgIdx].text = full.slice(0, i)
      await nextTick()
      await sleep(10)
    }
    if (token !== deliveryToken.value) return
    visibleHistory.value.splice(msgIdx, 1)
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
        scammerSummary:
          score.value >= 20
            ? '你这波全程走官方流程，坏窝瓜这单彻底没戏。'
            : '先别慌，这局有风险暴露点，下一局按平台验真就能稳住。',
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

onMounted(() => {
  preloadScamImages()
  restartGame()
})
</script>
