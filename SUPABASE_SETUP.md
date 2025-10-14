# Supabase Setup Guide for My Budget Mate

This guide will help you set up Supabase as the backend database for your budgeting app, ensuring your data is never lost.

## Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign up for a free account
2. Click "New Project"
3. Choose your organization and enter project details:
   - **Name**: My Budget Mate
   - **Database Password**: Create a strong password (save this!)
   - **Region**: Choose closest to your location
4. Click "Create new project" (takes 2-3 minutes)

## Step 2: Get Your Credentials

1. In your Supabase dashboard, go to **Settings** > **API**
2. Copy these two values:
   - **Project URL** (starts with `https://...supabase.co`)
   - **anon/public key** (starts with `eyJ...`)

## Step 3: Set Up Database Schema

1. In your Supabase dashboard, go to **SQL Editor**
2. Click "New Query"
3. Copy the entire contents of `server/supabase-schema.sql` 
4. Paste it into the SQL editor
5. Click "Run" to create all tables

## Step 4: Add Secrets to Replit

1. In your Replit project, click the **Secrets** tab (lock icon)
2. Add these two secrets:
   - **Key**: `SUPABASE_URL` **Value**: Your Project URL
   - **Key**: `SUPABASE_KEY` **Value**: Your anon/public key
3. Click "Add secret" for each

## Step 5: Test the Connection

1. Restart your Replit project
2. Check the console logs for:
   ```
   ✅ Connected to Supabase database - all data will be persisted
   📦 Storage backend: Supabase PostgreSQL
   ```

## What This Gives You

✅ **Data Persistence**: All your budgets, transactions, and envelopes are stored in Supabase
✅ **Never Lose Data**: Survives code changes, restarts, and deployments  
✅ **Real-time Updates**: Changes are immediately saved to the database
✅ **Scalable**: Handles multiple users and large amounts of data
✅ **Backup & Recovery**: Supabase handles backups automatically

## Troubleshooting

**Connection Failed?**
- Double-check your SUPABASE_URL and SUPABASE_KEY in Secrets
- Make sure you ran the SQL schema in Step 3
- Verify your Supabase project is active (not paused)

**Data Not Saving?**
- Check console logs for error messages
- Ensure you have proper permissions in Supabase
- Verify the database tables were created correctly

**Migration from Demo Data**
- The app will automatically detect Supabase and switch to it
- Demo data from memory storage won't transfer automatically
- You can recreate your budget setup through the UI

## Next Steps

Once Supabase is connected:
1. Go through the "Getting Started" flow to set up your budget
2. Add your real accounts and envelopes
3. Start tracking transactions
4. Your data will be safely stored in Supabase forever!

## Support

If you need help:
1. Check the Supabase documentation
2. Verify your SQL schema was created correctly
3. Test the connection using the built-in diagnostics