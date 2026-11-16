# CyberPulse Newsroom Image Studio — v6

**Designed for CyberPulse / CyberWaze's day-to-day WordPress editorial workflow.**
**Made by Aiza Sajid, CyberWaze · Built for the CyberWaze Team**

A static GitHub Pages-ready web app. It does **not** log in to WordPress, publish posts, access the WordPress database, or store article text on a server.

## The actual editorial workflow

1. Paste a cybersecurity article. The **article title can be blank**.
2. Select one of the grounded *newsroom headline suggestions*. The first suggestion may retain the supplied headline; all suggestions require an editor to verify facts. Headlines are deterministic, not produced by a hosted text-generation API.
3. Review the suggested CyberPulse category. Categories are recommendations using keyword matching; WordPress categories/slugs must be checked and selected manually in WordPress. The tool never changes `Uncategorized` automatically.
4. Read the story angle and choose a photo direction:
   - **Company / subject:** named organizations / hardware / buildings. Best for a genuine image tied to Nvidia or Microsoft, for example.
   - **Real-world photo:** a photographed setting linked to the report (university campus, data centre, office team, government building).
   - **Concept / stock:** illustrative technology scenes. Use these when an exact photo is unavailable.
5. Browse actual images fetched from **Openverse and Wikimedia Commons**. Two sources are searched independently. Initial thumbnails and search do **not** need a key, payment account or model download.
6. Choose **Fresh results** for the next page (two pages per phrase, then the next story-specific phrase); results already discovered are preserved and URL duplicates removed. **Deep search** explores three additional batches. All photo providers have their own availability and rate limits, so new unique results cannot be guaranteed endlessly.
7. Each card shows an **estimated** Article Match score based on image title/tags, searched terms, resolution and image dimensions. This is **not** a measured truth probability or proof the photo illustrates the incident. Cards also offer original image, creator, licence, attribution, save, copy WordPress image details and a WordPress-style preview.
8. **Pixel QA:** the browser separately checks photo thumbnail pixel brightness, contrast and crop suitability whenever the photo host's cross-origin policy allows it. A failure here never hides the photo. This is a pixel quality diagnostic, **not** semantic image AI.
9. **Optional free CLIP Vision AI:** click *AI check actual photo pixels*, *Vision AI: check top 3*, or upload a local JPG/PNG/WebP. CLIP compares the image's actual pixel content with story-specific and deliberately competing tech-photo concepts, and then reports *relative visual affinity*. A new AI badge only appears after the scan has succeeded. The first scan must download model files and a JavaScript library; some hosts block image fetches and some browsers/devices lack sufficient memory. For blocked images, download at the source and select **Upload photo to scan**. This optional step NEVER blocks the photo search.
10. **WordPress preview:** compare the **3:2 CyberPulse article card** (like the screenshots) and **16:9 featured banner**. Export a JPG at **1200×800** or **1200×675**, respectively, if the provider permits CORS fetch; otherwise open the original/download it and crop in WordPress. Export is a local crop, never a newly generated or edited news photo.
11. Before publishing, always inspect source and licence conditions, author/attribution, contextual truthfulness, trademarks and whether an image is authentic. Caption stock images as **illustrative**. Especially avoid identifying someone as a suspect, claiming an office is the actual breach site, or describing an AI-generated / stock image as actual event photography.

## Why photo search works without stock-site keys

The app uses:
- Openverse anonymous image search: https://api.openverse.org/v1/
- Wikimedia Commons Action API with cross-origin `origin=*`: https://commons.wikimedia.org/w/api.php

These are openly licensed media search libraries, **not curated commercial stock-photo subscriptions**. Results may include uneven quality. The interface ranks likely photo choices, but humans must approve images. Search providers are external services and may enforce rate limits; a 429, timeout or offline service cannot be prevented by this app.

For a business newsroom, actual image usage must comply with each original file's licence and any attribution and share-alike provisions. "No key" means the app is free to *search*, not that every photograph may be republished unrestricted.

## Deploy to the existing project

Existing GitHub repository: https://github.com/msaizah21/cyberpulse-image-finder

1. Download and extract `CyberPulse_Newsroom_Image_Studio_v6_GitHub_Ready.zip`.
2. Open the **extracted folder**. Upload the files inside to the root of the GitHub repository (`index.html`, JS, CSS, icons, `assets/`, `tests/`), replacing earlier versions. **Do not upload only the ZIP**.
3. Commit changes. Wait for GitHub Pages to deploy through the repository's existing Pages configuration and hard-refresh with `Ctrl + Shift + R`.
4. The existing Pages URL will use the new interface. This ZIP does not modify `cyberpulsemag.com` or WordPress; its purpose is to help a team select images for manual editorial uploading.
5. If earlier files like optional stock-worker scripts or config.js remain in the repository, they are unused by v6 and can be removed when cleaning up.

## Security and privacy

- No tokens, WordPress passwords, stock API keys, or confidential article text are sent to a backend by this static app.
- **The selected search queries are sent** to the image libraries when you search.
- If you activate CLIP, it downloads model files from the library/model CDNs. The CLIP inference itself happens locally in the browser, and images are not sent to a paid AI API.
- Browser storage holds optional image favourites only; full article input is not saved in local storage.
- Do not include confidential unpublished client information in image search queries without reviewing the query first.

## Validation & limitations

Developer validation:

```bash
node --check analysis.js
node --check newsroom.js
node --check relevance.js
node --check pixelqa.js
node --check vision.js
node --check app.js
node tests/test-analysis.cjs
node tests/test-relevance.cjs
node tests/test-newsroom.cjs
```

The test set includes 6 screenshot-inspired stories: AI adoption, university data incident, US government AI task force, Nvidia espionage, Microsoft 365 service recovery, and general AI security. Browser smoke tests with **mock API responses** checked initial results, refresh, deep search, one-provider failure scenarios, story direction switching, headline suggestions, crop preview and simulated Vision AI completion. These are local/simulated tests, **not** confirmation of live provider uptime, current images, model download or CORS on all photo hosts.

The categories are editable in `analysis.js`. Story-to-photo rules are editable in `newsroom.js`.

## Files

`index.html`, `styles.css`, `app.js`, `analysis.js`, `newsroom.js`, `relevance.js`, `pixelqa.js`, `vision.js`, `favicon.png`, `favicon.svg`, `assets/`, `tests/`, `.nojekyll`.


## v7 quick improvements
- Fresh results button duplicated at the top of image results.
- Search rotation now prioritises strict article-aware phrases before broad fallback terms.
- Relevance scoring now boosts named-entity and story-type matches, and penalises generic unrelated images.
