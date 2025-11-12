import type { VercelRequest, VercelResponse } from '@vercel/node'
import { GroqClient } from '../backend/src/llm/groqClient'
import { GenerateRequestSchema, GenerateResponseSchema, type GenerateResponse } from '../backend/src/schemas'
import { SYSTEM_PROMPT, buildPrompt } from '../backend/src/prompt'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
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
    // Validate request body
    const validationResult = GenerateRequestSchema.safeParse(req.body)

    if (!validationResult.success) {
      res.status(400).json({
        error: `Validation error: ${validationResult.error.message}`
      })
      return
    }

    const request = validationResult.data

    // Allow client to optionally supply Groq credentials (useful for demos); server env remains default
    const clientGroqKey = (req.body as any)?.groq_API_KEY || (req.body as any)?.GROQ_API_KEY
    const clientGroqBase = (req.body as any)?.groq_API_BASE || (req.body as any)?.GROQ_API_BASE
    const clientGroqModel = (req.body as any)?.groq_MODEL || (req.body as any)?.GROQ_MODEL

    // Effective config: prefer client-supplied when present, else env
    const effectiveKey = clientGroqKey || process.env.groq_API_KEY || process.env.GROQ_API_KEY
    const effectiveBase = clientGroqBase || process.env.groq_API_BASE || process.env.GROQ_API_BASE
    const effectiveModel = clientGroqModel || process.env.groq_MODEL || process.env.GROQ_MODEL

    if (!effectiveKey) {
      const envProvided = Boolean(process.env.groq_API_KEY || process.env.GROQ_API_KEY)
      const clientProvided = Boolean(clientGroqKey)
      res.status(400).json({
        error: `Groq API key is not configured. Set GROQ_API_KEY (or groq_API_KEY) in server env, or include groq_API_KEY in the request body when client-side override is enabled. [clientProvided=${clientProvided}, envProvided=${envProvided}]`
      })
      return
    }

    // Build prompts
    const userPrompt = buildPrompt(request)

    // Create GroqClient instance
  const groqClient = new GroqClient({ apiKey: effectiveKey, baseUrl: effectiveBase, model: effectiveModel })

    // Generate tests using Groq
    try {
      const groqResponse = await groqClient.generateTests(SYSTEM_PROMPT, userPrompt)

      // Parse the JSON content
      let parsedResponse: GenerateResponse
      try {
        parsedResponse = JSON.parse(groqResponse.content)
      } catch (parseError) {
        res.status(502).json({
          error: 'LLM returned invalid JSON format'
        })
        return
      }

      // Validate the response schema
      const responseValidation = GenerateResponseSchema.safeParse(parsedResponse)
      if (!responseValidation.success) {
        res.status(502).json({
          error: 'LLM response does not match expected schema'
        })
        return
      }

      // Add token usage info if available
      const finalResponse = {
        ...responseValidation.data,
        model: groqResponse.model,
        promptTokens: groqResponse.promptTokens,
        completionTokens: groqResponse.completionTokens
      }

      res.json(finalResponse)
    } catch (llmError) {
      console.error('LLM error:', llmError)
      res.status(502).json({
        error: 'Failed to generate tests from LLM service'
      })
      return
    }
  } catch (error) {
    console.error('Error in generate route:', error)
    res.status(500).json({
      error: 'Internal server error'
    })
  }
}
