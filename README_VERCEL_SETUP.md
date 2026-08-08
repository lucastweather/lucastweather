How to connect this repo to Vercel (automated)

Steps:
1. Create a GitHub repository and push this project to it. Example:

```bash
git init
git add .
git commit -m "Initial commit: lucastweather"
git branch -M main
# create remote on GitHub and add as origin
git remote add origin git@github.com:<your-username>/lucastweather.git
git push -u origin main
```

2. In the GitHub repository settings, go to "Secrets and variables" → "Actions" and add these secrets:
- `VERCEL_TOKEN`: your Vercel personal token (from https://vercel.com/account/tokens)
- `VERCEL_ORG_ID` (optional): your Vercel org id
- `VERCEL_PROJECT_ID` (optional): your Vercel project id

3. The included GitHub Actions workflow `.github/workflows/deploy-to-vercel.yml` will run on push to `main` and deploy to Vercel automatically.

4. Alternatively use the Vercel web UI:
- Import the GitHub repository into Vercel and set the Environment Variables from `.env.example` in the Vercel dashboard.

Notes:
- To reserve the domain `lucastweather.vercel.app`, name the project `lucastweather` when creating it in Vercel.
- The workflow uses `npx vercel` with the provided token, and will perform a production deploy.
