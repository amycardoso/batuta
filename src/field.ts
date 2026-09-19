// The generative system the conductor directs: a flow field of particles
// driven by fractal noise. Jev never touches a pixel — it only sets Params.

import type { Params } from './conduct'
import { PALETTES } from './questions.mjs'
import type { Rng } from './conduct'
import { mulberry32 } from './conduct'

interface Particle {
  x: number
  y: number
  px: number
  py: number
  color: string
  life: number
  ttl: number
}

function hash(n: number, seed: number): number {
  let h = (n * 374761393 + seed * 668265263) | 0
  h = (h ^ (h >>> 13)) * 1274126177
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296
}

function noise2D(x: number, y: number, seed: number): number {
  const ix = Math.floor(x)
  const iy = Math.floor(y)
  const fx = x - ix
  const fy = y - iy
  const sx = fx * fx * (3 - 2 * fx)
  const sy = fy * fy * (3 - 2 * fy)
  const n00 = hash(ix + iy * 57, seed)
  const n10 = hash(ix + 1 + iy * 57, seed)
  const n01 = hash(ix + (iy + 1) * 57, seed)
  const n11 = hash(ix + 1 + (iy + 1) * 57, seed)
  return (n00 * (1 - sx) + n10 * sx) * (1 - sy) + (n01 * (1 - sx) + n11 * sx) * sy
}

function fbm(x: number, y: number, seed: number, octaves: number): number {
  let value = 0
  let amplitude = 0.5
  let frequency = 1
  for (let i = 0; i < octaves; i++) {
    value += amplitude * noise2D(x * frequency, y * frequency, seed + i)
    amplitude *= 0.5
    frequency *= 2
  }
  return value
}

function hexWithAlpha(hex: string, alpha: number): string {
  const a = Math.round(alpha * 255)
    .toString(16)
    .padStart(2, '0')
  return hex + a
}

export class Field {
  private particles: Particle[] = []
  private time = 0
  private rng: Rng = mulberry32(1)
  private params: Params | null = null
  private noiseSeed = 1

  constructor(
    private ctx: CanvasRenderingContext2D,
    private width: number,
    private height: number,
  ) {}

  resize(w: number, h: number) {
    this.width = w
    this.height = h
  }

  setParams(params: Params, seed: number) {
    this.params = params
    this.rng = mulberry32(seed)
    this.noiseSeed = seed
    this.particles = []
    const bg = PALETTES[params.palette as keyof typeof PALETTES].bg
    this.ctx.fillStyle = bg
    this.ctx.fillRect(0, 0, this.width, this.height)
    const count = Math.round(400 + params.density * 2600)
    for (let i = 0; i < count; i++) this.particles.push(this.spawn())
  }

  private spawn(): Particle {
    const p = this.params!
    const palette = PALETTES[p.palette as keyof typeof PALETTES]
    const x = this.rng() * this.width
    const y = this.rng() * this.height
    return {
      x,
      y,
      px: x,
      py: y,
      color: palette.colors[Math.floor(this.rng() * palette.colors.length)],
      life: 0,
      ttl: 80 + this.rng() * 220,
    }
  }

  frame() {
    const p = this.params
    if (!p) return
    const ctx = this.ctx
    const palette = PALETTES[p.palette as keyof typeof PALETTES]
    const shape = p.shape

    // Trail persistence: névoa erases fast, filamentos accumulate.
    const fade = shape === 'nevoa' ? 0.09 : shape === 'estilhacos' ? 0.06 : 0.028
    ctx.fillStyle = hexWithAlpha(palette.bg, fade)
    ctx.fillRect(0, 0, this.width, this.height)

    const speed = 0.6 + p.energy * 3.4
    const noiseScale = 0.0016 + p.turbulence * 0.004
    const swirl = Math.PI * (2 + p.turbulence * 6)
    const stroke = 0.6 + p.strokeScale * 5.4
    const drift = this.time * (0.0004 + p.energy * 0.0016)

    ctx.lineCap = 'round'

    for (const particle of this.particles) {
      let angle = fbm(particle.x * noiseScale, particle.y * noiseScale + drift, this.noiseSeed, 3) * swirl
      // Estilhaços quantize the field into sharp allowed directions.
      if (shape === 'estilhacos') angle = Math.round((angle / Math.PI) * 3) * (Math.PI / 3)

      particle.px = particle.x
      particle.py = particle.y
      particle.x += Math.cos(angle) * speed
      particle.y += Math.sin(angle) * speed
      particle.life++

      const alpha = shape === 'nevoa' ? 0.16 : 0.34
      const draw = (x1: number, y1: number, x2: number, y2: number) => {
        if (shape === 'nevoa') {
          ctx.fillStyle = hexWithAlpha(particle.color, alpha)
          ctx.beginPath()
          ctx.arc(x2, y2, stroke * 1.6, 0, Math.PI * 2)
          ctx.fill()
        } else {
          ctx.strokeStyle = hexWithAlpha(particle.color, alpha)
          ctx.lineWidth = shape === 'fitas' ? stroke * (1.5 + Math.sin(particle.life * 0.08) * 1.2) : stroke
          ctx.beginPath()
          ctx.moveTo(x1, y1)
          ctx.lineTo(x2, y2)
          ctx.stroke()
        }
      }

      draw(particle.px, particle.py, particle.x, particle.y)
      if (p.symmetric) {
        draw(this.width - particle.px, particle.py, this.width - particle.x, particle.y)
      }

      const out =
        particle.x < -20 || particle.x > this.width + 20 || particle.y < -20 || particle.y > this.height + 20
      if (out || particle.life > particle.ttl) Object.assign(particle, this.spawn())
    }
    this.time++
  }
}
