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

function extractTitleAndSummary(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length === 0) return { title: 'LinkedIn Thought', summary: '' };
  
  // Use first line or first sentence as title
  let firstLine = lines[0].replace(/[#*_]/g, '').trim();
  let title = firstLine;
  if (title.length > 70) {
    const periodIdx = title.indexOf('.');
    if (periodIdx > 15 && periodIdx < 70) {
      title = title.slice(0, periodIdx);
    } else {
      title = title.slice(0, 67) + '...';
    }
  }

  // Summary is first 1-2 sentences
  let summary = lines.slice(1).join(' ').replace(/[#*_]/g, '').trim();
  if (!summary) summary = firstLine;
  if (summary.length > 180) {
    summary = summary.slice(0, 177) + '...';
  }

  return { title, summary };
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

async function fetchFromOfficialApi(accessToken, personUrn) {
  console.log('[Sync] Fetching posts via official LinkedIn REST API...');
  const res = await fetch(`https://api.linkedin.com/rest/posts?author=${encodeURIComponent(personUrn)}&count=10`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Linkedin-Version': '202610',
      'X-Restli-Protocol-Version': '2.0.0'
    }
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`LinkedIn REST API error (${res.status}): ${text}`);
  }

  const data = await res.json();
  const elements = data.elements || [];
  return elements.map(post => {
    const commentary = post.commentary || '';
    const date = new Date(post.createdAt || Date.now());
    const urn = post.id || '';
    const linkedinUrl = `https://www.linkedin.com/feed/update/${urn}`;
    const media = [];
    if (post.content && post.content.media && Array.isArray(post.content.media)) {
      post.content.media.forEach(m => {
        if (m.originalUrl) media.push(m.originalUrl);
      });
    }
    return { commentary, date, linkedinUrl, media };
  });
}

async function fetchFromVoyagerCookie(liAtCookie, vanityName = 'kleinjoes89') {
  console.log('[Sync] Fetching posts using session credentials...');
  // Voyager endpoint for user profile updates
  const profileRes = await fetch(`https://www.linkedin.com/voyager/api/identity/profiles/${vanityName}/profileView`, {
    headers: {
      'Cookie': `li_at=${liAtCookie}`,
      'Csrf-Token': 'ajax:4123456789012345678',
      'X-Restli-Protocol-Version': '2.0.0',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
  });

  if (!profileRes.ok) {
    throw new Error(`Voyager profile view returned ${profileRes.status}`);
  }

  const profileData = await profileRes.json();
  const urn = profileData.profile?.miniProfile?.entityUrn;
  if (!urn) throw new Error('Could not resolve entityUrn for profile');

  const memberId = urn.replace('urn:li:fs_miniProfile:', '');
  const feedRes = await fetch(`https://www.linkedin.com/voyager/api/identity/profileUpdatesV2?profileUrn=urn%3Ali%3Afsd_profile%3A${memberId}&q=memberShareFeed&count=10`, {
    headers: {
      'Cookie': `li_at=${liAtCookie}`,
      'Csrf-Token': 'ajax:4123456789012345678',
      'X-Restli-Protocol-Version': '2.0.0',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
  });

  if (!feedRes.ok) {
    throw new Error(`Voyager feed returned ${feedRes.status}`);
  }

  const feedData = await feedRes.json();
  const elements = feedData.elements || [];
  return elements.map(el => {
    const commentary = el.commentary?.text?.text || el.value?.commentary?.text?.text || '';
    const date = new Date(el.createdAt || Date.now());
    const urn = el.entityUrn || '';
    const linkedinUrl = `https://www.linkedin.com/feed/update/${urn}`;
    return { commentary, date, linkedinUrl, media: [] };
  }).filter(p => p.commentary.length > 50);
}

async function main() {
  const token = process.env.LINKEDIN_ACCESS_TOKEN;
  const personUrn = process.env.LINKEDIN_PERSON_URN || 'urn:li:person:kleinjoes89';
  const cookie = process.env.LINKEDIN_LI_AT;
  const vanity = process.env.LINKEDIN_VANITY || 'kleinjoes89';

  let rawPosts = [];

  if (token) {
    try {
      rawPosts = await fetchFromOfficialApi(token, personUrn);
    } catch (e) {
      console.warn('[Sync] Official API attempt failed:', e.message);
      if (cookie) {
        console.log('[Sync] Falling back to session cookie...');
        rawPosts = await fetchFromVoyagerCookie(cookie, vanity);
      }
    }
  } else if (cookie) {
    try {
      rawPosts = await fetchFromVoyagerCookie(cookie, vanity);
    } catch (e) {
      console.error('[Sync] Session cookie sync failed:', e.message);
    }
  } else {
    console.log('[Sync] Notice: Neither LINKEDIN_ACCESS_TOKEN nor LINKEDIN_LI_AT secret is configured.');
    console.log('[Sync] To enable automatic syncing of Joe\'s LinkedIn posts:');
    console.log('       Add LINKEDIN_ACCESS_TOKEN (from developer.linkedin.com) or LINKEDIN_LI_AT in GitHub Settings > Secrets.');
    console.log('[Sync] Exiting cleanly without error.');
    return;
  }

  console.log(`[Sync] Retrieved ${rawPosts.length} posts from LinkedIn.`);
  let newPostCount = 0;

  for (const post of rawPosts) {
    if (!post.commentary || post.commentary.trim().length < 40) continue;

    const { title, summary } = extractTitleAndSummary(post.commentary);
    const dateStr = post.date.toISOString().split('T')[0];
    const slug = slugify(title);
    const filename = `${dateStr}-${slug}.md`;
    const targetFile = path.join(insightsDir, filename);

    // Skip if already imported
    if (fs.existsSync(targetFile)) {
      continue;
    }

    let localFeaturedImage = '';
    if (post.media && post.media.length > 0) {
      const imgExt = '.jpg';
      const imgName = `${dateStr}-${slug}-cover${imgExt}`;
      const imgLocalPath = path.join(assetsDir, imgName);
      const downloaded = await downloadImage(post.media[0], imgLocalPath);
      if (downloaded) {
        localFeaturedImage = `/assets/insights/${imgName}`;
      }
    }

    const frontmatter = `---
title: "${title.replace(/"/g, '\\"')}"
date: ${dateStr}
author: "Joe Klein"
summary: "${summary.replace(/"/g, '\\"')}"
category: "Leadership"
source: "linkedin"
linkedinUrl: "${post.linkedinUrl}"
featuredImage: "${localFeaturedImage}"
draft: false
layout: layouts/post.njk
permalink: /insights/${slug}/index.html
---

${post.commentary.trim()}
`;

    fs.writeFileSync(targetFile, frontmatter, 'utf-8');
    console.log(`[Sync] Created new insight post: ${filename}`);
    newPostCount++;
  }

  console.log(`[Sync] Finished. Imported ${newPostCount} new LinkedIn post(s).`);
}

main().catch(err => {
  console.error('[Sync] Error during LinkedIn synchronization:', err);
  // Don't fail the build pipeline if LinkedIn is temporarily unreachable
  process.exit(0);
});
