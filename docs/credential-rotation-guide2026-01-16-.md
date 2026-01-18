# Credential Rotation Guide

**Date:** 16 January 2026

This guide provides step-by-step instructions for rotating all credentials that were exposed and need to be regenerated for security compliance.

---

## Table of Contents

1. [Supabase Credentials](#1-supabase-credentials)
2. [Upstash Redis](#2-upstash-redis)
3. [Google OAuth Credentials](#3-google-oauth-credentials)
4. [Generate New Security Secrets](#4-generate-new-security-secrets)
5. [Update Vercel Environment Variables](#5-update-vercel-environment-variables)
6. [Verify Everything Works](#6-verify-everything-works)
7. [Quick Reference](#7-quick-reference)
8. [Checklist](#8-checklist)

---

## 1. Supabase Credentials

### Supabase Anon Key & Service Role Key

1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Select your project: `nqmeepudwtwkpjomxqfz`
3. Click **Settings** (gear icon) in the left sidebar
4. Click **API** under Configuration
5. Under **Project API keys**:
   - Copy the new `anon` `public` key → paste into `.env.local` as `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - Copy the new `service_role` `secret` key → paste into `.env.local` as `SUPABASE_SERVICE_ROLE_KEY`

### Supabase JWT Secret

1. In the same **Settings > API** page
2. Scroll down to **JWT Settings**
3. Click **Generate new JWT secret** (this will invalidate all existing sessions)
4. Copy the new secret → paste into `.env.local` as `SUPABASE_JWT_SECRET`

> **Warning:** Regenerating the JWT secret will log out all users. Do this during low-traffic hours.

---

## 2. Upstash Redis

1. Go to [https://console.upstash.com](https://console.upstash.com)
2. Sign in with your account
3. You have two options:

### Option A: Create a new database (recommended)

1. Click **Create Database**
2. Name it something like `mybudgetmate-prod`
3. Select a region close to your Vercel deployment (e.g., `us-east-1` or `ap-southeast-2` for NZ)
4. Click **Create**
5. On the database details page, copy:
   - `UPSTASH_REDIS_REST_URL` → paste into `.env.local`
   - `UPSTASH_REDIS_REST_TOKEN` → paste into `.env.local`
6. Delete the old database `darling-narwhal-31597`

### Option B: Rotate credentials on existing database

1. Click on your database `darling-narwhal-31597`
2. Go to **Details** tab
3. Click **Reset Password** or **Regenerate Token**
4. Copy the new credentials to `.env.local`

---

## 3. Google OAuth Credentials

1. Go to [https://console.cloud.google.com](https://console.cloud.google.com)
2. Select your project from the dropdown at the top
3. Navigate to **APIs & Services** > **Credentials**
4. Find your OAuth 2.0 Client ID: `849194816230-lthunp5rksmvo5dci68smog58r7i23gg`
5. Click on it to edit
6. Click **RESET SECRET** button
7. Confirm the reset
8. Copy the new **Client Secret** → paste into `.env.local` as `GOOGLE_CLIENT_SECRET`

> **Note:** The Client ID stays the same, only the secret changes.

---

## 4. Generate New Security Secrets

Run these commands in your terminal (PowerShell or Git Bash):

### Using OpenSSL (if installed)

```bash
# Generate KID_SESSION_SECRET
openssl rand -hex 32

# Generate CSRF_SECRET
openssl rand -hex 32

# Generate CRON_SECRET
openssl rand -hex 32
```

### Using Node.js (alternative)

```bash
# Generate all three secrets
node -e "for(let i=0;i<3;i++){console.log(require('crypto').randomBytes(32).toString('hex'))}"
```

### Using PowerShell (Windows native)

```powershell
# Generate a single secret
-join ((1..32) | ForEach-Object { '{0:x2}' -f (Get-Random -Minimum 0 -Maximum 256) })

# Run this 3 times for each secret
```

Copy each generated 64-character hex string into your `.env.local`:
- First one → `KID_SESSION_SECRET`
- Second one → `CSRF_SECRET`
- Third one → `CRON_SECRET`

---

## 5. Update Vercel Environment Variables

After updating `.env.local` locally, you also need to update Vercel:

1. Go to [https://vercel.com/dashboard](https://vercel.com/dashboard)
2. Select your project: `codex-my-budget-mate`
3. Click **Settings** tab
4. Click **Environment Variables** in the left sidebar
5. Update each variable:
   - Click the **...** menu next to each variable
   - Click **Edit**
   - Paste the new value
   - Click **Save**

### Variables to update on Vercel

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase admin key |
| `SUPABASE_JWT_SECRET` | JWT signing secret |
| `UPSTASH_REDIS_REST_URL` | Redis endpoint |
| `UPSTASH_REDIS_REST_TOKEN` | Redis auth token |
| `GOOGLE_CLIENT_SECRET` | Google OAuth secret |
| `KID_SESSION_SECRET` | Kids login session signing |
| `CSRF_SECRET` | CSRF token signing |
| `CRON_SECRET` | Cron job authentication |

6. After updating all variables, click **Deployments** tab
7. Click **...** on the latest deployment
8. Click **Redeploy** to apply the new environment variables

---

## 6. Verify Everything Works

After updating all credentials:

### Test locally

```bash
npm run dev
```

- Check console for any `[SECURITY CRITICAL]` errors
- Try logging in
- Try the kids login if you use that feature

### Test on Vercel

- Visit your deployed site
- Test login/logout
- Check Vercel logs for errors: **Deployments** > **...** > **View Function Logs**

---

## 7. Quick Reference

After completing all steps, your `.env.local` should look like this (with real values):

```env
# --- Supabase ---
NEXT_PUBLIC_SUPABASE_URL=https://nqmeepudwtwkpjomxqfz.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...your-new-anon-key...
SUPABASE_SERVICE_ROLE_KEY=eyJ...your-new-service-role-key...
SUPABASE_JWT_SECRET=your-new-jwt-secret...

# --- Upstash Redis ---
UPSTASH_REDIS_REST_URL=https://your-new-database.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-new-token...

# --- Google ---
GOOGLE_CLIENT_ID=849194816230-lthunp5rksmvo5dci68smog58r7i23gg.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-your-new-secret...

# --- Security Secrets ---
KID_SESSION_SECRET=a1b2c3d4...64-char-hex-string...
CSRF_SECRET=e5f6g7h8...64-char-hex-string...
CRON_SECRET=i9j0k1l2...64-char-hex-string...
```

---

## 8. Checklist

Use this checklist to track your progress:

- [ ] Supabase anon key rotated
- [ ] Supabase service role key rotated
- [ ] Supabase JWT secret regenerated
- [ ] Upstash Redis credentials rotated
- [ ] Google OAuth client secret reset
- [ ] KID_SESSION_SECRET generated
- [ ] CSRF_SECRET generated
- [ ] CRON_SECRET generated
- [ ] All values updated in `.env.local`
- [ ] All values updated in Vercel dashboard
- [ ] Vercel redeployed
- [ ] Local development tested
- [ ] Production deployment tested

---

## Related Documents

- [Security & Penetration Test Checklist](./SECURITY-PENTEST-CHECKLIST.md)
- [Architecture Documentation](./ARCHITECTURE.md)
