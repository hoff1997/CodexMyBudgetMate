# Supabase Setup for My Budget Mate

## Quick Setup Guide

### 1. Create Supabase Account
1. Go to [supabase.com](https://supabase.com)
2. Click "Start your project" 
3. Sign up with GitHub, Google, or email

### 2. Create New Project
1. Click "New Project"
2. Choose your organization (or create one)
3. Enter project details:
   - **Name**: My Budget Mate (or any name you prefer)
   - **Database Password**: Create a strong password (save this!)
   - **Region**: Choose closest to you
4. Click "Create new project"
5. Wait 2-3 minutes for setup to complete

### 3. Get Your Credentials
1. In your Supabase dashboard, go to **Settings** → **API**
2. Copy these two values:
   - **Project URL** (looks like: `https://abcdefgh.supabase.co`)
   - **anon public key** (long string starting with `eyJ`)

### 4. Add to Replit Secrets
1. In your Replit project, click the **Secrets** tab (lock icon)
2. Add these secrets:
   - **Key**: `SUPABASE_URL` **Value**: [paste your Project URL]
   - **Key**: `SUPABASE_KEY` **Value**: [paste your anon public key]

### 5. Restart Your App
1. The app will automatically detect Supabase credentials
2. Database tables will be created automatically
3. Your data will now persist between sessions!

## Benefits After Setup
- ✅ Data persists between sessions
- ✅ Automatic backups by Supabase
- ✅ Can access your budget from any device
- ✅ Free tier includes 500MB storage + 2GB bandwidth

## Troubleshooting
- If you see connection errors, double-check your credentials
- Make sure there are no extra spaces in the secret values
- The app will fall back to in-memory storage if Supabase isn't configured

---
*The app works perfectly with in-memory storage too - Supabase just adds persistence!*