# CyberPulse — Article Image Finder

A small public website where an editor pastes a cybersecurity article and receives:

- a suggested category from the **10 CyberPulse category names supplied for this project**;
- other likely categories and more focused stock-image search phrases;
- real images from [Openverse](https://openverse.org/) with a [Wikimedia Commons](https://commons.wikimedia.org/) fallback;
- individual image source links, licence information, attribution copying, and a download action (some source sites only permit downloading on their own page).

**This project works with GitHub Pages. No server, database, WordPress password, Python, Flask, API key, or payment is needed.** The category matching uses transparent, weighted keyword and phrase rules; it is not an LLM/ChatGPT model.

## Publish on YOUR GitHub repository — step by step

Repository: <https://github.com/msaizah21/cyberpulse-image-finder>

1. Download and **extract** the ZIP. Do **not** upload the ZIP itself as your website.
2. Sign in to GitHub and open your `cyberpulse-image-finder` repository.
3. Choose **Add file → Upload files** (or the **uploading an existing file** link if the repository is empty).
4. Upload the files **inside the extracted folder**, including `index.html`, `app.js`, `analysis.js`, `styles.css`, `favicon.svg`, and `README.md`. They must be directly in the repository, **not inside another folder**.
5. Enter commit message `Add CyberPulse public image finder` and click **Commit changes**.
6. Open repository **Settings → Pages**.
7. Under **Build and deployment**, set **Source: Deploy from a branch**, **Branch: main**, **Folder: /(root)**, and click **Save**.
8. Once GitHub reports a successful deployment, open:
   **https://msaizah21.github.io/cyberpulse-image-finder/**

### IMPORTANT: repository visibility

GitHub Free supports Pages from **public** repositories. If your repository is private and your GitHub plan doesn't support private-repository Pages, go to **Settings → General → Danger Zone → Change repository visibility → Public** before enabling Pages. Be aware your **source code** becomes public, too. This project contains no passwords or API keys. A public Pages URL is viewable by anyone, regardless of the GitHub repository's visibility where supported.

## How to use

1. Paste the article title (optional) and article text (or a useful summary).
2. Click **Analyse & find images**.
3. Review the proposed **primary category** and optional other categories. The category is a suggestion, **not automatically assigned to WordPress**.
4. Use the suggested image search terms or edit the search query manually.
5. Preview images and check licence/source. Use **Download**, **Copy credit**, or **Open original source**.
6. Upload your chosen image to WordPress yourself and include any required attribution.

## Important limitations

- The Openverse API can impose rate limits, be unavailable, or show irrelevant/missing image links. The app retries with shorter searches and falls back to Wikimedia Commons. If both fail, use the direct **Browse on Openverse** link.
- Downloading direct from external image hosts may be blocked by browser cross-origin rules. The app opens the original source page when this happens. It never falsely reports success.
- Results are *openly licensed*, not necessarily unrestricted. CC BY needs credit; CC BY-SA can require sharing adaptations under the same licence; CC0 / public domain records should still be verified against the original source. Trademarks and people pictured can have separate rights. **Always review the original licence and attribution before commercial publishing.**
- There is no login, content storage or WordPress editing. Your article text remains in the browser; only image search words are sent to Openverse/Wikimedia. Image-source requests may be logged by those providers.
- Category suggestions use matching phrases, not a cloud AI model, and require editorial review.
- The user mentioned 13 categories but supplied **10 names**. This version includes those 10, without inventing 3 more.
- GitHub Pages cannot securely host a private Pexels API key inside frontend JavaScript. For private API keys, production-grade semantic AI classification, or direct WordPress publishing, use a protected server/backend instead of a static website.

## Changing categories and search suggestions

Edit the `categories` array in `analysis.js`. Add or rename `name`, update matching `terms` and `searches`. Commit the change to publish a new version. This keeps your WordPress category names as the source of truth.

## Local preview (optional)

You can open `index.html` directly in Chrome or Edge. If external image searches fail when opened as a local file, publish to GitHub Pages or run a simple static server:

```bash
python -m http.server 8000
```

Open <http://localhost:8000/>. The published GitHub Pages site is the intended way to share with others.

## Technical details

- Static HTML, CSS, plain JavaScript; no dependencies or build step.
- Openverse image API: <https://api.openverse.org/v1/>.
- Wikimedia Commons MediaWiki API: <https://commons.wikimedia.org/w/api.php>.
- Filters favor images that allow commercial use, but **never interpret a search result as a guarantee of rights**.

Project code may be modified by CyberPulse. Images remain subject to the individual source's terms.
