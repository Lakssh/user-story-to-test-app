import type { VercelRequest, VercelResponse } from '@vercel/node'
import { DefectPredictionRequestSchema, DefectPredictionResponseSchema } from '../backend/src/schemas'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Credentials', 'true')
  res.setHeader('Access-Control-Allow-Origin', process.env.CORS_ORIGIN || '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  try {
    const parsed = DefectPredictionRequestSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: `Validation error: ${parsed.error.message}` })
      return
    }

    const { description, components = [] } = parsed.data
    const text = `${description} ${components.join(' ')}`.toLowerCase()

    // Heuristic scoring based on keywords and components
    let score = 0
    const hotspots: string[] = []
    const add = (s: string, inc = 10) => { hotspots.push(s); score += inc }

    if (text.includes('refactor') || text.includes('rewrite')) add('Large refactor')
    if (text.includes('race') || text.includes('concurrent') || text.includes('async')) add('Concurrency risk', 15)
    if (text.includes('security') || text.includes('auth') || text.includes('token')) add('Auth/Security area', 12)
    if (text.includes('payment') || text.includes('money') || text.includes('billing')) add('Payment flows', 12)
    if (text.includes('migration') || text.includes('schema')) add('DB schema change', 10)
    if (text.includes('low-level') || text.includes('core')) add('Core component touch', 10)

    const compLower = components.map(c => c.toLowerCase())
    if (compLower.some(c => ['auth', 'checkout', 'payments'].includes(c))) score += 12
    if (compLower.some(c => ['infra', 'database', 'caching'].includes(c))) score += 8

    // Normalize to [0,1]
    const probability = Math.max(0, Math.min(1, score / 60))
    const riskLevel = probability > 0.66 ? 'high' : probability > 0.33 ? 'medium' : 'low'

    const suggestedTests: string[] = []
    if (hotspots.some(h => h.includes('Auth'))) {
      suggestedTests.push('Negative auth cases (expired/invalid tokens)')
    }
    if (hotspots.some(h => h.includes('Payment'))) {
      suggestedTests.push('Payment retries and idempotency checks')
    }
    if (hotspots.some(h => h.includes('DB'))) {
      suggestedTests.push('Backward compatible migration tests')
    }
    suggestedTests.push('Happy path E2E for affected components')

    const response = { riskLevel, probability, hotspots, suggestedTests }
    const valid = DefectPredictionResponseSchema.safeParse(response)
    if (!valid.success) {
      res.status(500).json({ error: 'Failed to produce prediction' })
      return
    }

    res.status(200).json(response)
  } catch (error) {
    console.error('Error in defect-prediction route:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}
