import express from 'express'
import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const app = express()
const port = Number(process.env.LLM_PROXY_PORT || 3001)

const deepseekApiKey = process.env.DEEPSEEK_API_KEY || ''
const deepseekBaseUrl = (process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com/v1').replace(/\/$/, '')
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ragDataDir = path.join(__dirname, 'data')
const ragStorePath = path.join(ragDataDir, 'rag-records.json')
const posterDataDir = path.join(ragDataDir, 'posters')
let ragWriteQueue = Promise.resolve()

app.use(express.json({ limit: '8mb' }))
app.use(
  '/api/posters',
  express.static(posterDataDir, {
    etag: false,
    maxAge: 0,
    setHeaders(res) {
      res.setHeader('Cache-Control', 'no-store')
      res.setHeader('X-Content-Type-Options', 'nosniff')
    }
  })
)

function normalizeTextList(list, maxItems, maxLength) {
  if (!Array.isArray(list)) return []
  return list
    .map((item) => String(item || '').trim())
    .filter(Boolean)
    .slice(0, maxItems)
    .map((item) => item.slice(0, maxLength))
}

function normalizeOptions(options) {
  if (!Array.isArray(options)) return []
  return options.slice(0, 4).map((option) => ({
    id: String(option?.id || '').slice(0, 8),
    text: String(option?.text || '').trim().slice(0, 120),
    category: String(option?.category || '').slice(0, 20)
  })).filter((option) => option.id && option.text && option.category)
}

function summarizeHistory(history) {
  if (!Array.isArray(history)) return ''
  return history
    .slice(-6)
    .map((item) => `${item?.role === 'user' ? 'user' : 'scammer'}:${String(item?.text || '').trim().slice(0, 48)}`)
    .join(' | ')
    .slice(0, 400)
}

function detectRiskTags(text) {
  const tags = []
  const rules = [
    { tag: 'deposit', patterns: ['定金', '占位', '锁单', '先付', '订金'] },
    { tag: 'direct_transfer', patterns: ['转账', '全款', '打款', '付款'] },
    { tag: 'off_platform', patterns: ['私下', '平台外', '绕过平台', '脱离平台'] },
    { tag: 'verification_code', patterns: ['验证码', '校验码'] },
    { tag: 'identity_info', patterns: ['身份证', '实名', '银行卡', '手机号'] },
    { tag: 'fake_link', patterns: ['链接', '页面', '入口', '点进去'] },
    { tag: 'refund', patterns: ['退款', '退票', '退费'] },
    { tag: 'account_access', patterns: ['账号', '登录', '密码', '授权'] }
  ]

  for (const rule of rules) {
    if (rule.patterns.some((pattern) => text.includes(pattern))) tags.push(rule.tag)
  }

  return tags
}

function detectScammerTone(round, text) {
  if (round >= 5) return 'closing'
  if (/[最后|马上|再不|尽快|快点|没了|来不及]/.test(text)) return 'pressure'
  if (/[内部|保真|稳|放心|补票|改口|优惠|名额]/.test(text)) return 'bait'
  if (round === 1) return 'probe'
  if (round === 2 || round === 3) return 'urge'
  return 'pressure'
}

function detectPressureLevel(text) {
  if (/[最后|马上|立刻|现在|再不|没了|来不及]/.test(text)) return 'high'
  if (/[尽快|抓紧|先付|先定|锁单]/.test(text)) return 'medium'
  return 'low'
}

function collectKeywords(themeName, historySummary, scammerMessages, options) {
  const bucket = `${themeName} ${historySummary} ${scammerMessages.join(' ')} ${options.map((option) => option.text).join(' ')}`
  const matches = bucket.match(/[A-Za-z0-9\u4e00-\u9fa5]{2,12}/g) || []
  const seen = new Set()
  const keywords = []

  for (const token of matches) {
    if (seen.has(token)) continue
    seen.add(token)
    keywords.push(token)
    if (keywords.length >= 12) break
  }

  return keywords
}

function classifyRecord(payload) {
  const scammerText = payload.scammerMessages.join(' ')
  const combinedText = `${payload.historySummary} ${scammerText} ${payload.options.map((option) => option.text).join(' ')}`
  return {
    scammerTone: detectScammerTone(payload.round, scammerText),
    pressureLevel: detectPressureLevel(combinedText),
    riskTags: detectRiskTags(combinedText),
    keywords: collectKeywords(payload.themeName, payload.historySummary, payload.scammerMessages, payload.options)
  }
}

function validateRememberPayload(body) {
  const themeId = String(body?.themeId || '').trim().slice(0, 60)
  const themeName = String(body?.themeName || '').trim().slice(0, 60)
  const round = Number(body?.round)
  const source = String(body?.source || '').trim()
  const historySummary = summarizeHistory(body?.history)
  const scammerMessages = normalizeTextList(body?.pack?.scammerMessages, 3, 80)
  const options = normalizeOptions(body?.pack?.options)
  const correctOptionId = String(body?.pack?.correctOptionId || '').trim().slice(0, 8)
  const correctOption = options.find((option) => option.id === correctOptionId) || null

  if (!themeId || !themeName || !Number.isInteger(round) || round < 1 || round > 5) return null
  if (source !== 'ai') return null
  if (scammerMessages.length < 1 || options.length !== 4 || !correctOption) return null

  return {
    themeId,
    themeName,
    round,
    source,
    historySummary,
    scammerMessages,
    options,
    correctOptionId,
    correctOptionText: correctOption.text
  }
}

async function ensureRagStore() {
  await mkdir(ragDataDir, { recursive: true })
  try {
    await readFile(ragStorePath, 'utf8')
  } catch {
    await writeFile(ragStorePath, JSON.stringify({ records: [] }, null, 2))
  }
}

async function loadRagStore() {
  await ensureRagStore()
  try {
    const raw = await readFile(ragStorePath, 'utf8')
    const parsed = JSON.parse(raw)
    if (!parsed || !Array.isArray(parsed.records)) return { records: [] }
    return parsed
  } catch {
    return { records: [] }
  }
}

async function saveRagStore(store) {
  await ensureRagStore()
  const normalized = {
    records: Array.isArray(store.records) ? store.records : []
  }
  await writeFile(ragStorePath, JSON.stringify(normalized, null, 2))
}

function computeRagStats(records) {
  const today = new Date().toISOString().slice(0, 10)
  const byTheme = {}
  const byRound = {}
  const byTone = {}
  const byPressure = {}
  const byRiskTag = {}
  let todayAdded = 0

  for (const record of records) {
    byTheme[record.themeId] = (byTheme[record.themeId] || 0) + 1
    byRound[record.round] = (byRound[record.round] || 0) + 1
    byTone[record.classification.scammerTone] = (byTone[record.classification.scammerTone] || 0) + 1
    byPressure[record.classification.pressureLevel] = (byPressure[record.classification.pressureLevel] || 0) + 1
    for (const tag of record.classification.riskTags) {
      byRiskTag[tag] = (byRiskTag[tag] || 0) + 1
    }
    if (String(record.createdAt || '').slice(0, 10) === today) todayAdded += 1
  }

  return {
    totalRecords: records.length,
    todayAdded,
    byTheme,
    byRound,
    byTone,
    byPressure,
    byRiskTag
  }
}

function enqueueRagWrite(task) {
  ragWriteQueue = ragWriteQueue.then(task, task)
  return ragWriteQueue
}

async function cleanupOldPosters() {
  try {
    const files = await readdir(posterDataDir)
    const now = Date.now()
    const maxAgeMs = 24 * 60 * 60 * 1000
    await Promise.all(files.map(async (file) => {
      if (!/^poster_\d+_[a-z0-9]+\.png$/.test(file)) return
      const createdAt = Number(file.split('_')[1])
      if (!Number.isFinite(createdAt) || now - createdAt <= maxAgeMs) return
      await rm(path.join(posterDataDir, file), { force: true })
    }))
  } catch {
  }
}

app.get('/healthz', async (_req, res) => {
  const store = await loadRagStore()
  res.status(200).json({ ok: true, ragRecords: store.records.length })
})

app.get('/api/rag/stats', async (_req, res) => {
  const store = await loadRagStore()
  res.status(200).json(computeRagStats(store.records))
})

app.post('/api/posters', async (req, res) => {
  const raw = String(req.body?.imageDataUrl || '')
  const match = raw.match(/^data:image\/png;base64,([A-Za-z0-9+/=]+)$/)
  if (!match) {
    res.status(400).json({ error: 'Invalid poster image' })
    return
  }

  const imageBuffer = Buffer.from(match[1], 'base64')
  if (!imageBuffer.length || imageBuffer.length > 6 * 1024 * 1024) {
    res.status(400).json({ error: 'Poster image size out of range' })
    return
  }

  await mkdir(posterDataDir, { recursive: true })
  void cleanupOldPosters()

  const filename = `poster_${Date.now()}_${Math.random().toString(36).slice(2, 10)}.png`
  await writeFile(path.join(posterDataDir, filename), imageBuffer)
  res.status(201).json({ ok: true, url: `/api/posters/${filename}` })
})

app.post('/api/rag/remember', async (req, res) => {
  const payload = validateRememberPayload(req.body)
  if (!payload) {
    res.status(400).json({ error: 'Invalid RAG remember payload' })
    return
  }

  const classification = classifyRecord(payload)
  const record = {
    id: `rag_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
    createdAt: new Date().toISOString(),
    ...payload,
    classification
  }

  await enqueueRagWrite(async () => {
    const store = await loadRagStore()
    store.records.push(record)
    await saveRagStore(store)
  })

  res.status(201).json({ ok: true, recordId: record.id, classification })
})

app.post('/api/llm/chat/completions', async (req, res) => {
  if (!deepseekApiKey) {
    res.status(500).json({ error: 'DEEPSEEK_API_KEY is not configured' })
    return
  }

  try {
    const response = await fetch(`${deepseekBaseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${deepseekApiKey}`
      },
      body: JSON.stringify(req.body)
    })

    const raw = await response.text()
    res.status(response.status)
    res.setHeader('Content-Type', response.headers.get('content-type') || 'application/json')
    res.send(raw)
  } catch (_err) {
    res.status(502).json({ error: 'Upstream request failed' })
  }
})

app.listen(port, () => {
  console.log(`LLM proxy server listening on :${port}`)
})
