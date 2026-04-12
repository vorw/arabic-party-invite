# Arabic Invitation Site

Arabic RSVP invitation site with:

- public invitation page
- Supabase-backed RSVP storage
- password-protected `/admin` dashboard
- optional Google Sheets fallback
- email notification scaffold for new responses

## Current file layout

- `app.js`: public invitation page logic
- `supabase.js`: browser Supabase configuration
- `admin/index.html`: admin route
- `admin/admin.js`: admin login and dashboard
- `supabase/schema.sql`: tables, indexes, and RLS
- `supabase/functions/rsvp-notify/index.ts`: notification email function scaffold

## Recommended setup: Supabase

### 1. Create a Supabase project

Create a project in Supabase, then copy:

- Project URL
- anon public key

Paste them into `supabase.js`:

```js
export const supabaseConfig = {
  url: "PASTE_SUPABASE_URL_HERE",
  anonKey: "PASTE_SUPABASE_ANON_KEY_HERE"
};
```

### 2. Create the database schema

Open the Supabase SQL editor and run:

- `supabase/schema.sql`

This creates:

- `public.rsvps`
- `public.admin_users`
- indexes
- Row Level Security policies

### 3. Create the admin user

In Supabase Auth:

1. Create a user with email + password
2. Copy that user’s UUID
3. Choose an admin username
4. Insert it into `public.admin_users`

Example:

```sql
insert into public.admin_users (user_id, username, email)
values ('PASTE_AUTH_USER_ID_HERE', 'admin', 'admin@example.com');
```

That user will then be able to open:

- `/admin/`

and sign in to access the dashboard.

### 4. Admin dashboard features

The `/admin` dashboard supports:

- sign in with username/password
- view all RSVP rows
- accepted / declined counts
- delete RSVP rows

### 5. Email notifications

The repo includes:

- `supabase/functions/rsvp-notify/index.ts`

Recommended approach:

1. Deploy the edge function with Supabase
2. Set these secrets:
   - `RESEND_API_KEY`
   - `ADMIN_NOTIFY_EMAIL`
   - `NOTIFY_FROM_EMAIL`
   - `WEBHOOK_SHARED_SECRET`
3. Create a Supabase Database Webhook for inserts on `public.rsvps`
4. Point that webhook to the deployed `rsvp-notify` function URL
5. Send the shared secret as a bearer token

When a new RSVP row is inserted, the function can email the chosen inbox.

## Optional fallback: Google Sheets

The public invite page still supports the older Apps Script fallback if Supabase is not configured yet.

That fallback uses:

- `submitEndpoint` in `app.js`
- `google-apps-script/Code.gs`

If Supabase is configured, the public page will prefer Supabase inserts.

## Important security note

Do not try to build `/admin` as a frontend-only password gate without backend auth. The current setup uses Supabase Auth + RLS so that:

- public users can insert RSVP rows
- only admin users can read or delete them
