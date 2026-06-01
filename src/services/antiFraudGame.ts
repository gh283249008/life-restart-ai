import { LLM_CONFIG } from '@/config/llm'
import { rememberRoundPack, retrieveRoundPack } from './ragStore'

export interface ScenarioOption {
  id: string
  text: string
  category: 'correct' | 'wrong' | 'funny'
}

export interface RoundPack {
  scammerMessages: string[]
  options: ScenarioOption[]
  correctOptionId: string
}

export interface RoundPackResult extends RoundPack {
  source: 'ai' | 'rag'
  rawContent?: string
}

export class RoundGenerationError extends Error {
  rawContent?: string
  stage: 'request' | 'parse_or_validate'
  reason?: 'timeout' | 'network' | 'http' | 'circuit_open' | 'empty_content' | 'unknown'
  status?: number

  constructor(
    message: string,
    stage: 'request' | 'parse_or_validate',
    rawContent?: string,
    reason?: 'timeout' | 'network' | 'http' | 'circuit_open' | 'empty_content' | 'unknown',
    status?: number
  ) {
    super(message)
    this.name = 'RoundGenerationError'
    this.stage = stage
    this.rawContent = rawContent
    this.reason = reason
    this.status = status
  }
}

export interface FinalReport {
  result: '得逞了' | '认输了'
  scammerSummary: string
  tips: string[]
}

export async function generateFinalScammerReply(
  history: Array<{ role: 'user' | 'scammer'; text: string }>
): Promise<string> {
  const content = await callLLM([
    {
      role: 'system',
      content:
        '你是票务诈骗对话生成器中的骗子角色。请基于整局对话给出一句收尾答复。输出纯文本一句话，不要JSON，不要解释，不要思考过程。'
    },
    {
      role: 'user',
      content: `历史对话：${history.map((x) => `${x.role === 'user' ? '我' : '神秘网友'}:${x.text}`).join(' | ')}
要求：
1) 只输出一句骗子口吻收尾台词，8-24字。
2) 可体现破防、认栽、嘴硬、撤退其一。
3) 不包含脏话，不包含隐私信息。`
    }
  ], 120)

  const line = sanitizeUnsafeText(String(content || '').trim().replace(/[\r\n]+/g, ' '))
  if (!line) return '行，你先忙，我撤了。'
  return line.slice(0, 36)
}

export interface ScenarioTheme {
  id: string
  name: string
  brief: string
}

export const SCENARIO_THEMES: ScenarioTheme[] = [
  { id: 'star_concert', name: '明星演唱会', brief: '热门明星巡演门票，骗子声称有内部票和员工票。' },
  { id: 'music_festival', name: '音乐节套票', brief: '双日联票售罄，骗子称可低价转让并催促先付定金。' },
  { id: 'school_show', name: '校园拼团票', brief: '校园群聊拼团买票，骗子冒充团长收集个人信息。' },
  { id: 'last_minute', name: '开场前捡漏', brief: '临开场前放票，骗子制造紧迫感诱导快速转账。' },
  { id: 'fan_group', name: '粉丝群代抢', brief: '骗子冒充后援会管理员，诱导提供账号和验证码。' },
  { id: 'overseas_show', name: '海外场次代购', brief: '跨境票务代购，骗子以海关和税费名义二次收费。' },
  { id: 'sports_event', name: '体育赛事（含世界杯）', brief: '世界杯、联赛和总决赛等热门场次一票难求，骗子冒充内部渠道或临时放票，诱导先款后票与私下交易。' },
  { id: 'scalper_ticket', name: '黄牛票', brief: '骗子伪装黄牛称有保真票源，诱导脱离平台并追加“加急费”。' },
  { id: 'fake_platform', name: '假平台/二手买票平台', brief: '骗子发送仿冒票务平台链接，诱导登录并窃取账号和支付信息。' },
  { id: 'refund_scam', name: '退票诈骗', brief: '骗子冒充客服办理退票退款，诱导提供验证码或进行屏幕共享。' }
]

const unsafeKeywordList = ['色情', '裸聊', '约炮', '毒品', '爆炸物', '种族清洗']
const staleOptionPatterns = [
  '抢得到算我输',
  '不行你报警吧',
  '你先转再说',
  '爱信不信',
  '机不可失',
  '最后一张'
]

const fallbackOptionPool: Record<'correct' | 'wrong' | 'funny', string[]> = {
  correct: [
    '只走平台验真流程，私下转账我不参与。',
    '先把票挂官方平台，我验真通过再下单。',
    '我只接受平台担保交易，其他方式都不聊。',
    '不给个人信息，不脱离平台，这单先按规则来。'
  ],
  wrong: [
    '我先打你一半定金，余款见票再补。',
    '我现在就转，你把验证码也一起发我。',
    '别催了，我直接全款打过去，快把链接给我。',
    '你都这么急了，我先付款占位，手续回头补。'
  ],
  funny: [
    '票先别急，你先通过我的反诈段位考试。',
    '可以交易，前提是你先背三遍防骗顺口溜。',
    '你先发一张今天的空气照，我再决定信不信。',
    '成交前先回答：诈骗克星是谁。'
  ]
}

const fallbackScammerMessagePool: Record<string, string[]> = {
  default: [
    '现在票真的紧张，你不下手很快就没了。',
    '我这边流程很快，你先按我说的走就行。',
    '你再犹豫就被别人拍走了，名额只留一会儿。',
    '我这边可以先帮你锁单，你先确认要不要。'
  ],
  sports_event: [
    '这场临开赛票很抢手，你现在不定就没了。',
    '连坐位只剩最后两张，我先给你锁着。',
    '很多人都在问这场，你这边尽快定。',
    '平台票慢，我这边内部通道出得更快。'
  ],
  fake_platform: [
    '我把入口发你，按页面提示提交就能出票。',
    '这个页面和官方流程一致，你直接照着填。',
    '你先在这边验证一下，过了我就放票。',
    '订单我先给你占着，你现在点进去确认。'
  ],
  refund_scam: [
    '退款通道现在排队，你先按我这边快速处理。',
    '客服这边催得急，你先把流程走完我再给你回执。',
    '系统快截止了，你这边现在操作最稳。',
    '我先帮你挂退款单，你按步骤处理就行。'
  ]
}

function sanitizeUnsafeText(text: string): string {
  let safe = String(text)
  safe = safe.replace(/\b\d{12,19}\b/g, '[银行卡号]')
  safe = safe.replace(/\b\d{17}[\dXx]\b/g, '[身份证号]')
  safe = safe.replace(/\b1[3-9]\d{9}\b/g, '[手机号]')
  safe = safe.replace(/(收款人|姓名|户名)[:：]\s*[\u4e00-\u9fa5]{2,4}/g, '$1:[已脱敏]')
  safe = safe.replace(/(验证码|code)[:：]?\s*\d{4,8}/gi, '$1[已脱敏]')
  return safe
}

function hasUnsafeText(text: string): boolean {
  const src = String(text)
  if (/\b\d{12,19}\b/.test(src)) return true
  if (/\b\d{17}[\dXx]\b/.test(src)) return true
  if (/\b1[3-9]\d{9}\b/.test(src)) return true
  if (/(收款人|姓名|户名)[:：]\s*[\u4e00-\u9fa5]{2,4}/.test(src)) return true
  return unsafeKeywordList.some((k) => src.includes(k))
}

function enforceRoundPackSafety(pack: RoundPack): RoundPack {
  const sanitizedMessages = pack.scammerMessages.map((m, idx) => {
    const text = sanitizeUnsafeText(m)
    return hasUnsafeText(text) ? `这边票源紧张，你先按平台流程验真再操作。(${idx + 1})` : text
  })

  const sanitizedOptions = pack.options.map((o, idx) => {
    const text = sanitizeUnsafeText(o.text)
    if (!hasUnsafeText(text)) return { ...o, text }
    if (o.category === 'correct') {
      return { ...o, text: '只走官方平台核验，不私下转账也不提供隐私信息。' }
    }
    if (o.category === 'funny') {
      return { ...o, text: `你先背一遍反诈口诀，我再考虑要不要回你。(${idx + 1})` }
    }
    return { ...o, text: `先别急，我只接受平台内交易和验真。(${idx + 1})` }
  })

  return {
    ...pack,
    scammerMessages: sanitizedMessages,
    options: sanitizedOptions
  }
}

function normalizeRoundPack(raw: RoundPack): RoundPack {
  const scammerMessages = (raw.scammerMessages || [])
    .map((x) => String(x).trim())
    .filter(Boolean)
    .slice(0, 3)

  const baseMessages = scammerMessages.length > 0 ? scammerMessages : ['我这边还有票，你先走私下流程更快。']

  const rawOptions = (raw.options || []).slice(0, 4).map((o, idx) => ({
    id: ['A', 'B', 'C', 'D'][idx] || String(o?.id || ''),
    text: String(o?.text || '').trim() || `回复话术${idx + 1}`,
    category: o?.category as unknown
  }))

  while (rawOptions.length < 4) {
    const idx = rawOptions.length
    rawOptions.push({
      id: ['A', 'B', 'C', 'D'][idx],
      text: `补充回复${idx + 1}`,
      category: 'wrong' as unknown
    })
  }

  const validCategory = (x: unknown): x is 'correct' | 'wrong' | 'funny' => x === 'correct' || x === 'wrong' || x === 'funny'
  const fixed = rawOptions.map((o) => ({ ...o, category: validCategory(o.category) ? o.category : 'wrong' as const }))

  // 强制归一：保留原始语义，修正数量为 1 correct + 2 wrong + 1 funny
  const ensureCount = (target: 'correct' | 'wrong' | 'funny', expected: number) => {
    const count = fixed.filter((o) => o.category === target).length
    if (count < expected) {
      let need = expected - count
      for (const item of fixed) {
        if (need <= 0) break
        if (item.category !== target) {
          item.category = target
          need -= 1
        }
      }
      return
    }

    if (count > expected) {
      let extra = count - expected
      for (let i = fixed.length - 1; i >= 0 && extra > 0; i -= 1) {
        if (fixed[i].category === target) {
          fixed[i].category = 'wrong'
          extra -= 1
        }
      }
    }
  }

  ensureCount('correct', 1)
  ensureCount('funny', 1)
  ensureCount('wrong', 2)

  const correctOptionId = fixed.find((x) => x.category === 'correct')?.id || 'A'

  return {
    scammerMessages: baseMessages,
    options: fixed,
    correctOptionId
  }
}

function normalizeForCompare(text: string): string {
  return String(text || '')
    .toLowerCase()
    .replace(/[\s\p{P}\p{S}]/gu, '')
}

function containsStalePattern(text: string): boolean {
  return staleOptionPatterns.some((p) => String(text).includes(p))
}

function similarityByCharSet(a: string, b: string): number {
  const sa = new Set(normalizeForCompare(a).split(''))
  const sb = new Set(normalizeForCompare(b).split(''))
  if (sa.size === 0 || sb.size === 0) return 0
  let inter = 0
  for (const ch of sa) {
    if (sb.has(ch)) inter += 1
  }
  return inter / Math.max(sa.size, sb.size)
}

function makeOptionDiversityGuard(
  history: Array<{ role: 'user' | 'scammer'; text: string }>,
  round: number
) {
  const historyTexts = history
    .filter((x) => x.role === 'user')
    .map((x) => String(x.text || '').trim())
    .filter(Boolean)

  return (pack: RoundPack): RoundPack => {
    const usedInRound = new Set<string>()

    const diversified = pack.options.map((opt, idx) => {
      const original = String(opt.text || '').trim()
      const duplicateInRound = Array.from(usedInRound).some((x) => similarityByCharSet(x, original) >= 0.9)
      const similarToHistory = historyTexts.some((x) => similarityByCharSet(x, original) >= 0.92)
      const similarToRecentOptions = recentOptionTexts.some((x) => similarityByCharSet(x, original) >= 0.95)
      const stale = containsStalePattern(original)

      let text = original
      if (stale || duplicateInRound || similarToHistory || similarToRecentOptions) {
        const pool = fallbackOptionPool[opt.category]
        const start = (round + idx) % pool.length
        let picked = pool[start]
        for (let i = 0; i < pool.length; i += 1) {
          const candidate = pool[(start + i) % pool.length]
          const badInRound = Array.from(usedInRound).some((x) => similarityByCharSet(x, candidate) >= 0.9)
          const badInHistory = historyTexts.some((x) => similarityByCharSet(x, candidate) >= 0.92)
          const badInRecent = recentOptionTexts.some((x) => similarityByCharSet(x, candidate) >= 0.95)
          if (!badInRound && !badInHistory && !badInRecent) {
            picked = candidate
            break
          }
        }
        text = picked
      }

      usedInRound.add(text)
      return { ...opt, text }
    })

    return { ...pack, options: diversified }
  }
}

function makeScammerMessageDiversityGuard(
  history: Array<{ role: 'user' | 'scammer'; text: string }>,
  round: number,
  theme: ScenarioTheme
) {
  const historyScammerTexts = history
    .filter((x) => x.role === 'scammer')
    .map((x) => String(x.text || '').trim())
    .filter(Boolean)

  const pool = fallbackScammerMessagePool[theme.id] || fallbackScammerMessagePool.default

  return (pack: RoundPack): RoundPack => {
    const usedInRound = new Set<string>()
    let replacedCount = 0

    const diversifiedMessages = pack.scammerMessages.map((msg, idx) => {
      const original = String(msg || '').trim()
      const duplicateInRound = Array.from(usedInRound).some((x) => similarityByCharSet(x, original) >= 0.92)
      const similarToHistory = historyScammerTexts.some((x) => similarityByCharSet(x, original) >= 0.93)

      let text = original
      const shouldReplace = round >= 3 && (duplicateInRound || similarToHistory) && replacedCount < 1
      if (shouldReplace) {
        const start = (round + idx) % pool.length
        let picked = pool[start]
        for (let i = 0; i < pool.length; i += 1) {
          const candidate = pool[(start + i) % pool.length]
          const badInRound = Array.from(usedInRound).some((x) => similarityByCharSet(x, candidate) >= 0.92)
          const badInHistory = historyScammerTexts.some((x) => similarityByCharSet(x, candidate) >= 0.93)
          if (!badInRound && !badInHistory) {
            picked = candidate
            break
          }
        }
        text = picked
        replacedCount += 1
      }

      usedInRound.add(text)
      return text
    })

    return {
      ...pack,
      scammerMessages: diversifiedMessages
    }
  }
}

function extractJson(raw: string): string {
  const codeMatch = raw.match(/```json\s*([\s\S]*?)\s*```/)
  if (codeMatch?.[1]) return codeMatch[1].trim()
  const objMatch = raw.match(/\{[\s\S]*\}/)
  if (objMatch?.[0]) return objMatch[0]
  return raw.trim()
}

function isLikelyTruncatedJson(raw: string): boolean {
  const text = String(raw || '').trim()
  if (!text) return false
  const open = (text.match(/\{/g) || []).length
  const close = (text.match(/\}/g) || []).length
  // 常见截断特征：花括号不平衡，或不是以 } 结尾
  if (open > close) return true
  if (!text.endsWith('}')) return true
  return false
}

const REQUEST_TIMEOUT_MS = 10000
const MAX_RETRIES = 2
const RETRY_DELAYS_MS = [300, 800, 1500]
const BREAKER_FAIL_THRESHOLD = 6
const BREAKER_COOLDOWN_MS = 8000
const RECENT_OPTION_MEMORY_LIMIT = 24

let failureCount = 0
let breakerUntil = 0
const inflight = new Map<string, Promise<string>>()
const recentOptionTexts: string[] = []

export function resetRoundDiversitySession() {
  recentOptionTexts.length = 0
}

function rememberRecentOptions(options: ScenarioOption[]) {
  for (const opt of options) {
    const text = String(opt.text || '').trim()
    if (text) recentOptionTexts.push(text)
  }
  while (recentOptionTexts.length > RECENT_OPTION_MEMORY_LIMIT) {
    recentOptionTexts.shift()
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function isRetryableStatus(status: number) {
  return status === 429 || status >= 500
}

function recordSuccess() {
  failureCount = 0
  breakerUntil = 0
}

function recordFailure() {
  failureCount += 1
  if (failureCount >= BREAKER_FAIL_THRESHOLD) {
    breakerUntil = Date.now() + BREAKER_COOLDOWN_MS
  }
}

function isCircuitOpen() {
  return Date.now() < breakerUntil
}

async function callLLM(
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
  maxTokens = 6000,
  bypassCircuit = false,
  extraRetries = 0
) {
  if (!bypassCircuit && isCircuitOpen()) {
    const err = new Error('AI 服务冷却中') as Error & { reason?: string }
    err.reason = 'circuit_open'
    throw err
  }

  const key = JSON.stringify({ messages, maxTokens })
  const existing = inflight.get(key)
  if (existing) {
    return existing
  }

  const requestPromise = (async () => {
    const retryBudget = MAX_RETRIES + extraRetries
    for (let attempt = 0; attempt <= retryBudget; attempt += 1) {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

      try {
        const requestMessages = messages.map((m) => ({
          role: m.role,
          content: m.content
        }))

        const response = await fetch(`${LLM_CONFIG.baseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: LLM_CONFIG.model,
            messages: requestMessages,
            stream: false,
            thinking: { type: 'disabled' },
            temperature: 0.5,
            max_tokens: maxTokens
          }),
          signal: controller.signal,
          keepalive: true
        })

        if (!response.ok) {
          let rawBody = ''
          try {
            rawBody = await response.text()
          } catch {
            rawBody = ''
          }
          if (isRetryableStatus(response.status) && attempt < retryBudget) {
            await sleep(RETRY_DELAYS_MS[attempt] || 1500)
            continue
          }
          const err = new Error(`AI 请求失败: ${response.status} ${response.statusText}`) as Error & { status?: number; rawContent?: string; reason?: string }
          err.status = response.status
          err.rawContent = rawBody || `[无原始正文：HTTP ${response.status}]`
          err.reason = 'http'
          throw err
        }

        const data = await response.json()
        const content = data?.choices?.[0]?.message?.content
        if (!content) {
          const err = new Error('AI 返回为空') as Error & { reason?: string }
          err.reason = 'empty_content'
          throw err
        }
        recordSuccess()
        return content as string
      } catch (error) {
        const typedError = error as Error & { status?: number; reason?: string }
        const aborted = typedError instanceof Error && typedError.name === 'AbortError'
        const status = typedError.status
        if (aborted) {
          typedError.reason = 'timeout'
        } else if (error instanceof TypeError) {
          typedError.reason = 'network'
        }
        if ((aborted || error instanceof TypeError) && attempt < retryBudget) {
          await sleep(RETRY_DELAYS_MS[attempt] || 1500)
          continue
        }
        // 4xx 多为请求语义问题，不触发全局熔断，避免后续轮次全降级
        if (!status || status >= 500 || status === 429 || aborted || error instanceof TypeError) {
          recordFailure()
        }
        throw error
      } finally {
        clearTimeout(timer)
      }
    }

    recordFailure()
    throw new Error('AI 请求失败')
  })()

  inflight.set(key, requestPromise)
  try {
    return await requestPromise
  } finally {
    inflight.delete(key)
  }
}

export async function generateRoundPack(
  history: Array<{ role: 'user' | 'scammer'; text: string }>,
  round: number,
  theme: ScenarioTheme
): Promise<RoundPackResult> {
  const diversifyOptions = makeOptionDiversityGuard(history, round)
  const diversifyScammerMessages = makeScammerMessageDiversityGuard(history, round, theme)
  const postProcessPack = (rawPack: RoundPack): RoundPack => {
    let pack = normalizeRoundPack(rawPack)
    pack = enforceRoundPackSafety(pack)
    pack = diversifyScammerMessages(pack)
    pack = diversifyOptions(pack)
    return pack
  }
  const buildPromptMessages = () => [
    {
      role: 'system' as const,
      content:
        '你是票务诈骗对话生成器。你扮演骗子“坏窝瓜”，每轮尝试诱导用户泄露隐私或先转账。输出必须是最终 JSON，不要输出思考过程。'
    },
    {
      role: 'user' as const,
      content: `当前第${round}轮（共5轮），本轮情节：${theme.name}。情节背景：${theme.brief}
历史对话：${history.map((x) => `${x.role === 'user' ? '我' : '神秘网友'}:${x.text}`).join(' | ') || '无'}。
请输出：
{
  "scammerMessages": ["骗子短消息1", "骗子短消息2", "骗子短消息3"],
  "options": [
    {"id":"A","text":"玩家回复话术A","category":"correct|wrong|funny"},
    {"id":"B","text":"玩家回复话术B","category":"correct|wrong|funny"},
    {"id":"C","text":"玩家回复话术C","category":"correct|wrong|funny"},
    {"id":"D","text":"玩家回复话术D","category":"correct|wrong|funny"}
  ],
  "correctOptionId": "A/B/C/D"
}
规则：
1) scammerMessages 输出 1-3 条，每条 8-28 字，必须口语化，像即时聊天。
2) 同一轮内骗子消息不能语义复读；必须紧接历史对话推进情节，不能突然换话题。
3) options 必须 4 条且不重复：1个correct、2个wrong、1个funny；四条在语义意图上必须明显不同。
4) options 全部是玩家视角回复话术。correct体现反诈动作（不脱离平台、不转账、不泄露隐私、要求平台验真）；wrong有迷惑性；funny可整活。
5) 对话中不要出现任何真实姓名；仅在必须使用称呼时可用“坏窝瓜”作为骗子代称，但禁止高频重复自称“坏窝瓜”。
6) 回复内容禁止出现脏话或辱骂词，如“傻蛋”“笨蛋”“傻逼”等。
7) 禁止输出完整身份证号、银行卡号、手机号、验证码等隐私信息。
8) 第四/第五轮若玩家持续戏耍，允许骗子出现轻度气急败坏情绪。
9) 语言风格要求：小红书语感，年轻口语、轻情绪、网感表达；短句、有节奏、可截图传播。
10) 对话将用于左右角色漫画分镜，台词要有戏剧张力与角色感。
11) 禁止复用高频模板句。像“抢得到算我输”“不行你报警吧”“你先转再说”这类整句在单局内最多出现一次，后续必须换表达。
12) wrong 的两个选项必须采用不同诱导策略（如“先付定金型”与“情绪施压型”），不能只换个别字。
13) funny 选项每轮都要有新梗，禁止与历史 funny 选项高相似复述（避免仅替换 1-2 个词）。
14) 五轮必须构成完整连续对话：第N轮必须回应第N-1轮玩家态度（质疑/拖延/戏耍/拒绝）。
15) 骗子策略要有递进：试探 -> 催促 -> 施压 -> 补诱饵/改口 -> 收尾表态，不能每轮都像重开新对话。
16) 每轮至少引用一个上轮信息点（如“你刚才说平台验真”“你一直不转账”），增强承接感。
17) 如果玩家连续坚持官方流程，骗子语气应逐轮从热情转急躁；如果玩家连续戏耍，骗子应逐轮更破防。
18) 严禁“场景重置句式”，例如“我这边有票你要吗”在第3轮后再次作为开场主句。`
    }
  ]

  let content = ''
  const isFirstRound = round === 1
  try {
    content = await callLLM(buildPromptMessages(), 6000, isFirstRound, isFirstRound ? 1 : 0)
  } catch (error) {
    const reqRaw = (error as { rawContent?: string })?.rawContent || ''
    const reqStatus = (error as { status?: number })?.status
    const reqReason = (error as { reason?: 'timeout' | 'network' | 'http' | 'circuit_open' | 'empty_content' | 'unknown' })?.reason || 'unknown'
    // 首轮强制优先 AI，不直接进入 RAG
    if (isFirstRound) {
      try {
        content = await callLLM(buildPromptMessages(), 6000, true, 2)
      } catch {
        // fall through to degrade chain
      }
    }

    if (content) {
      // first-round forced retry succeeded
    } else {
      // 仅在请求层失败时使用 RAG
      const recalled = retrieveRoundPack(history, round, theme)
      if (recalled) {
        const safe = postProcessPack(recalled)
        rememberRecentOptions(safe.options)
        return { ...safe, source: 'rag', rawContent: reqRaw || '[无原始正文：请求阶段失败]' }
      }
      throw new RoundGenerationError(
        `AI请求失败且无可用检索结果（reason=${reqReason}${reqStatus ? `, status=${reqStatus}` : ''}）`,
        'request',
        reqRaw || '[无原始正文：请求阶段失败]',
        reqReason,
        reqStatus
      )
    }
  }

  try {
    let lastErr: unknown = null
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        let parsed: RoundPack
        try {
          parsed = JSON.parse(extractJson(content)) as RoundPack
        } catch {
          const repaired = await callLLM([
            {
              role: 'system',
              content: '你是JSON修复器。只输出合法JSON，不输出解释。'
            },
            {
              role: 'user',
              content: `把下面内容修复为合法 JSON，保持语义不变：\n${content}`
            }
          ], 520, true, 1)
          parsed = JSON.parse(extractJson(repaired)) as RoundPack
        }

        parsed = postProcessPack(parsed)
        rememberRecentOptions(parsed.options)
        rememberRoundPack(history, round, theme, parsed)
        return { ...parsed, source: 'ai' }
      } catch (e) {
        lastErr = e
        if (attempt < 2) {
          // 若发现截断，优先提高 tokens 重试，避免半截 JSON
          const nextTokens = 6000
          content = await callLLM(buildPromptMessages(), nextTokens, true, 1)
        }
      }
    }
    throw lastErr
  } catch {
    // 先尝试一次 AI 二次修复，尽量保持本轮仍为 AI 生成
    try {
      const regen = await callLLM([
        {
          role: 'system',
          content: '你是票务反诈回合修复器。只输出合法JSON，不要解释。'
        },
        {
          role: 'user',
          content: `请重新生成第${round}轮回合JSON，要求：1个correct、2个wrong、1个funny；消息1-3条且不重复；不含隐私泄露样例。`
        }
      ], 6000)

      const repaired = JSON.parse(extractJson(regen)) as RoundPack
      if (
        repaired.options &&
        repaired.options.length === 4 &&
        repaired.scammerMessages &&
        repaired.scammerMessages.length >= 1
      ) {
        repaired.scammerMessages = [...new Set(repaired.scammerMessages.slice(0, 3).map((x) => String(x).slice(0, 40)))]
        const safe = postProcessPack(repaired)
        rememberRecentOptions(safe.options)
        rememberRoundPack(history, round, theme, safe)
        return { ...safe, source: 'ai' }
      }
    } catch {
      // ignore and continue degrade
    }
    const recalled = retrieveRoundPack(history, round, theme)
    if (recalled) {
      const safe = postProcessPack(recalled)
      rememberRecentOptions(safe.options)
      return { ...safe, source: 'rag', rawContent: content || '[无原始正文：校验阶段失败]' }
    }
    throw new RoundGenerationError('AI校验失败且无可用检索结果（reason=parse_or_validate）', 'parse_or_validate', content, 'unknown')
  }
}

export async function evaluateCustomReply(
  scammerMessage: string,
  userReply: string
): Promise<{ verdict: 'safe' | 'risky' | 'tease' }> {
  const content = await callLLM([
    {
      role: 'system',
      content: '你是反诈评估器。判断用户回复是成功反诈、风险泄露、还是戏耍中立。直接输出最终 JSON，不要输出思考过程。'
    },
    {
      role: 'user',
      content: `骗子消息：${scammerMessage}
用户回复：${userReply}
判定规则：
1) 明确拒绝转账、拒绝泄露隐私、要求平台验真、建议举报，判定 safe。
2) 提供个人信息、验证码、银行卡、转账意愿，判定 risky。
3) 故意整活、戏耍、给明显假信息、无真实泄露且无明确反诈动作，判定 tease。
输出：{"verdict":"safe|risky|tease"}`
    }
  ], 200)

  const parsed = JSON.parse(extractJson(content)) as { verdict: 'safe' | 'risky' | 'tease' }
  const verdict = parsed.verdict
  if (verdict !== 'safe' && verdict !== 'risky' && verdict !== 'tease') {
    return { verdict: 'tease' }
  }
  return { verdict }
}

export async function generateFinalReport(
  history: Array<{ role: 'user' | 'scammer'; text: string }>
): Promise<FinalReport> {
  const content = await callLLM([
    {
      role: 'system',
      content: '你是反诈游戏结算器。基于整局上下文判断骗子是得逞了还是认输了，并输出有小红书网感的结算总结和3条科普建议。严格 JSON。直接输出最终 JSON，不要输出思考过程。'
    },
    {
      role: 'user',
      content: `历史对话：${history.map((x) => `${x.role === 'user' ? '我' : '神秘网友'}:${x.text}`).join(' | ')}
语气规则：
1) 总结语必须是 1-2 句，年轻口语、有网感、有情绪，不要干巴巴。
2) 如果结果偏向“认输了”，且玩家坚持走官方/验真/不转账，语气要鼓励与点赞。
3) 如果玩家多次戏耍骗子（整局明显在整活），语气要夸奖机智与反诈意识。
4) 如果结果偏向“得逞了”或出现被骗风险，语气要安慰，强调可补救动作，避免指责。
5) 禁止脏话、羞辱、冷嘲热讽；不要出现真实姓名或隐私信息。
输出：
{
  "result":"得逞了|认输了",
  "scammerSummary":"结算总结文案（1-2句，小红书网感，按结果匹配鼓励/夸奖/安慰语气）",
  "tips":["科普1","科普2","科普3"]
}`
    }
  ])

  const parsed = JSON.parse(extractJson(content)) as FinalReport
  if (!parsed.tips || parsed.tips.length < 3 || !parsed.scammerSummary) {
    throw new Error('结算数据异常')
  }
  parsed.scammerSummary = sanitizeUnsafeText(parsed.scammerSummary)
  parsed.tips = parsed.tips.map((t) => sanitizeUnsafeText(t))
  if (parsed.result !== '得逞了' && parsed.result !== '认输了') {
    parsed.result = '得逞了'
  }
  return parsed
}
