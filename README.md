# FlagTrack

> **Track every flag. Know every dollar.**
>
> The flat-rate technician's app for tracking flag hours, auditing paychecks, and never wondering "did I get paid for that?" again.

Built with React + Vite + Tailwind, Supabase, OpenAI Vision, and deployed on Netlify.

---

## Tomorrow's Setup — Read This Slowly

You're going to set up 3 accounts (or use existing ones), paste a bit of code, and deploy.
**Total time: 25–40 minutes.** Take it one step at a time, don't skip ahead.

You'll need:
- ✅ A **GitHub** account (you have this)
- ✅ An **OpenAI API key** (you're getting this)
- 🆕 A **Supabase** account (free — we'll make this)
- 🆕 A **Netlify** account (free — we'll make this)

---

## Step 1 — Get this code into GitHub (5 min)

There are two ways. Pick whichever feels easier.

### Option A: Upload via GitHub website (easiest, no terminal needed)
1. Go to **https://github.com/new**
2. Repository name: `flagtrack`
3. Set it to **Private** (your code is yours — keep it private)
4. ❌ Don't check "Add a README" — we already have one
5. Click **Create repository**
6. On the next page, look for the link **"uploading an existing file"** (under "Quick setup")
7. Drag and drop ALL the files from this folder (the entire FlagTrack folder contents) into the page
8. Scroll down, write a commit message like `Initial commit`, click **Commit changes**

✅ Done. Your code is on GitHub.

### Option B: Use Git on your computer (if you know how)
```bash
cd flagtrack
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/flagtrack.git
git push -u origin main
```

---

## Step 2 — Set up Supabase (10 min)

Supabase is your database + authentication + file storage. Free tier handles thousands of users.

### 2.1 Create the project
1. Go to **https://supabase.com** → click **Start your project**
2. Sign in with GitHub (easiest)
3. Click **New Project**
4. Choose the **free** plan organization
5. Project name: `flagtrack`
6. Database password: **GENERATE A STRONG ONE** — Supabase will let you click "Generate" — **save this password somewhere safe** (you may need it later)
7. Region: pick the closest to you (e.g. **East US (N. Virginia)** for Maryland)
8. Click **Create new project** — wait ~2 minutes for it to spin up

### 2.2 Run the database schema
1. In your Supabase project, click the **SQL Editor** icon in the left sidebar (looks like a database/terminal icon)
2. Click **+ New query**
3. Open the file `supabase/schema.sql` from this project
4. Copy the **entire contents** and paste it into the SQL Editor
5. Click **Run** (bottom right, or Cmd/Ctrl + Enter)
6. You should see "Success. No rows returned." — that means it worked.

This created all your tables, security policies, the file storage bucket, and the trigger that auto-creates a profile and seeds the 50-service flag library for every new user.

### 2.3 Grab your Supabase keys (you'll need these in Netlify)
1. In Supabase, click the **gear icon** (Project Settings) → **API**
2. You'll see two things you need:
   - **Project URL** (looks like `https://abcdefgh.supabase.co`)
   - **Project API keys** → copy the **`anon` `public`** key (NOT the service_role key — keep that one secret forever)
3. Paste both into a temporary note. You'll use them in Step 4.

### 2.4 Enable email auth
1. Settings sidebar → **Authentication** → **Providers**
2. Make sure **Email** is enabled (it usually is by default)
3. For testing, scroll down and DISABLE **"Confirm email"** temporarily — this lets you and your teammates sign up without checking email. Turn it back on for production.

---

## Step 3 — Get your OpenAI API key (5 min)

You're already doing this. Just confirm:
1. Go to **https://platform.openai.com**
2. Click **API keys** → **Create new secret key**
3. Name: `FlagTrack`
4. Copy the key (starts with `sk-proj-...`) — you only see it once
5. Go to **Settings → Billing** → add a card → add **$10 in credits**

Save your key in a temporary secure note. You'll paste it into Netlify in Step 4.

---

## Step 4 — Deploy to Netlify (10 min)

This is where everything comes together.

### 4.1 Create Netlify account
1. Go to **https://netlify.com** → **Sign up** with GitHub
2. Authorize Netlify to access your GitHub

### 4.2 Connect your FlagTrack repo
1. From the Netlify dashboard, click **Add new site → Import an existing project**
2. Choose **GitHub** → authorize if asked → find your `flagtrack` repo
3. Build settings (Netlify should auto-detect from `netlify.toml`):
   - **Branch:** `main`
   - **Build command:** `npm run build`
   - **Publish directory:** `dist`
4. **DO NOT CLICK DEPLOY YET** — first, add the environment variables.

### 4.3 Add environment variables
On that same page, expand **Environment variables** (or after first deploy go to Site settings → Environment variables):

Add these **3 variables** (click "Add a variable" for each):

| Variable name | Value |
|---|---|
| `VITE_SUPABASE_URL` | The Project URL from Step 2.3 |
| `VITE_SUPABASE_ANON_KEY` | The anon public key from Step 2.3 |
| `OPENAI_API_KEY` | Your OpenAI key from Step 3 (starts with `sk-proj-`) |

⚠️ **Critical:** The variable names must be **exactly** as written above (case-sensitive). Double-check.

### 4.4 Deploy!
1. Click **Deploy site**
2. Wait 1–2 minutes for the build (you'll see logs scrolling)
3. When done, Netlify gives you a URL like `https://wondrous-marshmallow-12345.netlify.app`
4. Click it. **You're live.**

### 4.5 (Optional) Custom domain
- In Netlify, you can rename the random subdomain: Site settings → Site information → Change site name → `flagtrack-yourname.netlify.app`
- Or buy a real domain like `flagtrack.app` later and connect it.

---

## Step 5 — Test it! (5 min)

1. Open your Netlify URL on your phone or laptop
2. Click **Sign Up** — create an account (use your real email, but since you disabled email confirm, you log in instantly)
3. Fill in your hourly flat rate
4. You land on the home page
5. Tap **Upload Ticket** → **Take Photo** or **Upload Image** → pick a ticket
6. Watch it scan (takes 5–15 seconds depending on ticket complexity)
7. Review the parsed lines, edit anything wrong, tap **Confirm Ticket**
8. You'll see it appear in your dashboard and history

---

## Troubleshooting

**Sign-up doesn't work / "Email not confirmed":**
Go to Supabase → Authentication → Providers → Email → uncheck "Confirm email"

**Scan fails with "OPENAI_API_KEY is not configured":**
You forgot to add the env var to Netlify, OR Netlify hasn't rebuilt with the new variable.
Fix: Site settings → Environment variables → confirm it's there → trigger a redeploy (Deploys → Trigger deploy → Deploy site)

**Scan fails with "OpenAI error: insufficient_quota":**
You haven't added billing to OpenAI yet. Go to platform.openai.com → Billing → add a card.

**The site builds but the page is blank:**
Open browser console (F12). Most likely the Supabase env vars are wrong or missing.

**"Row Level Security policy violation":**
The schema didn't fully run. Go back to Supabase SQL Editor and re-run `supabase/schema.sql`.

---

## How it works (the parts that matter)

### OCR flow
1. User taps Upload Ticket → picks photo
2. Photo uploads to Supabase Storage (private bucket — only that user can access)
3. Front-end calls `/.netlify/functions/scan-ticket` with the base64 image
4. The Netlify Function calls OpenAI Vision (gpt-4o-mini) with a structured prompt
5. OpenAI returns JSON with vehicle info + line items
6. Front-end matches each line item against your personal flag library
7. Editor screen opens with everything pre-filled — you confirm/edit, tap save

### Privacy / Rate Lock
- Hourly rate is stored in Supabase, never displayed by default
- Tap unlock → PIN/biometric → revealed for 10 seconds, then auto-locks
- Goal money has a separate eye toggle (preference saved per device)
- Even with rate revealed, the user controls visibility on each screen

### Multi-tenant ready
- Every table has Row-Level Security: a user can ONLY read/write their own rows
- Adding "shops" / company accounts later just means adding a `companies` table and a join — no rebuild needed

### Cost per scan
- About $0.005–$0.01 per ticket scan via OpenAI Vision
- $10 of API credit handles ~1,000–2,000 scans
- Supabase free tier: 500MB storage, unlimited rows, unlimited auth users

---

## File structure

```
flagtrack/
├── src/
│   ├── App.jsx                  Router + auth gate
│   ├── main.jsx                 Entry point
│   ├── index.css                Global styles
│   ├── components/
│   │   ├── AppShell.jsx         Top bar, bottom nav, drawer
│   │   ├── Icon.jsx             All SVG icons
│   │   └── UnlockModal.jsx      PIN/biometric unlock
│   ├── pages/
│   │   ├── Auth.jsx             Login + Signup
│   │   ├── Home.jsx             Home with goal/flag hours cards
│   │   ├── Upload.jsx           Photo/image/PDF/manual selector
│   │   ├── Editor.jsx           Ticket editor (qty × flag = total)
│   │   └── Other.jsx            History, Dashboard, Goals, Paycheck, Settings
│   ├── lib/
│   │   ├── supabase.js          Supabase client
│   │   ├── auth.jsx             Auth context
│   │   └── privacy.js           Rate lock + money hide
│   └── data/
│       └── starterLibrary.js    50 default services + fuzzy matcher
├── netlify/
│   └── functions/
│       └── scan-ticket.js       OpenAI Vision OCR function
├── supabase/
│   └── schema.sql               Full database schema + RLS + seed
├── index.html
├── netlify.toml                 Build config
├── package.json
├── tailwind.config.js
├── vite.config.js
└── README.md (this file)
```

---

## What's next after launch

Once your teammates are using it daily, here are the things to add (roughly in order of value):

1. **Personal library editor** — UI to let users edit their flag library (currently they can only add/edit through ticket scans)
2. **Vehicle-specific library entries** — when a user corrects "Oil Change" to 0.6 for a Mazda CX-30, save it as "Mazda CX-30 → 0.6" so next time it auto-fills
3. **Split labor markers** — let users mark "this job, I only did 50%" on a line
4. **Paycheck entry + audit** — record actual paychecks, compare to expected
5. **Export PDF reports** — for personal records or in case of payroll dispute
6. **Push notifications** — pay-day reminder, goal alerts
7. **Team / shop accounts** — for the SaaS pivot to dealerships and chains

---

## Questions or issues?

DM me. I can help you debug or push fixes through GitHub → Netlify auto-deploys on every push.

---

## ⚙️ v0.2 update — smart scanning + work-order merge

If you're updating from the first version, there's ONE extra database step:

1. Supabase → SQL Editor → New query
2. Paste the contents of `supabase/migration-merge.sql`
3. Run it (adds an index for fast work-order lookup)

What changed in v0.2:
- **Service grouping** — verbose ticket blocks collapse into short tech names ("Tire Service," "Tire Install")
- **N/C lines now count** — no-charge lines with FRH hours are captured (they still pay you)
- **FRH-aware** — reads the Flat Rate Hours column as the source of truth
- **Library auto-fill** — tickets with no FRH get hours proposed from your 50-item library, auto-accepted so they count immediately
- **"Needs hours" state** — services it can't identify are flagged red and don't count until you enter the time
- **Work-order merge** — scan page 2 (or an add-on job) with the same WO# and it silently merges into the same ticket, skipping duplicate services
- **Home reminder** — a banner shows how many services need hours or are estimated, so nothing slips before payday

🏁 **Track every flag. Know every dollar.**

---

## ⚙️ v0.5 update — scan-time counting, alignments, visible breakdowns

**No database step required** (uses the existing `created_at` column).

What changed:
- **Counting by scan time** — a ticket counts for the calendar day and period it was *scanned/uploaded*, not the date printed on it. Shoot photos in the bay, upload at home — it still lands in today. Resets at midnight.
- **Fully dynamic metrics** — day count, period count, hours, goal %, and gross all recalculate live; deleting a ticket drops it from every metric immediately.
- **Three alignment types** — Alignment Check (0.6), Standard Alignment (1.2), Steering Angle Sensor Recalibration (0.2), Alignment Recheck/Warranty (0.8). The scan distinguishes them by the ticket's wording (free/check vs standard vs recheck/warranty); falls back to Alignment Check if unclear.
- **Visible breakdowns** — when services roll up under a package header (e.g. Tire Service), the editor now shows "Includes: Tire Installation: 0.6 · Wheel Balance: 0.3" so nothing is hidden.
- **Corrected library values** — Courtesy Check fixed to 0.1.

---

## ⚙️ v0.4 update — article-number flag decoding

This is the big accuracy update based on how Firestone tickets actually encode flag time. **No database step** — front-end + scan function only.

What changed:
- **Article-number FRH decoding** — when a ticket doesn't print flag hours, the app now reads the first 2 digits of each 9-digit article number as the flag time (e.g. `037008190` → 0.3, `057015016` → 0.5).
- **Header grouping** — all qualifying labor lines under a bold section header (e.g. FIRESTONE TIRE PACKAGE) sum into ONE service (0.3 + 0.5 = 0.8).
- **Quantity is ignored entirely** — flag hours belong to the service, never multiplied by qty (3 tires ≠ 3× the hours).
- **DOT numbers & handwritten lines skipped** — penned-in tire codes no longer confuse the scan.
- **Parts/fees skipped** — only 9-digit labor article numbers count; shorter numbers (parts) and fees are ignored.
- **Fixed-value packages** — "Car Care Package" = 0.5 flat and absorbs all its sub-lines (rotation, battery check, etc.). More can be added in `scan-ticket.js` → FIXED_PACKAGES.
- **Cleaner editor** — each service shows one Flag Hours field instead of Qty × Flag × Total.

---

## ⚙️ v0.3 update — pay periods + reactive dashboard

This update makes the numbers come alive. ONE database step:

1. Supabase → SQL Editor → New query
2. Paste the contents of `supabase/migration-payperiod.sql`
3. Run it (adds pay-period + goal columns to your profile)

What changed in v0.3:
- **Pay period engine** — choose Weekly or Biweekly and your start day in Settings. Everything (home, dashboard, goals) now calculates against YOUR period, not a generic week.
- **Per-period goal** — set a target like $2,500/period in Settings. Home shows % progress, $ earned, and **hours-to-go** so you always know what's left.
- **Smart pacing** — "On pace" / "X% behind pace" based on how far into the period you are.
- **Reactive everywhere** — confirm a ticket and Home, Dashboard, Goals, and History all update the moment you land back on them. No more stale numbers.
- **Editable settings** — tap your rate, goal, period mode, and start day right in Settings; saves instantly.
- **Real Goals page** — live progress, hours done, hours to go, days left.
- **Period-aware Dashboard** — bar chart spans your actual period, projections based on your real daily average.
