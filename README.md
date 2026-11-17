# ManaLife V1 — Private Household PWA

**ManaLife** is a mobile-friendly, installable React/Vite web app for exactly two household members (owner + one invited partner). **All tasks, grocery items, bills, and calendar events are visible to both household members. There is no private-task mode.** Access outside the household is restricted by PostgreSQL Row-Level Security (RLS), not just by hiding screens.

## Included in V1

- Today dashboard with task progress, groceries, bills, and upcoming events
- Shared tasks: create/edit/delete, assign to either member or anyone, priorities, daily/weekly/monthly repeats, completion per occurrence
- Shared groceries: add/edit/delete and check off purchased items
- Shared bills: INR amounts, once/monthly due dates, mark each occurrence paid
- Shared calendar: dated events, month navigation, upcoming events
- Separate email/password logins; owner creates a household; invite bound to partner's verified email; one-time code, 48-hour expiration
- **2-member cap**, household-only RLS, browser-installable PWA shell, auto-refresh shared data approximately every 20 seconds while the app is open
- Local, sample-data demo **only when running Vite in development mode without Supabase**

**Not included yet:** push notifications, email/WhatsApp/SMS reminders, live bank integration, payments, AI features, cross-device demo sync, offline data editing, and scheduled background jobs. Recurring tasks appear on their scheduled dates when the app is opened. This is an MVP, not a fully audited production service.

## 1. Run demo locally on Windows

Install Node.js (current LTS recommended). Unzip the project, then open Command Prompt in the `ManaLife_V1` folder:

```bat
npm install
npm run dev
```

Open the local address printed by Vite (normally `http://localhost:5173`). Choose **Explore the local demo**. The sample data is kept in that browser's localStorage. It is **not** a shared account and is not accessible on another device.

> If `npm` is not recognized, install Node.js and restart your terminal. If the demo button is absent, confirm you are using `npm run dev` and have **not** supplied production environment variables.

## 2. Create the real shared database

1. Create a new project at [Supabase](https://supabase.com/), in a region close to your household.
2. Under **SQL Editor**, run **`supabase/schema.sql`** once in the new project. It creates household tables, protected invitation functions, profile trigger, access policies and grants.
3. Open **`supabase/setup-owner.sql`**, replace `replace-with-your-email@example.com` with **your actual email address**, and run the updated statement in SQL Editor. This email allowlist lets **only this pre-approved email** create a household. Do not put that address in the source code.
4. Under **Authentication → Providers**, enable Email/password. Prefer email confirmation **ON**; the database requires `email_confirmed_at` for household creation and accepting invites. Verify both accounts' emails.
5. Under **Project Settings → API / Data API**, copy the **Project URL** and **publishable (or legacy anon) key**. **NEVER** copy a service-role key, secret API key, or database password into frontend files.
6. Copy `.env.example` to `.env.local` and set:

   ```ini
   VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLIC_ANON_OR_PUBLISHABLE_KEY
   ```

7. Restart the dev server (`Ctrl+C`, then `npm run dev`). Register the owner account using **the exact allowlisted email**, confirm it, sign in, choose **Create household**, and enter a household name.
8. In **Settings → Generate private invite**, type your wife's actual email. Copy the one-time code, send it to her securely. She creates/signs into her *own* account, confirms her email, and chooses **Join with invite**. Only the **matching verified email** can use the code; it expires after 48 hours and is used once.
9. Both members can now see and edit **all** household tasks, groceries, bills, and events.

> Admin setup for the initial owner is deliberately manual. An unapproved email can sign up but cannot create a household or access one without a valid invite. Database maximum is 2 household members in V1.

## 3. Privacy and security

- No shared information is accessible to anonymous visitors.
- RLS checks household membership for every shared content table and completion/payment record. Client-side UI filtering is not used as the security boundary.
- Users cannot join by guessing a household ID; invites are **random UUIDs**, restricted to the invitee's **verified email**, used once, and expire in 48 hours.
- A random email sign-up does **not** automatically get membership. The first owner must be provisioned in `private.allowed_owners` by the Supabase database administrator.
- Within the household **everything is shared**; assignment affects responsibility, not visibility.
- `VITE_` variables are public in browser bundles. Only use the **publishable/anon key**, never any privileged keys.
- The demo stores example data in browser storage. For personal information, use Supabase-backed accounts instead.
- V1 supports 2 people. Additional household members, removal/revocation, audit logs, and account recovery UX are future improvements.

## 4. Build and deploy

```bat
npm run build
npm run preview
```

Upload the project to GitHub, then create a new **Vercel** project with Vite detected. Set these two environment variables in **Vercel → Project → Settings → Environment Variables**:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

Deploy/redeploy after adding variables. In Supabase **Authentication → URL Configuration**, set the **Site URL** to your live HTTPS domain and add the domain to **Redirect URLs** as appropriate for email confirmation. Use an HTTPS address for installing the PWA; localhost works for local testing. Do not commit `.env.local` (already git-ignored).

To install it on a phone: open the HTTPS site and use browser **Add to Home Screen** / **Install app**. iPhone and Android menus vary by browser.

## 5. Project map

```
ManaLife_V1/
├── src/
│   ├── App.jsx       # all six screens and forms
│   ├── styles.css    # responsive mobile-first design
│   ├── store.js      # local demo & Supabase data operations
│   ├── supabase.js   # Supabase client (public key only)
│   ├── utils.js      # dates, recurrence, formatting
│   └── main.jsx
├── public/icons/     # installable PWA icons
├── supabase/
│   ├── schema.sql       # tables, functions, RLS, access grants
│   └── setup-owner.sql  # pre-approve the initial owner email
├── .env.example
├── vite.config.js    # Vite + PWA plugin
├── package.json
└── index.html
```

## Troubleshooting

| Symptom | What to check |
|---|---|
| “This email is not approved” | Check that you ran `setup-owner.sql` with the exact email used at signup. |
| “Please verify your email first” | Confirm the authentication email, then sign in again. |
| Invite rejected | Code must be unused, no older than 48 hours, and tied to wife's **verified** email. Generate a new invite if necessary. |
| Changes not visible on second phone | Both accounts must belong to the same Supabase household. Keep both apps open or revisit/foreground; open-app sync runs about every 20 seconds. |
| Build fails | Ensure Node.js is installed and `npm install` completed successfully. |
| Public site shows setup message | Set both `VITE_` environment variables in the hosting dashboard and redeploy. |

## Future roadmap

V2: real push notifications (requires a backend service worker push subscription/send system), reminder schedules, email delivery, more reliable real-time sync, family-member management. V3: smart planning and AI-based automation with explicit privacy settings.
