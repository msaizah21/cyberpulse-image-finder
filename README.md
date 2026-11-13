# CyberPulse Image Finder — v2 (Article → Category → Banner Photos)

A standalone, public, GitHub Pages-compatible tool for CyberPulse editorial staff. Paste **only the article text** or a separate title and body. The interface will immediately recommend a category, identify important company/product/topic clues, search photo sources, and display **16:9 banner previews** before publication.

**Designed for:** https://cyberpulsemag.com/articles/  
**GitHub repository:** https://github.com/msaizah21/cyberpulse-image-finder  
**Expected GitHub Pages site:** https://msaizah21.github.io/cyberpulse-image-finder/

## Official project branding

This version uses the user-supplied CyberPulse symbol in the header, main hero graphic, footer and favicon, and the user-supplied CyberWaze symbol in a small footer credit.

**Visible credit:** “Made by Aiza Sajid, CyberWaze” and “Built for the CyberWaze team.”

The new `/assets` folder is **required**: upload it alongside `index.html`, `styles.css`, `app.js` and the other top-level files. No separate image hosting or API is needed for the logos. This change only affects branding; it preserves the existing article analysis and image-search behavior.

## What improved in v2

- **Fixed a real bug:** the old category fallback referenced an object without `signals`, so articles with few known keywords could fail during analysis.
- **Paste-only input works:** if no title is entered, the tool derives a provisional headline from the pasted article.
- **Brand/product recognition:** NVIDIA/GPU/Blackwell, Microsoft, Google, OpenAI, Apple, AWS, Intel, AMD, CrowdStrike, Cisco, Meta, Palo Alto Networks, Samsung, Cloudflare, and Oracle.
- **Two distinct search intents:**
  - **Exact subject/company** — relevant original photos, company buildings and product hardware; filters out other brands when a named company is detected.
  - **Professional stock concept** — modern landscape technology photos (chipsets, GPUs, data centers, etc.), labelled as *illustrative* instead of a photo of the actual event.
- **Editorial orientation filter:** wide photos preferred; small, portrait, icon/vector and irrelevant results are downranked or removed.
- **16:9 featured image preview** and original-source link for each result.
- **Clear search fallbacks:** Openverse and Wikimedia Commons plus links for Pexels, Unsplash and Pixabay. Optional Pixabay Worker for higher-quality photos **inside** the website.

### Important: This is not a ChatGPT/LLM API

Category selection and photo queries use a **local rules-based analyser**. It is fast, free to host, and runs without your article leaving the browser, but editorial human review is still necessary. A name/product/photo match is not guaranteed for every story.

## Replace the existing code in your GitHub repository

1. Download and **extract** the latest ZIP. Do **not** upload the ZIP as one GitHub file.
2. Go to: https://github.com/msaizah21/cyberpulse-image-finder
3. Click **Add file → Upload files**.
4. Upload **all files from the extracted project folder**, including the `assets` folder, directly to the repo root. If GitHub detects existing files of the same names (`index.html`, `app.js`, `analysis.js`, `styles.css`, `README.md`), GitHub will update them in this commit.
5. Commit message: `Improve article analysis and banner images` → **Commit changes**.
6. If GitHub Pages has not been set up: **Settings → Pages → Deploy from a branch → main → /(root) → Save**. The repository must be eligible for GitHub Pages (a public repo works on GitHub Free).
7. When deployment succeeds, open the expected Pages URL: https://msaizah21.github.io/cyberpulse-image-finder/
8. If the old page remains, do a hard refresh (Windows: `Ctrl + Shift + R`) to clear browser cache.

**Important GitHub note:** The main `index.html` file must be at the **top level of your repository**, not inside a nested folder. The new version is static and does **not** require Flask, Python, npm, or Render to be hosted on GitHub Pages.

## How an editor uses the app

1. Paste the article in **Article text**. Leave **Article title** empty if desired.
2. Click **Analyse & find images**; category appears without waiting for the external image APIs.
3. For a company or product article, use **Exact subject/company** for subject-specific imagery. For a more generic visual, choose **Professional stock concept**.
4. Switch search phrases or type your own keywords if needed. Use **Preview 16:9** to see a WordPress-style article-banner crop.
5. Check the photo's original creator page and licence; download from the provider or original page, then upload to WordPress. **The tool does not change your WordPress website.**

## Image sources & licensing

**Without any key:** Openverse and Wikimedia Commons return openly licensed media where their browser-accessible APIs are available. Images may be old, low quality, unavailable or not the specific article subject; sources impose their own rate limits. The site also shows external links for **Pexels**, **Unsplash** and **Pixabay** search results. These are website links, **not** integrated image previews by default.

**Optional richer in-app photos:** Pixabay provides a photo-search API that requires an API key. The ZIP includes `pixabay-worker-OPTIONAL.js`, a small Cloudflare Worker that keeps the key on a server and feeds landscape photos to the site. This is optional; your public GitHub Pages website works without it.

- The photo's label or search result is **not** permission to use it for every purpose. Confirm the exact source terms.
- CC BY licences generally require attribution. CC BY-SA can impose share-alike obligations for adaptations. CC0/public domain claims still deserve source verification.
- Pixabay uses its **own Content License**, not CC0; some restrictions still apply.
- Company logos, buildings, brands, and photographs can implicate additional trademark, publicity and editorial context issues. Never caption a concept image as a photograph of a real incident.
- Direct downloads may be blocked by image hosts; in this case the tool opens the original photo page instead of falsely reporting a download.
- Article text stays in the visitor's browser; **short image queries** go to the image services.

## Optional: Enable more polished Pixabay photos *inside* results

You can skip this entire section initially.

1. Get a Pixabay API key from https://pixabay.com/api/docs/ (an account/API access is required).
2. In Cloudflare, create a **Worker**, paste the contents of `pixabay-worker-OPTIONAL.js`, and deploy it.
3. In Cloudflare Worker settings, add an encrypted **secret** named `PIXABAY_API_KEY` with the Pixabay key as its value. Re-deploy if needed.
4. Copy your Cloudflare Worker URL (for example, `https://your-worker.your-subdomain.workers.dev/`).
5. Edit GitHub file `config.js` and change the empty string to that URL:

   ```js
   window.CyberPulseConfig = { pixabayWorkerUrl: 'https://your-worker.your-subdomain.workers.dev/' };
   ```

6. Commit the update. Results then include Pixabay photos where available. Your **API key must never be committed to GitHub**. A public Worker endpoint can consume API quota; apply usage protections or rate limits if you expect substantial public traffic.

Pexels' API has currently paused issuance of new keys, so the basic tool does not depend on it. Its public photo-search site remains a fallback link.

## Developer validation

- JavaScript syntax check: `node --check analysis.js && node --check app.js`
- Unit test for article/category/entity/query selection: `node tests/test-analysis.cjs` (run from the repository root).
- No build process, API secrets, backend database or WordPress integration required for the default version.

## CyberPulse categories

Uses the **10 names included in the original request**: AI & Cybersecurity; Cloud Security; Cybersecurity; Cybersecurity News & Threats; Data Breaches; Malware; Malware & Threats; Phishing; Ransomware; Trojan. The request mentioned 13 items but only these 10 names were provided. Adjust `analysis.js` if the actual taxonomy changes.
