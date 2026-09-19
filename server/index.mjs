import http from 'node:http'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { buildQuestions } from '../src/questions.mjs'

const PORT = process.env.PORT ?? 8788
const JEV_URL = 'https://api.typesafe.ai/v1/systemone'

function loadApiKey() {
  if (process.env.TYPESAFE_API_KEY) return process.env.TYPESAFE_API_KEY
  try {
    const env = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', '.env'), 'utf8')
    return env.match(/^TYPESAFE_API_KEY=(.+)$/m)?.[1].trim()
  } catch {
    return undefined
  }
}

const API_KEY = loadApiKey()
const QUESTIONS = buildQuestions()

function json(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify(body))
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'GET' && req.url === '/api/health') {
    return json(res, 200, { ok: true, hasKey: Boolean(API_KEY) })
  }
  if (req.method === 'POST' && req.url === '/api/conduct') {
    let raw = ''
    for await (const chunk of req) raw += chunk
    let frase
    try {
      frase = JSON.parse(raw).frase
    } catch {
      return json(res, 400, { error: 'JSON inválido' })
    }
    if (typeof frase !== 'string' || !frase.trim()) {
      return json(res, 400, { error: 'Informe "frase" como texto não vazio' })
    }
    try {
      const started = performance.now()
      const jevRes = await fetch(JEV_URL, {
        method: 'POST',
        headers: { Authorization: `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'jev-latest', state: { frase }, questions: QUESTIONS }),
        signal: AbortSignal.timeout(10000),
      })
      const latencyMs = Math.round(performance.now() - started)
      if (!jevRes.ok) {
        throw new Error(`Jev ${jevRes.status}: ${(await jevRes.text()).slice(0, 300)}`)
      }
      const body = await jevRes.json()
      // Annotate score answers with their level counts so the client can
      // normalize without re-deriving the question definitions.
      for (const [name, q] of Object.entries(QUESTIONS)) {
        if (q.type === 'score' && body.answers?.[name]) {
          body.answers[name].levels = q.criteria.length
        }
      }
      return json(res, 200, {
        answers: body.answers,
        usage: body.usage,
        model: body.model,
        latencyMs,
      })
    } catch (err) {
      console.error('[batuta]', err.message)
      return json(res, 502, { error: err.message })
    }
  }
  json(res, 404, { error: 'Rota desconhecida' })
})

server.listen(PORT, () => {
  console.log(`batuta proxy em http://localhost:${PORT} — chave: ${API_KEY ? 'ok' : 'AUSENTE'}`)
})
