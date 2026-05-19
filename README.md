# Ledger — Personal Finance Tracker

A private, mobile-friendly personal finance tracker that runs on Vercel and syncs your data across all devices.

Track multiple bank accounts, credit cards, cash, loans, and investments. Log every transaction in seconds with the floating + button. See your net worth, today's spending, and monthly breakdown at a glance.

## Tech Stack

- **Next.js 14** (App Router) — framework
- **Upstash Redis** — your data storage (free tier, syncs across devices)
- **Tailwind CSS + custom design tokens** — styling
- **Recharts** — pie + bar charts
- **TypeScript** — type safety

---

## Deployment Guide (~10 minutes)

You'll do these things in order:
1. Push this code to GitHub
2. Import it into Vercel
3. Add the Upstash Redis integration (this is your database)
4. Redeploy
5. Bookmark the URL on phone and laptop

### Step 1 — Push to GitHub

1. Create a new repository on GitHub. Suggested name: `finance-tracker`. Keep it **Private** (your data lives here later through env vars, but private is good hygiene).
2. On your computer, in this project folder, run:

   ```bash
   git init
   git add .
   git commit -m "Initial finance tracker"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/finance-tracker.git
   git push -u origin main
   ```

   Replace `YOUR_USERNAME` with your GitHub username.

### Step 2 — Deploy to Vercel

1. Go to [vercel.com](https://vercel.com) and sign in with your GitHub account.
2. Click **Add New → Project**.
3. Find `finance-tracker` in the list and click **Import**.
4. Leave all defaults. Click **Deploy**.

The first deploy will succeed but the app won't be able to save data yet — you'll see a sync error. That's expected. Next step fixes it.

### Step 3 — Add Upstash Redis (your database)

1. In your Vercel project dashboard, click the **Storage** tab.
2. Click **Create Database** (or **Connect Store**).
3. Choose **Upstash** → **Redis**.
4. Pick a database name (e.g. `finance-data`) and the region closest to you (Mumbai if you're in India).
5. Select the **Free** plan.
6. Click **Create**. Vercel will provision the database and auto-inject `KV_REST_API_URL` and `KV_REST_API_TOKEN` environment variables into your project.

### Step 4 — Redeploy

1. Go to the **Deployments** tab.
2. Click the three-dot menu on the latest deployment → **Redeploy**.
3. Wait ~30 seconds.

Your app is now live at `https://finance-tracker-YOUR_USERNAME.vercel.app` (or whatever Vercel assigned). Open it.

### Step 5 — Use it everywhere

- **On phone**: Open the URL in Chrome/Safari → Share → **Add to Home Screen**. It now behaves like an installed app.
- **On laptop**: Bookmark the URL.

Any transaction you add on phone shows up on laptop instantly (after a sub-second sync).

---

## Local Development (optional)

If you want to develop locally:

```bash
npm install
npx vercel link        # links to your Vercel project
npx vercel env pull .env.local   # pulls Redis credentials
npm run dev
```

Then open `http://localhost:3000`.

---

## How the Data Works

Two keys are stored in Redis:
- `finance:accounts` — array of your accounts
- `finance:transactions` — array of all transactions

Every change saves automatically with a 600ms debounce. Look at the top-right corner for the sync indicator (saving / saved / error).

When you spend on a credit card, the "owed" amount goes up. When you transfer between accounts, both balances adjust. When you delete a transaction, the balance reverses cleanly.

---

## Custom Domain (optional)

In Vercel → your project → **Settings → Domains**, add a custom domain like `money.yourname.com` if you want a shorter URL.

---

## Privacy Note

You chose not to add login protection. The app is publicly accessible to anyone with the URL. To stay safe:
- Don't share the URL
- Don't post it in screenshots
- Consider adding [Vercel Password Protection](https://vercel.com/docs/security/deployment-protection) (paid) or a simple password gate later if you change your mind

---

## Free Tier Limits

- **Vercel Hobby**: 100 GB bandwidth/month, unlimited deploys. More than enough.
- **Upstash Redis Free**: 500 MB storage, 500K commands/month. Your finance data will use < 1 MB. You'd need to add ~50,000 transactions/month to hit command limits.

Both stay free for personal use.
