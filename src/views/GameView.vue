<template>
  <div class="max-w-4xl mx-auto space-y-6">
    <div class="game-card">
      <div class="flex flex-wrap items-center justify-between gap-4">
        <h2 class="text-2xl font-bold text-gray-800">你 vs 神秘网友</h2>
        <div class="flex gap-4 text-sm">
          <span class="px-3 py-1 bg-blue-50 text-blue-700 rounded">第 {{ round }}/5 轮</span>
          <span class="px-3 py-1 bg-green-50 text-green-700 rounded">积分 {{ score }}</span>
        </div>
      </div>
      <p v-if="currentTheme" class="mt-2 text-sm text-gray-500">本轮情节：{{ currentTheme.name }}</p>
      <p v-if="roundSource" class="mt-1 text-xs text-gray-500">本轮来源：{{ roundSource }}</p>
      <p v-if="sessionRagUsed" class="mt-1 text-xs text-amber-700">本局标记：已触发检索兜底</p>
      <p v-if="lastJudge" class="mt-3 text-sm text-gray-600">{{ lastJudge }}</p>
    </div>

    <div class="game-card">
      <div class="space-y-3 max-h-[480px] overflow-y-auto pr-1">
        <div
          v-for="(item, idx) in chatHistory"
          :key="idx"
          class="flex"
          :class="item.role === 'user' ? 'justify-end' : 'justify-start'"
        >
          <div
            class="max-w-[82%] rounded-xl px-3 py-2 text-sm"
            :class="item.role === 'user' ? 'bg-blue-600 text-white' : 'bg-red-50 border border-red-200 text-red-900'"
          >
            {{ item.text }}
          </div>
        </div>
      </div>
    </div>

    <div v-if="stage === 'playing'" class="space-y-6">
      <div v-if="loading || delivering" class="game-card text-center text-gray-600">神秘网友正在输入...</div>
      <div v-else-if="loadError" class="game-card text-center text-red-700">
        {{ loadError }}
        <pre v-if="rawAiError" class="mt-3 p-3 text-left text-xs bg-red-50 border border-red-200 rounded whitespace-pre-wrap break-words">{{ rawAiError }}</pre>
        <div class="mt-3">
          <button @click="loadRoundPack" class="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">重试本轮</button>
        </div>
      </div>

      <div v-else class="game-card">
        <h4 class="font-semibold text-gray-800 mb-3">选择回复话术</h4>
        <div class="space-y-2">
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

      <div class="game-card">
        <h4 class="font-semibold text-gray-800 mb-3">自定义回复</h4>
        <div class="flex gap-2">
          <input
            v-model="freeInput"
            type="text"
            placeholder="输入你自己的回复话术..."
            maxlength="20"
            class="flex-1 border border-gray-300 rounded px-3 py-2"
            :disabled="replying || loading || delivering"
          />
          <button
            @click="sendCustomReply"
            :disabled="replying || loading || delivering || !freeInput.trim()"
            class="px-4 py-2 bg-gray-800 text-white rounded disabled:opacity-50"
          >
            {{ replying ? '发送中...' : '发送' }}
          </button>
        </div>
      </div>
    </div>

    <div v-else class="game-card border-blue-200 bg-blue-50">
      <h3 class="text-lg font-semibold text-blue-900 mb-2">结算：骗子{{ finalReport?.result }}</h3>
      <p class="text-blue-900 mb-4">{{ finalReport?.scammerSummary }}</p>
      <h4 class="text-sm font-semibold text-blue-900 mb-2">反诈科普</h4>
      <ul class="list-disc pl-5 text-sm text-blue-900 space-y-1">
        <li v-for="(tip, idx) in finalReport?.tips || []" :key="idx">{{ tip }}</li>
      </ul>
      <button @click="restartGame" class="mt-4 px-5 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">再来一局</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import {
  evaluateCustomReply,
  generateFinalReport,
  generateRoundPack,
  RoundGenerationError,
  SCENARIO_THEMES,
  type ScenarioTheme,
  type FinalReport,
  type ScenarioOption
} from '@/services/antiFraudGame'
import { resetRetrieveSession } from '@/services/ragStore'
import { startSession, recordRoundChoice, finishSession, type ChoiceCategory } from '@/services/statsStore'

type ChatMessage = { role: 'user' | 'scammer'; text: string }

const sessionId = ref(`session_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`)

const round = ref(1)
const score = ref(0)
const stage = ref<'playing' | 'final'>('playing')
const loading = ref(false)
const delivering = ref(false)
const replying = ref(false)
const deliveryToken = ref(0)

const freeInput = ref('')
const chatHistory = ref<ChatMessage[]>([])
const currentOptions = ref<ScenarioOption[]>([])
const currentCorrectOptionId = ref('')
const finalReport = ref<FinalReport | null>(null)
const lastJudge = ref('')
const currentTheme = ref<ScenarioTheme | null>(null)
const roundSource = ref<'AI生成' | '检索兜底' | '前端兜底' | ''>('')
const sessionRagUsed = ref(false)
const loadError = ref('')
const rawAiError = ref('')

function lastScammerMessage() {
  const scammerMsgs = chatHistory.value.filter((x) => x.role === 'scammer')
  return scammerMsgs[scammerMsgs.length - 1]?.text || ''
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
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
      chatHistory.value.push({ role: 'scammer', text })
      lastText = text
    }
  } finally {
    if (token === deliveryToken.value) {
      delivering.value = false
    }
  }
}

async function loadRoundPack() {
  loading.value = true
  try {
    if (!currentTheme.value) {
      currentTheme.value = SCENARIO_THEMES[Math.floor(Math.random() * SCENARIO_THEMES.length)]
    }
    const pack = await generateRoundPack(chatHistory.value, round.value, currentTheme.value)
    roundSource.value = pack.source === 'ai' ? 'AI生成' : '检索兜底'
    if (pack.source === 'rag') sessionRagUsed.value = true
    loadError.value = ''
    rawAiError.value = pack.source === 'rag' ? (pack.rawContent || '[无原始正文]') : ''
    const token = deliveryToken.value
    await deliverScammerMessages(pack.scammerMessages, token)
    currentOptions.value = pack.options
    currentCorrectOptionId.value = pack.correctOptionId
  } catch (error) {
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

async function endOrNextRound() {
  if (round.value >= 5) {
    const report = await generateFinalReport(chatHistory.value)
    finalReport.value = report
    chatHistory.value.push({ role: 'scammer', text: report.scammerSummary })
    stage.value = 'final'
    finishSession(sessionId.value, score.value, report.result)
    return
  }

  round.value += 1
  await loadRoundPack()
}

async function pickOption(optionId: string) {
  if (replying.value || loading.value || stage.value !== 'playing') return
  const selected = currentOptions.value.find((x) => x.id === optionId)
  if (!selected) return

  replying.value = true
  try {
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
    await endOrNextRound()
  } finally {
    replying.value = false
  }
}

async function sendCustomReply() {
  if (replying.value || loading.value || stage.value !== 'playing' || !freeInput.value.trim()) return
  const text = freeInput.value.trim().slice(0, 20)
  freeInput.value = text
  replying.value = true

  try {
    chatHistory.value.push({ role: 'user', text })
    const result = await evaluateCustomReply(lastScammerMessage(), text)
    if (result.verdict === 'safe') {
      score.value += 10
      lastJudge.value = '本轮判定：成功反诈，+10分'
    } else if (result.verdict === 'risky') {
      score.value -= 5
      lastJudge.value = '本轮判定：存在风险，-5分'
    } else {
      lastJudge.value = '本轮判定：戏耍中立，积分不变'
    }
    recordRoundChoice(sessionId.value, round.value, `custom_${result.verdict}` as ChoiceCategory, result.verdict === 'safe', currentTheme.value?.id || '', currentTheme.value?.name || '')
    freeInput.value = ''
    await endOrNextRound()
  } finally {
    replying.value = false
  }
}

async function restartGame() {
  deliveryToken.value += 1
  resetRetrieveSession()
  sessionId.value = `session_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  round.value = 1
  score.value = 0
  stage.value = 'playing'
  delivering.value = false
  freeInput.value = ''
  chatHistory.value = []
  currentOptions.value = []
  currentCorrectOptionId.value = ''
  finalReport.value = null
  lastJudge.value = ''
  roundSource.value = ''
  sessionRagUsed.value = false
  loadError.value = ''
  rawAiError.value = ''
  currentTheme.value = SCENARIO_THEMES[Math.floor(Math.random() * SCENARIO_THEMES.length)]
  startSession(sessionId.value, currentTheme.value.id, currentTheme.value.name)
  await loadRoundPack()
}

onMounted(() => {
  restartGame()
})
</script>
