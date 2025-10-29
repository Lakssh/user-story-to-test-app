import express from 'express';
import fs from 'fs/promises';
import path from 'path';

const router = express.Router();

interface ConfigData {
  PORT: string;
  CORS_ORIGIN: string;
  groq_API_BASE: string;
  groq_API_KEY: string;
  groq_MODEL: string;
  JIRA_URL: string;
  JIRA_USERNAME: string;
  JIRA_API_TOKEN: string;
  JIRA_ACCEPTANCE_CRITERIA_FIELD: string;
  JIRA_STORY_POINTS_FIELD: string;
}

// Get configuration (with masked sensitive values)
router.get('/', async (req, res) => {
  try {
    // Path to .env file in root directory (two levels up from dist/src)
    const envPath = path.resolve(__dirname, '../../../.env');
    console.log('Reading config from:', envPath);
    const envContent = await fs.readFile(envPath, 'utf-8');
    
    const config: Partial<ConfigData> = {};
    const lines = envContent.split('\n');
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (trimmedLine && !trimmedLine.startsWith('#')) {
        const [key, ...valueParts] = trimmedLine.split('=');
        const value = valueParts.join('=').replace(/^['"]|['"]$/g, '');
        
        if (key && value) {
          // Mask sensitive keys
          if (key.includes('KEY') || key.includes('TOKEN') || key.includes('PASSWORD')) {
            const maskedValue = value.length > 8 
              ? value.substring(0, 4) + '*'.repeat(value.length - 8) + value.substring(value.length - 4)
              : '*'.repeat(value.length);
            config[key as keyof ConfigData] = maskedValue;
          } else {
            config[key as keyof ConfigData] = value;
          }
        }
      }
    }
    
    res.json(config);
  } catch (error) {
    console.error('Error reading config:', error);
    res.status(500).json({ error: 'Failed to read configuration' });
  }
});

// Update configuration
router.put('/', async (req, res) => {
  try {
    const updates: Partial<ConfigData> = req.body;
    // Path to .env file in root directory (two levels up from dist/src)
    const envPath = path.resolve(__dirname, '../../../.env');
    console.log('Updating config at:', envPath);
    const envContent = await fs.readFile(envPath, 'utf-8');
    
    let newContent = envContent;
    
    for (const [key, value] of Object.entries(updates)) {
      // Skip if value contains asterisks (masked value that wasn't changed)
      if (value && !value.includes('*')) {
        const regex = new RegExp(`^${key}=.*$`, 'm');
        // Always wrap values in double quotes for consistency and safety
        const newLine = `${key}="${value}"`;
        
        if (regex.test(newContent)) {
          newContent = newContent.replace(regex, newLine);
        } else {
          // Add new key if it doesn't exist
          newContent += `\n${newLine}`;
        }
      }
    }
    
    await fs.writeFile(envPath, newContent, 'utf-8');
    
    // Reload environment variables
    for (const [key, value] of Object.entries(updates)) {
      if (value && !value.includes('*')) {
        process.env[key] = value.replace(/^['"]|['"]$/g, '');
      }
    }
    
    res.json({ message: 'Configuration updated successfully' });
  } catch (error) {
    console.error('Error updating config:', error);
    res.status(500).json({ error: 'Failed to update configuration' });
  }
});

export default router;
