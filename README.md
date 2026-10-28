# Taryfa – Warsaw taxi price comparison

Compare **estimated** Uber, Bolt and FREENOW fares for any trip in Warsaw.

- Detects your current location automatically (or type it yourself)
- Precise pickup and drop-off: real address search with house numbers, a "Pin on map" button, and markers you can drag to the exact door
- Real driving route and distance on an OpenStreetMap map
- Three fares side by side (Standard / Comfort / XL), cheapest first, with surge and night-tariff logic
- Choose a fare → "Book in Uber / Bolt / FREENOW" (Uber opens with both points filled in)

It's a static website (HTML + CSS + JavaScript). It has no server, no build step and no API keys, so you can host it free.

---

## Files

```
taryfa/
├── index.html        the page
├── css/style.css     all styling
├── js/config.js      ← PRICES & settings (edit this to update fares)
├── js/places.js      popular Warsaw places shown instantly
├── js/app.js         app logic (map, search, location, routing, pricing)
├── assets/favicon.svg
├── .nojekyll         tells GitHub Pages to serve files as-is
└── README.md
```

---

## Publish free with GitHub Pages

### Option A – in the browser (no tools needed)

1. Sign in at **github.com** → click **+** (top right) → **New repository**.
2. Name it `taryfa`, set it to **Public**, and click **Create repository**.
3. On the new repo page, click **uploading an existing file**.
4. Unzip `taryfa.zip` on your computer. Open the `taryfa` folder and drag **everything inside it** (`index.html`, `css`, `js`, `assets`, `README.md`) into the upload area.
   `index.html` must be at the top level of the repo, not inside a subfolder.
5. Click **Commit changes**.
6. Go to **Settings → Pages**. Under **Build and deployment** pick **Source: Deploy from a branch**, **Branch: `main`**, folder **`/ (root)`**, then click **Save**.
7. Wait 1–2 minutes and refresh. Your site is live at
   **`https://<your-username>.github.io/taryfa/`**

> `.nojekyll` is a hidden file, so the browser upload may skip it. That's fine because the site works without it.

### Option B – with git on your computer

```bash
# 1. unzip and enter the folder
unzip taryfa.zip
cd taryfa

# 2. create the repo locally and push it
git init
git add .
git commit -m "Taryfa: Warsaw taxi price comparison"
git branch -M main
git remote add origin https://github.com/<your-username>/taryfa.git
git push -u origin main
```

Then do step 6 above (**Settings → Pages → main / root → Save**).

### Updating the live site later

Edit the files, then:

```bash
git add .
git commit -m "Update fares"
git push
```

GitHub Pages republishes automatically within about a minute.

### Optional: your own domain

In **Settings → Pages → Custom domain**, type your domain (e.g. `taryfa.pl`). At your domain registrar, add a `CNAME` record pointing to `<your-username>.github.io`, then tick **Enforce HTTPS**.

---

## Other free hosts (also take the same folder)

- **Netlify**: go to app.netlify.com/drop and drag the `taryfa` folder in.
- **Cloudflare Pages**: Create project → Upload assets → drop the folder (or connect the GitHub repo).
- **Vercel**: Import the GitHub repo. Framework: "Other", no build command.

---

## Test on your computer first

Location detection only works over `https://` or `http://localhost`, so don't double-click `index.html`. Run a tiny local server instead:

```bash
cd taryfa
python3 -m http.server 8000
# open http://localhost:8000
```

---

## Keeping fares accurate

Uber, Bolt and FREENOW **do not provide public price APIs**, so the fares are estimates. Open **`js/config.js`** and update the numbers from time to time by checking real quotes in each app:

| Setting | Meaning |
|---|---|
| `base`, `perKm`, `perMin`, `minimum`, `bookingFee` | App-ride pricing per class (Uber, Bolt) |
| `surge.peak`, `surge.party` | Multipliers at weekday rush hour / Fri–Sat nights |
| `start`, `perKm.tariff1/2`, `perWaitMin` | Licensed-taxi meter rates (FREENOW) |
| `trafficFactor` | Adds traffic on top of the router's free-flow time |

A good routine is to take 3–4 real trips' quotes from each app, compare them with what Taryfa shows, and adjust `perKm` / `base` until they match.

---

## Free services used, and their limits

| What | Service | Notes |
|---|---|---|
| Map tiles | OpenStreetMap | Free with attribution, but not meant for heavy traffic |
| Address search | Nominatim (OSM) | Max ~1 request/second per site. The app waits until you stop typing and caches results |
| Driving route | OSRM public demo | Free, best-effort. If it's down, the app falls back to a straight-line estimate |

These are fine for a personal or early-stage site. **If your site gets lots of users**, switch the URLs in `js/config.js → services` to a provider with a free tier and higher limits, for example:

- Tiles: MapTiler, Stadia Maps or Thunderforest (free API key)
- Search: LocationIQ, Geoapify or MapTiler Geocoding (Nominatim-compatible APIs)
- Routing: OpenRouteService, GraphHopper, or your own OSRM server

---

## Legal notes

- Fares are estimates. The page says so clearly, and the final fare is always the one shown in the provider's app.
- Taryfa isn't affiliated with Uber, Bolt or FREENOW. Use their names only to identify the services; don't add their logos without permission.
- Keep the "© OpenStreetMap contributors" credit visible on the map. It's required.
