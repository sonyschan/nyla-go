# Security Notice

## ⚠️ IMPORTANT: API Key Security

**NEVER commit your API keys to Git!**

### Local Development Setup

1. **Environment File**: Your OpenAI API key is stored in `.env` file
   - This file is listed in `.gitignore` and will NOT be pushed to Git
   - Keep this file secure and never share it

2. **Verify .gitignore**: Always ensure `.env` is in your `.gitignore`:
   ```
   .env
   .env.*
   .env.local
   ```

3. **Before Committing**: Always run:
   ```bash
   git status
   ```
   Make sure `.env` is NOT listed in files to be committed

### Production Deployment

For Cloud Run deployment, use Google Secret Manager:

```bash
# Store the API key in Secret Manager (do this once)
echo -n "your-api-key" | gcloud secrets create openai-api-key --data-file=-

# Reference in Cloud Run deployment
gcloud run deploy nylago-llm-proxy \
  --set-secrets OPENAI_API_KEY=openai-api-key:latest
```

### If You Accidentally Commit an API Key

1. **Immediately revoke the key** in your OpenAI dashboard
2. Generate a new API key
3. Remove the commit from history using `git filter-branch` or BFG Repo-Cleaner
4. Force push to update remote repository

### Security Best Practices

- ✅ Use environment variables for all secrets
- ✅ Keep `.env` files out of version control
- ✅ Use secret management services in production
- ✅ Rotate API keys regularly
- ✅ Use least-privilege access controls
- ❌ Never hardcode secrets in source code
- ❌ Never commit `.env` files
- ❌ Never share API keys in issues, PRs, or documentation