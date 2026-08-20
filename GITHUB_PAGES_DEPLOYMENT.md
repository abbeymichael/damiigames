# Deploying DAMII to GitHub Pages

This guide outlines step-by-step instructions for deploying the **DAMII Draughts Arena** frontend to **GitHub Pages**.

---

## 1. Overview & Architecture Considerations

GitHub Pages is a static web hosting service that serves HTML, CSS, JavaScript, and media assets directly from a GitHub repository.

Because GitHub Pages **does not run a Node.js server runtime**, server-side API routes (`/app/api/*`) cannot execute directly on GitHub Pages. To deploy DAMII to GitHub Pages, you have two architectural options:

### Option A: Static Frontend + Remote Node.js API Server (Recommended)
- **Frontend**: Static Next.js export hosted on GitHub Pages.
- **Backend**: DAMII API Server deployed on a Node.js provider (Render, Railway, Cloud Run, VPS, Heroku) handling `/api/damii`, `/api/auth`, `/api/wallet`, and `/api/admin`.
- **Configuration**: Set `NEXT_PUBLIC_API_URL` to point to your live Node.js server.

### Option B: Pure Static Single-Player / Offline Mode
- Exports static HTML/JS pages.
- Uses client-side local storage / IndexedDB for game state and local Draughts play.

---

## 2. Next.js Static Export Configuration

To enable static HTML export in Next.js for GitHub Pages, update `next.config.ts`:

### Update `next.config.ts`
```typescript
import type { NextConfig } from "next";

const isGithubActions = process.env.GITHUB_ACTIONS || false;
const repoName = process.env.GITHUB_REPOSITORY ? process.env.GITHUB_REPOSITORY.replace(/.*?\//, "") : "";

const nextConfig: NextConfig = {
  // Enable static HTML export
  output: "export",

  // Configure base path if hosted on a subpath (e.g., https://username.github.io/repo-name)
  basePath: isGithubActions && repoName ? `/${repoName}` : "",
  assetPrefix: isGithubActions && repoName ? `/${repoName}/` : "",

  // Disable default image optimization loader (required for static exports)
  images: {
    unoptimized: true,
  },

  // trailingSlash ensures clean page routing on static hosting
  trailingSlash: true,
};

export default nextConfig;
```

---

## 3. GitHub Actions Automated Deployment Workflow

Create a GitHub Actions workflow file at `.github/workflows/deploy.yml` in your repository:

```yaml
name: Deploy DAMII to GitHub Pages

on:
  push:
    branches:
      - main

# Grant required permissions for GitHub Pages deployment
permissions:
  contents: read
  pages: write
  id-token: write

# Allow only one concurrent deployment
concurrency:
  group: 'pages'
  cancel-in-progress: true

jobs:
  build-and-deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    steps:
      - name: Checkout Repository
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'npm'

      - name: Install Dependencies
        run: npm ci

      - name: Build Static Export
        env:
          NEXT_PUBLIC_API_URL: ${{ secrets.NEXT_PUBLIC_API_URL }}
        run: npm run build

      - name: Upload Pages Artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: './out'

      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

---

## 4. Repository Configuration

1. Push your code and the `.github/workflows/deploy.yml` file to GitHub.
2. In your GitHub repository, navigate to **Settings** > **Pages**.
3. Under **Build and deployment**:
   - **Source**: Select **GitHub Actions**.
4. Push a commit to the `main` branch to trigger the build and deployment.
5. Once complete, your site will be available at:
   `https://<your-username>.github.io/<repository-name>/`

---

## 5. Connecting a Remote Backend (Optional)

If hosting the frontend on GitHub Pages while pointing to a full DAMII Node.js backend:

1. Deploy your DAMII Node.js backend server (refer to `NODE_SERVER_DEPLOYMENT.md`).
2. Set the GitHub Repository Secret:
   - Go to **Settings** > **Secrets and variables** > **Actions**.
   - Add a new secret: `NEXT_PUBLIC_API_URL` = `https://your-api-domain.com`.
3. In your client fetch utilities (`lib/client-auth.ts`, etc.), ensure fetch URLs prepend `process.env.NEXT_PUBLIC_API_URL || ""`.

---

## 6. Custom Domain Setup (Optional)

To use a custom domain (e.g., `damii.app`):

1. Go to **Settings** > **Pages** in your repository.
2. Under **Custom domain**, enter your domain name (e.g., `damii.app`) and click **Save**.
3. Create a `public/CNAME` file in your project containing your custom domain:
   ```text
   damii.app
   ```
4. Configure DNS records with your domain registrar:
   - **Apex domain (`damii.app`)**: Point `A` records to GitHub Pages IPs:
     - `185.199.108.153`
     - `185.199.109.153`
     - `185.199.110.153`
     - `185.199.111.153`
   - **Subdomain (`www.damii.app`)**: Point `CNAME` record to `<your-username>.github.io`.

---

## 7. Troubleshooting & Common Pitfalls

| Issue | Solution |
| :--- | :--- |
| **404 on page refresh** | Ensure `trailingSlash: true` is set in `next.config.ts` so Next.js exports `index.html` files for subroutes (e.g., `/arena/index.html`). |
| **Broken CSS or Images** | Check `basePath` and `assetPrefix` in `next.config.ts`. Relative image links should use Next.js `<Image>` or include `basePath`. |
| **API Route 404s** | Remember that `/api/*` routes are server-side. Ensure `NEXT_PUBLIC_API_URL` points to an active Node.js server. |
