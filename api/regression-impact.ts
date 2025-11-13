import type { VercelRequest, VercelResponse } from '@vercel/node'
import { RegressionImpactRequestSchema, RegressionImpactResponseSchema } from '../backend/src/schemas'

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
    const parsed = RegressionImpactRequestSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: `Validation error: ${parsed.error.message}` })
      return
    }

    const { changedItems, notes } = parsed.data

    const lowered = changedItems.map(s => s.toLowerCase())
    const impactedAreas = new Set<string>()
    const recommendedTests = new Set<string>()

    const add = {
      area: (s: string) => impactedAreas.add(s),
      test: (s: string) => recommendedTests.add(s)
    }

    lowered.forEach(item => {
      if (item.includes('auth') || item.includes('login') || item.includes('oauth')) {
        add.area('Authentication & Authorization')
        add.test('Auth smoke: login, logout, session expiry')
        add.test('Negative auth: invalid creds, locked accounts')
      }
      if (item.includes('payment') || item.includes('checkout')) {
        add.area('Payments & Checkout')
        add.test('Payment flows: success, decline, retry')
        add.test('Refunds and idempotency checks')
      }
      if (item.includes('api') || item.includes('controller') || item.includes('handler')) {
        add.area('API Layer')
        add.test('Contract tests for affected endpoints')
        add.test('Error handling and status codes')
      }
      if (item.includes('ui') || item.includes('component') || item.endsWith('.tsx') || item.endsWith('.jsx')) {
        add.area('UI Components')
        add.test('Visual regression for updated components')
        add.test('Accessibility and keyboard navigation')
      }
      if (item.includes('db') || item.includes('repository') || item.includes('prisma') || item.includes('entity')) {
        add.area('Data Access & Persistence')
        add.test('Migration backward compatibility')
        add.test('CRUD operations and data integrity')
      }
    })

    if ((notes || '').toLowerCase().includes('performance')) {
      add.area('Performance')
      add.test('Load test baseline for critical paths')
    }

    const response = {
      impactedAreas: Array.from(impactedAreas),
      recommendedTests: Array.from(recommendedTests),
      riskScore: Math.min(100, Math.max(10, impactedAreas.size * 15 + recommendedTests.size * 2))
    }

    const valid = RegressionImpactResponseSchema.safeParse(response)
    if (!valid.success) {
      res.status(500).json({ error: 'Failed to produce impact analysis' })
      return
    }

    res.status(200).json(response)
  } catch (error) {
    console.error('Error in regression-impact route:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}
