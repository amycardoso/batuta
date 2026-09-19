// The obedience↔chaos machinery: turning Jev's answers (with their full
// probability distributions) into concrete artwork parameters. Pure module —
// re-rolls never touch the API, they just re-sample what one call returned.

export type Rng = () => number

/** Deterministic PRNG so a re-roll seed reproduces the exact same artwork. */
export function mulberry32(seed: number): Rng {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * Sample from a distribution tempered by chaos ∈ [0, 1].
 * chaos 0 → argmax (pure obedience); chaos 1 → the raw distribution
 * (Jev's hesitation left intact); in between, the distribution is sharpened
 * with exponent 1/chaos before sampling.
 */
export function sampleTempered(dist: Record<string, number>, chaos: number, rng: Rng): string {
  const entries = Object.entries(dist)
  if (chaos <= 0.001) {
    return entries.reduce((best, e) => (e[1] > best[1] ? e : best))[0]
  }
  const exponent = 1 / chaos
  const tempered = entries.map(([id, p]) => [id, Math.pow(p, exponent)] as const)
  const total = tempered.reduce((acc, [, w]) => acc + w, 0)
  let roll = rng() * total
  for (const [id, w] of tempered) {
    roll -= w
    if (roll <= 0) return id
  }
  return tempered[tempered.length - 1][0]
}

interface ScoreAnswer {
  score: number
  levels?: number
  probabilities?: Record<string, number>
  [k: string]: unknown
}

/**
 * Normalize a Score answer to [0, 1]. The API's `score` is the probability-
 * weighted mean of the 0-based level index; `probabilities` is keyed by that
 * index. Obedience returns the normalized mean; chaos samples a level from
 * the (tempered) distribution — Jev's own hesitation as the jitter source.
 */
export function realizeScore(answer: ScoreAnswer, chaos: number, rng: Rng): number {
  const levels = answer.levels ?? 10
  const base = answer.score / (levels - 1)
  if (chaos <= 0.001 || !answer.probabilities) return Math.min(1, Math.max(0, base))
  const level = Number(sampleTempered(answer.probabilities, chaos, rng))
  return Math.min(1, Math.max(0, level / (levels - 1)))
}

export interface Params {
  palette: string
  shape: string
  density: number
  energy: number
  turbulence: number
  strokeScale: number
  symmetric: boolean
}

interface Answers {
  paleta: { choice: string; probabilities?: Record<string, number> }
  forma: { choice: string; probabilities?: Record<string, number> }
  densidade: ScoreAnswer
  energia: ScoreAnswer
  turbulencia: ScoreAnswer
  escala: ScoreAnswer
  simetria: { noul: number }
}

function realizeChoice(
  answer: { choice: string; probabilities?: Record<string, number> },
  chaos: number,
  rng: Rng,
): string {
  if (!answer.probabilities) return answer.choice
  return sampleTempered(answer.probabilities, chaos, rng)
}

/** Turn one set of Jev answers into artwork parameters at a chaos level. */
export function realize(answers: Answers, chaos: number, rng: Rng): Params {
  const p = answers.simetria.noul
  // Obedience rounds the noul; chaos treats it as a biased coin.
  const symmetric = chaos <= 0.001 ? p >= 0.5 : rng() < p * chaos + (p >= 0.5 ? 1 : 0) * (1 - chaos)
  return {
    palette: realizeChoice(answers.paleta, chaos, rng),
    shape: realizeChoice(answers.forma, chaos, rng),
    density: realizeScore(answers.densidade, chaos, rng),
    energy: realizeScore(answers.energia, chaos, rng),
    turbulence: realizeScore(answers.turbulencia, chaos, rng),
    strokeScale: realizeScore(answers.escala, chaos, rng),
    symmetric,
  }
}
