# Klein Insight Learning Center and news-driven drafting agent

This feature adds the static [Learning Center](../learn/index.html) and a **human-approval-required** AI news education drafting system. All changes are staged for review; do not merge until ready to expose the Learning Center.

## Prerequisites

1. In [OpenAI API](https://platform.openai.com/), create an API key and enable billing. ChatGPT Plus does not include API credits.
2. In GitHub: repository **Settings → Secrets and variables → Actions → New repository secret**. Create `OPENAI_API_KEY` with the API key. **Never paste the key into site files or chat**.
3. In GitHub: repository **Settings → Actions → General → Workflow permissions**, choose **Read and write permissions** and, if present, **Allow GitHub Actions to create and approve pull requests**. If your policy prevents these settings, use a dedicated GitHub App instead of weakening broader security settings. Do not add a personal access token unless necessary.
4. Confirm Cloudflare Pages (or other deployment) builds only `main` into production; preview environments may be created for pull-request branches.
5. Review costs, rate limits, and model availability in your OpenAI project. The default is `gpt-4.1`, with web search enabled for the researching step. RSS discovery uses public endpoints.

## Workflow

- GitHub Actions runs Mondays and Thursdays at 14:00 UTC (06:00/07:00 Pacific depending on daylight saving), or manually from the Actions tab.
- It checks whether a previous article PR from `automation/content-review` is still open and skips if so.
- Public RSS provides candidate headlines. The model picks a relevant story, researches it using web search, and returns structured original educational content.
- The code checks required fields, citation URL syntax, minimum length, and whether the topic was previously published. **These automated checks are not independent fact-checking.**
- It creates a dated HTML article under `learn/articles/`, adds its card to `learn/index.html`, updates `sitemap.xml`, and appends history.
- The `peter-evans/create-pull-request` action opens a PR targeting `main`. The PR contains an editorial checklist. **No automatic merge or publishing occurs.**

## Manual verification required before every merge

- Open each source and verify that it exists and supports the specific statements made; review all dates, numbers and causal claims.
- Confirm the topic and implications are relevant to established business owners and distinguish general education from specific advice.
- Review generated copy for accuracy, usefulness, originality, and appropriate tone.
- Inspect the article URL and the Learning Center index in a branch preview if available.
- Do not merge on uncertain claims, unsubstantiated sources, or misleading headlines.

## Run locally

From the repository root, with Python 3.12:

```sh
python -m pip install -r automation/requirements.txt
export OPENAI_API_KEY="your-api-key"  # use a private local env; never commit it
python automation/run.py
```

The script modifies local files only; inspect changes before committing. On Windows PowerShell, use `$env:OPENAI_API_KEY = "your-api-key"` in place of `export`.

## Troubleshooting

- **No PR appears:** There may be no qualifying headline, the draft may fail validation, an earlier draft PR may be pending, or permissions may block PR creation.
- **Workflow doesn't run:** GitHub scheduled workflows run from the default branch only, so this feature must be merged before scheduling starts. You can manually run it after the workflow exists on the default branch.
- **RSS fails:** Feed URLs and their content may change; replace or expand `FEEDS` in `automation/run.py`.
- **OpenAI reports unsupported model/tool:** Check current model support and update `OPENAI_MODEL` or the web-search tool invocation.
- **Publishing:** Never connect draft generation to a direct push to `main`. Human PR approval is the safety boundary.

## Scope

This first iteration produces **news-driven lessons only**; the included baseline article is an evergreen example. A scheduled evergreen content engine, social-media exports, analytics, and asset generation are future additions, not part of this implementation.
