# Quick Start: Using GitHub Secrets

## 🚀 For First-Time Setup

### Step 1: Add Secrets to GitHub

1. Go to: `https://github.com/Lakssh/gen-ai-learning-homeworks/settings/secrets/actions`
2. Click **"New repository secret"**
3. Add these required secrets:

   | Secret Name | Description | Example |
   |------------|-------------|---------|
   | `GROQ_API_KEY` | Your Groq API Key | `gsk_abc123...` |
   | `JIRA_API_TOKEN` | Your Jira API Token | `ATATT3xFfGF0...` |
   | `JIRA_URL` | Your Jira URL | `https://yourcompany.atlassian.net/` |
   | `JIRA_USERNAME` | Your Jira Email | `you@example.com` |

### Step 2: Generate .env File

#### Option A: Using GitHub Actions (Recommended)

1. Go to your repository's **Actions** tab
2. Click **"Generate .env from Secrets"** workflow
3. Click **"Run workflow"**
4. Select environment (development/staging/production)
5. Wait for completion
6. Download the `.env` artifact
7. Extract and place in project root

#### Option B: Manual Deployment

The `.github/workflows/deploy.yml` automatically creates `.env` from secrets when you push to main branch.

### Step 3: Local Development

For local development, you still need to manually create `.env` from the downloaded artifact or manually enter values.

## 📋 Complete Secret List

### Required Secrets
- ✅ `GROQ_API_KEY` - Must be set
- ✅ `JIRA_API_TOKEN` - Must be set

### Optional Secrets (will use defaults if not set)
- `PORT` (default: 8080)
- `CORS_ORIGIN` (default: http://localhost:5173)
- `GROQ_API_BASE` (default: https://api.groq.com/openai/v1)
- `GROQ_MODEL` (default: openai/gpt-oss-120b)
- `JIRA_URL` (no default - recommended to set)
- `JIRA_USERNAME` (no default - recommended to set)
- `JIRA_ACCEPTANCE_CRITERIA_FIELD` (default: customfield_10000)
- `JIRA_STORY_POINTS_FIELD` (default: customfield_10002)

## 🎯 Usage Examples

### Check if secrets exist (requires GitHub CLI)
```bash
npm run load-secrets
```

### Deploy with secrets
```bash
# Push to main branch - workflow auto-runs
git push origin main

# Or manually trigger deploy workflow from Actions tab
```

### Local Development
```bash
# Method 1: Download from GitHub Actions
1. Trigger "Generate .env from Secrets" workflow
2. Download artifact
3. Extract .env to project root

# Method 2: Manual
cp .env.example .env
# Edit .env and add your secrets manually
```

## 🔒 Security Notes

- ✅ Secrets are encrypted in GitHub
- ✅ Secrets never appear in logs
- ✅ Artifact .env files expire after 1 day
- ❌ Never commit .env files to Git
- ❌ Never share secrets in issues/PRs

For detailed documentation, see [GITHUB_SECRETS_SETUP.md](./GITHUB_SECRETS_SETUP.md)
