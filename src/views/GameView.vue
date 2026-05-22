<template>
  <div class="h-full flex flex-col gap-3 relative">
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
            <h4 class="font-semibold text-gray-800 mb-2 text-sm">选择回复</h4>
            <div class="overlay-choice-options">
              <button
                v-for="item in currentOptions"
                :key="item.id"
                class="choice-button"
                :disabled="replying || loading || delivering"
                @click="pickOption(item.id)"
              >
                <span class="font-medium mr-2">{{ item.id }}.</span>{{ item.text }}
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
        <div class="h-full space-y-3 px-3 pb-2 pt-1 overflow-hidden">
          <div
            v-for="(item, idx) in visibleHistory"
            :key="idx"
            class="flex items-end"
            :class="item.role === 'user' ? 'justify-end' : 'justify-start'"
          >
            <div class="comic-bubble" :class="item.role === 'user' ? 'comic-bubble-user' : 'comic-bubble-scammer'">{{ item.text }}</div>
          </div>
        </div>
      </div>
      <div class="comic-portrait comic-portrait-right">
        <div class="comic-figure">玩家立绘位</div>
      </div>
    </div>

    <div v-if="stage !== 'playing'" class="game-card border-blue-200 bg-blue-50 text-blue-900">
      对局已结束，正在跳转结算页...
    </div>
  </div>
</template>

<script setup lang="ts">
import { nextTick, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  generateFinalReport,
  generateRoundPack,
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

type ChatMessage = { role: 'user' | 'scammer'; text: string }

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
const visibleHistory = ref<ChatMessage[]>([])
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

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function pushWithTyping(role: 'user' | 'scammer', fullText: string, token: number) {
  const text = String(fullText).trim()
  if (!text) return
  visibleHistory.value.push({ role, text: '' })
  const msgIndex = visibleHistory.value.length - 1

  for (let i = 0; i < text.length; i += 1) {
    if (token !== deliveryToken.value) return
    visibleHistory.value[msgIndex].text = text.slice(0, i + 1)
    await nextTick()
    await sleep(28 + Math.floor(Math.random() * 36))
  }
}

async function ensureTypingIndicator(token: number) {
  const last = visibleHistory.value[visibleHistory.value.length - 1]
  if (last?.role === 'scammer' && last.text === typingIndicatorText) return
  visibleHistory.value.push({ role: 'scammer', text: '' })
  const idx = visibleHistory.value.length - 1
  for (let i = 0; i < typingIndicatorText.length; i += 1) {
    if (token !== deliveryToken.value) return
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

async function deliverScammerMessages(messages: string[], token: number) {
  delivering.value = true
  try {
    let lastText = ''
    for (const message of messages) {
      if (token !== deliveryToken.value) return
      await sleep(320 + Math.floor(Math.random() * 460))
      if (token !== deliveryToken.value) return
      const text = String(message).trim()
      if (!text || text === lastText) continue
      await pushWithTyping('scammer', text, token)
      chatHistory.value.push({ role: 'scammer', text })
      lastText = text
    }
  } finally {
    if (token === deliveryToken.value) {
      delivering.value = false
    }
  }
}

async function loadRoundPack(prefetchedPack?: RoundPackResult | Promise<RoundPackResult>) {
  loading.value = true
  showChoicePanel.value = false
  const token = deliveryToken.value
  await eraseVisibleHistory(token)
  await ensureTypingIndicator(token)
  try {
    if (!currentTheme.value) {
      currentTheme.value = SCENARIO_THEMES[Math.floor(Math.random() * SCENARIO_THEMES.length)]
    }
    const pack = prefetchedPack ? await prefetchedPack : await generateRoundPack(chatHistory.value, round.value, currentTheme.value)
    roundSource.value = pack.source === 'ai' ? 'AI生成' : '检索兜底'
    if (pack.source === 'rag') sessionRagUsed.value = true
    loadError.value = ''
    rawAiError.value = pack.source === 'rag' ? (pack.rawContent || '[无原始正文]') : ''
    await eraseTypingIndicator(token)
    await deliverScammerMessages(pack.scammerMessages, token)
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

async function retryCurrentRound() {
  await loadRoundPack()
}

async function endOrNextRound(prefetchedPack?: RoundPackResult | Promise<RoundPackResult>) {
  if (round.value >= 5) {
    const report = await generateFinalReport(chatHistory.value)
    finalReport.value = report
    chatHistory.value.push({ role: 'scammer', text: report.scammerSummary })
    stage.value = 'final'
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
  currentTheme.value = SCENARIO_THEMES[Math.floor(Math.random() * SCENARIO_THEMES.length)]
  showChoicePanel.value = false
  startSession(sessionId.value, currentTheme.value.id, currentTheme.value.name)
  await loadRoundPack()
}

onMounted(() => {
  restartGame()
})
</script>
