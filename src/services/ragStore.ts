import type { RoundPack, ScenarioTheme } from './antiFraudGame'

interface RoundMemoryRecord {
  id: string
  themeId: string
  round: number
  queryText: string
  vector: number[]
  pack: RoundPack
  createdAt: number
}

const STORE_KEY = 'anti_fraud_round_memory_v1'
const VECTOR_DIM = 96
const MAX_RECORDS = 400
const usedRecordIds = new Set<string>()

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter(Boolean)
}

function hashToken(token: string): number {
  let hash = 0
  for (let i = 0; i < token.length; i += 1) {
    hash = (hash * 31 + token.charCodeAt(i)) >>> 0
  }
  return hash
}

function vectorize(text: string): number[] {
  const vec = Array.from({ length: VECTOR_DIM }, () => 0)
  const tokens = tokenize(text)
  if (tokens.length === 0) return vec
  for (const t of tokens) {
    const idx = hashToken(t) % VECTOR_DIM
    vec[idx] += 1
  }
  const norm = Math.sqrt(vec.reduce((sum, x) => sum + x * x, 0)) || 1
  return vec.map((x) => x / norm)
}

function cosine(a: number[], b: number[]): number {
  let sum = 0
  for (let i = 0; i < VECTOR_DIM; i += 1) {
    sum += (a[i] || 0) * (b[i] || 0)
  }
  return sum
}

function loadRecords(): RoundMemoryRecord[] {
  try {
    const raw = localStorage.getItem(STORE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as RoundMemoryRecord[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function saveRecords(records: RoundMemoryRecord[]) {
  localStorage.setItem(STORE_KEY, JSON.stringify(records.slice(-MAX_RECORDS)))
}

function buildQueryText(history: Array<{ role: 'user' | 'scammer'; text: string }>, round: number, theme: ScenarioTheme): string {
  const latest = history.slice(-6).map((x) => `${x.role}:${x.text}`).join(' | ')
  return `theme:${theme.id} round:${round} brief:${theme.brief} history:${latest}`
}

export function rememberRoundPack(
  history: Array<{ role: 'user' | 'scammer'; text: string }>,
  round: number,
  theme: ScenarioTheme,
  pack: RoundPack
) {
  const queryText = buildQueryText(history, round, theme)
  const record: RoundMemoryRecord = {
    id: `mem_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    themeId: theme.id,
    round,
    queryText,
    vector: vectorize(queryText),
    pack,
    createdAt: Date.now()
  }
  const records = loadRecords()
  records.push(record)
  saveRecords(records)
}

export function retrieveRoundPack(
  history: Array<{ role: 'user' | 'scammer'; text: string }>,
  round: number,
  theme: ScenarioTheme
): RoundPack | null {
  const records = loadRecords()
  if (records.length === 0) return null

  const queryText = buildQueryText(history, round, theme)
  const queryVec = vectorize(queryText)

  const ranked = records
    .filter((r) => r.themeId === theme.id && r.round === round && !usedRecordIds.has(r.id))
    .map((r) => ({ record: r, score: cosine(queryVec, r.vector) }))
    .sort((a, b) => b.score - a.score)

  const best = ranked[0]
  if (!best || best.score < 0.24) return null

  const pack = best.record.pack
  const valid =
    Array.isArray(pack.scammerMessages) &&
    pack.scammerMessages.length >= 1 &&
    Array.isArray(pack.options) &&
    pack.options.length === 4
  if (!valid) return null

  usedRecordIds.add(best.record.id)

  return {
    scammerMessages: pack.scammerMessages.slice(0, 3),
    options: pack.options,
    correctOptionId: pack.correctOptionId
  }
}

export function resetRetrieveSession() {
  usedRecordIds.clear()
}
