import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const insightsDir = path.join(rootDir, 'content', 'insights');
const assetsDir = path.join(rootDir, 'assets', 'insights');

// Ensure directories exist
if (!fs.existsSync(insightsDir)) fs.mkdirSync(insightsDir, { recursive: true });
if (!fs.existsSync(assetsDir)) fs.mkdirSync(assetsDir, { recursive: true });

function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50);
}

function extractDateFromActivityId(activityId) {
  try {
    if (!activityId) return new Date();
    // Match numeric digits from id or activity URN
    const match = activityId.toString().match(/\d{15,20}/);
    if (!match) return new Date();
    const numericId = match[0];
    const ms = Number(BigInt(numericId) >> 22n);
    const date = new Date(ms);
    // Sanity check: between 2020 and 2030
    if (date.getFullYear() >= 2020 && date.getFullYear() <= 2030) {
      return date;
    }
  } catch (e) {
    // fallback
  }
  return new Date();
}

function extractCategory(text) {
  const lower = text.toLowerCase();
  if (lower.includes('market research') || lower.includes('survey') || lower.includes('conjoint') || lower.includes('data') || lower.includes('qualtrics')) {
    return 'Market Research';
  }
  if (lower.includes('parent') || lower.includes('father') || lower.includes('leadership') || lower.includes('burnout') || lower.includes('culture')) {
    return 'Leadership';
  }
  if (lower.includes('operation') || lower.includes('scaling') || lower.includes('system') || lower.includes('process')) {
    return 'Operations';
  }
  return 'Strategy';
}

function extractTitleAndSummary(rawText) {
  // Strip trailing "...more" or "... see more"
  let clean = rawText
    .replace(/\.\.\.more$/i, '')
    .replace(/\.\.\. see more$/i, '')
    .trim();

  const lines = clean.split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length === 0) return { title: 'Strategic Thought', summary: '', body: clean };

  let firstLine = lines[0].replace(/[#*_]/g, '').trim();
  let title = firstLine;

  // If first line has a pipe or colon delimiter, take the core headline
  if (title.length > 70) {
    const periodIdx = title.indexOf('.');
    if (periodIdx > 15 && periodIdx < 70) {
      title = title.slice(0, periodIdx);
    } else {
      title = title.slice(0, 67) + '...';
    }
  }

  // Summary is second line or first 180 chars
  let summary = lines.slice(1).join(' ').replace(/[#*_]/g, '').trim();
  if (!summary) summary = firstLine;
  if (summary.length > 180) {
    summary = summary.slice(0, 177) + '...';
  }

  return { title, summary, body: clean };
}

async function downloadImage(url, destPath) {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const arrayBuffer = await res.arrayBuffer();
    fs.writeFileSync(destPath, Buffer.from(arrayBuffer));
    return true;
  } catch (err) {
    console.warn(`[Sync] Could not download image from ${url}:`, err.message);
    return false;
  }
}

// -----------------------------------------------------------------------------
// Bright Data LinkedIn Profile & Activity Scraper
// -----------------------------------------------------------------------------
async function fetchFromBrightData(apiKey, profileUrl, snapshotId = null) {
  console.log('[Sync] Connecting to Bright Data API...');
  let targetSnapshotId = snapshotId;

  if (!targetSnapshotId) {
    console.log(`[Sync] Triggering fresh collection on Bright Data for: ${profileUrl}`);
    const triggerRes = await fetch('https://api.brightdata.com/datasets/v3/trigger?dataset_id=gd_l1viktl72bvl7bjuj0&include_errors=true', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify([{ url: profileUrl }])
    });

    if (!triggerRes.ok) {
      const errText = await triggerRes.text();
      throw new Error(`Bright Data trigger failed (${triggerRes.status}): ${errText}`);
    }

    const triggerData = await triggerRes.json();
    targetSnapshotId = triggerData.snapshot_id;
    console.log(`[Sync] Bright Data triggered snapshot: ${targetSnapshotId}`);

    // Poll until ready (up to 30 attempts of 10s = 5 minutes)
    let isReady = false;
    const maxAttempts = 30;
    const pollIntervalMs = 10000;
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise(r => setTimeout(r, pollIntervalMs));
      const progRes = await fetch(`https://api.brightdata.com/datasets/v3/progress/${targetSnapshotId}`, {
        headers: { 'Authorization': `Bearer ${apiKey}` }
      });
      if (progRes.ok) {
        const progData = await progRes.json();
        console.log(`[Sync] Bright Data status: ${progData.status} (attempt ${i + 1}/${maxAttempts})`);
        if (progData.status === 'ready') {
          isReady = true;
          break;
        } else if (progData.status === 'failed') {
          throw new Error(`Bright Data scraping job failed: ${JSON.stringify(progData)}`);
        }
      } else {
        console.warn(`[Sync] Bright Data progress check returned HTTP ${progRes.status}`);
      }
    }

    if (!isReady) {
      throw new Error(`Bright Data scraping job did not finish within 5 minutes. Snapshot ID: ${targetSnapshotId}`);
    }
  } else {
    console.log(`[Sync] Using snapshot ID: ${targetSnapshotId}`);
  }

  // Fetch snapshot data
  const snapRes = await fetch(`https://api.brightdata.com/datasets/v3/snapshot/${targetSnapshotId}?format=json`, {
    headers: { 'Authorization': `Bearer ${apiKey}` }
  });

  if (!snapRes.ok) {
    const errBody = await snapRes.text();
    throw new Error(`Bright Data snapshot retrieval failed (${snapRes.status}): ${errBody}`);
  }

  const rawData = await snapRes.json();
  const profile = Array.isArray(rawData) ? rawData[0] : rawData;
  if (!profile || !profile.activity) {
    console.log('[Sync] No profile activity array found in snapshot.');
    return [];
  }

  console.log(`[Sync] Retrieved profile: ${profile.name || 'Joe Klein'} with ${profile.activity.length} activity items.`);

  // Filter strictly for Joe's own published posts (ignore comments on other users' posts)
  const vanity = profileUrl.replace(/\/$/, '').split('/').pop();
  const ownPosts = profile.activity.filter(item => {
    if (!item.link) return false;
    const link = item.link;
    const isOwnPost = link.includes(`/posts/${vanity}_`) ||
                      link.includes('/posts/kleininsight_') ||
                      link.includes('/posts/kleinjoes89_');
    return isOwnPost;
  });

  console.log(`[Sync] Found ${ownPosts.length} post(s) authored by Joe Klein.`);

  return ownPosts.map(p => {
    // Determine post ID
    const urlMatch = p.link.match(/activity-(\d+)/);
    const numericId = urlMatch ? urlMatch[1] : (p.id || '');
    const date = extractDateFromActivityId(numericId);

    return {
      commentary: p.title || '',
      date,
      linkedinUrl: p.link,
      authorName: profile.name || 'Joe Klein',
      media: p.img ? [p.img] : [],
      postId: numericId
    };
  });
}

// -----------------------------------------------------------------------------
// Main Pipeline
// -----------------------------------------------------------------------------
async function main() {
  const brightDataKey = process.env.BRIGHTDATA_API_KEY || process.env.BRIGHT_DATA_API_KEY;
  const snapshotId = process.env.BRIGHTDATA_SNAPSHOT_ID || null;
  const profileUrl = process.env.LINKEDIN_PROFILE_URL || 'https://www.linkedin.com/in/kleininsight/';

  if (!brightDataKey) {
    console.error('[Sync] Error: BRIGHTDATA_API_KEY is not set in environment variables.');
    console.error('       Please configure BRIGHTDATA_API_KEY in GitHub repository secrets.');
    process.exit(1);
  }

  let rawPosts = [];
  rawPosts = await fetchFromBrightData(brightDataKey, profileUrl, snapshotId);

  if (rawPosts.length === 0) {
    console.log('[Sync] No posts returned from scraper.');
    return;
  }

  console.log(`[Sync] Processing ${rawPosts.length} post(s) for import...`);
  let newPostCount = 0;

  for (const post of rawPosts) {
    if (!post.commentary || post.commentary.trim().length < 30) continue;

    const { title, summary, body } = extractTitleAndSummary(post.commentary);
    const dateStr = post.date.toISOString().split('T')[0];
    const slug = slugify(title);
    const filename = `${dateStr}-${slug}.md`;
    const targetFile = path.join(insightsDir, filename);

    // Skip if already imported
    if (fs.existsSync(targetFile)) {
      console.log(`[Sync] Already imported: ${filename}`);
      continue;
    }

    let localFeaturedImage = '';
    if (post.media && post.media.length > 0) {
      const imgExt = '.jpg';
      const imgName = `${dateStr}-${slug}-cover${imgExt}`;
      const imgLocalPath = path.join(assetsDir, imgName);
      console.log(`[Sync] Downloading post image to ${imgName}...`);
      const downloaded = await downloadImage(post.media[0], imgLocalPath);
      if (downloaded) {
        localFeaturedImage = `/assets/insights/${imgName}`;
      }
    }

    const category = extractCategory(body);

    const frontmatter = `---
title: "${title.replace(/"/g, '\\"')}"
date: ${dateStr}
author: "${post.authorName || 'Joe Klein'}"
summary: "${summary.replace(/"/g, '\\"')}"
category: "${category}"
source: "linkedin"
linkedinUrl: "${post.linkedinUrl}"
featuredImage: "${localFeaturedImage}"
draft: false
layout: layouts/post.njk
permalink: /insights/${slug}/index.html
---

${body}
`;

    fs.writeFileSync(targetFile, frontmatter, 'utf-8');
    console.log(`[Sync] Created new insight post: ${filename}`);
    newPostCount++;
  }

  console.log(`[Sync] Finished. Successfully imported ${newPostCount} new insight post(s).`);
}

main().catch(err => {
  console.error('[Sync] Error during LinkedIn synchronization:', err);
  process.exit(1);
});

