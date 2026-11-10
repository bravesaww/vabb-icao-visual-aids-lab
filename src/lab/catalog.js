import { RWY_0927, TAXI_N, TAXI_S, TAXI_N1, HOLD_N1, thresholdAlong, landingSign, physicalAlong, headingVec, thresholdStripeCount, aimingInnerSpacing, aimingPointFromThreshold, tdzPairCount, fp, endFp, } from "./world";
import { EXTRA_FEATURES } from "./catalog-extra";
function endFeatures(rwy, endName) {
    const end = rwy.ends[endName];
    const zebraCount = thresholdStripeCount(rwy.width);
    const lda = end.declared.lda;
    const apFrom = aimingPointFromThreshold(lda);
    const pairs = tdzPairCount(lda);
    const inner = aimingInnerSpacing(rwy.width);
    const usable = rwy.length - rwy.ends[Object.keys(rwy.ends)[0]].displaced - rwy.ends[Object.keys(rwy.ends)[1]].displaced;
    const displacedLen = end.displaced;
    const other = Object.keys(rwy.ends).find((k) => k !== endName);
    return [
        {
            id: `mark.thr.${endName}`,
            title: `Threshold markings RWY ${endName}`,
            kind: "marking",
            location: `RWY ${endName} threshold, ${end.displaced} m in from the ${endName} physical end`,
            purpose: "Identify the beginning of the runway available for landing. Longitudinal white stripes (the “zebra”) are the ICAO threshold pattern.",
            icao: "Annex 14 Vol I §5.2.4 Threshold markings",
            dimensions: [
                { label: "Stripe length", value: "≥ 30 m" },
                { label: "Stripe width", value: "1.80 m" },
                { label: "Gap between stripes", value: "1.80 m" },
                { label: "Number of stripes", value: `${zebraCount} (${rwy.width} m runway)` },
                { label: "Width → count (§5.2.4)", value: "18 m: 4; 23 m: 6; 30 m: 8; 45 m: 12; 60 m: 16" },
                { label: "Start from threshold", value: "6 m" },
                { label: "Transverse stripe", value: "≥ 1.80 m wide at a displaced threshold (recommended)" },
            ],
            notes: `VABB RWY ${endName} is drawn as ${end.cat}. ${end.catNote} Displaced threshold ${end.displaced} m — landing is not authorised on the closed section before this bar.`,
            footprint: endFp(rwy, endName, 21, 30, rwy.width),
        },
        {
            id: `mark.des.${endName}`,
            title: `Runway designation ${endName}`,
            kind: "marking",
            location: `Painted on RWY ${rwy.pair}, ${endName} approach end`,
            purpose: "Two-digit magnetic heading (nearest 10°) so a landing crew can confirm they are on the correct runway.",
            icao: "Annex 14 Vol I §5.2.2 Runway designation marking",
            dimensions: [
                { label: "Character height", value: "9 m" },
                { label: "Numerals", value: endName },
                { label: "Placement", value: "12 m beyond threshold stripes" },
            ],
            notes: `True heading here is ~${end.heading}°. Mumbai magnetic variation is small; the painted ${endName} is the published designation.`,
            footprint: endFp(rwy, endName, 52.5, 9, 16),
        },
        {
            id: `mark.aim.${endName}`,
            title: `Aiming point RWY ${endName}`,
            kind: "marking",
            location: `${apFrom} m past RWY ${endName} threshold (Table 5-1 for LDA ${lda} m), both sides of the centre line`,
            purpose: "Visual aim point for a 3° (or published) approach. The pair of rectangles is the primary visual glideslope cue with PAPI.",
            icao: "Annex 14 Vol I §5.2.5 Aiming point marking / Table 5-1",
            dimensions: [
                { label: "LDA (AIP AD 2.13, 2017)", value: `${lda} m` },
                { label: "Distance from threshold", value: `${apFrom} m (LDA ≥ 2 400 m → 400 m)` },
                { label: "Stripe length (Table 5-1)", value: "45–60 m for LDA ≥ 1 200 m (lab draws 50 m)" },
                { label: "Stripe width (Table 5-1)", value: "6–10 m for LDA ≥ 1 200 m (lab draws 8 m)" },
                { label: "Inner-side spacing", value: `${inner} m (${rwy.width} m runway)` },
            ],
            notes: `Table 5-1 lists 150 / 250 / 300 / 400 m for LDA < 800 / < 1 200 / < 2 400 / ≥ 2 400 m. All four VABB ends have published LDA ≥ 2 400 m. PAPI ${end.papiDeg.toFixed(2)}° ${end.papiSide}, ${end.papiSitingNote}.`,
            footprint: endFp(rwy, endName, 425, 50, 42),
        },
        {
            id: `mark.tdz.${endName}`,
            title: `Touchdown zone RWY ${endName}`,
            kind: "marking",
            location: `Pairs at 150 m intervals from 150 m to 900 m past threshold ${endName}`,
            purpose: "Paint the usable touchdown zone so the aiming point is not a lone mark. Pair count reduces with distance from threshold.",
            icao: "Annex 14 Vol I §5.2.6 Touchdown zone marking / Figure 5-5",
            dimensions: [
                { label: "LDA → pairs", value: "<900: 1; <1200: 2; <1500: 3; <2400: 4; ≥2400: 6" },
                { label: "Pairs on this end", value: `${pairs} (LDA ${lda} m)` },
                { label: "Stations", value: "150, 300, 450, 600, 750, 900 m from threshold" },
                { label: "Omitted pair", value: "450 m (within 50 m of the 400 m aiming point)" },
                { label: "Figure 5-5 (A)", value: "One 22.5 × 3 m rectangle each side" },
                { label: "Figure 5-5 (B)", value: "22.5 × 1.8 m stripes, 1.5 m apart (lab: 3 then 2 at 150 / 300 m, then single bars)" },
            ],
            notes: `Marks are laid from the displaced threshold. The pair within 50 m of the aiming point is omitted (§5.2.6).`,
            footprint: endFp(rwy, endName, 525, 750, rwy.width),
        },
        {
            id: `mark.disp.${endName}`,
            title: `Displaced-threshold arrows RWY ${endName}`,
            kind: "marking",
            location: `Closed-to-landing section, ${end.displaced} m before threshold ${endName}`,
            purpose: "Chevron arrows point to the landing threshold and show pavement that may be used for take-off / roll-out but not for landing.",
            icao: "Annex 14 Vol I §5.2.4.7–5.2.4.10 Displaced threshold / Figure 5-4",
            dimensions: [
                { label: "Closed-to-landing length", value: `${end.displaced} m` },
                { label: "Arrow type", value: "White arrows toward the threshold (Figure 5-4)" },
                { label: "Transverse stripe", value: "≥ 1.80 m at the displaced threshold (recommended)" },
                { label: "Arrow spacing", value: "Uniform (Figure 5-4); lab spacing is schematic/approximate" },
            ],
            notes: `VABB published displacement ${endName}: ${end.displaced} m. Opposite end ${other} is displaced ${rwy.ends[other].displaced} m. Schematic LDA is ${Math.round(usable)} m.`,
            footprint: fp(rwy, (physicalAlong(rwy, end.sign) + thresholdAlong(rwy, endName)) / 2, 0, displacedLen, rwy.width),
        },
        {
            id: `light.thr.${endName}`,
            title: `Threshold bar RWY ${endName}`,
            kind: "light",
            location: `Green wing-bar and threshold bar at ${endName}`,
            purpose: "Green lights facing the approach mark the landing threshold. A wing bar extends the cue beyond the pavement.",
            icao: "Annex 14 Vol I §5.3.10 Runway threshold lights / wing bars",
            dimensions: [
                { label: "Colour (approach face)", value: "Green" },
                { label: "Layout", value: "Bar across threshold + wing bars" },
            ],
            notes: `${end.cat} threshold at VABB ${endName} (green bar + wing bars, §5.3.10). ${end.catNote} Unidirectional green toward the approach; the opposite face of the bar is not a landing cue.`,
            footprint: endFp(rwy, endName, 0, 6, rwy.width + 24),
        },
        {
            id: `light.end.${endName}`,
            title: `Runway-end lights RWY ${endName}`,
            kind: "light",
            location: `Red bar at the ${endName} physical end`,
            purpose: "Red lights facing the runway warn that the usable pavement is ending.",
            icao: "Annex 14 Vol I §5.3.11 Runway end lights",
            dimensions: [
                { label: "Colour", value: "Red (runway face)" },
                { label: "Placement", value: "At the physical runway end" },
            ],
            notes: `The ${endName} end has a ${end.displaced} m displacement, so landing traffic stops well before this bar; departing traffic still needs the end lights.`,
            footprint: fp(rwy, physicalAlong(rwy, end.sign), 0, 8, rwy.width + 8),
        },
        {
            id: `light.als.${endName}`,
            title: `Approach lights ${endName} (${end.cat} ${end.alsM} m)`,
            kind: "light",
            location: `Extended centreline before threshold ${endName}`,
            purpose: "Lead the aircraft onto the runway centreline in low visibility. Category (and length) set the barrette / side-row pattern.",
            icao: "Annex 14 Vol I §5.3.4 Approach lighting systems",
            dimensions: [
                { label: "System length", value: `${end.alsM} m` },
                { label: "Category", value: end.cat },
                { label: "Glide path", value: `${end.papiDeg.toFixed(2)}°` },
            ],
            notes: `${end.cat} / CAT II/III ALS (§5.3.4): 900 m centreline barrettes at 30 m, a white crossbar at 300 m, and red side-row barrettes over the inner 270 m. ${end.catNote}`,
            footprint: endFp(rwy, endName, -end.alsM / 2, end.alsM, 30),
        },
        {
            id: `light.papi.${endName}`,
            title: `PAPI RWY ${endName}`,
            kind: "light",
            location: `${end.papiSide === "left" ? "Left" : "Right"} of ${endName} as seen on approach, ${end.papiSitingM} m past threshold, 15 m off the edge (inboard unit)`,
            purpose: "Four-unit precision approach path indicator. Two white + two red means on slope. Colour is a function of the observer’s elevation angle.",
            icao: "Annex 14 Vol I §5.3.5 Visual approach slope indicator systems (PAPI)",
            dimensions: [
                { label: "Units", value: "4 (PAPI); APAPI is the 2-unit form" },
                { label: "Spacing between units", value: "9 m ± 1 m" },
                { label: "Inboard unit from edge", value: "Typically not less than 15 m (code 3/4)" },
                { label: "Published angle", value: `${end.papiDeg.toFixed(2)}° ${end.papiSide.toUpperCase()}` },
                { label: "MEHT (AIP 2017)", value: `${end.papiMehtFt} ft` },
                { label: "Siting from threshold", value: `${end.papiSitingM} m — ${end.papiSitingNote}` },
                { label: "Unit settings vs slope", value: "−30′ / −10′ / +10′ / +30′ (0.50° / 0.17° / 0.17° / 0.50°)" },
                { label: "On-slope cue", value: "two white + two red" },
            ],
            notes: `AIP AD 2.14 (2017 extract) puts PAPI on the ${end.papiSide} of ${endName} at ${end.papiDeg.toFixed(2)}°. Camera elevation drives the red/white split. This is a schematic — not a certified aiming aid.`,
            footprint: endFp(rwy, endName, end.papiSitingM, 12, 50, (end.papiSide === "left" ? -1 : 1) * landingSign(end) * (rwy.width / 2 + 28)),
        },
    ];
}
export const FEATURES = [
    {
        id: "mark.cl.0927",
        title: "RWY 09/27 centreline",
        kind: "marking",
        location: "Full usable length of RWY 09/27",
        purpose: "Provide directional guidance along the runway axis in low visibility and at night.",
        icao: "Annex 14 Vol I §5.2.3 Runway centre line marking",
        dimensions: [
            { label: "Stripe", value: "30 m" },
            { label: "Gap", value: "20 m" },
            { label: "Width", value: "0.90 m on CAT II/III runways (§5.2.3)" },
            { label: "Runway", value: "3448 × 60 m" },
        ],
        notes: "VABB 09/27 is drawn as a CAT II/III precision runway, so the centre line is 0.90 m wide (§5.2.3). AIP 2017 lists 09 as CAT I; applying the 0.90 m width to the whole runway is consistent with treating both ends as CAT II for teaching.",
        footprint: fp(RWY_0927, 0, 0, 3448, 0.9),
    },
    ...endFeatures(RWY_0927, "09"),
    ...endFeatures(RWY_0927, "27"),
    {
        id: "mark.side.0927",
        title: "RWY 09/27 side stripes",
        kind: "marking",
        location: "Both edges of RWY 09/27",
        purpose: "Show the edge of the load-bearing pavement, especially where the shoulder contrast is poor.",
        icao: "Annex 14 Vol I §5.2.7 Runway side stripe marking",
        dimensions: [
            { label: "Width", value: "At least 0.90 m on runways 30 m or more wide" },
            { label: "Runway width", value: "60 m" },
            { label: "Placement", value: "Outer edge approximately coinciding with the runway edge" },
        ],
        notes: "Continuous white. The displaced sections keep side stripes — only landing is restricted, not pavement width.",
        footprint: fp(RWY_0927, 0, 0, 3448, 60),
    },
    {
        id: "mark.hold.n1",
        title: "Runway-holding position N1 (CAT II)",
        kind: "marking",
        location: "Taxiway N1, 90 m north of RWY 09/27 centre line",
        purpose: "CAT II/III holding position: Pattern A (two solid + two dashed yellow lines; solids face the runway) plus Pattern B (ladder) at the same station. Aircraft stop before the solids unless cleared to cross.",
        icao: "Annex 14 Vol I §5.2.10 Runway-holding position marking / Figure 5-8 Pattern A and Pattern B; Table 3-2",
        dimensions: [
            { label: "Pattern A", value: "2 solid + 2 dashed yellow" },
            { label: "Pattern B", value: "Two parallel yellow lines joined by perpendicular bars (taxi side of Pattern A)" },
            { label: "Line width", value: "0.90 m" },
            { label: "Gap", value: "0.90 m" },
            { label: "Distance from CL", value: "90 m (Table 3-2, code 4, CAT II or III)" },
        ],
        notes: "The same Pattern A + Pattern B pair is painted on every connector, including the end links N09/S09 and N27/S27. Table 3-2 sets 90 m as the minimum centre-line distance for a code-4 CAT II/III hold.",
        footprint: { x: HOLD_N1.x, z: HOLD_N1.z, headingDeg: 0, length: 8, width: 23 },
    },
    {
        id: "mark.taxi.n",
        title: "Taxiway N centreline",
        kind: "marking",
        location: "Parallel taxiway north of RWY 09/27",
        purpose: "Continuous yellow centreline for taxi guidance.",
        icao: "Annex 14 Vol I §5.2.8 Taxiway centre line marking",
        dimensions: [
            { label: "Style", value: "Continuous yellow" },
            { label: "Width", value: "At least 0.15 m; 0.30 m where extra conspicuity is needed (lab draws 0.30 m)" },
            { label: "Taxiway width", value: "23 m (schematic)" },
        ],
        notes: "Parallel taxiway N runs the full 3448 m paved length and terminates into end connectors N09 (RWY 09 physical end) and N27 (RWY 27 physical end). Midfield connectors N1–N4 plus those end links join it to the runway with fillets and curved lead-on/lead-off centre lines. A north MRO pad overlaps N (no gap). Layout of the stubs is schematic/approximate.",
        footprint: { x: 0, z: TAXI_N.z, headingDeg: 90, length: TAXI_N.x1 - TAXI_N.x0, width: 0.3 },
    },
    {
        id: "mark.taxi.s",
        title: "Taxiway S centreline",
        kind: "marking",
        location: "Parallel taxiway south of RWY 09/27, between the runway and T2",
        purpose: "South parallel taxiway centreline.",
        icao: "Annex 14 Vol I §5.2.8 Taxiway centre line marking",
        dimensions: [
            { label: "Style", value: "Continuous yellow" },
            { label: "Width", value: "0.30 m" },
        ],
        notes: "S runs the full paved length between 09/27 and the T2 massing, terminating into end connectors S09 and S27. Midfield connectors S1–S3 use the same lead-on/lead-off geometry as the north side. The T2 apron overlaps S so taxiway pavement is continuous into the stand area (schematic/approximate).",
        footprint: { x: 0, z: TAXI_S.z, headingDeg: 90, length: TAXI_S.x1 - TAXI_S.x0, width: 0.3 },
    },
    {
        id: "light.edge.0927",
        title: "RWY 09/27 edge lights",
        kind: "light",
        location: "Both edges, 60 m longitudinal spacing",
        purpose: "White edge lights define the runway at night. The last 600 m in the take-off direction are yellow caution zone.",
        icao: "Annex 14 Vol I §5.3.9 Runway edge lights",
        dimensions: [
            { label: "Spacing", value: "60 m" },
            { label: "Colour", value: "White; yellow last 600 m" },
            { label: "Runway length", value: "3448 m" },
        ],
        notes: "Bidirectional runway: both ends show a 600 m yellow caution zone. Elevated lights, schematic 0.4 m high.",
        footprint: fp(RWY_0927, 0, 0, 3448, 60),
    },
    {
        id: "light.cl.0927",
        title: "RWY 09/27 centreline lights",
        kind: "light",
        location: "Inset on 09/27 centreline, 15 m spacing",
        purpose: "High-intensity centreline for low-visibility take-off and landing. Colour-coded by remaining distance: white, then alternate red/white last 900 m, red last 300 m.",
        icao: "Annex 14 Vol I §5.3.12 Runway centre line lights",
        dimensions: [
            { label: "Annex 14 CAT II/III spacing", value: "15 m (used in this lab)" },
            { label: "VABB published spacing", value: "30 m on 09/27 (AIP AD 2.14, 2017) — not used; 15 m is the CAT II/III teaching value" },
            { label: "White section", value: "until 900 m remaining" },
            { label: "Alternate red/white", value: "900–300 m remaining" },
            { label: "Red", value: "last 300 m" },
        ],
        notes: "Colour coding is bidirectional from both ends: white, then alternating red/white from 900 m remaining to 300 m, then red for the last 300 m (§5.3.12). AIP 2017 published 30 m spacing; the lab uses 15 m because the runway is drawn as CAT II/III.",
        footprint: fp(RWY_0927, 0, 0, 3448, 1),
    },
    {
        id: "light.tdz.27",
        title: "Touchdown-zone lights RWY 27",
        kind: "light",
        location: "First 900 m of RWY 27",
        purpose: "White inset barrettes in the touchdown zone to define the landing area in CAT II/III.",
        icao: "Annex 14 Vol I §5.3.13 Runway touchdown zone lights",
        dimensions: [
            { label: "Length", value: "900 m" },
            { label: "Colour", value: "White" },
            { label: "Typical spacing", value: "30 m rows" },
        ],
        notes: "AIP AD 2.14 (2017) lists TDZ 900 m on 27. Matching 900 m TDZ lights are also drawn on 09 as part of the schematic CAT II set.",
        footprint: endFp(RWY_0927, "27", 450, 900, 40),
    },
    {
        id: "light.tdz.09",
        title: "Touchdown-zone lights RWY 09",
        kind: "light",
        location: "First 900 m of RWY 09",
        purpose: "White inset barrettes in the touchdown zone — drawn to match the CAT II/III 900 m standard.",
        icao: "Annex 14 Vol I §5.3.13 Runway touchdown zone lights",
        dimensions: [
            { label: "Length", value: "900 m" },
            { label: "Colour", value: "White" },
            { label: "Typical spacing", value: "30 m rows" },
        ],
        notes: "schematic/approximate — AIP AD 2.14 (2017 extract) does not list TDZ lights on 09 (CAT I). They are shown here because the lab treats both ends as CAT II.",
        footprint: endFp(RWY_0927, "09", 450, 900, 40),
    },
    {
        id: "light.taxi.edge",
        title: "Taxiway edge lights",
        kind: "light",
        location: "Blue lights along N, S and every runway connector edge",
        purpose: "Blue edge lights outline the taxiway at night.",
        icao: "Annex 14 Vol I §5.3.18 Taxiway edge lights (9th ed., 2022; some 8th-ed. prints number this §5.3.17)",
        dimensions: [
            { label: "Colour", value: "Blue" },
            { label: "Spacing (schematic)", value: "60 m" },
        ],
        notes: "Blue is reserved for taxiway edge — never used on the runway. Toggle the Lights layer to hide them.",
        footprint: { x: 0, z: TAXI_N.z, headingDeg: 90, length: 3400, width: 23 },
    },
    {
        id: "light.taxi.cl",
        title: "Taxiway centreline lights",
        kind: "light",
        location: "Green inset lights on N and S; green/yellow on lead-in/lead-off connectors",
        purpose: "Green centreline lights for night / low-visibility taxi, switching to alternate green/yellow inside the ILS critical area / runway strip.",
        icao: "Annex 14 Vol I §5.3.17 Taxiway centre line lights (9th ed., 2022; some 8th-ed. prints number this §5.3.16)",
        dimensions: [
            { label: "Colour on parallels", value: "Green" },
            { label: "Colour on lead-in/out (within 150 m of RWY CL)", value: "Alternating green and yellow" },
            { label: "First / last in the coded section", value: "First (nearest the runway CL) green as viewed from the runway; last (at the perimeter) yellow" },
            { label: "Spacing (schematic)", value: "30 m on parallels, 15 m on connectors / curves" },
        ],
        notes: "§5.3.17 codes exit taxiway centre-line lights green/yellow from near the runway centre line to the ILS critical/sensitive area or the inner edge of the strip (here the code-4 strip half-width of 150 m). Beyond that they are green. Geometry of the stubs is schematic/approximate.",
        footprint: { x: 0, z: TAXI_S.z, headingDeg: 90, length: 3200, width: 1 },
    },
    {
        id: "light.rgl.n1",
        title: "Runway guard lights (wig-wag) N1",
        kind: "light",
        location: "Both sides of N1 at the holding position",
        purpose: "Alternating yellow wig-wag lights (configuration A) that shout “runway ahead”. Used in addition to the painted hold.",
        icao: "Annex 14 Vol I §5.3.23 Runway guard lights",
        dimensions: [
            { label: "Colour", value: "Yellow, alternating" },
            { label: "Config", value: "A — elevated pair" },
        ],
        notes: "Watch them alternate. They sit with the mandatory 09-27 sign at N1.",
        footprint: { x: HOLD_N1.x, z: HOLD_N1.z, headingDeg: 0, length: 6, width: 28 },
    },
    {
        id: "light.reil.27",
        title: "REIL threshold 27",
        kind: "light",
        location: "White flashing pair at threshold 27, outboard of the wing bars",
        purpose: "Runway end identifier lights — high-intensity white flashers that help acquire the threshold in cluttered city lighting.",
        icao: "Annex 14 Vol I §5.3.8 Runway threshold identification lights",
        dimensions: [
            { label: "Colour", value: "White, flashing" },
            { label: "Units", value: "2" },
        ],
        notes: "The 2017 AIP AD 2.14 extract does not explicitly list RTIL/REIL. airport-data.com lists REIL on 09/27. Shown as a teaching pair; treat presence at VABB as unconfirmed against the current eAIP. Lab flash is schematic.",
        footprint: endFp(RWY_0927, "27", 0, 8, 90),
    },
    {
        id: "sign.mand.0927",
        title: "Mandatory sign 09-27",
        kind: "sign",
        location: "N1 holding position, left of the taxiway facing the hold",
        purpose: "Red / white mandatory instruction: the runway you are about to enter.",
        icao: "Annex 14 Vol I §5.4.2 Mandatory instruction signs",
        dimensions: [
            { label: "Legend", value: "09-27" },
            { label: "Face", value: "White on red" },
        ],
        notes: "Installed at every runway/taxiway intersection. Combined with location sign N1 in a real array.",
        footprint: { x: HOLD_N1.x - 26, z: HOLD_N1.z, headingDeg: 0, length: 1.2, width: 3.2 },
    },
    {
        id: "sign.mand.cat2",
        title: "Mandatory CAT II holding-position signs",
        kind: "sign",
        location: "At each CAT II hold (example: N4, 90 m north of the centre line, east side)",
        purpose: "Marks the CAT II holding position for RWY 27. Aircraft must not pass in CAT II operations without clearance.",
        icao: "Annex 14 Vol I §5.4.2 / §5.2.10 Category I/II/III holding positions",
        dimensions: [
            { label: "Legend", value: "27 CAT II / 09 CAT II / 09-27 CAT II" },
            { label: "Face", value: "White on red" },
        ],
        notes: "Mandatory CAT II inscription paired with a yellow-on-black location sign at every CAT II holding position (§5.4.2 / §5.4.3). AIP 2017 lists only 27 as CAT II; 09 CAT II signs are schematic/approximate.",
        footprint: { x: 1180, z: -90, headingDeg: 0, length: 1.2, width: 4.4 },
    },
    {
        id: "sign.mand.noentry",
        title: "NO ENTRY sign",
        kind: "sign",
        location: "West of T2 apron / S taxiway stub (schematic)",
        purpose: "Mandatory prohibition — do not proceed. Used at one-way stubs and closed pavement.",
        icao: "Annex 14 Vol I §5.4.2 Mandatory instruction signs",
        dimensions: [
            { label: "Legend", value: "NO ENTRY" },
            { label: "Face", value: "White on red" },
        ],
        notes: "Placed on a stub that looks like a runway entrance but is not. Classic hot-spot mitigation.",
        footprint: { x: 620, z: 118, headingDeg: 90, length: 1.2, width: 3.6 },
    },
    {
        id: "sign.loc.n1",
        title: "Location sign N1",
        kind: "sign",
        location: "N1 holding position, yellow on black",
        purpose: "Identifies the taxiway you are on. Location signs are yellow inscription on black.",
        icao: "Annex 14 Vol I §5.4.3 Location signs",
        dimensions: [
            { label: "Legend", value: "N1" },
            { label: "Face", value: "Yellow on black" },
        ],
        notes: "Never used alone at a hold — always paired with the red mandatory runway sign.",
        footprint: { x: HOLD_N1.x + 26, z: HOLD_N1.z, headingDeg: 0, length: 1.2, width: 2.4 },
    },
    {
        id: "sign.dir.ne",
        title: "Direction sign N / E",
        kind: "sign",
        location: "Taxiway N at the N1 junction",
        purpose: "Black on yellow with arrows: continue on N or turn toward the east / runway connector.",
        icao: "Annex 14 Vol I §5.4.4 Direction/destination signs",
        dimensions: [
            { label: "Legend", value: "N ←  → E" },
            { label: "Face", value: "Black on yellow" },
        ],
        notes: "Information signs are yellow. A black-on-yellow arrow board is not a hold — it is routing.",
        footprint: { x: TAXI_N1.x, z: TAXI_N.z - 16, headingDeg: 90, length: 1.2, width: 4.8 },
    },
    {
        id: "bldg.t2",
        title: "Terminal 2 massing",
        kind: "building",
        location: "South of RWY 09/27, land-side of taxiway S",
        purpose: "Schematic stand-in for CSMIA Terminal 2. Not a photogrammetric model.",
        icao: "Not a visual aid — aerodrome obstacle / building restriction (Annex 14 §4)",
        dimensions: [
            { label: "Role", value: "Passenger terminal massing" },
            { label: "Position", value: "South of 09/27" },
        ],
        notes: "Block geometry only. Grok Runway Lab is not a digital twin and must not be used for real docking or hot-spot study.",
        footprint: { x: 380, z: 340, headingDeg: 90, length: 420, width: 160 },
    },
    {
        id: "bldg.tower",
        title: "Control tower",
        kind: "building",
        location: "South-west of T2 apron, overlooking both runways",
        purpose: "Visual control room with a view of RWY 09/27.",
        icao: "Annex 14 Vol I §1.4 / tower siting (operational, not a marking)",
        dimensions: [
            { label: "Cab height (schematic)", value: "~65 m" },
        ],
        notes: "The real VABB tower sits on the south campus. Height and exact grid are schematic.",
        footprint: { x: -40, z: 260, headingDeg: 0, length: 18, width: 18 },
    },
    {
        id: "bldg.hangars",
        title: "Maintenance hangars",
        kind: "building",
        location: "North of taxiway N",
        purpose: "MRO / GHA hangar massing and a small apron for parked jets.",
        icao: "Not a visual aid",
        dimensions: [{ label: "Count", value: "3 sheds" }],
        notes: "Block hangars only — no photo textures as 3D meshes.",
        footprint: { x: -80, z: -280, headingDeg: 90, length: 280, width: 80 },
    },
    {
        id: "bldg.windsock",
        title: "Windsock",
        kind: "building",
        location: "Near threshold 09, left of approach",
        purpose: "Surface wind direction and a crude speed cue (extension of the sleeve).",
        icao: "Annex 14 Vol I §5.1.1 Wind direction indicator",
        dimensions: [
            { label: "Pole", value: "Illuminated schematic" },
            { label: "Colour", value: "Orange / white bands" },
        ],
        notes: "A wind direction indicator is required at an aerodrome. The sleeve here weathervanes on a fixed lab breeze.",
        footprint: { x: -1500, z: -70, headingDeg: 0, length: 8, width: 8 },
    },
    {
        id: "bldg.jets",
        title: "Parked jets (block geometry)",
        kind: "building",
        location: "South apron between taxiway S and T2",
        purpose: "Scale reference. Three narrow-body silhouettes, boxes and cylinders only.",
        icao: "Not a visual aid",
        dimensions: [
            { label: "Type", value: "Schematic narrow-body" },
            { label: "Count", value: "3" },
        ],
        notes: "No photographic textures, no airline livery. They exist so walk-mode has something human-scaled beside the 60 m runway.",
        footprint: { x: 220, z: 230, headingDeg: 90, length: 180, width: 50 },
    },
    ...EXTRA_FEATURES,
];
export const FEATURE_BY_ID = new Map(FEATURES.map((f) => [f.id, f]));
export function featuresOfKind(kind) {
    return FEATURES.filter((f) => f.kind === kind);
}
const LAYER_OF = {
    marking: "markings",
    light: "lights",
    sign: "signs",
    building: "buildings",
    physical: "physical",
};
export function pickFeature(x, z, layers) {
    let best = null;
    let bestArea = Infinity;
    for (const f of FEATURES) {
        if (!layers[LAYER_OF[f.kind]])
            continue;
        const r = f.footprint;
        const { fx, fz, rx, rz } = headingVec(r.headingDeg);
        const dx = x - r.x;
        const dz = z - r.z;
        const along = dx * fx + dz * fz;
        const across = dx * rx + dz * rz;
        const pad = f.kind === "sign" ? 6 : f.kind === "light" ? 8 : 4;
        if (Math.abs(along) <= r.length / 2 + pad && Math.abs(across) <= r.width / 2 + pad) {
            const area = r.length * r.width;
            if (area < bestArea) {
                best = f;
                bestArea = area;
            }
        }
    }
    return best;
}
export function nearestFeature(x, z, layers) {
    let best = null;
    let bestD = Infinity;
    for (const f of FEATURES) {
        if (!layers[LAYER_OF[f.kind]])
            continue;
        const d = Math.hypot(f.footprint.x - x, f.footprint.z - z);
        if (d < bestD) {
            best = f;
            bestD = d;
        }
    }
    return best;
}
