import type { FinalReport, ScenarioTheme } from './antiFraudGame'

interface ChatMessage {
  role: 'user' | 'scammer'
  text: string
}

export interface GameResultSnapshot {
  sessionId: string
  score: number
  finalReport: FinalReport
  theme: ScenarioTheme | null
  chatHistory: ChatMessage[]
  endedAt: number
}

const RESULT_KEY = 'anti_fraud_result_snapshot_v1'

export function saveGameResultSnapshot(snapshot: GameResultSnapshot) {
  sessionStorage.setItem(RESULT_KEY, JSON.stringify(snapshot))
}

export function loadGameResultSnapshot(): GameResultSnapshot | null {
  try {
    const raw = sessionStorage.getItem(RESULT_KEY)
    if (!raw) return null
    return JSON.parse(raw) as GameResultSnapshot
  } catch {
    return null
  }
}

export function clearGameResultSnapshot() {
  sessionStorage.removeItem(RESULT_KEY)
}
