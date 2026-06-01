import express from 'express'

const app = express()
const port = Number(process.env.LLM_PROXY_PORT || 3001)

const deepseekApiKey = process.env.DEEPSEEK_API_KEY || ''
const deepseekBaseUrl = (process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com/v1').replace(/\/$/, '')

app.use(express.json({ limit: '1mb' }))

app.get('/healthz', (_req, res) => {
  res.status(200).json({ ok: true })
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
