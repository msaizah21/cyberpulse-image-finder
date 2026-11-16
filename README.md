# CyberPulse Studio v4 — Advanced Stock Image Finder + Free Browser Vision AI

**Created for:** CyberWaze editorial team | **Made by Aiza Sajid, CyberWaze**  
**For editorial work on:** https://cyberpulsemag.com/articles/  
**GitHub repository to update:** https://github.com/msaizah21/cyberpulse-image-finder  
**Expected website:** https://msaizah21.github.io/cyberpulse-image-finder/

A lightweight, dark-theme website that runs on **GitHub Pages**, with no npm, backend or paid AI API required for the basic version. The user-supplied CyberPulse and CyberWaze logos are included in `assets/`.

## What this version actually does

| Feature | Details |
| --- | --- |
| **Article-only entry** | Paste a full story with the title field empty. Get up to four factual, text-grounded editorial headline ideas and a category suggestion. Choose **Use** to fill the title field. |
| **Article analysis** | Detects relevant cybersecurity categories, recognizable organizations/products, context-driven stock concepts and search terms. Local rule-based analysis: it does **not** call an LLM or upload the article. |
| **Search results** | Search licensed Openverse photographs without an API key, or optionally connect professional-stock APIs through a secure Cloudflare Worker. Provider availability, CORS and daily quota affect actual results. |
| **Fresh results / deep search** | **Fresh results** retrieves subsequent provider pages instead of resetting to the first page. **Deep search · 3 batches** iterates three sequential batches. Duplicates are removed within the current search. Editing search words and pressing Enter starts a brand-new search. |
| **Professional photo focus** | Prefer wide, high-resolution photos. Filter out illustrations, logos, vectors, screenshots and low-resolution imagery when descriptions and dimensions permit. **The default free Openverse source cannot guarantee professional-stock quality; the optional Pexels/Pixabay Worker provides true stock-photo libraries.** |
| **Article Match %** | Initially scores a photo using its title/tags, topic overlap, resolution, and suitability for 16:9 featured-image cropping. This is a transparent editorial estimate, not a scientific probability. |
| **Free pixel-based vision AI** | Optional **AI check actual photo pixels** or **AI scan top 3 photos**. Uses open-source [CLIP](https://huggingface.co/Xenova/clip-vit-base-patch32) via [Hugging Face Transformers.js](https://huggingface.co/docs/transformers.js) directly in the visitor's browser. No paid inference API. |
| **Visual affinity** | Once scanned, shows pixel-based relative affinity to tested visual prompts, and updates Article Match % to **60% metadata score + 40% visual affinity**. This is a ranking heuristic, **not a probability that an image depicts a news event**. |
| **Upload-to-scan fallback** | External providers can block CORS, preventing direct AI reading of their images. Download the source image from its provider and upload a JPG/PNG/WebP (max 12MB) to scan privately in the browser. |
| **Daily-use editor tools** | Save favourites in browser storage, filter by match/source/rights, sort by score or resolution, preview 16:9 crop, open original provider, attempt to download, and copy attribution. |

## Deploy this ZIP to the existing GitHub repository

1. Download and **extract** this ZIP. Upload its **contents** (not the ZIP itself) to the **root** of the repo: https://github.com/msaizah21/cyberpulse-image-finder
2. On GitHub choose **Add file → Upload files** and upload `index.html`, `styles.css`, `app.js`, `analysis.js`, `relevance.js`, `vision.js`, `config.js`, `README.md`, both optional Worker scripts, favicon assets, `.nojekyll`, `assets/`, and `tests/`. Overwrite the older files where GitHub asks.
3. Commit e.g. `Upgrade CyberPulse Studio with free image vision AI`.
4. To enable GitHub Pages: **Settings → Pages → Deploy from branch → main → /(root)**.
5. Open the GitHub Pages URL above. If it looks old, hard refresh with Ctrl+Shift+R.

Do not upload the ZIP as a single file or nest all files inside an extra subfolder.

## Everyday editorial workflow

1. Paste the article into **Article text**. The title can remain empty. Click **Analyse article & discover photos** (Ctrl+Enter also works in the article box).
2. Review the category and choose an article-ready title. Adjust the generated search phrase if the stock results are too generic.
3. Click **Fresh results** as often as needed, or **Deep search · 3 batches**. Each batch uses additional provider pages and context-aware search phrases. Quotas and finite search results still apply; these controls are **not infinite**.
4. Click **AI check actual photo pixels** on a suitable image or **AI scan top 3 photos**. Only do this when needed; model initialization requires a large download. The first request can be slow or fail on low-powered devices or blocked networks.
5. Look at **estimated Article Match %** and **Vision AI visual affinity**, then independently verify visual truth, publisher licence, and editorial context.
6. Preview the 16:9 crop, save your choice, and download the original from its source for WordPress. **This utility does not publish to WordPress.**

### What free vision AI does — and does not do

- Transformers.js loads the `Xenova/clip-vit-base-patch32` model on demand from Hugging Face/CDN, with quantized ONNX weights and WebAssembly inference. It does **not** use a paid OpenAI/Anthropic/Gemini image API.
- CLIP compares a photo against multiple text prompts made from the article's **photo concepts** plus unrelated controls. The resulting visual affinity is a **relative classification score**, **not a calibrated probability**, a recognition of a specific person/product, or factual verification.
- **The full article stays local**. Image *search keywords* are sent to the photo libraries. For image-vision scoring, pretrained code/weights are downloaded first; photo pixels are processed on-device and not sent to an inference service. Fetching an image from its host still sends a normal network request to that photo host.
- Some stock domains deny cross-origin requests. If direct AI scan fails, the app displays a specific error and offers the file-upload fallback. **Do not disable browser security or use random proxy sites.**
- Vision runtime and live provider results depend on the user's browser/network. They were **not validated end-to-end against the live third-party model/CDNs in the build environment**; the static app and simulated provider/vision UI flows were browser-smoke-tested.

## Optional: show TRUE professional stock images in the results grid

The free default Openverse API provides photographs under various Creative Commons licences. It may return unsuitable photos. **To get curated professional stock results inside the grid, connect a Pexels and/or Pixabay API credential using `stock-worker-OPTIONAL.js`**, *without ever committing a key to public GitHub*.

1. Register at the provider, check whether free API access is presently offered, and obtain an eligible API key. Pexels key issuance/limits and Pixabay API availability can change.
2. Create a Cloudflare Worker and paste the entire `stock-worker-OPTIONAL.js` source as its Worker code.
3. Add encrypted secrets in Worker Settings: `PIXABAY_API_KEY` and/or `PEXELS_API_KEY` (use what you have). Set an environment variable `ALLOWED_ORIGIN=https://msaizah21.github.io` (adjust if hosted on another domain).
4. Deploy the Worker, enable reasonable rate limits to prevent abuse of a public endpoint, and copy its Worker URL.
5. In your GitHub repository edit `config.js`:

   ```js
   window.CyberPulseConfig = {
     stockWorkerUrl: 'https://YOUR-WORKER.YOUR-SUBDOMAIN.workers.dev/',
     pixabayWorkerUrl: ''
   };
   ```

6. Commit the change. Search will **prefer the actual stock providers instead of Openverse** if `stockWorkerUrl` is configured. If that Worker fails, the UI will show a provider error; it does not pretend to have stock results.

**Safety note:** Cloudflare Worker routes are public even with an origin restriction, so add Worker-side rate limiting / bot protection for production use, especially for shared high-traffic editorial workflows. Browser CORS is not authentication. Keep API keys encrypted in Worker secrets.

The ZIP also retains `pixabay-worker-OPTIONAL.js` as a legacy compatibility option for anyone who already deployed the older single-provider Worker. **Do not configure both workers at the same time.**

## Source licences & publishing review

- **Openverse** indexes openly licensed media, but specific licences can require attribution and share-alike; publisher and creator rights need verification. Not all images are professional stock.
- **Pexels** and **Pixabay** use their own content licences with restrictions. Verify the current provider licence at source; **do not infer unrestricted rights from a result**.
- Filtering by photograph, aspect ratio and keywords uses metadata and is imperfect. Some photos may be conceptual or misleading for breaking news.
- A related stock photo should be captioned as an **illustrative stock image**. Never imply it shows a specific cyberattack, victim, product, building, or company without verifying the original source.
- Image downloads may fail because of host-side restrictions; in that case the app opens the official source page for safe manual download.

## Files in this ZIP

```text
index.html                    Main website
styles.css                    Responsive dark design
app.js                        Search, deep refresh, results, favourites, ranking, previews
analysis.js                   Article category and headline suggestions
relevance.js                  Transparent metadata ranking
vision.js                     FREE local CLIP browser image vision
config.js                     OPTIONAL Worker URL, no secrets
stock-worker-OPTIONAL.js      Cloudflare Worker for Pexels/Pixabay (encrypted secrets)
pixabay-worker-OPTIONAL.js    Legacy single-provider Worker
assets/                       CyberPulse and CyberWaze logos
favicon.png, favicon.svg      Branding
.nojekyll                     GitHub Pages support
tests/                        Developer tests
```

## Developer tests

```bash
node --check analysis.js
node --check app.js
node --check relevance.js
node --check vision.js
node --check stock-worker-OPTIONAL.js
node tests/test-analysis.cjs
node tests/test-relevance.cjs
```

A browser smoke test was also run against simulated Openverse results and a stubbed CLIP inference response: category, titles, cards, fresh paging, saved items and score refresh all worked without browser console exceptions. This **does not** certify actual third-party provider API responses or live CLIP downloads.

### Technical source references

- [Transformers.js zero-shot image classification pipeline](https://huggingface.co/docs/transformers.js/api/pipelines)
- [CLIP model repository and licence](https://huggingface.co/Xenova/clip-vit-base-patch32)
- [Openverse API](https://api.openverse.org/v1/)
- [Pexels API](https://www.pexels.com/api/)
- [Pixabay API](https://pixabay.com/api/docs/)
