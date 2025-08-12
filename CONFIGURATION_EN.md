# Configuration Guide

This document explains how to configure environment variables for the N8N Backup & Restore tool.

## Quick Start

1. Copy the environment variable template:
   ```bash
   cp .env.example .env
   ```

2. Edit the `.env` file and fill in your actual configuration values

## Detailed Configuration Instructions

### N8N Configuration

#### Local N8N Instance
```env
N8N_BASE_URL=http://localhost:5678
N8N_API_KEY=your_n8n_api_key_here
```

**How to get N8N API Key:**
1. Log into your N8N instance
2. Go to Settings > API Keys
3. Create a new API Key
4. Copy the generated API Key

#### Multi-Environment Configuration
The tool supports up to 4 N8N environments (local + 3 remote):

```env
# Environment A
N8N_A_NAME=Production N8N
N8N_A_BASE_URL=https://your-production-n8n.com
N8N_A_API_KEY=your_production_api_key

# Environment B
N8N_B_NAME=Staging N8N
N8N_B_BASE_URL=https://your-staging-n8n.com
N8N_B_API_KEY=your_staging_api_key

# Environment C
N8N_C_NAME=Development N8N
N8N_C_BASE_URL=https://your-dev-n8n.com
N8N_C_API_KEY=your_dev_api_key
```

### GitHub Configuration

```env
GITHUB_TOKEN=ghp_your_github_personal_access_token_here
GITHUB_REPO_OWNER=your_github_username
GITHUB_REPO_NAME=n8n-backups
```

**How to get GitHub Personal Access Token:**
1. Go to GitHub Settings > Developer settings > Personal access tokens
2. Click "Generate new token (classic)"
3. Select the following permissions:
   - `repo` (Full repository access)
   - `write:packages` (if needed)
4. Copy the generated token

**Repository Setup:**
- Ensure the specified repository exists
- Ensure you have write access to the repository

### Google Drive Configuration

```env
GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-your_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:3000/auth/google/callback
GOOGLE_REFRESH_TOKEN=1//your_google_refresh_token_here
```

**How to set up Google Drive API:**

1. **Create Google Cloud Project:**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select an existing one

2. **Enable Google Drive API:**
   - In API & Services > Library, search for "Google Drive API"
   - Click Enable

3. **Create OAuth 2.0 Credentials:**
   - Go to API & Services > Credentials
   - Click "Create Credentials" > "OAuth 2.0 Client IDs"
   - Select "Web application" as application type
   - Add redirect URI: `http://localhost:3000/auth/google/callback`

4. **Get Refresh Token:**
   - Use OAuth 2.0 Playground or run the application for initial authorization
   - Save the obtained refresh token

### Security Configuration

```env
JWT_SECRET=your_64_character_jwt_secret_key_here
ENCRYPTION_KEY=your_32_character_encryption_key_here
```

**Generate Security Keys:**

```bash
# Generate JWT Secret (64 characters)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Generate Encryption Key (32 characters)
node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"
```

### Server Configuration

```env
PORT=3003
```

Ensure the selected port is not occupied by other applications.

## Environment Variable Validation

When starting the application, the system automatically validates whether necessary environment variables are set. If required configurations are missing, the application will display error messages and provide setup guidance.

## Security Considerations

1. **Never commit the `.env` file to version control**
2. **Regularly rotate API Keys and Tokens**
3. **Use strong passwords and long keys**
4. **Limit API Key permission scope**
5. **Use environment variables instead of files in production**

## Troubleshooting

### Common Issues

1. **N8N API Connection Failed**
   - Check if N8N_BASE_URL is correct
   - Confirm API Key is valid and has sufficient permissions
   - Check network connectivity

2. **GitHub Push Failed**
   - Confirm GitHub Token has repo permissions
   - Check repository name and owner are correct
   - Confirm repository exists and is accessible

3. **Google Drive Upload Failed**
   - Check OAuth configuration is correct
   - Confirm Refresh Token is still valid
   - Check Google Drive API quota

### Testing Configuration

After starting the application, you can:
1. Visit the `/test` page to test basic functionality
2. Check connection status in log output
3. Try performing small-scale backup tests

## Support

If you encounter issues during configuration:
1. Check application logs
2. Confirm all environment variables are formatted correctly
3. Refer to the troubleshooting section in this document
4. Report issues in GitHub Issues