import express from 'express'
import { JiraFetchRequestSchema, JiraStoryDetailsSchema, type JiraFetchRequest, type JiraStoryDetails } from '../schemas'

export const jiraRouter = express.Router()

jiraRouter.post('/story', async (req: express.Request, res: express.Response): Promise<void> => {
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

    // Use credentials from .env or request body (request body takes precedence)
    const jiraUrl = request.jiraUrl || process.env.JIRA_URL
    const username = request.username || process.env.JIRA_USERNAME
    const apiToken = request.apiToken || process.env.JIRA_API_TOKEN

    // Validate that we have all required credentials
    if (!jiraUrl || !username || !apiToken) {
      res.status(400).json({
        error: 'Jira credentials not configured. Please set JIRA_URL, JIRA_USERNAME, and JIRA_API_TOKEN in .env file'
      })
      return
    }

    // Fetch story from Jira API
    const jiraStory = await fetchJiraStoryFromAPI(
      request.storyKey,
      jiraUrl,
      username,
      apiToken
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
})

// Real Jira API integration
async function fetchJiraStoryFromAPI(
  storyKey: string, 
  jiraUrl: string, 
  username: string, 
  apiToken: string
): Promise<JiraStoryDetails> {
  const url = `${jiraUrl}/rest/api/3/issue/${storyKey}`
  
  console.log(`Fetching Jira story: ${storyKey} from ${jiraUrl}`)
  
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
        errorMessage += '. Issue not found or you do not have permission to view it. Please verify the story key and your Jira permissions.'
      } else if (response.status === 401) {
        errorMessage += '. Authentication failed. Please check your Jira credentials in the .env file.'
      } else if (response.status === 403) {
        errorMessage += '. Access denied. Your account does not have permission to view this issue.'
      }
    } catch {
      errorMessage += ` - ${errorText}`
    }
    
    throw new Error(errorMessage)
  }

  const jiraData = await response.json() as any
  
  // Get custom field names from environment or use defaults
  const acceptanceCriteriaField = process.env.JIRA_ACCEPTANCE_CRITERIA_FIELD || 'customfield_10000'
  const storyPointsField = process.env.JIRA_STORY_POINTS_FIELD || 'customfield_10002'
  
  // Extract description from Jira's Atlassian Document Format (ADF) or plain text
  let description = ''
  if (jiraData.fields.description) {
    if (typeof jiraData.fields.description === 'string') {
      description = jiraData.fields.description
    } else if (jiraData.fields.description.content) {
      // ADF format - extract text from content blocks
      description = extractTextFromADF(jiraData.fields.description)
    }
  }

  // Extract acceptance criteria
  let acceptanceCriteria = ''
  if (jiraData.fields.description) {
    const acField = jiraData.fields.description
    if (typeof acField === 'string') {
      acceptanceCriteria = acField
    } else if (acField.content) {
      acceptanceCriteria = extractTextFromADF(acField)
    }
  }
  
  // Transform Jira response to our format
  return {
    key: jiraData.key,
    title: jiraData.fields.summary || '',
    description: description,
    acceptanceCriteria: acceptanceCriteria,
    status: jiraData.fields.status?.name,
    assignee: jiraData.fields.assignee?.emailAddress || jiraData.fields.assignee?.displayName,
    storyPoints: jiraData.fields[storyPointsField]
  }
}

// Helper function to extract text from Atlassian Document Format (ADF)
function extractTextFromADF(adfContent: any): string {
  if (!adfContent || !adfContent.content) {
    return ''
  }

  let text = ''
  
  const processNode = (node: any): void => {
    if (node.type === 'text') {
      text += node.text
    } else if (node.type === 'hardBreak') {
      text += '\n'
    } else if (node.content) {
      node.content.forEach((child: any) => processNode(child))
      // Add line breaks after paragraphs and headings
      if (node.type === 'paragraph' || node.type === 'heading') {
        text += '\n'
      }
    }
  }

  adfContent.content.forEach((node: any) => processNode(node))
  
  return text.trim()
}