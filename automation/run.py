"""Create a researched educational draft in learn/ for human PR review.

Uses public RSS for story discovery and OpenAI web search for supplemental research.
Everything produced is an unverified editorial draft until the owner reviews it.
"""
import datetime as dt
import html
import json
import os
import re
import sys
from pathlib import Path
from urllib.parse import urlparse

import feedparser
from openai import OpenAI

ROOT = Path(__file__).resolve().parents[1]
LEARN = ROOT / "learn"
ARTICLES = LEARN / "articles"
INDEX = LEARN / "index.html"
LOG = ROOT / "automation" / "history.json"
BASE = "https://kleininsight.com"
FEEDS = [
    "https://feeds.npr.org/1006/rss.xml",
    "https://www.federalreserve.gov/feeds/press_all.xml",
]
MODEL = os.environ.get("OPENAI_MODEL", "gpt-4.1")
MIN_WORDS = 380


def discover():
    stories = []
    for url in FEEDS:
        try:
            feed = feedparser.parse(url)
            for entry in feed.entries[:18]:
                title = str(entry.get("title", "")).strip()
                link = str(entry.get("link", "")).strip()
                if title and link.startswith("https://"):
                    stories.append({"title": title[:220], "url": link,
                                    "published": str(entry.get("published", ""))[:45]})
        except Exception as exc:
            print(f"Feed unavailable: {url}: {exc}", file=sys.stderr)
    return stories


def parse_json(text):
    text = re.sub(r"^\s*```(?:json)?\s*|\s*```\s*$", "", text.strip())
    return json.loads(text)


def ask(client, prompt, search=False):
    args = {"model": MODEL, "input": prompt, "max_output_tokens": 4200}
    if search:
        args["tools"] = [{"type": "web_search_preview"}]
    response = client.responses.create(**args)
    return response.output_text


def choose(client, stories, already):
    summary = [{"title": x["title"], "url": x["url"]} for x in stories[:35]
               if x["url"] not in already]
    if not summary:
        return None
    prompt = ("You are an editor for an evidence-driven business advisory for established "
              "owner-led businesses. From ONLY the supplied RSS headlines, choose ONE story "
              "with the strongest practical educational relevance to operations, research, "
              "pricing, customer experience or business strategy. Exclude political advocacy, "
              "speculative predictions, sensationalism, and niche big-corporation coverage. "
              "If nothing qualifies return null. Return ONLY JSON of shape "
              '{"url":"exact input URL","reason":"brief explanation"} or null. '
              "Do not introduce any new URL. Headlines: " + json.dumps(summary))
    try:
        choice = parse_json(ask(client, prompt))
        if isinstance(choice, dict):
            return next((s for s in stories if s["url"] == choice.get("url")), None)
    except (ValueError, KeyError):
        pass
    return None


def draft(client, story):
    prompt = f"""You are preparing an editorial DRAFT for Klein Insight, a business strategy and
market research advisor to established business owners.

Starting news headline (discovery only; NOT verification):
{json.dumps(story)}

Use web search to independently substantiate the news event from credible accessible
sources. If it cannot be verified, respond with ONLY the JSON object {{"reject":true}}.
Research at least two independent trustworthy sources when possible, preferring primary
sources (official releases or data). Do not invent citations or statistics. Distinguish
what is documented from strategic interpretation, explain applicability and limitations.
Write original educational material, not a derivative rewrite of articles.

Return ONLY a JSON object, no Markdown fences:
{{
  "title": "helpful educational title, <=90 chars",
  "summary": "one to two sentences",
  "category": "Business News, Explained",
  "news_context": "factual event explanation, 120-180 words",
  "business_implications": "evidence-aware practical interpretation, 150-220 words",
  "exercise": ["specific task 1", "specific task 2", "specific task 3", "specific task 4"],
  "caveats": "uncertainties and exceptions, 60-120 words",
  "sources": [{{"title":"source name/title","url":"https://original-authoritative-source"}}]
}}

Never fabricate Klein Insight projects, client results, direct quotations, or data.
Each source must materially support claims, and should be a specific article/release URL.
The owner will independently verify every claim and URL prior to publication.
If there is not enough evidence to support a useful lesson, output {{"reject":true}}.
"""
    return parse_json(ask(client, prompt, search=True))


def validate(article, story):
    if article.get("reject"):
        raise ValueError("Insufficient reliable evidence; no draft created")
    for key in ("title", "summary", "news_context", "business_implications", "caveats"):
        if not isinstance(article.get(key), str) or not article[key].strip():
            raise ValueError(f"Missing {key}")
    if not isinstance(article.get("exercise"), list) or len(article["exercise"]) < 3:
        raise ValueError("Missing practical exercise")
    sources = article.get("sources")
    if not isinstance(sources, list) or len(sources) < 2:
        raise ValueError("Requires two sources for editorial review")
    for source in sources:
        u = urlparse(source.get("url", ""))
        if u.scheme != "https" or not u.hostname or "." not in u.hostname or not source.get("title"):
            raise ValueError("Invalid source citation")
    text = " ".join(str(article[k]) for k in ("news_context", "business_implications", "caveats"))
    if len(text.split()) < 160:
        raise ValueError("Content is too thin for a useful resource")
    if len(article["title"]) > 100:
        raise ValueError("Title too long")
    # This is STRUCTURAL validation, not independent factual verification.
    return article


def slugify(title):
    slug = re.sub(r"[^a-z0-9]+", "-", title.lower()).strip("-")[:75].strip("-")
    return slug or "business-insight"


def render(article, slug, today):
    e = html.escape
    item = lambda text: f"<li>{e(str(text))}</li>"
    sources = "".join(
        f'<li><a rel="noopener noreferrer" href="{e(s["url"], quote=True)}">'
        f'{e(s["title"])}</a></li>' for s in article["sources"])
    return f"""<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{e(article["title"])} | Klein Insight</title>
<meta name="description" content="{e(article["summary"][:150], quote=True)}">
<link rel="canonical" href="{BASE}/learn/articles/{slug}.html">
<link rel="stylesheet" href="../../styles.css">
<style>body{{background:#13212b;color:#e8edf0}}.resource{{max-width:780px;padding:4rem 1.5rem;margin:auto;line-height:1.8}}.resource h1{{font-size:clamp(2rem,5vw,3.2rem);line-height:1.2}}.resource h2{{margin-top:2.5rem}}.resource a{{color:#b5d9d4}}.resource li{{margin-bottom:.8rem}}</style>
</head><body><main class="resource"><a href="../">← Learning Center</a>
<article><header><p>Business News, Explained · {today}</p>
<h1>{e(article["title"])}</h1><p>{e(article["summary"])}</p></header>
<h2>What happened</h2><p>{e(article["news_context"])}</p>
<h2>What business owners should consider</h2><p>{e(article["business_implications"])}</p>
<h2>Try this in your business</h2><ol>{''.join(item(x) for x in article["exercise"])}</ol>
<h2>What we still don't know</h2><p>{e(article["caveats"])}</p>
<h2>Sources</h2><ul>{sources}</ul>
<p><small>This article provides general education, not personalized financial or legal advice.</small></p>
<p><a href="../../application.html">Need help applying this to your business? Work with Klein Insight.</a></p>
</article><p><a href="../">Back to Learning Center</a></p></main></body></html>"""


def main():
    if not os.environ.get("OPENAI_API_KEY"):
        raise RuntimeError("OPENAI_API_KEY is not set; configure it as a GitHub Actions secret.")
    today = dt.datetime.now(dt.timezone.utc).date().isoformat()
    previous = json.loads(LOG.read_text()) if LOG.exists() else []
    already = {x["story_url"] for x in previous}
    stories = discover()
    if not stories:
        print("No RSS headlines retrieved; no draft generated.")
        return
    client = OpenAI()
    story = choose(client, stories, already)
    if not story:
        print("No sufficiently relevant, unprocessed story; skipping.")
        return
    try:
        article = validate(draft(client, story), story)
    except (ValueError, KeyError, TypeError) as exc:
        print(f"Article rejected: {exc}; no draft generated.")
        return
    slug = today + "-" + slugify(article["title"])
    output = ARTICLES / (slug + ".html")
    if output.exists():
        print("Article already exists; skipping.")
        return
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(render(article, slug, today), encoding="utf-8")
    card = (f'<article class="learn-card"><p class="learn-type">Business News, Explained · {today}</p>'
            f'<h2>{html.escape(article["title"])}</h2><p>{html.escape(article["summary"])}</p>'
            f'<a href="articles/{slug}.html">Read the lesson</a></article>')
    index = INDEX.read_text(encoding="utf-8")
    marker = "<!-- ARTICLES_START -->"
    if marker not in index:
        raise RuntimeError("Learning Center insertion marker missing")
    INDEX.write_text(index.replace(marker, marker + "\n" + card, 1), encoding="utf-8")
    previous.append({"story_url": story["url"], "article_slug": slug, "created_utc": today})
    LOG.write_text(json.dumps(previous, indent=2) + "\n", encoding="utf-8")
    sitemap = ROOT / "sitemap.xml"
    xml = sitemap.read_text(encoding="utf-8")
    loc = f"  <url><loc>{BASE}/learn/articles/{slug}.html</loc></url>\n"
    if "</urlset>" not in xml:
        raise RuntimeError("Malformed sitemap")
    sitemap.write_text(xml.replace("</urlset>", loc + "</urlset>"), encoding="utf-8")
    print(f"Created review-only article: {output.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
