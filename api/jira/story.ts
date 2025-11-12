import type { VercelRequest, VercelResponse } from '@vercel/node'
import { JiraFetchRequestSchema, JiraStoryDetailsSchema, type JiraStoryDetails } from '../../backend/src/schemas'

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
    const validationResult = JiraFetchRequestSchema.safeParse(req.body)

    if (!validationResult.success) {
      res.status(400).json({
        error: `Validation error: ${validationResult.error.message}`
      })
      return
    }

    const request = validationResult.data

    // Use credentials from environment or request body (request body takes precedence)
    const jiraUrl = request.jiraUrl || process.env.JIRA_URL
    const username = request.username || process.env.JIRA_USERNAME
    const apiToken = request.apiToken || process.env.JIRA_API_TOKEN

    // Validate that we have all required credentials
    if (!jiraUrl || !username || !apiToken) {
      res.status(400).json({
        error: 'Jira credentials not configured. Please set JIRA_URL, JIRA_USERNAME, and JIRA_API_TOKEN environment variables'
      })
      return
    }

    // Fetch story from Jira API
    const jiraStory = await fetchJiraStoryFromAPI(
      request.storyKey,
      jiraUrl!,
      username!,
      apiToken!
    )

    // Validate response
    const responseValidation = JiraStoryDetailsSchema.safeParse(jiraStory)
    if (!responseValidation.success) {
      res.status(500).json({
        error: 'Invalid Jira story format received'
      })
      return
    }

    res.json(jiraStory)
  } catch (error) {
    console.error('Error fetching Jira story:', error)
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to fetch Jira story'
    })
  }
}

// Real Jira API integration
async function fetchJiraStoryFromAPI(
  storyKey: string,
  jiraUrl: string,
  username: string,
  apiToken: string
): Promise<JiraStoryDetails> {
  const url = `${jiraUrl}/rest/api/3/issue/${storyKey}`

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Basic ${Buffer.from(`${username}:${apiToken}`).toString('base64')}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    }
  })

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error')
    let errorMessage = `Jira API error: ${response.status} ${response.statusText}`

    // Try to parse error details
    try {
      const errorData = JSON.parse(errorText)
      if (errorData.errorMessages && errorData.errorMessages.length > 0) {
        errorMessage += ` - ${errorData.errorMessages.join(', ')}`
      }

      // Add specific error guidance based on status code
      if (response.status === 404) {
        errorMessage += '. Issue not found or you do not have permission to view it.'
      } else if (response.status === 401) {
        errorMessage += '. Authentication failed. Please check your Jira credentials.'
      } else if (response.status === 403) {
        errorMessage += '. Access denied. Your account does not have permission to view this issue.'
      }
    } catch {
      errorMessage += ` - ${errorText}`
    }

    throw new Error(errorMessage)
  }

  const jiraData = await response.json() as any

  const storyPointsField = process.env.JIRA_STORY_POINTS_FIELD || 'customfield_10002'

  // Extract description text (handles ADF or plain text)
  let description = ''
  if (jiraData.fields.description) {
    if (typeof jiraData.fields.description === 'string') {
      description = jiraData.fields.description
    } else if (jiraData.fields.description.content) {
      description = extractTextFromADF(jiraData.fields.description)
    }
  }

  // Accept. criteria – currently using description; customize as needed with a specific field
  let acceptanceCriteria = ''
  if (jiraData.fields.description) {
    const acField = jiraData.fields.description
    if (typeof acField === 'string') {
      acceptanceCriteria = acField
    } else if (acField.content) {
      acceptanceCriteria = extractTextFromADF(acField)
    }
  }

  return {
    key: jiraData.key,
    title: jiraData.fields.summary || '',
    description,
    acceptanceCriteria,
    status: jiraData.fields.status?.name,
    assignee: jiraData.fields.assignee?.emailAddress || jiraData.fields.assignee?.displayName,
    storyPoints: jiraData.fields[storyPointsField]
  }
}

function extractTextFromADF(adfContent: any): string {
  if (!adfContent || !adfContent.content) return ''

  let text = ''

  const processNode = (node: any): void => {
    if (node.type === 'text') {
      text += node.text
    } else if (node.type === 'hardBreak') {
      text += '\n'
    } else if (node.content) {
      node.content.forEach((child: any) => processNode(child))
      if (node.type === 'paragraph' || node.type === 'heading') {
        text += '\n'
      }
    }
  }

  adfContent.content.forEach((node: any) => processNode(node))

  return text.trim()
}
