# CyberPulse Newsroom — Story-Matched WordPress Featured Images (v9)

Made by **Aiza Sajid, CyberWaze** · For the CyberWaze / CyberPulse editorial team.

This is a **static GitHub Pages site**, with no mandatory API keys, paid subscriptions, or WordPress credentials. It does not publish articles or automatically replace WordPress media. Photos are discovered via Openverse and Wikimedia Commons and must be manually reviewed for authenticity and rights.

## What makes v9 useful

1. **Read the article first.** Paste a title (optional) and full article. The app extracts names, organizations, story angle, policy, industries, laws and incident phrases from the supplied text. It distinguishes early lead subjects from later supporting mentions.
2. **News headline and category.** The app suggests article-grounded headlines and a CyberPulse category. Government/AI reporting stories get concise editorial title variations; other stories use bounded, conservative source-text rewrites. These are *editorial suggestions*, not verified facts or hosted generative-AI output.
3. **Story Intelligence panel.** Separate People, Organizations, Story & Incident, Critical Sectors and Policy & Law groups, plus copyable photo keywords and editorial brief. A keyword is extracted from the article, not researched or confirmed externally.
4. **Real photos, not generic tech mood boards.** The search plan prioritizes the primary subject, then a genuinely different related subject, then a real setting, with broader illustrative concepts as fallback. Clicking a query chip instantly starts that photo search. The **Fresh results** / **More results** / **Deep search** controls are *above the image gallery*. Previously found unique photos remain during refresh.
5. **Explainable photo suitability.** Each photo is tagged *Named subject match*, *Contextual match*, *Supporting mention only*, or *Generic / review* based on **photo title and metadata**. Named-subject photos rank higher; misleadingly generic or supporting-only photos rank lower. The numerical `Article Match %` is a heuristic sorting score, **not a truth probability**.
6. **Top 3 banner shortlist.** The gallery shows the closest available qualifying photos in a smaller shortlist. Clicking a pick opens the WordPress crop preview. When nothing is sufficiently related, the shortlist stays hidden rather than claiming a match.
7. **WordPress preparation.** Preview the site's 3:2 article-card crop and a 16:9 featured-image crop. JPG export works when the original host permits browser image downloads; otherwise open the original source and crop it in WordPress. Photo source, licence terms, copy credits and WordPress image details remain available.
8. **Optional pixel checks.** Lightweight pixel-quality diagnostics check brightness and contrast where the photo host permits. Opt-in **free CLIP image vision** downloads a local browser model and compares actual image pixels to story concepts. This needs an internet connection and may require significant device memory; providers may block cross-origin photo access. If blocked, download an original and use **Upload photo to scan**. CLIP does not prove that a photo depicts an actual news event.

## Example: Trump AI task-force reporting

For a supplied article mentioning Donald Trump, Emil Michael, U.S. Defense Department, OpenAI, Hugging Face, AI-powered cyberattacks, AI safety incident reporting, critical infrastructure, banking, energy, emergency services, and the Cybersecurity Information Sharing Act, v9 generates the corresponding **keyword groups**. Its starting image-search sequence is:

- Donald Trump White House official photograph
- Pentagon building Washington DC exterior photograph
- White House Washington DC exterior photo
- Emil Michael Department of Defense official photograph

OpenAI and Hugging Face are retained as named **supporting organizations**, not automatically treated as the lead featured-photo subject. The tool flags that an official portrait, Pentagon picture or stock photograph is **illustrative** unless the source independently establishes that it documents the reported task-force meeting. It does **not** fact-check article claims or verify they actually happened.

## Installation and updating GitHub Pages

Repository: https://github.com/msaizah21/cyberpulse-image-finder

1. Download the **v9 GitHub-ready ZIP** and extract it.
2. Upload the **files and folders inside the ZIP** (`index.html`, `.js`, `.css`, `assets/`, `favicon`, etc.) to your existing repository's **root directory**, replacing earlier code files. Do not upload just the ZIP.
3. Commit changes and, after the Pages deployment finishes, refresh the browser with **Ctrl + Shift + R**.
4. No Pexels/Pixabay token, commercial photo service or paid AI API is required. The site still depends on public Openverse/Wikimedia services being available.

**Important:** If files were previously published in a different folder, ensure Pages points to the folder containing `index.html`; otherwise the old version can remain visible.

## Responsible editorial use

- Image content might not match its metadata. A high ranking does **not** prove that an image shows Trump, a government meeting, an attack scene or any specific incident.
- Attribution, commercial-use permissions, licence modifications (including ShareAlike), trademarks, privacy, accuracy and rights must be checked at the **original media page** before publishing. Openverse/Commons image quality varies and may not meet a professional-stock standard.
- The app processes article text locally. Image-search **keywords** are sent to the two public search services. Optional CLIP downloads model assets, and local image analysis does not require sending article text to a paid AI service.
- Some story patterns are curated for the cybersecurity newsroom. Unknown people and companies may not receive custom photo-direction suggestions. More named entities can be added to `editorial.js` as editorial needs evolve.

## Files

`index.html`, `styles.css`, `app.js`, `analysis.js`, `editorial.js`, `newsroom.js`, `relevance.js`, `pixelqa.js`, `vision.js`, `favicon.png`, `favicon.svg`, `assets/`, `tests/`, `.nojekyll`.

## Validation

Run from this directory:

```bash
for f in *.js; do node --check "$f"; done
node tests/test-analysis.cjs
node tests/test-relevance.cjs
node tests/test-newsroom.cjs
node tests/test-intelligence.cjs
```

Logic tests cover all six earlier CyberPulse article examples and the full supplied Trump/Defense Department article, including photo subject labels and headline extraction. Static validation checks referenced IDs and script locations. Browser automation could not be completed here because the test browser was blocked by the execution environment's administrator restrictions. **Live Openverse/Wikimedia requests, Chrome UI interactions and CLIP model downloads must still be tested after deployment**; no error-free guarantee is made for third-party hosts.


## v9: Refresh that visibly produces different photos

- **Top sticky Refresh** stays accessible while browsing image results; a status bar shows exactly which article-related search directions were attempted.
- Each press searches **two distinct editorial directions**, across both public libraries. If no new photos are found, the tool tries another related angle; it does not falsely claim to have found something.
- Search queries are compacted for each provider to reduce empty results from overly-long strings, while the full article search intent is retained for editorial scoring.
- Photos from the **latest round** are tagged **NEW · LATEST REFRESH**, and the grid automatically switches to **Fresh results first** so the button visibly changes the top photos. Older candidates remain available.
- **Closest to article** is the default photo filter. It prefers named subjects and context with documentary support in original titles/tags. If none qualify, broader candidates are shown but prominently flagged as needing review. Use **Show all options** to see everything.
- Article signals now include Zscaler, CYFIRMA, PwC, Cisco, Meta, Palo Alto Networks and Cloudflare. Unknown acronym-like and mixed-case organizations in headlines can be proposed as search anchors (review names before publishing).
- An individual image's **match % remains an editorial heuristic**, not a measured probability. Optional CLIP examines pixels only when explicitly run. Never claim an event is shown unless the photographer/source establishes it.

## CyberPulse website review scope (16 November 2026)

The news archive `https://cyberpulsemag.com/articles/` returned HTTP 403 from the website reader used for this review, and the site's WordPress API could not be retrieved. Therefore **not every published post was independently audited**. The design referenced the user's supplied November 2026 screenshots of six visible cards (AI adoption, B.C. university incident, Trump AI task force, NVIDIA espionage, Microsoft 365 recovery, and AI security race), and the site's publicly indexed home page and accessible NVIDIA article.

Observed from those screenshots: dark navy article cards, bright cyan category pills, generally photo-led 3:2 imagery, and several cards showing “UNCATEGORIZED”. Tool previews follow the visible card style. Note: fixing WordPress category assignments or the website's unequal masonry image heights is a **separate website change**, not something this image-finder tool can automatically do.
