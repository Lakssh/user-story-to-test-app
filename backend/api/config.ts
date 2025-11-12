import type { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Credentials', 'true')
  res.setHeader('Access-Control-Allow-Origin', process.env.CORS_ORIGIN || '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  if (req.method === 'GET') {
    const mask = (value: string): string => {
      if (!value || value.length <= 8) return '*'.repeat(value.length)
      return value.substring(0, 4) + '*'.repeat(value.length - 8) + value.substring(value.length - 4)
    }

    const config = {
      PORT: process.env.PORT || '3000',
      CORS_ORIGIN: process.env.CORS_ORIGIN || '',
      groq_API_BASE: process.env.groq_API_BASE || '',
      groq_API_KEY: mask(process.env.groq_API_KEY || ''),
      groq_MODEL: process.env.groq_MODEL || '',
      JIRA_URL: process.env.JIRA_URL || '',
      JIRA_USERNAME: process.env.JIRA_USERNAME || '',
      JIRA_API_TOKEN: mask(process.env.JIRA_API_TOKEN || ''),
      JIRA_ACCEPTANCE_CRITERIA_FIELD: process.env.JIRA_ACCEPTANCE_CRITERIA_FIELD || '',
      JIRA_STORY_POINTS_FIELD: process.env.JIRA_STORY_POINTS_FIELD || ''
    }

    res.status(200).json(config)
    return
  }

  if (req.method === 'PUT') {
    res.status(200).json({ message: 'Update environment variables via Vercel Project Settings → Environment Variables' })
    return
  }

  res.status(405).json({ error: 'Method not allowed' })
}
