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
  { id: 'overseas_show', name: '海外场次代购', brief: '跨境票务代购，骗子以海关和税费名义二次收费。' }
]

const unsafeKeywordList = ['色情', '裸聊', '约炮', '毒品', '爆炸物', '种族清洗']

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

let failureCount = 0
let breakerUntil = 0
const inflight = new Map<string, Promise<string>>()

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
  maxTokens = 420,
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
        const systemParts = messages.filter((m) => m.role === 'system').map((m) => m.content)
        const mergedInstructions = [
          LLM_CONFIG.noThinking ? 'No thinking mode. Output final answer directly.' : '',
          ...systemParts
        ]
          .filter(Boolean)
          .join('\n\n')
        const nonSystemParts = messages
          .filter((m) => m.role !== 'system')
          .map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)

        const response = await fetch(`${LLM_CONFIG.baseUrl}/responses`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${LLM_CONFIG.apiKey}`
          },
          body: JSON.stringify({
            model: LLM_CONFIG.model,
            instructions: mergedInstructions || 'You are a helpful assistant.',
            input: nonSystemParts.join('\n\n') || '你好',
            stream: false,
            thinking: LLM_CONFIG.noThinking ? false : undefined,
            temperature: 0.5,
            max_output_tokens: maxTokens
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
        const outputText = data?.output_text
        const outputArrayText = Array.isArray(data?.output)
          ? data.output
              .flatMap((item: { content?: Array<{ text?: string }> }) => item?.content || [])
              .map((c: { text?: string }) => c?.text || '')
              .join('\n')
          : ''
        const compatChoiceText = data?.choices?.[0]?.message?.content
        const content = outputText || outputArrayText || compatChoiceText
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
  const buildPromptMessages = () => [
    {
      role: 'system' as const,
      content:
        '你是票务诈骗对话生成器。你扮演骗子，每轮都要尝试诱导用户泄露手机号、身份证、验证码、收货地址、银行卡信息或先转账。直接输出最终 JSON，不要输出思考过程。'
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
0) scammerMessages 随机 1-3 条。
1) 每条骗子消息 8-28 字，口语化，像即时聊天。
2) 同一轮内 scammerMessages 不能语义重复，不能只改个别字复读。
3) options 的 text 不能重复，语义也要有差异。
4) 1个correct、2个wrong、1个funny。
5) wrong要有迷惑性，funny要整活。
6) correct要体现反诈动作：不脱离平台、不转账、不泄露隐私、要求平台验真。
7) 涉及到真实姓名的情况，一律输出“坏蛋薯”。
8) 无论如何不能主动输出完整的身份证号、银行卡号、手机号等个人信息。
9) 骗子回复必须参考历史对话内容做出生动、有情绪、有变化的回应，不能机械重复套路。
10) 轮次接近结束的时候（第四轮/第五轮），如果玩家依然采用戏耍类态度，允许回复带有轻度气急败坏情绪的内容。
 11) options 必须是玩家视角的回复话术，不能是骗子视角的话术。正确选项是玩家识破骗局的应对方式，错误选项是玩家被误导的应对方式。
 12) 对话将用于左右两个角色的漫画分镜，请输出更有戏剧张力和角色个性的短句，避免平铺直叙。`
    }
  ]

  let content = ''
  const isFirstRound = round === 1
  try {
    content = await callLLM(buildPromptMessages(), 3000, isFirstRound, isFirstRound ? 1 : 0)
  } catch (error) {
    const reqRaw = (error as { rawContent?: string })?.rawContent || ''
    const reqStatus = (error as { status?: number })?.status
    const reqReason = (error as { reason?: 'timeout' | 'network' | 'http' | 'circuit_open' | 'empty_content' | 'unknown' })?.reason || 'unknown'
    // 首轮强制优先 AI，不直接进入 RAG
    if (isFirstRound) {
      try {
        content = await callLLM(buildPromptMessages(), 3000, true, 2)
      } catch {
        // fall through to degrade chain
      }
    }

    if (content) {
      // first-round forced retry succeeded
    } else {
      // 仅在请求层失败时使用 RAG
      const recalled = retrieveRoundPack(history, round, theme)
      if (recalled) return { ...recalled, source: 'rag', rawContent: reqRaw || '[无原始正文：请求阶段失败]' }
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

        parsed = normalizeRoundPack(parsed)
        parsed = enforceRoundPackSafety(parsed)
        rememberRoundPack(history, round, theme, parsed)
        return { ...parsed, source: 'ai' }
      } catch (e) {
        lastErr = e
        if (attempt < 2) {
          // 若发现截断，优先提高 tokens 重试，避免半截 JSON
          const nextTokens = 3000
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
      ], 3000)

      const repaired = JSON.parse(extractJson(regen)) as RoundPack
      if (
        repaired.options &&
        repaired.options.length === 4 &&
        repaired.scammerMessages &&
        repaired.scammerMessages.length >= 1
      ) {
        repaired.scammerMessages = [...new Set(repaired.scammerMessages.slice(0, 3).map((x) => String(x).slice(0, 40)))]
        const safe = enforceRoundPackSafety(repaired)
        rememberRoundPack(history, round, theme, safe)
        return { ...safe, source: 'ai' }
      }
    } catch {
      // ignore and continue degrade
    }
    const recalled = retrieveRoundPack(history, round, theme)
    if (recalled) return { ...recalled, source: 'rag', rawContent: content || '[无原始正文：校验阶段失败]' }
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
      content: '你是反诈游戏结算器。基于整局上下文判断骗子是得逞了还是认输了，并输出最终一句总结和3条科普建议。严格 JSON。直接输出最终 JSON，不要输出思考过程。'
    },
    {
      role: 'user',
      content: `历史对话：${history.map((x) => `${x.role === 'user' ? '我' : '神秘网友'}:${x.text}`).join(' | ')}
输出：
{
  "result":"得逞了|认输了",
  "scammerSummary":"骗子最后一句总结台词，得逞了或认输了",
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
