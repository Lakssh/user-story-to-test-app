import type { VercelRequest, VercelResponse } from '@vercel/node'
import { GroqClient } from '../src/llm/groqClient'
import { GenerateRequestSchema, GenerateResponseSchema, type GenerateResponse } from '../src/schemas'
import { SYSTEM_PROMPT, buildPrompt } from '../src/prompt'

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
    const validationResult = GenerateRequestSchema.safeParse(req.body)
    if (!validationResult.success) {
      res.status(400).json({ error: `Validation error: ${validationResult.error.message}` })
      return
    }

    const request = validationResult.data
    const userPrompt = buildPrompt(request)
    const groqClient = new GroqClient()

    try {
      const groqResponse = await groqClient.generateTests(SYSTEM_PROMPT, userPrompt)

      let parsedResponse: GenerateResponse
      try {
        parsedResponse = JSON.parse(groqResponse.content)
      } catch {
        res.status(502).json({ error: 'LLM returned invalid JSON format' })
        return
      }

      const responseValidation = GenerateResponseSchema.safeParse(parsedResponse)
      if (!responseValidation.success) {
        res.status(502).json({ error: 'LLM response does not match expected schema' })
        return
      }

      const finalResponse = {
        ...responseValidation.data,
        model: groqResponse.model,
        promptTokens: groqResponse.promptTokens,
        completionTokens: groqResponse.completionTokens
      }

      res.json(finalResponse)
    } catch (llmError) {
      console.error('LLM error:', llmError)
      res.status(502).json({ error: 'Failed to generate tests from LLM service' })
      return
    }
  } catch (error) {
    console.error('Error in generate route:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}
