# Dual Client Deployment Guide

## Overview

This project supports **dual deployment** to two separate Vercel projects, each with its own database:

| Client | URL | Database | Purpose |
|--------|-----|----------|---------|
| **Client 1** (Original) | `https://gym-genie-lime-fitness.vercel.app` | Original Supabase | Primary client |
| **Client 2** (New) | `https://gym-genie-one.vercel.app` | Separate Supabase | Secondary client |

Both clients share the same codebase but use **different Supabase databases** and environment variables.

---

## Quick Start

### Deploy to Both Clients
```bash
npm run deploy:both
```

### Deploy to Individual Clients
```bash
# Deploy to Client 1 only
npm run deploy:client1

# Deploy to Client 2 only
npm run deploy:client2
```

---

## File Structure

### Deployment Scripts
- `deploy-vercel-client1.sh` - Deploys to Client 1 (original)
- `deploy-vercel-client2.sh` - Deploys to Client 2 (new, with separate DB)
- `deploy-vercel-both.sh` - Deploys to both clients sequentially
- `deploy-vercel-setup-client2.sh` - Sets up environment variables for Client 2

### Environment Files
- `vercel.json` - Vercel configuration (shared)
- `vercel-client2.json` - Vercel configuration for Client 2 (if needed)
- `.env.production.client2` - Environment variables for Client 2

---

## Environment Variables

### Client 1 (Original)
Managed directly in Vercel dashboard or via `vercel env` commands.

### Client 2 (New)
Stored in `.env.production.client2` and configured in Vercel:

```bash
# Database
DATABASE_URL=postgresql://...
NEXT_PUBLIC_SUPABASE_URL=https://...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...

# Firebase (Shared)
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_FIREBASE_VAPID_KEY=...

# Server
NODE_ENV=production
PORT=5000
STATIC_SERVER_URL=https://gym-genie-one.vercel.app
```

---

## Adding a Third Client

To add another client with a separate database:

1. **Create environment file**:
   ```bash
   cp .env.production.client2 .env.production.client3
   # Edit .env.production.client3 with new Supabase credentials
   ```

2. **Create deployment script**:
   ```bash
   cp deploy-vercel-client2.sh deploy-vercel-client3.sh
   # Update deploy-vercel-client3.sh to reference client3
   ```

3. **Create Vercel project**:
   ```bash
   vercel --name gym-genie-three --yes --scope gvngymgenie-2794s-projects
   ```

4. **Set environment variables**:
   ```bash
   ./deploy-vercel-setup-client3.sh
   ```

5. **Deploy**:
   ```bash
   vercel --prod
   ```

---

## Vercel Projects

Both projects are under the Vercel team: `gvngymgenie-2794s-projects`

- **Project 1**: `gym-genie-lime-fitness`
- **Project 2**: `gym-genie-one`

### Manage via CLI
```bash
# Link to specific project
vercel link --project gym-genie-one

# View deployments
vercel ls

# View environment variables
vercel env ls production

# Add environment variable
vercel env add VAR_NAME production
```

---

## Database Management

### Client 1 Database
```bash
# Push schema changes to Client 1 DB
npm run db:push
```

### Client 2 Database
```bash
# Switch to Client 2 environment
source .env.production.client2

# Push schema changes to Client 2 DB
npm run db:push
```

**Important**: Always verify you're connected to the correct database before running migrations!

---

## Troubleshooting

### Deployment Fails
1. Check build logs: `vercel --prod`
2. Verify environment variables: `vercel env ls production`
3. Check Vercel dashboard: https://vercel.com/gvngymgenie-2794s-projects

### Database Connection Issues
1. Verify `DATABASE_URL` is correct in `.env.production.client2`
2. Check Supabase project is active
3. Test connection locally: `source .env.production.client2 && npm run db:push`

### Environment Variables Not Working
1. Ensure variables are set in Vercel: `vercel env ls production`
2. Redeploy after adding variables: `vercel --prod`
3. Check variable names match exactly (case-sensitive)

---

## Best Practices

✅ **DO**:
- Test changes locally before deploying
- Deploy to both clients to keep them in sync
- Keep environment files secure (never commit `.env.production.client2` to public repos)
- Verify database connections before running migrations

❌ **DON'T**:
- Mix up environment variables between clients
- Run migrations without verifying the target database
- Commit sensitive credentials to version control
- Deploy to only one client unless intentionally testing

---

## Support

For issues or questions:
1. Check Vercel logs: `vercel logs <deployment-url>`
2. Review Supabase dashboard for database issues
3. Consult Vercel docs: https://vercel.com/docs
