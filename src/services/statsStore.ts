export type ChoiceCategory = 'correct' | 'wrong' | 'funny' | 'custom_safe' | 'custom_risky' | 'custom_tease' | 'skip'

export interface RoundChoiceRecord {
  sessionId: string
  round: number
  choiceCategory: ChoiceCategory
  isCorrect: boolean
  themeId: string
  themeName: string
  timestamp: number
}

export interface SessionRecord {
  sessionId: string
  themeId: string
  themeName: string
  startedAt: number
  finishedAt: number | null
  finalScore: number
  finalResult: '得逞了' | '认输了' | null
  roundChoices: RoundChoiceRecord[]
}

export interface DayStats {
  date: string
  totalSessions: number
  totalRounds: number
  correctCount: number
  wrongCount: number
  funnyCount: number
  customSafeCount: number
  customRiskyCount: number
  customTeaseCount: number
  skipCount: number
  avgScore: number
  scammerWonCount: number
  scammerLostCount: number
}

const STATS_KEY = 'anti_fraud_stats_v1'

function loadSessions(): SessionRecord[] {
  try {
    const raw = localStorage.getItem(STATS_KEY)
    if (!raw) return []
    return JSON.parse(raw) as SessionRecord[]
  } catch {
    return []
  }
}

function saveSessions(sessions: SessionRecord[]) {
  localStorage.setItem(STATS_KEY, JSON.stringify(sessions.slice(-500)))
}

export function startSession(sessionId: string, themeId: string, themeName: string) {
  const sessions = loadSessions()
  sessions.push({
    sessionId,
    themeId,
    themeName,
    startedAt: Date.now(),
    finishedAt: null,
    finalScore: 0,
    finalResult: null,
    roundChoices: []
  })
  saveSessions(sessions)
}

export function recordRoundChoice(
  sessionId: string,
  round: number,
  choiceCategory: ChoiceCategory,
  isCorrect: boolean,
  themeId: string,
  themeName: string
) {
  const sessions = loadSessions()
  const session = sessions.find((s) => s.sessionId === sessionId)
  if (!session) return
  session.roundChoices.push({
    sessionId,
    round,
    choiceCategory,
    isCorrect,
    themeId,
    themeName,
    timestamp: Date.now()
  })
  saveSessions(sessions)
}

export function finishSession(sessionId: string, finalScore: number, finalResult: '得逞了' | '认输了') {
  const sessions = loadSessions()
  const session = sessions.find((s) => s.sessionId === sessionId)
  if (!session) return
  session.finishedAt = Date.now()
  session.finalScore = finalScore
  session.finalResult = finalResult
  saveSessions(sessions)
}

export function getDayStats(dateStr?: string): DayStats {
  const targetDate = dateStr || new Date().toISOString().slice(0, 10)
  const sessions = loadSessions()

  const daySessions = sessions.filter((s) => {
    const day = new Date(s.startedAt).toISOString().slice(0, 10)
    return day === targetDate
  })

  const finishedSessions = daySessions.filter((s) => s.finishedAt !== null)
  const allChoices = daySessions.flatMap((s) => s.roundChoices)

  const totalRounds = allChoices.length
  const correctCount = allChoices.filter((c) => c.choiceCategory === 'correct').length
  const wrongCount = allChoices.filter((c) => c.choiceCategory === 'wrong').length
  const funnyCount = allChoices.filter((c) => c.choiceCategory === 'funny').length
  const customSafeCount = allChoices.filter((c) => c.choiceCategory === 'custom_safe').length
  const customRiskyCount = allChoices.filter((c) => c.choiceCategory === 'custom_risky').length
  const customTeaseCount = allChoices.filter((c) => c.choiceCategory === 'custom_tease').length
  const skipCount = allChoices.filter((c) => c.choiceCategory === 'skip').length

  const avgScore = finishedSessions.length > 0
    ? finishedSessions.reduce((sum, s) => sum + s.finalScore, 0) / finishedSessions.length
    : 0

  const scammerWonCount = finishedSessions.filter((s) => s.finalResult === '得逞了').length
  const scammerLostCount = finishedSessions.filter((s) => s.finalResult === '认输了').length

  return {
    date: targetDate,
    totalSessions: daySessions.length,
    totalRounds,
    correctCount,
    wrongCount,
    funnyCount,
    customSafeCount,
    customRiskyCount,
    customTeaseCount,
    skipCount,
    avgScore: Math.round(avgScore * 10) / 10,
    scammerWonCount,
    scammerLostCount
  }
}

export function getRecentDayStats(days: number = 7): DayStats[] {
  const result: DayStats[] = []
  const now = new Date()
  for (let i = 0; i < days; i += 1) {
    const d = new Date(now.getTime() - i * 86400000)
    const dateStr = d.toISOString().slice(0, 10)
    result.push(getDayStats(dateStr))
  }
  return result
}