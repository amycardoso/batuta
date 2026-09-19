import { describe, test, expect } from 'vitest'
import { mulberry32, sampleTempered, realizeScore, realize } from '../src/conduct'

describe('mulberry32', () => {
  test('same seed yields the same sequence, different seeds differ', () => {
    const a = mulberry32(42)
    const b = mulberry32(42)
    const c = mulberry32(7)
    const seqA = [a(), a(), a()]
    expect([b(), b(), b()]).toEqual(seqA)
    expect(c()).not.toBe(seqA[0])
    for (const v of seqA) expect(v).toBeGreaterThanOrEqual(0)
  })
})

describe('sampleTempered', () => {
  const dist = { carnaval: 0.7, brasa: 0.2, lavanda: 0.1 }

  test('obedience (chaos=0) always picks the argmax', () => {
    const rng = mulberry32(1)
    for (let i = 0; i < 50; i++) expect(sampleTempered(dist, 0, rng)).toBe('carnaval')
  })

  test('full chaos (chaos=1) samples roughly proportionally to the distribution', () => {
    const rng = mulberry32(2)
    const counts: Record<string, number> = { carnaval: 0, brasa: 0, lavanda: 0 }
    for (let i = 0; i < 2000; i++) counts[sampleTempered(dist, 1, rng)]++
    expect(counts.carnaval / 2000).toBeGreaterThan(0.6)
    expect(counts.carnaval / 2000).toBeLessThan(0.8)
    expect(counts.lavanda).toBeGreaterThan(0)
  })

  test('mid chaos sits between: sharper than the raw distribution', () => {
    const rng = mulberry32(3)
    let top = 0
    for (let i = 0; i < 2000; i++) if (sampleTempered(dist, 0.5, rng) === 'carnaval') top++
    expect(top / 2000).toBeGreaterThan(0.8)
    expect(top / 2000).toBeLessThan(1)
  })
})

describe('realizeScore', () => {
  // Real API shape: score is the probability-weighted mean of the 0-based
  // level index; probabilities are keyed by level index as strings.
  const answer = {
    type: 'score',
    score: 6.3,
    levels: 10,
    probabilities: { '5': 0.2, '6': 0.4, '7': 0.3, '9': 0.1 },
  }

  test('obedience returns the mean index normalized by levels-1', () => {
    expect(realizeScore(answer, 0, mulberry32(1))).toBeCloseTo(6.3 / 9)
  })

  test('full chaos samples a level from the distribution, normalized', () => {
    const rng = mulberry32(4)
    const seen = new Set<number>()
    for (let i = 0; i < 300; i++) {
      const v = realizeScore(answer, 1, rng)
      expect([5, 6, 7, 9].map((i) => i / 9)).toContainEqual(v)
      seen.add(v)
    }
    expect(seen.size).toBeGreaterThan(2)
  })

  test('falls back to the mean when no probabilities are present', () => {
    expect(realizeScore({ type: 'score', score: 2, levels: 10 }, 1, mulberry32(1))).toBeCloseTo(2 / 9)
  })
})

describe('realize', () => {
  const answers = {
    paleta: { type: 'choice', choice: 'brasa', probabilities: { brasa: 0.9, carnaval: 0.1 }, confidence: 0.88 },
    forma: { type: 'choice', choice: 'estilhacos', probabilities: { estilhacos: 0.8, nevoa: 0.2 }, confidence: 0.75 },
    densidade: { type: 'score', score: 8, levels: 10 },
    energia: { type: 'score', score: 9, levels: 10 },
    turbulencia: { type: 'score', score: 6, levels: 10 },
    escala: { type: 'score', score: 3, levels: 10 },
    simetria: { type: 'noul', noul: 0.12 },
  }

  test('obedience maps answers to deterministic params', () => {
    const p = realize(answers, 0, mulberry32(1))
    expect(p.palette).toBe('brasa')
    expect(p.shape).toBe('estilhacos')
    expect(p.density).toBeCloseTo(8 / 9)
    expect(p.symmetric).toBe(false)
    expect(p.energy).toBeGreaterThan(p.strokeScale)
  })

  test('symmetry flips when the noul probability crosses the sampled threshold', () => {
    const sym = { ...answers, simetria: { type: 'noul', noul: 0.97 } }
    expect(realize(sym, 0, mulberry32(1)).symmetric).toBe(true)
  })
})
