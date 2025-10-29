export interface GenerateRequest {
  storyTitle: string
  acceptanceCriteria: string
  description?: string
  additionalInfo?: string
}

export interface TestCase {
  id: string
  title: string
  steps: string[]
  testData?: string
  expectedResult: string
  category: string
}

export interface GenerateResponse {
  cases: TestCase[]
  model?: string
  promptTokens: number
  completionTokens: number
}

// Jira-specific interfaces
export interface JiraStoryDetails {
  key: string
  title: string
  description: string
  acceptanceCriteria: string
  status?: string
  assignee?: string
  storyPoints?: number
}

export interface JiraFetchRequest {
  storyKey: string
  jiraUrl?: string
  username?: string
  apiToken?: string
}

export interface JiraFormData {
  storyKey: string
  title: string
  description: string
  acceptanceCriteria: string
  additionalInfo: string
}

export interface ConfigData {
  PORT?: string
  CORS_ORIGIN?: string
  groq_API_BASE?: string
  groq_API_KEY?: string
  groq_MODEL?: string
  JIRA_URL?: string
  JIRA_USERNAME?: string
  JIRA_API_TOKEN?: string
  JIRA_ACCEPTANCE_CRITERIA_FIELD?: string
  JIRA_STORY_POINTS_FIELD?: string
}
