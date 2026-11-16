# CyberPulse Image Finder — Reliable Free Edition v5

**Built for the CyberWaze team · Made by Aiza Sajid, CyberWaze**

This version specifically repairs the earlier v4 regression: photos must actually show up without depending on Pexels, Pixabay, API keys or Cloudflare Workers.

## What is fixed

- **Original free image pipeline restored and expanded.** Searches both Openverse and Wikimedia Commons independently (the second source was removed in v4). Neither source needs an API key or account.
- **Refresh works:** Each **Find more photos** click visits the next real API page; every four batches it rotates to an alternate article-aware search phrase. All batches keep previous images and remove duplicates. **Deep search** explores three batches sequentially.
- **No over-restrictive filtering:** v4 required minimum 1200px width, a strict aspect ratio and >=32 match before showing a photo. Those hard conditions have been removed. Metadata-driven photo/rights checks and relevance sorting remain; editors can still filter by Match and source.
- **Resilient fallbacks:** Openverse and Wikimedia Commons can succeed independently. On a first empty search the tool tries a wider phrase. If one library fails or a new batch has zero photos, existing results are preserved, with a readable message instead of an app crash.
- **Optional free browser vision:** CLIP can examine photo pixels, but the image search never waits for the AI download. First use may require substantial model download, and some source hosts block browser image scanning; the upload-photo option is provided.
- **Title suggestion + match score** from article text, plus saved photos, preview and original source/credit links remain.

## Deploy to the same GitHub Pages project

1. Extract this ZIP (do not upload the ZIP itself).
2. Upload all files and the `assets/` and `tests/` directories to your existing repository root, overwriting earlier files: https://github.com/msaizah21/cyberpulse-image-finder
3. Commit and open the existing GitHub Pages URL. Use Ctrl+Shift+R to clear the old cached app.
4. **No keys or configuration required**. Delete old optional `stock-worker-OPTIONAL.js`, `pixabay-worker-OPTIONAL.js`, and `config.js` from the repo when tidying up; they are not used by this edition.

## Daily workflow

1. Paste an article (headline optional) and click **Analyse article & discover photos**.
2. Select a title suggestion and review the category. Photos load from two free, openly licensed search libraries.
3. Click **Find more photos** repeatedly to explore later pages and new search terms; **Deep search** gets three batches. Change the keyword and press Enter to start a new search.
4. The **Article Match %** is an **estimate**, calculated from image titles/tags, article topic, image resolution and banner suitability — it does not establish truth or copyright clearance.
5. If desired, run **Vision AI** on a selected photo, or upload one from your computer. Scanning is optional and never prevents photo results from appearing.
6. Preview a 16:9 crop and check the **original photo and licence** before publishing to CyberPulse. Attribution or share-alike terms can apply.

## Important limitations for a business publication

- No external image service can guarantee 100% uptime, endless unique photos, correct image tags or valid usage rights. This interface handles partial failures but cannot make the provider stay online.
- **Openverse and Wikimedia Commons are free-licence media search tools, not curated paid stock-photo libraries.** Their images can look professional, but not every result will. Human review is required.
- Some hotlinked thumbnails can be blocked by their hosts. The tool tries the original image as fallback; if that also fails, it provides the source page. Direct download can also be blocked by CORS.
- Free CLIP image vision gives relative affinity to image concepts; it is not an authoritative factual match or proof an incident is pictured.
- Search keywords, not full article text, are sent to image-library search endpoints. Browser vision model files load from Hugging Face / CDN when requested.
- When a tool is used for cybersecurity news, stock images depicting brands, events, identities or breach incidents should always be captioned accurately as illustrative.

## Files

`index.html`, `styles.css`, `app.js`, `analysis.js`, `relevance.js`, `vision.js`, `assets/`, `favicon.png`, `favicon.svg`, `.nojekyll`, `tests/`.

### Developer checks

```bash
node --check app.js
node --check analysis.js
node --check relevance.js
node --check vision.js
node tests/test-analysis.cjs
node tests/test-relevance.cjs
```

Search API references: https://api.openverse.org/v1/ and https://www.mediawiki.org/wiki/API:Search .

**Testing note:** Browser smoke tests were run with simulated search API responses: initial 4 -> 8 on refresh -> 16 after Deep Search; source-failure scenarios worked with only one provider, and the app reported no uncaught JavaScript exceptions in those simulations. Actual network availability, live browser image loading and external CLIP model downloads were not verified by these simulations.
