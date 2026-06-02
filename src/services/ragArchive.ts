import type { RoundPack, ScenarioTheme } from './antiFraudGame'

interface ChatMessage {
  role: 'user' | 'scammer'
  text: string
}

export async function archiveRoundPack(
  history: ChatMessage[],
  round: number,
  theme: ScenarioTheme,
  pack: RoundPack
) {
  await fetch('/api/rag/remember', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      source: 'ai',
      themeId: theme.id,
      themeName: theme.name,
      round,
      history,
      pack
    })
  })
}
