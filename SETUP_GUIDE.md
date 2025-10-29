# Quick Setup Guide - Jira Integration

## Prerequisites
- Jira account with access to create API tokens
- Node.js and npm installed

## Step-by-Step Setup

### 1. Get Your Jira API Token

1. Visit https://id.atlassian.com/manage-profile/security/api-tokens
2. Click **"Create API token"**
3. Give it a name (e.g., "Test Case Generator")
4. **Copy the token** - you won't be able to see it again!

### 2. Configure Environment Variables

#### Option A: Local Development (Quick Setup)

1. Navigate to the project root:
   ```bash
   cd "/Volumes/Shana/Gen AI Learning/user-story-to-tests"
   ```

2. Edit the `.env` file and update these values:
   ```env
   JIRA_URL=https://your-company.atlassian.net
   JIRA_USERNAME=your.email@company.com
   JIRA_API_TOKEN=paste-your-token-here
   groq_API_KEY=paste-your-groq-api-key-here
   ```

#### Option B: GitHub Secrets (Recommended for Teams & CI/CD)

For production deployments and team collaboration, store secrets in GitHub:

1. **Navigate to GitHub Repository Settings:**
   - Go to: `https://github.com/Lakssh/gen-ai-learning-homeworks/settings/secrets/actions`
   - Or: Repository → Settings → Secrets and variables → Actions

2. **Add Required Secrets** (Click "New repository secret" for each):
   
   | Secret Name | Description | Required |
   |------------|-------------|----------|
   | `GROQ_API_KEY` | Your Groq API Key | ✅ Yes |
   | `JIRA_API_TOKEN` | Your Jira API Token | ✅ Yes |
   | `JIRA_URL` | Your Jira URL (e.g., https://company.atlassian.net/) | ✅ Yes |
   | `JIRA_USERNAME` | Your Jira Email | ✅ Yes |
   | `PORT` | Backend server port | Optional (default: 8080) |
   | `CORS_ORIGIN` | Frontend URL | Optional (default: http://localhost:5173) |
   | `GROQ_API_BASE` | Groq API base URL | Optional (default: https://api.groq.com/openai/v1) |
   | `GROQ_MODEL` | AI model to use | Optional (default: openai/gpt-oss-120b) |
   | `JIRA_ACCEPTANCE_CRITERIA_FIELD` | Custom field ID | Optional (default: customfield_10000) |
   | `JIRA_STORY_POINTS_FIELD` | Custom field ID | Optional (default: customfield_10002) |

3. **Generate .env File from GitHub Secrets:**
   
   **Method 1: Using GitHub Actions Workflow**
   - Go to repository **Actions** tab
   - Select **"Generate .env from Secrets"** workflow
   - Click **"Run workflow"**
   - Choose environment (development/staging/production)
   - Wait for completion
   - Download the `.env` artifact from the workflow run
   - Extract and place `.env` in project root

   **Method 2: Automatic on Deploy**
   - Push to main branch
   - The `deploy.yml` workflow automatically creates `.env` from secrets
   - Secrets are injected during CI/CD pipeline

4. **Benefits of Using GitHub Secrets:**
   - ✅ Secure storage - encrypted at rest
   - ✅ Team collaboration - share repo without sharing secrets
   - ✅ CI/CD ready - automatic injection in workflows
   - ✅ No accidental commits - secrets never in code
   - ✅ Easy rotation - update once, applies everywhere

📚 **For detailed GitHub Secrets setup, see:**
- Quick Start: [GITHUB_SECRETS_QUICKSTART.md](./GITHUB_SECRETS_QUICKSTART.md)
- Full Documentation: [GITHUB_SECRETS_SETUP.md](./GITHUB_SECRETS_SETUP.md)

### 3. Find Your Custom Field IDs (Optional)

If your Jira uses different field IDs for Acceptance Criteria or Story Points:

**Method 1: Via Jira UI**
1. Open any story in Jira
2. Click the "⋯" (More) menu
3. Select "View in JSON"
4. Search for fields containing your data
5. Note the `customfield_XXXXX` IDs

**Method 2: Via API**
```bash
curl -u your.email@company.com:your-api-token \
  "https://your-company.atlassian.net/rest/api/3/field" \
  | jq '.[] | select(.name | contains("Acceptance"))'
```

Update `.env` with your field IDs:
```env
JIRA_ACCEPTANCE_CRITERIA_FIELD=customfield_10000
JIRA_STORY_POINTS_FIELD=customfield_10002
```

### 4. Start the Backend Server

```bash
cd backend
npm install
npm run dev
```

The server should start on http://localhost:8080

### 5. Start the Frontend

In a new terminal:
```bash
cd frontend
npm install
npm run dev
```

The UI should open at http://localhost:5173

### 6. Test the Integration

1. Open http://localhost:5173 in your browser
2. Click the **"Jira Integration"** tab
3. Enter a valid story key (e.g., `PROJ-123`)
4. Click **"Fetch"**
5. The fields should populate with data from Jira
6. Add any additional context
7. Click **"Generate Test Cases"**

## Troubleshooting

### "Jira credentials not configured"
- Check that all three variables are set in `.env`:
  - JIRA_URL
  - JIRA_USERNAME
  - JIRA_API_TOKEN
- Restart the backend server after changing `.env`

### "Story not found" or 404 Error
- Verify the story key is correct (case-sensitive)
- Ensure your Jira user has permission to view the story
- Check that JIRA_URL doesn't have a trailing slash

### "Invalid Jira story format"
- Your custom fields might use different IDs
- Follow Step 3 to find your actual field IDs
- Update `JIRA_ACCEPTANCE_CRITERIA_FIELD` in `.env`

### Empty Acceptance Criteria
- The story might not have acceptance criteria filled in Jira
- Or your Jira uses a different field name
- Check the field ID as described in Step 3

### Authentication Errors (401)
- Verify your API token is correct and not expired
- Ensure your username (email) is correct
- Tokens don't expire automatically, but can be revoked

### Network/CORS Errors
- Check that CORS_ORIGIN in `.env` matches your frontend URL
- Default is `http://localhost:5173`

## Security Notes

⚠️ **Important**: 
- Never commit the `.env` file to version control
- The `.env.example` file is provided as a template
- API tokens should be treated like passwords
- Rotate tokens periodically for security
- **For production/team environments, use GitHub Secrets** (see step 2, Option B)

### Why Use GitHub Secrets?

**Local .env file (Development only):**
- ❌ Risk of accidental commits
- ❌ Each team member needs manual setup
- ❌ Difficult to rotate/update across team
- ❌ Not secure for production

**GitHub Secrets (Recommended):**
- ✅ Encrypted and secure
- ✅ Never exposed in code or logs
- ✅ Automatic injection in CI/CD
- ✅ Easy to update for entire team
- ✅ Audit trail of changes
- ✅ Works with deployment pipelines

📚 **See GitHub Secrets documentation:**
- [GITHUB_SECRETS_QUICKSTART.md](./GITHUB_SECRETS_QUICKSTART.md) - Quick setup guide
- [GITHUB_SECRETS_SETUP.md](./GITHUB_SECRETS_SETUP.md) - Detailed documentation

## What Gets Fetched from Jira

The integration retrieves:
- ✅ Story Key (e.g., PROJ-123)
- ✅ Title/Summary
- ✅ Description
- ✅ Acceptance Criteria (custom field)
- ✅ Status (e.g., In Progress, Done)
- ✅ Assignee
- ✅ Story Points (custom field)

## Next Steps

Once configured, you can:
- Fetch stories directly from Jira
- Generate comprehensive test cases automatically
- Add custom context before generation
- Export or save generated test cases

Need help? Check the full documentation in `JIRA_INTEGRATION.md`
