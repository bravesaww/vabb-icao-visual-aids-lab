import {
  RWY_0927,
  TAXI_N,
  TAXI_S,
  TAXI_N1,
  TAXI_WIDTH,
  APRON_S,
  HOLD_N1,
  HOLD_CAT2,
  physicalAlong,
  fp,
  endFp,
} from "./world";
import { TAXI_SHOULDER_M } from "./junctions";

function declared(rwy, endName) {
  const end = rwy.ends[endName];
  const d = end.declared;
  return {
    id: `phys.declared.${endName}`,
    title: `Declared distances RWY ${endName}`,
    kind: "physical",
    location: `RWY ${endName} — AIP India AD 2.13 (25 MAY 2017 extract)`,
    purpose:
      "TORA, TODA, ASDA and LDA are the four declared distances used for take-off and landing performance. TORA = TODA = ASDA on every VABB runway in that AIP, so no stopway or clearway was declared then.",
    icao: "AIP India VABB AD 2.13; Annex 14 Vol I declared-distance definitions",
    dimensions: [
      { label: "TORA", value: `${d.tora} m` },
      { label: "TODA", value: `${d.toda} m` },
      { label: "ASDA", value: `${d.asda} m` },
      { label: "LDA", value: `${d.lda} m` },
      { label: "Displaced threshold (lab)", value: `${end.displaced} m` },
      { label: "Published length this direction (AIP AD 2.12 note)", value: `${end.publishedLengthM} m × ${rwy.width} m` },
    ],
    notes:
      `LDA ${d.lda} m versus physical length ${rwy.length} m minus ${end.displaced} m displacement is consistent with the 2017 AIP extract (1–2 m rounding).`,
    footprint: endFp(rwy, endName, (rwy.length - end.displaced) / 2, Math.min(d.lda, rwy.length), rwy.width),
  };
}

function resa(rwy, endName) {
  const end = rwy.ends[endName];
  return {
    id: `phys.resa.${endName}`,
    title: `RESA RWY ${endName}`,
    kind: "physical",
    location: `Beyond the ${endName} physical end (drawn next to the pavement in this schematic)`,
    purpose:
      "A runway end safety area reduces damage if an aeroplane undershoots or overruns. It begins at the end of the runway strip.",
    icao: "Annex 14 Vol I §3.5 Runway end safety areas",
    dimensions: [
      { label: "Published RESA (AIP AD 2.12, 2017)", value: `${end.resa.length} × ${end.resa.width} m` },
      { label: "Minimum length (§3.5, code 3/4)", value: "90 m" },
      { label: "Recommended length (§3.5, code 3/4)", value: "240 m" },
      { label: "Width (§3.5)", value: "At least twice the runway width" },
    ],
    notes:
      "Annex 14 places the RESA after the 60 m strip extension beyond the runway (code 3/4). This lab draws the published box immediately beyond the physical end so it is easy to click — that placement is schematic/approximate.",
    footprint: fp(
      rwy,
      physicalAlong(rwy, end.sign) + end.sign * (end.resa.length / 2),
      0,
      end.resa.length,
      end.resa.width,
    ),
  };
}

export const EXTRA_FEATURES = [
  {
    id: "mark.hold.patternB",
    title: "Runway-holding position Pattern B (CAT II)",
    kind: "marking",
    location: "Every connector, 120 m from the RWY 09/27 centre line — the hold farther from the runway",
    purpose:
      "Pattern B is the ladder marking used at a CAT II/III holding position when a second hold is provided. Aircraft stop short of it in CAT II operations unless cleared.",
    icao: "Annex 14 Vol I 5.2.10.3 and 5.2.10.6 / Figure 5-8 Pattern B2; Figure 5-32 Distance Y; 3.12.6 and Table 3-2 note b",
    dimensions: [
      { label: "Pattern", value: "B2 — two 0.3 m lines with a 1.5 m space (2.10 m), joined by rungs" },
      { label: "Distance from runway CL", value: "120 m (schematic Distance Y — edge of the ILS/MLS critical/sensitive area)" },
      { label: "Rung pitch", value: "0.9 m / 0.9 m (from Figure 5-8 labels; not stated in the Annex text — schematic/approximate)" },
    ],
    notes:
      "Table 3-2 gives the same 90 m minimum for CAT I and for CAT II/III on a code-4 precision runway. The farther hold is set at the edge of the ILS/MLS critical/sensitive area (Figure 5-32 Distance Y; 3.12.6 and Table 3-2 note b). 120 m is schematic/approximate — it is not taken from a VABB eAIP sensitive-area figure — and is chosen so Pattern B stays on the constant-width stub, short of the code-C fillets. 5.2.10.8 (CAT II/III painted on the surface when Pattern B would exceed 60 m) does not apply: the taxiway is 23 m wide.",
    footprint: { x: HOLD_CAT2.x, z: HOLD_CAT2.z, headingDeg: 0, length: 4, width: 23 },
  },
  {
    id: "mark.enhanced.cl.n1",
    title: "Enhanced taxiway centre line (N1)",
    kind: "marking",
    location: "On each stub from Pattern A away from the runway (illustrated at N1), including the gap between Pattern A and Pattern B",
    purpose: "Dashed yellow lines either side of the taxiway centre line warn that a runway-holding position is ahead.",
    icao: "Annex 14 Vol I §5.2.8 Enhanced taxiway centre line marking",
    dimensions: [
      { label: "Length prior to the hold", value: "47 m" },
      { label: "Line width", value: "0.15 m" },
      { label: "Inner edge from taxiway CL", value: "0.15 m" },
      { label: "Dash / gap", value: "As shown in the Annex figure (lab uses 3 m / 3 m — schematic/approximate)" },
    ],
    notes:
      "5.2.8.9 a: the marking extends from Pattern A up to 47 m away from the runway. Pattern B is 30 m from Pattern A, so 5.2.8.9 b applies: the dashes are interrupted 0.9 m before and after Pattern B, then continue for at least three dashes or 47 m from the start, whichever is greater. Junction turn lines also sit inside that 47 m; dashes within 1.5 m of a turn line are omitted and at least three dashes continue beyond (5.2.8.9 c). Dash / gap 3 m is taken from Figure 5-7 and is labelled schematic/approximate in the dimensions.",
    footprint: { x: TAXI_N1.x, z: -105, headingDeg: 0, length: 50, width: 4 },
  },
  {
    id: "mark.info.paint.n",
    title: "Information marking N",
    kind: "marking",
    location: "Taxiway N east of the N1 junction, beside the centre line",
    purpose: "Painted location information on the pavement — yellow on black (or black on yellow on a light surface).",
    icao: "Annex 14 Vol I §5.2.17 Information marking",
    dimensions: [
      { label: "Inscription", value: "N" },
      { label: "Colours", value: "Yellow on black, or black on yellow" },
    ],
    notes: "Repeats or supplements an information sign at a complex intersection.",
    footprint: { x: TAXI_N1.x + 75, z: TAXI_N.z - 5, headingDeg: 90, length: 8, width: 8 },
  },
  {
    id: "mark.taxi.edge",
    title: "Taxi side stripe marking",
    kind: "marking",
    location: "Along the edge of the load-bearing pavement of taxiways N, S, the runway connectors and the apron joins",
    purpose:
      "Marks the boundary between the load-bearing taxiway and the non-load-bearing shoulder, so an aircraft is not taxied onto the weaker surface.",
    icao: "Annex 14 Vol I 7.2 Non-load-bearing surfaces (7.2.1 Standard; 7.2.2 and 7.2.3 Recommendations). This is not §5.2.17 (that paragraph is Information marking).",
    dimensions: [
      { label: "Style (7.2.3)", value: "A pair of solid yellow lines, each 15 cm wide, spaced 15 cm apart" },
      { label: "Position (7.2.2)", value: "Along the edge of the load-bearing pavement; the outer edge of the marking approximately on that edge" },
      { label: "Taxiway load-bearing width (lab)", value: "23 m (3.9.4 for OMGWS 9–15 m / code E–F)" },
    ],
    notes: "The lines follow every fillet and stop at junction mouths and apron joins (no side stripe painted across pavement). The 7.2.3 Note points to ADM Doc 9157 Part 4 for optional transverse stripes at an intersection; this lab does not paint those (they are not required by the Annex).",
    footprint: { x: 0, z: TAXI_N.z, headingDeg: 90, length: TAXI_N.x1 - TAXI_N.x0, width: 23 },
  },
  {
    id: "phys.shoulder.taxi",
    title: "Taxiway shoulders (non-load-bearing)",
    kind: "physical",
    location: "7.5 m each side of taxiways N, S, the runway connectors and the free edges of the aprons",
    purpose: "A prepared surface beside the taxiway that resists erosion and engine ingestion, not meant to carry aircraft loads.",
    icao: "Annex 14 Vol I 3.10 Taxiway shoulders (Recommendations 3.10.1 and 3.10.2); boundary marked per 7.2",
    dimensions: [
      { label: "Shoulder width (lab)", value: "7.5 m each side" },
      { label: "Overall width with the 23 m taxiway", value: "38 m (the 3.10.1 figure for code letter E)" },
      { label: "Code C minimum overall (3.10.1)", value: "25 m — already exceeded by the 23 m pavement alone" },
    ],
    notes: "The load-bearing taxiway stays 23 m (code E–F width). Shoulders are a lighter colour so they can be distinguished from the full-strength pavement, which is what 7.2.1 requires to be marked. Fillets remain sized for a code-C A320; a larger aeroplane would need bigger fillets. Shoulder width is schematic/approximate.",
    footprint: { x: 0, z: TAXI_N.z, headingDeg: 90, length: TAXI_N.x1 - TAXI_N.x0, width: 38 },
  },
  {
    id: "mark.taxi.junction",
    title: "Taxiway junctions and fillets",
    kind: "marking",
    location: "Every connector / parallel junction (N1–N4, S1–S3, end links), the runway corners of each stub, and the apron joins",
    purpose:
      "Curved yellow turn lines for each turning movement, with paved fillets so the main gear of a code-C A320 keeps its wheel clearance while the cockpit stays over the line. A larger aeroplane would need bigger fillets.",
    icao: "Annex 14 Vol I 3.9.3 (Standard: wheel clearance), 3.9.5 and 3.9.6 (Recommendations: curves and fillets), 5.2.8.6 (Recommendation: centre line on curves); ADM Doc 9157 Part 2 guidance",
    dimensions: [
      { label: "Turn line radius (schematic)", value: "45 m at taxiway junctions; 36 m lead-on/off onto the runway" },
      { label: "Design aeroplane (approximate)", value: "Code C / A320: OMGWS 8.95 m (track 7.59 m plus tyre), cockpit-to-main-gear 16.5 m, wheel base 12.6 m" },
      { label: "Wheel clearance kept", value: "3 m (3.9.3: OMGWS 6 m up to but not including 9 m; 3 m on straights, and 3 m on curves because the A320 wheel base is under 18 m)" },
      { label: "Apron-corner fillets (schematic)", value: "R 22 m" },
    ],
    notes:
      "Fillet outlines are computed, not taken from a VABB chart: the main gear is tracked as a pursuit curve behind a cockpit that follows each turn line in both directions, and the pavement is widened wherever the outer main wheel would come within 3 m of the edge. Sized for a code-C A320; a code-E or code-F aeroplane would need bigger fillets. The straight taxiway width stays 23 m (the 3.9.4 Recommendation for OMGWS 9–15 m / code E–F) — a code-C straight width would be 15 m — so the fillets only add what the A320 needs beyond that already-wide strip. All sizes here are schematic/approximate.",
    footprint: { x: -400, z: -140, headingDeg: 0, length: 50, width: 80 },
  },
  {
    id: "mark.intermediate.hold",
    title: "Intermediate holding position",
    kind: "marking",
    location: "Across taxiway N, west of N1 (schematic)",
    purpose: "A single dashed yellow line across the taxiway, used where aircraft hold for traffic but not for a runway.",
    icao: "Annex 14 Vol I §5.2.11 Intermediate holding position marking",
    dimensions: [
      { label: "Style", value: "A single broken yellow line" },
      { label: "Line width", value: "0.30 m typical (3D slightly overscale)" },
      { label: "Dash / gap (schematic)", value: "1 m / 1 m, across the full taxiway width" },
    ],
    notes: "Distinct from Pattern A/B runway-holding markings. Drawn across taxiway N (it was previously drawn lengthwise along the centre line by mistake). Placement on N is schematic; at a taxiway/taxiway intersection 5.2.11.3 would place it clear of the intersecting taxiway.",
    footprint: { x: -800, z: TAXI_N.z, headingDeg: 0, length: 4, width: 23 },
  },
  {
    id: "mark.chevron.blast",
    title: "Blast-pad / unusable-pavement chevrons",
    kind: "marking",
    location: "Teaching pad immediately west of the RWY 09 physical end",
    purpose:
      "Yellow chevrons mark pre-threshold or blast-pad pavement that aircraft must not use, even for taxi or take-off. They point toward the runway.",
    icao: "Annex 14 Vol I Chapter 7 — yellow chevrons on unusable pre-threshold pavement",
    dimensions: [
      { label: "Colour", value: "Yellow" },
      { label: "Recommended trigger", value: "Pre-threshold pavement longer than 60 m that aircraft should not use" },
      { label: "Chevron geometry", value: "Annex figure (lab proportions are schematic/approximate)" },
      { label: "VABB stopway / clearway", value: "None in the 2017 AIP extract (TORA = TODA = ASDA)" },
    ],
    notes:
      "VABB displaced thresholds use white arrows because that pavement remains available for take-off. This yellow-chevron pad is a teaching schematic only.",
    footprint: fp(RWY_0927, -(3448 / 2) - 40, 0, 80, 60),
  },
  {
    id: "light.stopbar.n1",
    title: "Stop bars (Pattern A and Pattern B)",
    kind: "light",
    location: "Across every connector, just on the taxiway side of each Pattern A and Pattern B holding-position marking (illustrated at N1)",
    purpose:
      "A controllable red stop bar at the runway-holding position. When the bar is on, taxiway centre-line lights beyond it are extinguished; when those lights are on, the bar is off.",
    icao: "Annex 14 Vol I 5.3.20.1, 5.3.20.2, 5.3.20.4–5.3.20.8 and 5.3.20.12",
    dimensions: [
      { label: "Colour / direction", value: "Red, unidirectional toward the approaching aircraft (5.3.20.7)" },
      { label: "Spacing", value: "No more than 3 m across the taxiway (5.3.20.5)" },
      { label: "Elevated ends", value: "A pair of elevated red lights at each end, not less than 3 m from the taxiway edge (5.3.20.6 Recommendation / 5.3.20.4)" },
    ],
    notes: "5.3.20.1 requires a stop bar at every runway-holding position used in RVR less than 550 m, so both Pattern A and Pattern B have one. 5.3.20.2: only one bar is lit at an intersection at a time — pick A or B in the HUD, or click a bar. The Bars ON/OFF control is the clearance: ON lights the operational bar and extinguishes lead-on lights beyond it for the whole path onto the runway (5.3.20.12 c asks for at least 90 m; d interlocks the two circuits). The Stop chip only shows or hides the fixtures. The same layout is repeated on every connector, including the end links.",
    footprint: { x: HOLD_N1.x, z: HOLD_N1.z, headingDeg: 0, length: 4, width: 23 },
  },
  {
    id: "light.reil.09",
    title: "REIL / RTIL threshold 09",
    kind: "light",
    location: "White flashing pair at threshold 09, outboard of the wing bars",
    purpose: "Runway threshold identification lights — flashing white, one each side of the threshold.",
    icao: "Annex 14 Vol I §5.3.8 Runway threshold identification lights",
    dimensions: [
      { label: "Colour / rate", value: "White, 60–120 flashes per minute, simultaneous" },
      { label: "Offset", value: "About 10 m outboard of each edge-light row" },
    ],
    notes:
      "The 2017 AIP AD 2.14 extract does not explicitly list RTIL/REIL. airport-data.com lists REIL on 09/27. Treat presence at VABB as unconfirmed against the current eAIP.",
    footprint: endFp(RWY_0927, "09", 0, 8, 90),
  },
  {
    id: "sign.loc.n",
    title: "Location sign N",
    kind: "sign",
    location: "Taxiway N, east of the N1 junction",
    purpose: "Yellow-on-black location sign identifying taxiway N.",
    icao: "Annex 14 Vol I §5.4.3 Location signs",
    dimensions: [
      { label: "Legend", value: "N" },
      { label: "Face", value: "Yellow inscription on black" },
      { label: "Inscription height (Table 5-5, code 3/4)", value: "300, 400 or 800 mm" },
    ],
    notes: "A location sign may stand alone on a long straight taxiway, or combine with a direction sign at an intersection.",
    footprint: { x: -1100, z: TAXI_N.z - 26, headingDeg: 90, length: 1.2, width: 2.0 },
  },
  {
    id: "sign.loc.s",
    title: "Location sign S",
    kind: "sign",
    location: "West of the T2 apron, just south of taxiway S (moved off the apron pavement)",
    purpose: "Yellow-on-black location sign identifying taxiway S.",
    icao: "Annex 14 Vol I §5.4.3 Location signs",
    dimensions: [
      { label: "Legend", value: "S" },
      { label: "Face", value: "Yellow on black" },
    ],
    notes: "Same colour rule as N and N1 — yellow inscription, black background.",
    footprint: { x: APRON_S.x - APRON_S.width / 2 - 26, z: TAXI_S.z + TAXI_WIDTH / 2 + TAXI_SHOULDER_M + 6, headingDeg: 90, length: 1.2, width: 2.0 },
  },
  {
    id: "sign.dest.t2",
    title: "Destination sign T2",
    kind: "sign",
    location: "East of the T2 apron, just south of taxiway S (moved off the apron pavement)",
    purpose: "Black-on-yellow destination information (terminal, cargo, apron, etc.).",
    icao: "Annex 14 Vol I §5.4.3 Information signs — destination signs",
    dimensions: [
      { label: "Legend", value: "T2 →" },
      { label: "Face", value: "Black on yellow" },
    ],
    notes: "Destination signs use the same yellow information-sign face as direction signs, but name a facility rather than a taxiway.",
    footprint: { x: APRON_S.x + APRON_S.width / 2 + 26, z: TAXI_S.z + TAXI_WIDTH / 2 + TAXI_SHOULDER_M + 6, headingDeg: 90, length: 1.2, width: 3.6 },
  },
  {
    id: "sign.exit.n1",
    title: "Runway exit sign N1",
    kind: "sign",
    location: "North side of RWY 09/27, prior to the N1 exit (schematic)",
    purpose: "Identifies an upcoming runway exit, on the same side as the exit, with the designator and an arrow.",
    icao: "Annex 14 Vol I §5.4.3 Information signs — runway exit signs",
    dimensions: [
      { label: "Legend", value: "N1 ←" },
      { label: "Face", value: "Black on yellow" },
      { label: "Distance from runway edge (Table 5-6, code 3/4)", value: "8–15 m to the near side of the sign" },
    ],
    notes: "Placed before the exit, on the exit side, so a landing or rolling-out crew can plan the turn-off.",
    footprint: { x: HOLD_N1.x + 80, z: -42, headingDeg: 90, length: 1.2, width: 3.2 },
  },
  {
    id: "sign.info.apron",
    title: "Information sign APN",
    kind: "sign",
    location: "South apron / S taxiway (schematic)",
    purpose: "General information sign — black on yellow.",
    icao: "Annex 14 Vol I §5.4.3 Information signs",
    dimensions: [
      { label: "Legend", value: "APN" },
      { label: "Face", value: "Black on yellow" },
    ],
    notes: "Colour rule: red/white = mandatory; yellow/black = information; yellow on black = location (you are here).",
    footprint: { x: 480, z: 150, headingDeg: 90, length: 1.2, width: 3.2 },
  },
  {
    id: "phys.rwy.0927",
    title: "RWY 09/27 physical characteristics",
    kind: "physical",
    location: "Primary east–west runway",
    purpose: "Published length, width, shoulders and code for the main instrument runway.",
    icao: "Annex 14 Vol I Chapter 3 (Table 3-1 width; §3.2 shoulders); AIP India VABB AD 2.12",
    dimensions: [
      { label: "Lab / original project length × width", value: "3448 × 60 m" },
      { label: "AIP AD 2.12 note, RWY 27", value: "3448 × 60 m" },
      { label: "AIP AD 2.12 note, RWY 09", value: "3188 × 60 m (matches TORA 09)" },
      { label: "Displaced thresholds", value: "09: 142 m; 27: 482 m" },
      { label: "Shoulders (AIP 2017)", value: "7.5 m each side" },
      { label: "True bearings (AIP 2017)", value: "89.52° / 269.52°" },
      { label: "Aerodrome reference code", value: "4F (AIP AD 2.2)" },
      { label: "Surface / PCN (AIP 2017)", value: "Asphalt 100/F/A/W/T; concrete ends noted separately" },
    ],
    notes:
      "OurAirports lists 09/27 as 3509 × 60 m — that figure is not used here. The original project and the 2017 AIP extract agree on 3448 × 60 m for the full 27 direction.",
    footprint: fp(RWY_0927, 0, 0, 3448, 60),
  },
  {
    id: "phys.strip.0927",
    title: "RWY 09/27 strip",
    kind: "physical",
    location: "Graded strip centred on 09/27",
    purpose: "The strip includes the runway and is cleared and graded to reduce damage to an aeroplane that runs off it.",
    icao: "Annex 14 Vol I §3.4 Runway strips",
    dimensions: [
      { label: "AIP strip, 09 direction", value: "3308 × 300 m (3188 + 60 + 60)" },
      { label: "AIP strip, 27 direction", value: "3568 × 300 m (3448 + 60 + 60)" },
      { label: "Lateral extent (§3.4.3, precision code 3/4)", value: "150 m each side of CL (300 m total)" },
      { label: "Beyond each end (§3.4.2, code 2/3/4)", value: "60 m" },
    ],
    notes: "The 3D plane uses the longer 3568 × 300 m box so the full 27-direction strip is visible.",
    footprint: fp(RWY_0927, 0, 0, 3568, 300),
  },
  {
    id: "phys.shoulder.0927",
    title: "RWY 09/27 shoulders",
    kind: "physical",
    location: "7.5 m each side of the 60 m runway",
    purpose: "Shoulders protect the runway edge and provide a surface for vehicles and an aeroplane that runs off the pavement.",
    icao: "Annex 14 Vol I §3.2 Runway shoulders",
    dimensions: [
      { label: "Shoulder width (AIP 2017)", value: "7.5 m each side" },
      { label: "Overall width", value: "75 m" },
    ],
    notes: "09/27 is already 60 m wide, which meets the 3.2.2 Recommendation of an overall 60 m for code D/E (and for code F with two- or three-engined aeroplanes). The published 7.5 m shoulders bring the overall width to 75 m, the 3.2.2 figure for code F with four or more engines. They are a lighter colour than the runway so the load-bearing edge (marked by the 5.2.7 side stripe) is easy to see. The 7.2 Note says runway sides are marked per 5.2.7, not with a taxi side stripe.",
    footprint: fp(RWY_0927, 0, 0, 3448, 75),
  },
  {
    id: "phys.slopes.0927",
    title: "Runway slopes (schematic)",
    kind: "physical",
    location: "RWY 09/27 — no surveyed profile is modelled",
    purpose: "Annex 14 limits overall and local longitudinal slope and requires a transverse slope that sheds water.",
    icao: "Annex 14 Vol I §3.1.12–3.1.19 Slopes on runways",
    dimensions: [
      { label: "Overall longitudinal (code 3/4)", value: "Not more than 1 %" },
      { label: "Maximum local longitudinal", value: "1.25 % (code 4); 1.5 % (code 3)" },
      { label: "Transverse (typical)", value: "1.0 % to 1.5 %" },
      { label: "VABB surveyed profile", value: "Not modelled — schematic/approximate" },
    ],
    notes: "The lab pavement is drawn flat. Third-party slope quotes are not treated as AIP figures.",
    footprint: fp(RWY_0927, 0, 0, 3448, 60),
  },
  declared(RWY_0927, "09"),
  declared(RWY_0927, "27"),
  resa(RWY_0927, "09"),
  resa(RWY_0927, "27"),
];
