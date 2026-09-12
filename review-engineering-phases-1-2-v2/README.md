# Review Engineering Assistant

Branded review-request tool for loan officers and their real estate agent partners.

## Features

- Voice-first agent interview and AI-generated review outreach
- Loan officer passwordless login and branding profile
- Public branded links with no agent login
- Optional named tracking links and anonymous analytics
- Transaction answers and generated content are not stored

## Required Vercel environment variables

```text
OPENAI_API_KEY=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

`OPENAI_MODEL` is optional and overrides the default model.

## Supabase setup

1. Create a Supabase project.
2. Open SQL Editor and run `supabase/schema.sql` once.
3. In Authentication → URL Configuration, set Site URL to the production domain.
4. Add `https://your-domain.com/dashboard` to Redirect URLs.
5. In Authentication → Users, invite each approved loan officer by email. Public sign-up is disabled in the app.
6. Copy the Project URL and anon public key into Vercel.

## Routes

- `/login` — loan officer sign-in
- `/dashboard` — branding, analytics, and tracking links
- `/l/[loan-officer-slug]` — public branded interview
- `/l/[loan-officer-slug]/[tracking-slug]` — named tracking link
- `/app.html` — unbranded interview

Never commit a real API key to this repository.
