import { LLM_CONFIG } from '@/config/llm'

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

function extractJson(raw: string): string {
  const codeMatch = raw.match(/```json\s*([\s\S]*?)\s*```/)
  if (codeMatch?.[1]) return codeMatch[1].trim()
  const objMatch = raw.match(/\{[\s\S]*\}/)
  if (objMatch?.[0]) return objMatch[0]
  return raw.trim()
}

async function callLLM(messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>, maxTokens = 420) {
  const response = await fetch(`${LLM_CONFIG.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${LLM_CONFIG.apiKey}`
    },
    body: JSON.stringify({
      model: LLM_CONFIG.model,
      messages,
      temperature: 0.75,
      max_tokens: maxTokens
    })
  })

  if (!response.ok) {
    throw new Error(`AI 请求失败: ${response.status} ${response.statusText}`)
  }

  const data = await response.json()
  const content = data?.choices?.[0]?.message?.content
  if (!content) {
    throw new Error('AI 返回为空')
  }
  return content as string
}

export async function generateRoundPack(
  history: Array<{ role: 'user' | 'scammer'; text: string }>,
  round: number,
  theme: ScenarioTheme
): Promise<RoundPack> {
  const content = await callLLM([
    {
      role: 'system',
      content:
        '你是票务诈骗对话生成器。你扮演骗子，每轮都要尝试诱导用户泄露手机号、身份证、验证码、收货地址、银行卡信息或先转账。直接输出最终 JSON，不要输出思考过程。'
    },
    {
      role: 'user',
      content: `当前第${round}轮（共5轮），本轮情节：${theme.name}。情节背景：${theme.brief}
历史对话：${history.map((x) => `${x.role === 'user' ? '我' : '神秘网友'}:${x.text}`).join(' | ') || '无'}。
请输出：
{
  "scammerMessages": ["骗子短消息1", "骗子短消息2", "骗子短消息3"],
  "options": [
    {"id":"A","text":"回复话术A","category":"correct|wrong|funny"},
    {"id":"B","text":"回复话术B","category":"correct|wrong|funny"},
    {"id":"C","text":"回复话术C","category":"correct|wrong|funny"},
    {"id":"D","text":"回复话术D","category":"correct|wrong|funny"}
  ],
  "correctOptionId": "A/B/C/D"
}
规则：
0) scammerMessages 随机 1-3 条。
1) 每条骗子消息 8-28 字，口语化，像即时聊天。
1) 1个correct、2个wrong、1个funny。
2) wrong要有迷惑性，funny要整活。
3) correct要体现反诈动作：不脱离平台、不转账、不泄露隐私、要求平台验真。`
    }
  ])

  const parsed = JSON.parse(extractJson(content)) as RoundPack
  if (!parsed.options || parsed.options.length !== 4 || !parsed.scammerMessages || parsed.scammerMessages.length < 1) {
    throw new Error('回合数据异常')
  }
  parsed.scammerMessages = parsed.scammerMessages.slice(0, 3).map((x) => String(x).slice(0, 40))

  const categoryCount = parsed.options.reduce(
    (acc, item) => {
      acc[item.category] = (acc[item.category] || 0) + 1
      return acc
    },
    { correct: 0, wrong: 0, funny: 0 } as Record<'correct' | 'wrong' | 'funny', number>
  )

  if (categoryCount.correct !== 1 || categoryCount.wrong !== 2 || categoryCount.funny !== 1) {
    throw new Error('选项类型不符合要求')
  }

  return parsed
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
  history: Array<{ role: 'user' | 'scammer'; text: string }>,
  score: number
): Promise<FinalReport> {
  const presetResult: '得逞了' | '认输了' = score >= 20 ? '认输了' : '得逞了'
  const content = await callLLM([
    {
      role: 'system',
      content: '你是反诈游戏结算器。输出骗子最终一句总结和3条科普建议，严格 JSON。直接输出最终 JSON，不要输出思考过程。'
    },
    {
      role: 'user',
      content: `历史对话：${history.map((x) => `${x.role === 'user' ? '我' : '神秘网友'}:${x.text}`).join(' | ')}
结算结果固定为：${presetResult}
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
  parsed.result = presetResult
  return parsed
}
