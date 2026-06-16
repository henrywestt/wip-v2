# WIP

A living Work In Progress page for weekly 1:1s. Three layers — **This Week** (what
you're doing now), **Quarterly Bets** (what you're achieving this quarter), and your
**North Star** (what you're becoming). Weeks are the main object: scroll back through
your own arc. Edits autosave; anyone with the link can edit; changes sync live.

Stack: Next.js 14 (App Router) · React · TypeScript · Supabase (Postgres + Realtime).
Hand-rolled CSS, no UI framework.

---

## The three pieces

- **GitHub** holds the code.
- **Vercel** runs it and puts it on the internet. It rebuilds every time you push to GitHub.
- **Supabase** is the memory. Your weeks live here. Without it, nothing persists.

Vercel finds Supabase through two environment variables. That wire is the part people
forget. If the live site loads but shows no data, a missing env var is almost always why.

---

## Deploy it — do these in order

### 1. Supabase (the database) — ~5 min
1. Go to supabase.com, create a free account, **New project**. Pick a name and a strong
   database password. Wait ~2 min for it to spin up.
2. Left sidebar → **SQL Editor** → **New query**.
3. Open `supabase/schema.sql` from this repo, paste the whole thing in, click **Run**.
   You should see "Success". This creates the one table and turns on live sync.
4. Left sidebar → **Project Settings** (gear) → **API**. Keep this tab open. You need:
   - **Project URL** (looks like `https://abcd.supabase.co`)
   - **anon public** key (a long string under "Project API keys")

### 2. GitHub (the code) — ~3 min
1. Create a new **empty** repo on github.com (no README, it'll conflict).
2. In a terminal, from this folder:
   ```bash
   git init
   git add .
   git commit -m "WIP: initial"
   git branch -M main
   git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPO.git
   git push -u origin main
   ```
   (`.gitignore` already keeps `node_modules` and your secrets out of the repo.)

### 3. Vercel (the host) — ~3 min
1. Go to vercel.com, sign in **with GitHub**.
2. **Add New → Project**, pick the repo you just pushed. Vercel auto-detects Next.js,
   leave the build settings alone.
3. Before clicking Deploy, open **Environment Variables** and add the two from Supabase:
   - `NEXT_PUBLIC_SUPABASE_URL` → your Project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` → your anon public key
4. Click **Deploy**. ~1 minute later you get a live URL.
5. Open it. It lands on a fresh doc at `/w/<some-id>`. **That URL is your WIP.** Bookmark
   it. Send it to Polina and she can edit the same page live.

From now on: edit code → `git push` → Vercel redeploys automatically.

---

## Run it locally first (optional)
```bash
cp .env.local.example .env.local     # then paste your two Supabase values in
npm install
npm run dev                          # open http://localhost:3000
```

---

## Read this — the security model
"Anyone with the link can edit" is exactly what's built. Be honest about what that means:
anyone who has the public anon key (it ships in the browser bundle) **and** a doc id can
read or edit that doc. **Treat the URL like a password.** Don't put confidential client
data in here. If you later want it locked to named people, that's a Supabase Auth step —
a clean follow-up, not a rewrite.

## How the data is stored
One table, `wip_docs`, with the whole document in a single JSON column. That's deliberate:
you can add, rename, or restructure sections forever without a database migration. Weeks
are just an array inside the JSON. Trade-off: no per-field SQL queries or row-level history.
For a personal 1:1 doc, that's the right call. If reporting needs grow later, the weeks can
be split into their own table without touching the rest.

## Troubleshooting
- **Live site loads but no data / "saving…" never becomes "saved"** → env vars missing or
  mistyped in Vercel. Fix them, then redeploy (Vercel → Deployments → ⋯ → Redeploy).
- **Edits don't appear on the other person's screen** → re-run `supabase/schema.sql`; the
  realtime line at the bottom is what enables live sync.
- **Build fails on Vercel** → check the deploy log. Lint is set not to block builds, so a
  failure is a real type/import error worth reading.
