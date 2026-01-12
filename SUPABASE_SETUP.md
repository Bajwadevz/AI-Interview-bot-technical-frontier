# Supabase Setup Guide

## Overview
This application now uses Supabase for:
- **User Authentication** (Supabase Auth)
- **Database Storage** (PostgreSQL with Row Level Security)
- **Real-time Data** (Optional - can be enabled later)

## Setup Steps

### 1. Create Supabase Project
✅ Already done - Your project URL: `https://vfdkbdhntohtmheuzsaa.supabase.co`

### 2. Run SQL Schema
1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Navigate to **SQL Editor**
3. Copy and paste the contents of `supabase/schema.sql`
4. Click **Run** to execute the schema

This will create:
- `profiles` table (extends auth.users)
- `interview_sessions` table
- `transcript_entries` table
- `custom_questions` table
- Row Level Security (RLS) policies for privacy
- Triggers for automatic profile creation

### 3. Verify RLS Policies
After running the schema, verify RLS is enabled:
1. Go to **Authentication** → **Policies**
2. Check that all tables have RLS enabled
3. Verify policies are created for each table

### 4. Environment Variables
The Supabase client is already configured in `backend/services/supabase.ts` with:
- **URL**: `https://vfdkbdhntohtmheuzsaa.supabase.co`
- **Anon Key**: `sb_publishable_YKIDaodU8Hd9WG6RLwCb4g_3Up5fIre`

### 5. Test Authentication
1. Start the dev server: `npm run dev`
2. Try registering a new user
3. Check Supabase Dashboard → **Authentication** → **Users** to see the new user
4. Check **Table Editor** → **profiles** to see the profile was created

## Database Schema

### Tables Created:

1. **profiles** - User profiles (extends auth.users)
   - `id` (UUID, references auth.users)
   - `email`, `name`, `role`, `is_verified`, `avatar`, `history`

2. **interview_sessions** - Interview sessions
   - `session_id` (TEXT, primary key)
   - `user_id` (UUID, references auth.users)
   - `domain`, `difficulty`, `question_count`, `status`
   - `state` (JSONB) - stores scores, feedback, progress

3. **transcript_entries** - Conversation transcripts
   - `id` (UUID, primary key)
   - `session_id` (TEXT, references interview_sessions)
   - `user_id` (UUID, references auth.users)
   - `ts`, `speaker`, `text`, `intent`, `confidence`

4. **custom_questions** - AI-generated custom questions
   - `id` (TEXT, primary key)
   - `user_id` (UUID, references auth.users)
   - `domain`, `text`, `type`, `difficulty`, `expected_keywords`

## Row Level Security (RLS)

All tables have RLS enabled with policies ensuring:
- ✅ Users can only see their own data
- ✅ Users can only create/update their own records
- ✅ Automatic user_id filtering on all queries
- ✅ Privacy guaranteed at the database level

## Migration from localStorage

The application maintains backward compatibility:
- Falls back to localStorage if Supabase is unavailable
- Gradually migrates data as users interact
- No data loss during transition

## Troubleshooting

### Issue: "relation does not exist"
**Solution**: Run the SQL schema in Supabase SQL Editor

### Issue: "permission denied"
**Solution**: Check RLS policies are created correctly

### Issue: "user not authenticated"
**Solution**: Ensure user is logged in via Supabase Auth

### Issue: Profile not created on signup
**Solution**: Check the trigger `on_auth_user_created` exists

## Next Steps

1. ✅ Run SQL schema
2. ✅ Test user registration
3. ✅ Test user login
4. ✅ Verify data is saved to Supabase
5. ✅ Check RLS policies are working (users can't see others' data)

## Security Notes

- RLS policies ensure users can only access their own data
- All queries automatically filter by `auth.uid()`
- No sensitive data exposed in client-side code
- Supabase handles password hashing and security

