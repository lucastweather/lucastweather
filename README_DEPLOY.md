Deployment steps for Vercel

Prerequisites (on your machine):
- Node.js (16+ or as required by the project)
- npm or yarn
- Vercel account

Local build and test (run locally in the project root):

```bash
# install dependencies
npm ci

# run dev server
npm run dev

# build for production
npm run build

# preview the built site
npm run preview
```

Deploy using Vercel (recommended: connect your GitHub repo to Vercel):

Option A — Connect repository to Vercel via the web UI
1. Push this repository to your GitHub account.
2. In Vercel dashboard, select "New Project" → import your repository.
3. In project settings, set Environment Variables from `.env.example` values.
4. Deploy — Vercel will run `npm run build` and publish the site.

Option B — Use Vercel CLI (requires interactive login)

```bash
# install vercel CLI if you don't have it
npm i -g vercel

# login
vercel login

# deploy to your account (first time will ask about project settings)
vercel --prod --name lucastweather
```

Domain: After deploying under your Vercel account, your project will be available at `https://<your-project>.vercel.app`. To get `lucastweather.vercel.app`, select `lucastweather` as the project name during CLI deploy or in the Vercel UI.

Security notes:
- Rotate any exposed Stripe keys immediately in the Stripe dashboard.
- Do not store secrets in committed files; use Vercel Environment Variables or a separate secret manager.
