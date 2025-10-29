# GitHub Secrets Setup Guide

This guide explains how to set up and use GitHub Secrets for your application's environment variables.

## 📋 Prerequisites

- GitHub repository access with admin/maintainer permissions
- Sensitive values (API keys, tokens) ready to be stored

## 🔐 Setting Up GitHub Secrets

### 1. Navigate to Repository Settings

1. Go to your GitHub repository: `https://github.com/Lakssh/gen-ai-learning-homeworks`
2. Click on **Settings** tab
3. In the left sidebar, click **Secrets and variables** → **Actions**
4. Click **New repository secret**

### 2. Add Required Secrets

Add the following secrets one by one:

#### Required Secrets (Sensitive Data)
- **GROQ_API_KEY**: Your Groq API key
  ```
  Example: gsk_abc123xyz456...
  ```

- **JIRA_API_TOKEN**: Your Jira API token
  ```
  Example: ATATT3xFfGF0...
  ```

#### Optional Secrets (Can use defaults)
- **PORT**: Backend server port (default: 8080)
- **CORS_ORIGIN**: Frontend URL (default: http://localhost:5173)
- **GROQ_API_BASE**: Groq API base URL (default: https://api.groq.com/openai/v1)
- **GROQ_MODEL**: AI model to use (default: openai/gpt-oss-120b)
- **JIRA_URL**: Your Jira instance URL
- **JIRA_USERNAME**: Your Jira username/email
- **JIRA_ACCEPTANCE_CRITERIA_FIELD**: Custom field ID (default: customfield_10000)
- **JIRA_STORY_POINTS_FIELD**: Custom field ID (default: customfield_10002)

## 🚀 Using GitHub Secrets

### Method 1: GitHub Actions (Recommended for CI/CD)

The repository includes GitHub Actions workflows that automatically inject secrets:

#### Deploy Workflow
```bash
# Automatically triggers on push to main branch
# Or manually trigger from Actions tab
```

#### Generate .env Workflow
```bash
# Manually trigger from Actions tab
1. Go to Actions tab
2. Select "Generate .env from Secrets"
3. Click "Run workflow"
4. Choose environment (development/staging/production)
5. Download the generated .env file from artifacts
```

### Method 2: Local Development with GitHub CLI

For local development, you can verify secrets exist (but not read values):

```bash
# Install GitHub CLI
brew install gh

# Authenticate
gh auth login

# Run the secret loader script
npm run load-secrets

# Or with API method
npm run load-secrets -- --api
```

**Note:** GitHub CLI cannot retrieve secret values for security. Use GitHub Actions workflows instead.

## 📝 Workflow Files

### 1. Deploy Workflow (`.github/workflows/deploy.yml`)
- Triggers on push to main branch
- Creates .env from GitHub Secrets
- Builds the application
- Ready for deployment steps

### 2. Generate .env Workflow (`.github/workflows/load-env.yml`)
- Manually triggered workflow
- Generates .env file for specified environment
- Downloads as artifact (expires in 1 day)

## 🔒 Security Best Practices

1. **Never commit .env files** with real secrets to Git
   - Already added to `.gitignore`
   - Use `.env.example` for documentation

2. **Rotate secrets regularly**
   - Update in GitHub Secrets settings
   - Workflows will use new values automatically

3. **Limit secret access**
   - Only add secrets visible to this repository
   - Don't use organization-wide secrets for sensitive data

4. **Use environment-specific secrets**
   - Prefix with environment name if needed (e.g., `PROD_GROQ_API_KEY`)
   - Or use GitHub Environments feature

## 🛠️ NPM Scripts

Add these scripts to your `package.json`:

```json
{
  "scripts": {
    "load-secrets": "tsx scripts/load-github-secrets.ts",
    "load-secrets:api": "tsx scripts/load-github-secrets.ts --api"
  }
}
```

## 📦 Local Development Setup

For local development without GitHub Actions:

1. Copy `.env.example` to `.env`
   ```bash
   cp .env.example .env
   ```

2. Manually fill in the values from your password manager or secure storage

3. **Never commit the `.env` file**

## 🔄 Updating Secrets

To update a secret:

1. Go to Repository → Settings → Secrets and variables → Actions
2. Find the secret you want to update
3. Click **Update** button
4. Enter the new value
5. Click **Update secret**

The next workflow run will use the updated value.

## 🎯 Environment-Specific Secrets

If you need different secrets for different environments:

### Option 1: Use GitHub Environments
1. Settings → Environments → New environment
2. Add environment-specific secrets
3. Reference in workflow: `environment: production`

### Option 2: Use Secret Prefixes
- `DEV_GROQ_API_KEY`
- `STAGING_GROQ_API_KEY`
- `PROD_GROQ_API_KEY`

## 📚 Additional Resources

- [GitHub Secrets Documentation](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
- [GitHub Environments](https://docs.github.com/en/actions/deployment/targeting-different-environments/using-environments-for-deployment)
- [GitHub CLI Documentation](https://cli.github.com/manual/)

## ❓ Troubleshooting

### Workflow fails with "secret not found"
- Verify secret name matches exactly (case-sensitive)
- Check secret exists in repository settings
- Ensure you have required permissions

### .env file not generated in workflow
- Check workflow logs for errors
- Verify all required secrets are set
- Check for syntax errors in workflow YAML

### Local script can't access secrets
- GitHub Secrets are only accessible in GitHub Actions
- For local development, manually create .env file
- Or use the "Generate .env" workflow to download artifact

## 🆘 Support

If you need help:
1. Check the workflow run logs in Actions tab
2. Verify all secrets are properly set
3. Review this documentation
4. Check GitHub Actions status page
