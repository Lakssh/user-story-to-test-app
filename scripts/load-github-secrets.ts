#!/usr/bin/env node
/**
 * Script to load secrets from GitHub and populate .env file
 * Usage: npm run load-secrets
 * 
 * Prerequisites:
 * 1. Install GitHub CLI: brew install gh
 * 2. Authenticate: gh auth login
 * 3. Set up repository secrets in GitHub Settings > Secrets and variables > Actions
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

interface SecretConfig {
  envKey: string;
  githubSecretName: string;
}

// Map environment variables to GitHub secret names
const SECRET_MAPPINGS: SecretConfig[] = [
  { envKey: 'groq_API_KEY', githubSecretName: 'GROQ_API_KEY' },
  { envKey: 'JIRA_API_TOKEN', githubSecretName: 'JIRA_API_TOKEN' },
];

// GitHub repository (format: owner/repo)
const GITHUB_REPO = process.env.GITHUB_REPO || 'Lakssh/gen-ai-learning-homeworks';

async function loadSecretsFromGitHub() {
  console.log('🔐 Loading secrets from GitHub...\n');

  // Check if gh CLI is installed
  try {
    execSync('gh --version', { stdio: 'pipe' });
  } catch (error) {
    console.error('❌ GitHub CLI (gh) is not installed.');
    console.error('   Install it with: brew install gh');
    console.error('   Then authenticate with: gh auth login');
    process.exit(1);
  }

  // Check if authenticated
  try {
    execSync('gh auth status', { stdio: 'pipe' });
  } catch (error) {
    console.error('❌ Not authenticated with GitHub CLI.');
    console.error('   Run: gh auth login');
    process.exit(1);
  }

  const envPath = path.join(__dirname, '../.env');
  let envContent = fs.readFileSync(envPath, 'utf-8');

  let successCount = 0;
  let failureCount = 0;

  for (const { envKey, githubSecretName } of SECRET_MAPPINGS) {
    try {
      console.log(`📥 Fetching ${githubSecretName}...`);
      
      // Fetch secret value from GitHub
      const secretValue = execSync(
        `gh secret list --repo ${GITHUB_REPO} --json name,updatedAt | grep -q "${githubSecretName}" && echo "exists" || echo "not_found"`,
        { encoding: 'utf-8', stdio: 'pipe' }
      ).trim();

      if (secretValue === 'not_found') {
        console.warn(`⚠️  Secret ${githubSecretName} not found in GitHub repository`);
        failureCount++;
        continue;
      }

      // Note: GitHub CLI doesn't allow reading secret values directly for security
      // We need to use GitHub API with a personal access token
      console.log(`✅ Secret ${githubSecretName} exists in GitHub`);
      console.log(`   Note: Use GitHub Actions to inject this value automatically`);
      
      successCount++;
    } catch (error) {
      console.error(`❌ Failed to fetch ${githubSecretName}:`, error);
      failureCount++;
    }
  }

  console.log(`\n📊 Summary:`);
  console.log(`   ✅ Success: ${successCount}`);
  console.log(`   ❌ Failed: ${failureCount}`);
  
  console.log('\n💡 Note: GitHub Secrets cannot be read directly via CLI for security.');
  console.log('   Use the GitHub Actions workflow to automatically inject secrets.');
}

// Alternative: Load from GitHub API with Personal Access Token
async function loadSecretsFromGitHubAPI() {
  const GITHUB_TOKEN = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  
  if (!GITHUB_TOKEN) {
    console.error('❌ GITHUB_TOKEN or GH_TOKEN environment variable is required.');
    console.error('   Create a Personal Access Token at: https://github.com/settings/tokens');
    console.error('   Required scope: repo (for private repos) or public_repo (for public repos)');
    console.error('   Then run: export GITHUB_TOKEN=your_token_here');
    process.exit(1);
  }

  console.log('🔐 Loading secrets from GitHub API...\n');

  const envPath = path.join(__dirname, '../.env');
  let envContent = fs.readFileSync(envPath, 'utf-8');

  for (const { envKey, githubSecretName } of SECRET_MAPPINGS) {
    try {
      console.log(`📥 Fetching ${githubSecretName}...`);
      
      // Note: GitHub API doesn't expose secret values for security reasons
      // This endpoint only lists secret names
      const response = await fetch(
        `https://api.github.com/repos/${GITHUB_REPO}/actions/secrets/${githubSecretName}`,
        {
          headers: {
            'Authorization': `token ${GITHUB_TOKEN}`,
            'Accept': 'application/vnd.github.v3+json',
          },
        }
      );

      if (response.ok) {
        console.log(`✅ Secret ${githubSecretName} exists in GitHub`);
      } else if (response.status === 404) {
        console.warn(`⚠️  Secret ${githubSecretName} not found in GitHub repository`);
      } else {
        console.error(`❌ Failed to check ${githubSecretName}: ${response.statusText}`);
      }
    } catch (error) {
      console.error(`❌ Error fetching ${githubSecretName}:`, error);
    }
  }

  console.log('\n💡 GitHub Secrets values cannot be retrieved via API for security.');
  console.log('   Secrets are only available in GitHub Actions workflows.');
  console.log('   Use the provided GitHub Actions workflow for deployment.');
}

// Main execution
const args = process.argv.slice(2);
const useAPI = args.includes('--api');

if (useAPI) {
  loadSecretsFromGitHubAPI().catch(console.error);
} else {
  loadSecretsFromGitHub();
}
