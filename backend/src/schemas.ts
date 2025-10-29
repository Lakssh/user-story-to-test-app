import { z } from 'zod'

export const GenerateRequestSchema = z.object({
  storyTitle: z.string().min(1, 'Story title is required'),
  acceptanceCriteria: z.string().min(1, 'Acceptance criteria is required'),
  description: z.string().optional(),
  additionalInfo: z.string().optional()
})

export const TestCaseSchema = z.object({
  id: z.string(),
  title: z.string(),
  steps: z.array(z.string()),
  testData: z.string().optional(),
  expectedResult: z.string(),
  category: z.string()
})

export const GenerateResponseSchema = z.object({
  cases: z.array(TestCaseSchema),
  model: z.string().optional(),
  promptTokens: z.number(),
  completionTokens: z.number()
})

// Jira schemas
export const JiraFetchRequestSchema = z.object({
  storyKey: z.string().min(1, 'Story key is required'),
  jiraUrl: z.string().optional(),
  username: z.string().optional(),
  apiToken: z.string().optional()
})

export const JiraStoryDetailsSchema = z.object({
  key: z.string(),
  title: z.string(),
  description: z.string(),
  acceptanceCriteria: z.string(),
  status: z.string().optional(),
  assignee: z.string().optional(),
  storyPoints: z.number().optional()
})

// Type exports
export type GenerateRequest = z.infer<typeof GenerateRequestSchema>
export type TestCase = z.infer<typeof TestCaseSchema>
export type GenerateResponse = z.infer<typeof GenerateResponseSchema>
export type JiraFetchRequest = z.infer<typeof JiraFetchRequestSchema>
export type JiraStoryDetails = z.infer<typeof JiraStoryDetailsSchema>