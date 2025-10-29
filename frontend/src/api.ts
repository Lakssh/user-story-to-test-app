import { GenerateRequest, GenerateResponse, JiraFetchRequest, JiraStoryDetails, ConfigData } from './types'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api'

export async function generateTests(request: GenerateRequest): Promise<GenerateResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/generate-tests`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
    }

    const data: GenerateResponse = await response.json()
    return data
  } catch (error) {
    console.error('Error generating tests:', error)
    throw error instanceof Error ? error : new Error('Unknown error occurred')
  }
}

export async function fetchJiraStory(request: JiraFetchRequest): Promise<JiraStoryDetails> {
  try {
    const response = await fetch(`${API_BASE_URL}/jira/story`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
    }

    const data: JiraStoryDetails = await response.json()
    return data
  } catch (error) {
    console.error('Error fetching Jira story:', error)
    throw error instanceof Error ? error : new Error('Failed to fetch Jira story details')
  }
}

export async function getConfig(): Promise<ConfigData> {
  try {
    const response = await fetch(`${API_BASE_URL}/config`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
    }

    const data: ConfigData = await response.json()
    return data
  } catch (error) {
    console.error('Error fetching config:', error)
    throw error instanceof Error ? error : new Error('Failed to fetch configuration')
  }
}

export async function updateConfig(config: ConfigData): Promise<{ message: string }> {
  try {
    console.log('API_BASE_URL:', API_BASE_URL)
    console.log('Sending config update to:', `${API_BASE_URL}/config`)
    console.log('Config payload:', config)
    
    const response = await fetch(`${API_BASE_URL}/config`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(config),
    })

    console.log('Response status:', response.status)
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
      console.error('Error response:', errorData)
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
    }

    const data = await response.json()
    console.log('Success response:', data)
    return data
  } catch (error) {
    console.error('Error updating config:', error)
    throw error instanceof Error ? error : new Error('Failed to update configuration')
  }
}

