# Environment Variables for Netlify

Set these in your Netlify dashboard under Site Settings > Environment Variables:

## Required Environment Variables

```
JWT_SECRET=86d2bbcb5cd6a7b84f1e84473a95c976fd1febc5955da91779765d8df109304812e3c2b6410eb4c92cfa524f17e0263649f3b164297c0c94dcc0798682f1c8fe

ANALYTICS_ENCRYPTION_KEY=276970bfb90ec83a75fbd70a1685557a297b31f4586f6b8e098c81511b7a0bef

DATABASE_PATH=./sprouter_events.db

SESSION_STORAGE_PATH=./sessions.json
```

## How to Set Environment Variables in Netlify:

1. Go to your Netlify dashboard
2. Select your site
3. Go to Site Settings > Environment Variables
4. Add each variable above
5. Make sure to set them for "All deploy contexts" or "Production"

## After Setting Variables:

1. Trigger a new deployment (or push changes to git)
2. Test the endpoints:
   - `https://maidutickets.com/api/health`
   - `https://maidutickets.com/api/login` (POST with student ID)
   - `https://maidutickets.com/api/volunteer-login` (POST with code and email)
