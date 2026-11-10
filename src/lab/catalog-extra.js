import {
  RWY_0927,
  TAXI_N,
  TAXI_S,
  TAXI_N1,
  HOLD_N1,
  HOLD_CAT2,
  physicalAlong,
  fp,
  endFp,
} from "./world";

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
    location: "90 m north of RWY 09/27 centre line, east side (schematic CAT II hold for 27)",
    purpose:
      "Pattern B is the ladder marking used where more than one runway-holding position is provided (CAT I / II / III). Pattern A remains nearest the runway; Pattern B marks the intermediate CAT II/III position.",
    icao: "Annex 14 Vol I §5.2.10 / Figure 5-8 Pattern B; Table 3-2",
    dimensions: [
      { label: "Pattern", value: "B — two parallel yellow lines joined by perpendicular bars" },
      { label: "Distance from runway CL", value: "90 m (Table 3-2, code 4, CAT II or III)" },
      { label: "Line geometry", value: "Figure 5-8 Pattern B (3D ladder is schematic/approximate)" },
    ],
    notes:
      "Table 3-2 sets 90 m as the minimum centre-line distance for a code-4 CAT II/III hold; the real ILS critical/sensitive area may sit further back.",
    footprint: { x: HOLD_CAT2.x, z: HOLD_CAT2.z, headingDeg: 0, length: 10, width: 23 },
  },
  {
    id: "mark.enhanced.cl.n1",
    title: "Enhanced taxiway centre line (N1)",
    kind: "marking",
    location: "On the approach to the N1 Pattern A hold",
    purpose: "Dashed yellow lines either side of the taxiway centre line warn that a runway-holding position is ahead.",
    icao: "Annex 14 Vol I §5.2.8 Enhanced taxiway centre line marking",
    dimensions: [
      { label: "Length prior to the hold", value: "47 m" },
      { label: "Line width", value: "0.15 m" },
      { label: "Inner edge from taxiway CL", value: "0.15 m" },
      { label: "Dash / gap", value: "As shown in the Annex figure (lab uses 3 m / 3 m — schematic/approximate)" },
    ],
    notes:
      "Annex 14 extends the marking 47 m prior to the holding position. N1 is only about 21 m from taxiway N in this schematic, so the remainder is shown along N approaching the junction (schematic layout).",
    footprint: { x: TAXI_N1.x, z: -85, headingDeg: 0, length: 50, width: 4 },
  },
  {
    id: "mark.mandatory.paint.n1",
    title: "Mandatory instruction marking 09-27",
    kind: "marking",
    location: "Painted on N1 short of the Pattern A hold",
    purpose: "A pavement-level supplement (or substitute) for a mandatory instruction sign: white inscription on a red background.",
    icao: "Annex 14 Vol I §5.2.16 Mandatory instruction marking",
    dimensions: [
      { label: "Inscription", value: "09-27 (white on red)" },
      { label: "Character height (code 3/4)", value: "4 m typical" },
    ],
    notes: "Used where a sign cannot be installed or to supplement one. Never a replacement for the holding-position marking itself.",
    footprint: { x: TAXI_N1.x, z: -82, headingDeg: 0, length: 8, width: 16 },
  },
  {
    id: "mark.info.paint.n",
    title: "Information marking N",
    kind: "marking",
    location: "Taxiway N near the N1 junction",
    purpose: "Painted location information on the pavement — yellow on black (or black on yellow on a light surface).",
    icao: "Annex 14 Vol I §5.2.17 Information marking",
    dimensions: [
      { label: "Inscription", value: "N" },
      { label: "Colours", value: "Yellow on black, or black on yellow" },
    ],
    notes: "Repeats or supplements an information sign at a complex intersection.",
    footprint: { x: TAXI_N1.x + 40, z: TAXI_N.z, headingDeg: 90, length: 8, width: 8 },
  },
  {
    id: "mark.taxi.edge",
    title: "Taxiway edge markings (double yellow)",
    kind: "marking",
    location: "Along both edges of taxiways N, S and N1",
    purpose:
      "A double continuous yellow line is widely used to show the taxiway edge. Annex 14 §5.2 specifies a taxiway centre line (§5.2.8) but has no separate edge-marking paragraph comparable to FAA AC 150/5340-1.",
    icao: "Not a dedicated Annex 14 §5.2 paragraph — common State practice (schematic)",
    dimensions: [
      { label: "Style", value: "Two continuous yellow lines (schematic 0.15 m, 0.15 m apart)" },
      { label: "Taxiway width (lab)", value: "23 m (schematic)" },
    ],
    notes: "Included so students can compare centre-line vs edge cues. Treat geometry as schematic/approximate.",
    footprint: { x: 0, z: TAXI_N.z, headingDeg: 90, length: TAXI_N.x1 - TAXI_N.x0, width: 23 },
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
    ],
    notes: "Distinct from Pattern A/B runway-holding markings. Placement on N is schematic.",
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
    title: "Stop bar N1",
    kind: "light",
    location: "Red in-pavement lights across N1 at the Pattern A hold",
    purpose:
      "A controllable red stop bar at the runway-holding position. Taxiway centre-line lights beyond the bar are extinguished while the bar is on.",
    icao: "Annex 14 Vol I §5.3.20 Stop bars (9th ed., 2022)",
    dimensions: [
      { label: "Colour", value: "Red, unidirectional toward the approaching aircraft" },
      { label: "Spacing", value: "3 m across the taxiway" },
      { label: "Elevated ends", value: "Additional elevated red lights at each edge (recommended)" },
    ],
    notes: "Shown permanently on as a teaching pattern — a real stop bar is selectable by ATC.",
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
    location: "Taxiway S, south of 09/27",
    purpose: "Yellow-on-black location sign identifying taxiway S.",
    icao: "Annex 14 Vol I §5.4.3 Location signs",
    dimensions: [
      { label: "Legend", value: "S" },
      { label: "Face", value: "Yellow on black" },
    ],
    notes: "Same colour rule as N and N1 — yellow inscription, black background.",
    footprint: { x: 200, z: TAXI_S.z + 26, headingDeg: 90, length: 1.2, width: 2.0 },
  },
  {
    id: "sign.dest.t2",
    title: "Destination sign T2",
    kind: "sign",
    location: "Taxiway S, pointing toward the Terminal 2 apron",
    purpose: "Black-on-yellow destination information (terminal, cargo, apron, etc.).",
    icao: "Annex 14 Vol I §5.4.3 Information signs — destination signs",
    dimensions: [
      { label: "Legend", value: "T2 →" },
      { label: "Face", value: "Black on yellow" },
    ],
    notes: "Destination signs use the same yellow information-sign face as direction signs, but name a facility rather than a taxiway.",
    footprint: { x: 280, z: TAXI_S.z + 26, headingDeg: 90, length: 1.2, width: 3.6 },
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
    notes: "09/27 is already 60 m wide; the published 7.5 m shoulders are additional to the §3.2 60 m overall-width aim.",
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
