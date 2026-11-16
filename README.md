# CyberPulse PRIME Research + Learning Newsroom · v11

**Made by Aiza Sajid, CyberWaze**  
A practical, free-to-start featured-image research studio for the CyberPulse editorial team.

This version upgrades v9 with **article-aware automatic research after weak results**, a **best-three banner shortlist**, and **editorial preference learning**. It is a static GitHub Pages site; no paid image API or WordPress account is required.

## How your team uses it

1. Paste the news story. You may leave the title blank. Click **Analyse article & discover photos**.
2. The app proposes a news headline, CyberPulse category, story-specific People/Organizations/Incidents/Policy keywords, and live open-licensed image suggestions.
3. **If fewer than two source-metadata matches score 65 or above**, **Prime Research starts automatically**. It searches up to three additional *distinct* editorial directions (for example, a person, an official department, and a real-world building), rather than stopping at a weak 45% photo.
4. Review the **Prime Research / Best Three** shortlist. If strong images were not found, it is explicitly labelled **Best available alternatives — review before publishing**. The tool never claims that a weak image documents a specific incident.
5. Press **PRIME DEEP RESEARCH** above the photos to try up to six additional distinctive searches. **Refresh** continues exploring different story directions while retaining earlier results. Requests may be throttled by external services.
6. Click **✓ Good for this article** or **✕ Not relevant** on a photo. Mark your final choice **✓ Selected for WordPress** in the preview (or successfully export its WordPress JPG). Preferences affect the *ordering* of eligible photos in similar future stories; they do **not** inflate the **Article Match %**.
7. Export your team's local preference data using **Export team learning**, then import it in another editor's browser. It does not automatically sync across team computers. Use **Reset learning** if needed.

## What “learning” actually means

This site uses **explicit-feedback preference learning**, not training a new AI model. It stores compact image title/tag keywords, story type, image identifier and the feedback action in browser local storage. Your full articles are **not** persisted as training examples. Selected / rejected image features bias later ranking by a bounded amount, but **named subject and actual article context take precedence**. Import/export JSON is the manual team sharing method. Browser private mode or local-storage restrictions may mean changes cannot be retained.

The separate **optional CLIP Vision AI** feature can inspect actual image pixels on your device, but it must download model files on first use. External image hosts may block pixel access; when that happens download a photograph and use the built-in photo upload fallback. CLIP similarity does not prove that a photo depicts the reported incident.

## Example: Trump AI task-force article

The extract mentioning Donald Trump, Emil Michael, Defense Department, AI safety reporting, critical infrastructure, OpenAI and Hugging Face is analyzed as a **government AI cybersecurity policy story**. Primary photo directions prioritize Trump, government buildings and Defense Department, with policy/context as alternates. An image of OpenAI alone is only a supporting mention and should not automatically become the lead featured image.

If the first returned images are generic tech photos with ~45% estimated relevance, Prime will run additional different provider searches and choose up to three best candidates. It does **not** silently change a 45% estimate to 90% or label an unrelated stock photo as a real event photograph.

## Installation on GitHub Pages

Repository: <https://github.com/msaizah21/cyberpulse-image-finder>

- Extract the ZIP and upload the **contents** (`index.html`, all `.js` and `.css` files, `assets/`, favicon, `.nojekyll`) into the **repository root** (the folder that holds the current `index.html`). Replace the old files and commit.
- Ensure **Settings → Pages** points to that same root (or existing deployment setup). Reload with **Ctrl + Shift + R** after publication.
- Do not commit a user export of team-learning JSON; these exports are intended to be exchanged privately, when needed.

## Image source and business-use limitations

- Image results are provided by the **Openverse** API and **Wikimedia Commons** API; access requires internet and depends on the services being available. Openverse anonymous usage is rate-limited; frequent Prime searches or refreshes may return HTTP 429. The app preserves earlier results, reports the limitation, and provides links to the original libraries. See <https://api.openverse.org/v1/> and <https://www.mediawiki.org/wiki/API:Cross-site_requests>.
- The app does not use Pexels or Pixabay. Free/Openly licensed images are **not guaranteed premium-stock photography**. It can suggest **up to three** closest available images, but cannot manufacture a source image that does not exist or promise three objectively relevant photos for every breaking news story.
- **Article Match % is a heuristic**, based on original metadata, named-entity/topic matching, photo resolution/crop, and optional local CLIP vision. It is **not an objective probability or factual image verification**. An image caption may be wrong. Always inspect the original photographer/file page, licensing, attribution requirements, model releases where relevant, and whether it actually portrays the subject.
- No web-wide fact-checker or live news crawler is included. “Prime Research” means **extra targeted image-library searches**, not verified independent investigation of a news claim.
- WordPress JPG export only works when the remote image host allows browser downloads. Otherwise open the creator’s original photo and crop in WordPress.

## Validation

From the project directory run:

```bash
for file in *.js; do node --check "$file"; done
for test in tests/*.cjs; do node "$test"; done
```

Automated JavaScript tests cover article analysis, story keyword extraction, named-entity ranking, query diversification, fallback at 45%, three-choice labelling, local preference learning and importing/exporting history. An **offline headless Chromium simulation** using mocked image-provider responses also tested automatic Prime triggering, gallery/shortlist rendering, feedback, and top Refresh without JavaScript errors. **This is not a live provider or live WordPress integration test.** Results from actual Openverse/Wikimedia endpoints, API throttling, and first-time CLIP model download must still be verified on the deployed site.

**Developed for CyberWaze / CyberPulse**. Not affiliated with Openverse, Wikimedia, or WordPress.
