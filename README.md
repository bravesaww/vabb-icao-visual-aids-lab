# VABB ICAO Visual Aids Lab

Educational 3D schematic of Chhatrapati Shivaji Maharaj International Airport (ICAO **VABB**, IATA **BOM**). ICAO Annex 14 Volume I markings, lights and signs on published runway dimensions, with expanded catalogue notes (chapter/section numbers, tables and metres) plus runway physical characteristics.

**Not a photoreal digital twin. Not an AIP substitute. Not for real navigation or flight.**

This is a new JavaScript project based on the earlier TypeScript [VABB Runway Lab](https://github.com/ssaiffudeen946-collab/new-visual-aids-for-nav). It keeps the same stack (TanStack Start, React 19, Tailwind v4, three.js / R3F / drei) and models a single runway — **RWY 09/27** — with a much more detailed Annex 14 / AIP catalogue and matching 3D cues.

## What’s new

- **Markings** — threshold stripe counts by runway width (§5.2.4), centre-line stripe/gap/width rules (§5.2.3), aiming-point Table 5-1 (400 m on every VABB end because published LDA ≥ 2 400 m), touchdown-zone pair counts and the omitted pair within 50 m of the aiming point (§5.2.6 / Figure 5-5), displaced-threshold arrows (Figure 5-4), Pattern A and Pattern B holding positions (§5.2.10 / Table 3-2), enhanced taxiway centre line (47 m, §5.2.8), mandatory instruction and information pavement markings (§5.2.16–5.2.17), intermediate holding position (§5.2.11), and a teaching blast-pad chevron pad (Chapter 7; VABB has no declared stopway/clearway in the 2017 AIP extract).
- **Lights** — CAT I / CAT II approach systems per published length (§5.3.4), threshold and wing bars (§5.3.10), edge-light colour rules including yellow caution zone and red pre-threshold (§5.3.9), centre-line colour coding last 900 m / 300 m (§5.3.12), TDZ lights on 27 (900 m) (§5.3.13), PAPI settings ±30′ / ±10′ with AIP side, angle and MEHT (§5.3.5), REIL/RTIL (§5.3.8), stop bar (§5.3.20), runway guard lights (§5.3.23), taxiway centre-line and edge lights.
- **Signs** — mandatory (runway designation, CAT II, NO ENTRY), location, direction, destination, runway-exit and information faces, with Table 5-5 inscription heights and Table 5-6 placement distances.
- **Physical characteristics** — RWY 09/27 dimensions, TORA/TODA/ASDA/LDA, displaced thresholds, strips, RESA, shoulders and Annex 14 slope limits. A Physical layer toggles strip and RESA overlays.

## Sources

- **ICAO Annex 14 Volume I**, *Aerodrome Design and Operations* (8th/9th edition numbering): Chapter 3 physical characteristics; Chapter 5 visual aids (§5.2 markings, §5.3 lights, §5.4 signs); Chapter 7 unserviceable-area chevrons. Table numbers cited (5-1 aiming point, 3-2 holding-position distance, 5-5 / 5-6 signs) follow recent English editions; light paragraph numbers shifted by one between some 8th- and 9th-edition prints (noted in the catalogue).
- **AIP India, VABB AD 2.12 / AD 2.13 / AD 2.14**, 25 MAY 2017 extract of the official Airports Authority of India AIP (declared distances, published runway notes, RESA, shoulders, strips, approach-light type/length, PAPI side/angle/MEHT, TDZ lengths, centre-line and edge-light spacing). Current eAIP: [aim-india.aai.aero VABB AD 2](https://aim-india.aai.aero/eaip-v2-02-2025/eAIP/IN-AD%202.1VABB-en-GB.html). **Confirm every operational figure against the current eAIP and NOTAMs.**
- Original project values kept unless an authoritative source differed: **09/27 3448 × 60 m**, displaced **142 m / 482 m**. The crossing runway 14/32 from the earlier lab is not modelled here.
- OurAirports lists 09/27 as 3509 × 60 m — that figure is **not** used.

Values that could not be sourced exactly are labelled **schematic/approximate** in the catalogue (for example PAPI siting on 09/27, chevron outline proportions, enhanced-centre-line dash length, Pattern B ladder proportions, REIL presence).

## Run locally

Needs **Node.js 22+**.

```bash
git clone https://github.com/bravesaww/vabb-icao-visual-aids-lab.git
cd vabb-icao-visual-aids-lab
npm install --legacy-peer-deps
npm run dev
```

Then open the URL Vite prints (default `http://localhost:8080`).

`--legacy-peer-deps` is required because React 19 and `@react-three/fiber` disagree on a peer range; the app still runs.

### Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server on `0.0.0.0:8080` |
| `npm run build` | Production build (Vercel / Nitro) |
| `npm run lint` | ESLint |

No login, no database. Auth is off (`.grok/app-env.json` → `VITE_AUTH_ENABLED=false`).

The project is **JavaScript** (`.js` / `.jsx`) with a `jsconfig.json` path alias `@/*` → `./src/*`.

## Deploy

This is a **TanStack Start** app with SSR. Production (including Vercel) serves the same React lab as `npm run dev`. It will **not** run as a static GitHub Pages site.

A legacy one-file three.js demo is kept at `docs/legacy-standalone.html` for reference only and is not part of the production build.

Use **Vercel** (already configured in `vite.config.js` via the Nitro `vercel` preset):

1. Import the GitHub repo in Vercel
2. Framework: Vite / other
3. Build command: `npm run build`
4. Install command: `npm install --legacy-peer-deps`

Or run it in **GitHub Codespaces** with `npm install --legacy-peer-deps && npm run dev`.

## What to try

- **Enter airfield** — orbit camera
- **Walk mode** — starts at RWY 09 threshold, looking east. WASD, Shift sprint, click to look, Q/E altitude, F nearest feature
- Click any marking, light, sign or physical feature for metres + Annex 14 notes
- **Night** — aerodrome lights
- Catalog jump, layer toggles (Markings / Lights / Signs / Buildings / Physical)

## Lab source (the 3D app)

| File | Role |
| --- | --- |
| `src/lab/world.js` | Metres, headings, runway geometry, AIP declared distances (1 unit = 1 m, +Y up, −Z north) |
| `src/lab/catalog.js` | Clickable features + ICAO / AIP text |
| `src/lab/catalog-extra.js` | Additional markings, lights, signs and physical-characteristic entries |
| `src/lab/markings.jsx` | Runway / taxiway paint |
| `src/lab/lights.jsx` | Edge, CL, ALS, PAPI, TDZ, REIL, stop bar, wig-wag |
| `src/lab/fixtures.jsx` | Signs, T2, tower, hangars, jets, windsock |
| `src/lab/systems.jsx` | Cameras, walk/inspect, picker, pavement, strip/RESA overlays |
| `src/lab/AirfieldCanvas.jsx` | React Three Fiber canvas |
| `src/lab/ui/` | Start screen, HUD, touch joystick |
| `src/routes/index.jsx` | `/` route |

Stack: TanStack Start + React 19 + Tailwind v4 + three.js / R3F / drei.

## Dimensions used

Declared distances below are from AIP India VABB AD 2.13 (25 MAY 2017 extract). TORA = TODA = ASDA on RWY 09/27 in that extract (no stopway or clearway). This lab models **only RWY 09/27**.

| Runway | Physical (lab) | Displaced THR (lab) | TORA / TODA / ASDA | LDA | Approach (AD 2.14) | PAPI |
| --- | --- | --- | --- | --- | --- | --- |
| 09 | 3448 × 60 m (AIP note: 3188 × 60 m this direction) | 142 m | 3188 m | 3048 m | CAT I, 540 m | Right / 3.00°, MEHT 73.93 ft |
| 27 | 3448 × 60 m | 482 m | 3448 m | 2965 m | CAT II, 900 m; TDZ 900 m | Left / 3.00°, MEHT 73.93 ft |

Notes:

- RWY 09 published take-off length in that AIP is 3188 m; RWY 27 uses the full 3448 m. Shoulders: 7.5 m each side. RESA: 240 × 120 m at both ends. Strip: 3308 × 300 m (09 direction), 3568 × 300 m (27 direction).
- Aerodrome reference code **4F** (AIP AD 2.2). ARP 190530N 0725158E, elevation 40 ft.
