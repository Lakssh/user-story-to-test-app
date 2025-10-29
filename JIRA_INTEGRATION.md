# Jira Integration Feature

## Overview
The User Story to Tests application now includes a **Jira Integration** tab that allows you to fetch user stories directly from Jira and generate test cases automatically.

## Features

### 1. Two-Tab Interface
- **Manual Input Tab**: Original functionality for manually entering user story details
- **Jira Integration Tab**: New feature to fetch stories from Jira

### 2. Jira Tab Components

#### Story Fetch Section
- **Story Key Input Field**: Enter your Jira story key (e.g., PROJ-123, TEAM-456)
- **Fetch Button**: Click to retrieve story details from Jira
  - Shows loading state while fetching
  - Automatically populates Title, Description, and Acceptance Criteria fields

#### Populated Fields (Read-Only after fetch)
- **Title**: Story summary from Jira
- **Description**: Detailed description from Jira
- **Acceptance Criteria**: Acceptance criteria from Jira story

#### Additional Input
- **Additional Inputs**: Free-text field for any supplementary information or context
  - Remains editable even after fetching from Jira
  - Optional field

#### Generation
- **Generate Test Cases Button**: Uses the same logic as Manual Input to generate comprehensive test cases
  - Disabled until Title and Acceptance Criteria are populated
  - Shows loading state during generation

## How to Use

### Using Jira Integration

1. **Navigate to Jira Tab**
   - Click on the "Jira Integration" tab at the top

2. **Enter Story Key**
   - Type your Jira story key (format: PROJECT-NUMBER)
   - Examples: PROJ-123, TEAM-456

3. **Fetch Story Details**
   - Click the "Fetch" button
   - Wait for the story details to load
   - Fields will auto-populate with Jira data

4. **Add Additional Context (Optional)**
   - Use the "Additional Inputs" field to provide extra information
   - This helps generate more relevant test cases

5. **Generate Test Cases**
   - Click "Generate Test Cases"
   - Review the generated test cases in the results table

## Backend Implementation

### Configuration
The backend now uses real Jira API integration with credentials from the `.env` file.

**Required Environment Variables** (in `.env`):
```env
JIRA_URL=https://your-domain.atlassian.net
JIRA_USERNAME=your-email@company.com
JIRA_API_TOKEN=your-api-token
JIRA_ACCEPTANCE_CRITERIA_FIELD=customfield_10000
JIRA_STORY_POINTS_FIELD=customfield_10002
```

### How to Get Jira API Token

1. **Log in to Jira** (https://id.atlassian.com/)
2. Click on your profile icon → **Account Settings**
3. Go to **Security** tab
4. Click **Create and manage API tokens**
5. Click **Create API token**
6. Give it a name (e.g., "Test Generator")
7. **Copy the token** and save it in your `.env` file

### Customizing Field Mappings

Jira custom fields vary by instance. To find your field IDs:

1. **Via Jira UI**:
   - Go to any story → Click "⋯" → View in JSON
   - Look for field names like `customfield_10000`

2. **Via API**:
   ```bash
   curl -u your-email@company.com:your-api-token \
     https://your-domain.atlassian.net/rest/api/3/field
   ```

3. **Update .env** with your field IDs:
   ```env
   JIRA_ACCEPTANCE_CRITERIA_FIELD=customfield_XXXXX
   JIRA_STORY_POINTS_FIELD=customfield_YYYYY
   ```

### API Endpoint
```
POST /api/jira/story
Content-Type: application/json

Request Body:
{
  "storyKey": "PROJ-123"
}

Optional - Override default credentials:
{
  "storyKey": "PROJ-123",
  "jiraUrl": "https://custom-domain.atlassian.net",
  "username": "custom-email@company.com",
  "apiToken": "custom-api-token"
}

Response:
{
  "key": "PROJ-123",
  "title": "Story title from Jira",
  "description": "Story description",
  "acceptanceCriteria": "Acceptance criteria text",
  "status": "In Progress",
  "assignee": "john.doe@company.com",
  "storyPoints": 5
}
```

### Features

- **Environment-based Configuration**: Credentials stored securely in `.env` file
- **Credential Override**: Optional per-request credential override
- **ADF Support**: Automatically extracts text from Atlassian Document Format
- **Plain Text Support**: Also handles plain text descriptions
- **Configurable Fields**: Custom field IDs configured via environment variables
- **Error Handling**: Detailed error messages for debugging
- **Logging**: Request logging for troubleshooting

## Architecture

### Frontend (`frontend/src/`)
- **App.tsx**: Main component with tab navigation and Jira integration logic
- **api.ts**: API client with `fetchJiraStory()` function
- **types.ts**: TypeScript interfaces for Jira data structures

### Backend (`backend/src/`)
- **routes/jira.ts**: Jira API route handler
- **schemas.ts**: Zod validation schemas for Jira requests/responses
- **server.ts**: Express server with Jira route mounted

## Test Case Generation
The Jira integration reuses the existing test generation logic:
- Same prompt engineering
- Same LLM integration (Groq)
- Same comprehensive test case categories:
  - Positive scenarios
  - Negative scenarios
  - Edge cases
  - Authorization tests
  - Non-functional requirements

## Error Handling
- Validates story key format
- Handles network errors gracefully
- Provides user-friendly error messages
- Falls back to manual entry if Jira fetch fails

## UI/UX Highlights
- Clean tab-based navigation
- Visual feedback during loading states
- Read-only fields for fetched data (prevents accidental changes)
- Consistent styling with existing Manual Input tab
- Responsive design

## Future Enhancements
- [ ] Jira authentication configuration UI
- [ ] Support for multiple Jira instances
- [ ] Fetch related stories/epics
- [ ] Import multiple stories at once
- [ ] Cache Jira credentials securely
- [ ] Export test cases back to Jira
- [ ] Real-time Jira sync
- [ ] Support for Jira Cloud and Server versions
