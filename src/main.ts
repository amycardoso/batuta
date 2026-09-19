import { Field } from './field'
import { realize, mulberry32 } from './conduct'
import { PALETTES, SHAPES } from './questions.mjs'
import './styles.css'

const canvas = document.getElementById('stage') as HTMLCanvasElement
const ctx = canvas.getContext('2d')!
const fraseInput = document.getElementById('frase') as HTMLInputElement
const chaosInput = document.getElementById('chaos') as HTMLInputElement
const rerollBtn = document.getElementById('reroll') as HTMLButtonElement
const saveBtn = document.getElementById('save') as HTMLButtonElement
const statusEl = document.getElementById('status') as HTMLParagraphElement
const panel = document.getElementById('panel') as HTMLElement

function fit() {
  canvas.width = window.innerWidth * devicePixelRatio
  canvas.height = window.innerHeight * devicePixelRatio
  canvas.style.width = '100vw'
  canvas.style.height = '100vh'
  ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0)
  field?.resize(window.innerWidth, window.innerHeight)
}

let field: Field | null = null
let answers: any = null
let meta: { latencyMs: number; usage: any; model: string } | null = null
let seed = 1

function chaos(): number {
  return Number(chaosInput.value) / 100
}

function conductFromAnswers() {
  if (!answers || !field) return
  const params = realize(answers, chaos(), mulberry32(seed))
  field.setParams(params, seed)
  renderPanel(params)
}

const nf = (x: number) => `${Math.round(x * 100)}%`

function renderPanel(params: ReturnType<typeof realize>) {
  if (!answers) return
  const paleta = PALETTES[params.palette as keyof typeof PALETTES]
  const rows = [
    ['paleta', `${paleta.label}`, answers.paleta.probabilities?.[params.palette] ?? 1],
    ['forma', params.shape, answers.forma.probabilities?.[params.shape] ?? 1],
    ['densidade', nf(params.density), answers.densidade.confidence ?? 1],
    ['energia', nf(params.energy), answers.energia.confidence ?? 1],
    ['turbulência', nf(params.turbulence), answers.turbulencia.confidence ?? 1],
    ['traço', nf(params.strokeScale), answers.escala.confidence ?? 1],
    ['simetria', params.symmetric ? 'sim' : 'não', Math.max(answers.simetria.noul, 1 - answers.simetria.noul)],
  ] as const
  const swatches = paleta.colors.map((c) => `<i style="background:${c}"></i>`).join('')
  panel.innerHTML =
    `<div class="swatches">${swatches}</div>` +
    rows
      .map(
        ([name, value, p]) =>
          `<div class="row"><span class="k">${name}</span><span class="v">${value}</span>` +
          `<span class="p"><b style="width:${Math.round(Number(p) * 100)}%"></b></span></div>`,
      )
      .join('') +
    (meta
      ? `<div class="meta">${meta.latencyMs}ms · ${meta.usage?.input_tokens ?? '—'} tokens · ${meta.model} · seed ${seed}</div>`
      : '')
  panel.hidden = false
}

async function conduct(frase: string) {
  statusEl.textContent = 'regendo…'
  try {
    const res = await fetch('/api/conduct', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ frase }),
    })
    const body = await res.json()
    if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`)
    answers = body.answers
    meta = body
    seed = (Math.random() * 2 ** 31) | 0
    conductFromAnswers()
    statusEl.textContent = ''
  } catch (err) {
    statusEl.textContent = `sem regência: ${(err as Error).message}`
  }
}

fraseInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && fraseInput.value.trim()) conduct(fraseInput.value.trim())
})
chaosInput.addEventListener('input', conductFromAnswers)
rerollBtn.addEventListener('click', () => {
  seed = (Math.random() * 2 ** 31) | 0
  conductFromAnswers()
})
saveBtn.addEventListener('click', () => {
  const a = document.createElement('a')
  a.download = `batuta-${fraseInput.value.trim().replace(/\s+/g, '-').slice(0, 40) || 'obra'}.png`
  a.href = canvas.toDataURL('image/png')
  a.click()
})

window.addEventListener('resize', fit)

field = new Field(ctx, window.innerWidth, window.innerHeight)
fit()

// Opening state: a quiet default so the stage is never empty.
answers = {
  paleta: { type: 'choice', choice: 'veludo_noturno', probabilities: { veludo_noturno: 1 } },
  forma: { type: 'choice', choice: 'filamentos', probabilities: { filamentos: 1 } },
  densidade: { type: 'score', score: 3, levels: 10 },
  energia: { type: 'score', score: 2, levels: 10 },
  turbulencia: { type: 'score', score: 3, levels: 10 },
  escala: { type: 'score', score: 2, levels: 10 },
  simetria: { type: 'noul', noul: 0.1 },
}
conductFromAnswers()
panel.hidden = true

function loop() {
  field!.frame()
  requestAnimationFrame(loop)
}
loop()
