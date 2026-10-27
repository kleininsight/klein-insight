# Klein Insight Website & Insights Hub

Business strategy consulting website for Klein Insight, featuring the **Insights Hub** (`/insights/`), automated LinkedIn synchronization, and visual CMS authoring.

## Architecture

- **Static Site Engine**: Built with a lightweight [Eleventy (11ty)](https://www.11ty.dev/) pipeline that preserves all existing vanilla HTML/CSS/JS pages verbatim while compiling Markdown insight articles into static, SEO-optimized pages.
- **CMS Authoring**: [Sveltia CMS](https://github.com/sveltia/sveltia-cms) at `/admin/` — lightweight, Git-backed visual editor with zero server or subscription costs.
- **LinkedIn Sync**: Automated GitHub Action (`.github/workflows/sync-linkedin.yml`) that pulls Joe's LinkedIn posts, caches images locally, and commits them as Markdown articles.
- **Hosting**: Cloudflare Pages.

---

## Local Development

```bash
# Install dependencies
npm install

# Start local preview server (serves site at http://localhost:8080)
npm start

# Compile static distribution to /_site
npm run build
```

---

## Cloudflare Pages Deployment Settings

When connecting or updating the repository in Cloudflare Pages:

- **Production branch**: `main`
- **Framework preset**: `None`
- **Build command**: `npm run build`
- **Build output directory**: `_site`

---

## Authoring Site-Only Posts (Sveltia CMS)

1. Navigate to `https://kleininsight.com/admin/`.
2. Click **Login with GitHub**.
3. Create, edit, or publish articles using the rich text / markdown editor.
4. When published, Sveltia CMS commits the post to the `main` branch, triggering an automatic Cloudflare Pages deployment.

---

## Automated LinkedIn Ingestion Setup

The synchronization workflow runs automatically once daily at 6:00 AM Pacific (13:00 UTC) and can also be triggered on demand via the **Actions** tab in GitHub ("Run workflow").

To connect Joe's LinkedIn feed:
1. Go to your GitHub repository: **Settings > Secrets and variables > Actions**.
2. Add the following repository secret:
   - **`BRIGHTDATA_API_KEY`**: Your Bright Data API key/token (from your Bright Data dashboard).
3. The scraper will automatically trigger Bright Data collection on Joe's LinkedIn profile (`https://www.linkedin.com/in/kleininsight/`), poll until complete, download any new posts and media locally into `/content/insights/` and `/assets/insights/`, compile the static site, and commit the changes directly to `main`.

