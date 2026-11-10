/** VABB ICAO Visual Aids Lab: 1 unit = 1 metre, +Y up, −Z north, +X east. */

export const WORLD = {
  north: -1,
  unit: "m",
};

export const SOURCES = {
  annex: "ICAO Annex 14 Volume I, Aerodrome Design and Operations (8th/9th edition numbering). Chapter 3 physical characteristics; Chapter 5 visual aids (5.2 markings, 5.3 lights, 5.4 signs); Chapter 7 unserviceable-area chevrons.",
  aip: "AIP India, VABB AD 2.12 (physical characteristics), AD 2.13 (declared distances) and AD 2.14 (approach and runway lighting), 25 MAY 2017 extract of the official Airports Authority of India AIP. Confirm against the current eAIP at https://aim-india.aai.aero/ before any operational use.",
  eAip: "https://aim-india.aai.aero/eaip-v2-02-2025/eAIP/IN-AD%202.1VABB-en-GB.html",
};

/** Annex 14 §5.2.4 — number of threshold stripes vs runway width. */
export function thresholdStripeCount(widthM) {
  if (widthM >= 60) return 16;
  if (widthM >= 45) return 12;
  if (widthM >= 30) return 8;
  if (widthM >= 23) return 6;
  return 4;
}

/**
 * Annex 14 §5.2.5 / Table 5-1 — lateral spacing between the inner sides of
 * aiming-point (and matching TDZ) rectangles. VABB uses only 45 m and 60 m.
 */
export function aimingInnerSpacing(widthM) {
  return widthM >= 60 ? 22.5 : 18;
}

/** Annex 14 §5.2.5 / Table 5-1 — beginning of aiming-point marking vs LDA. */
export function aimingPointFromThreshold(ldaM) {
  if (ldaM < 800) return 150;
  if (ldaM < 1200) return 250;
  if (ldaM < 2400) return 300;
  return 400;
}

/** Annex 14 §5.2.6 — TDZ pair count vs LDA (or distance between thresholds). */
export function tdzPairCount(ldaM) {
  if (ldaM < 900) return 1;
  if (ldaM < 1200) return 2;
  if (ldaM < 1500) return 3;
  if (ldaM < 2400) return 4;
  return 6;
}

export const TDZ_STATIONS = [150, 300, 450, 600, 750, 900];

export const RWY_0927 = {
  id: "0927",
  pair: "09/27",
  length: 3448,
  width: 60,
  heading: 90,
  clWidth: 0.9,
  clLightSpacing: 30,
  shoulderM: 7.5,
  pcn: "100/F/A/W/T asphalt (AIP 2017); concrete ends noted as 150/R/C/W/T or 150/R/D/W/T",
  center: { x: 0, z: 0 },
  ends: {
    "09": {
      name: "09",
      heading: 90,
      trueHeading: 89.52,
      displaced: 142,
      sign: -1,
      cat: "CAT I",
      papiDeg: 3.0,
      papiSide: "right",
      papiMehtFt: 73.93,
      papiSitingM: 300,
      papiSitingNote: "schematic/approximate — 2017 AIP extract lists MEHT 73.93 ft and RIGHT/3.00° but not the published distance from THR 09",
      alsM: 540,
      tdzLightsM: 0,
      declared: { tora: 3188, toda: 3188, asda: 3188, lda: 3048 },
      publishedLengthM: 3188,
      strip: { length: 3308, width: 300 },
      resa: { length: 240, width: 120 },
      preThrEdgeRedM: 140,
    },
    "27": {
      name: "27",
      heading: 270,
      trueHeading: 269.52,
      displaced: 482,
      sign: 1,
      cat: "CAT II",
      papiDeg: 3.0,
      papiSide: "left",
      papiMehtFt: 73.93,
      papiSitingM: 300,
      papiSitingNote: "schematic/approximate — 2017 AIP extract lists MEHT 73.93 ft and LEFT/3.00° but not the published distance from THR 27",
      alsM: 900,
      tdzLightsM: 900,
      declared: { tora: 3448, toda: 3448, asda: 3448, lda: 2965 },
      publishedLengthM: 3448,
      strip: { length: 3568, width: 300 },
      resa: { length: 240, width: 120 },
      preThrEdgeRedM: 482,
    },
  },
};

export const RUNWAYS = { "0927": RWY_0927 };

export const TAXI_N = { z: -96, x0: -1720, x1: 1720, width: 23 };
export const TAXI_S = { z: 96, x0: -1600, x1: 1680, width: 23 };
export const TAXI_N1 = { x: -1280, z0: -96, z1: -30, width: 23 };

/** Pattern A hold on N1, 75 m north of RWY 09/27 centre line (Table 3-2, code 4 CAT I). */
export const HOLD_N1 = { x: -1280, z: -75, distFromRwyCl: 75 };

/** Pattern B / CAT II hold, 90 m north of RWY 09/27 (Table 3-2, code 4 CAT II/III). */
export const HOLD_CAT2 = { x: 1180, z: -90, distFromRwyCl: 90 };

export function headingVec(headingDeg) {
  const h = (headingDeg * Math.PI) / 180;
  const fx = Math.sin(h);
  const fz = -Math.cos(h);
  const rx = Math.cos(h);
  const rz = Math.sin(h);
  return { fx, fz, rx, rz, yaw: -h };
}

export function rwyPos(rwy, along, across, y = 0) {
  const { fx, fz, rx, rz } = headingVec(rwy.heading);
  return {
    x: rwy.center.x + fx * along + rx * across,
    y,
    z: rwy.center.z + fz * along + rz * across,
  };
}

export function rwyYaw(rwy) {
  return headingVec(rwy.heading).yaw;
}

/** Along-station of a threshold, from runway geometric centre. */
export function thresholdAlong(rwy, endName) {
  const end = rwy.ends[endName];
  return end.sign * (rwy.length / 2 - end.displaced);
}

export function physicalAlong(rwy, sign) {
  return sign * (rwy.length / 2);
}

/** +1 if landing direction is +along (first-named end). */
export function landingSign(end) {
  return -end.sign;
}

export function endOf(name) {
  const end = RWY_0927.ends[name];
  if (!end) {
    throw new Error(`Unknown runway end: ${name}`);
  }
  return { rwy: RWY_0927, end };
}

export function thresholdWorld(name, across = 0, y = 0) {
  const { rwy, end } = endOf(name);
  return rwyPos(rwy, thresholdAlong(rwy, end.name), across, y);
}

export function containsXZ(rect, x, z, pad = 4) {
  const { fx, fz, rx, rz } = headingVec(rect.headingDeg);
  const dx = x - rect.x;
  const dz = z - rect.z;
  const along = dx * fx + dz * fz;
  const across = dx * rx + dz * rz;
  return Math.abs(along) <= rect.length / 2 + pad && Math.abs(across) <= rect.width / 2 + pad;
}

export function rectArea(r) {
  return r.length * r.width;
}

export const WALK_START = {
  ...thresholdWorld("09", 0, 1.7),
  yaw: -Math.PI / 2,
};

export const INSPECT_START = {
  position: [210, 260, 520],
  target: [0, 0, 0],
};

export function fp(rwy, along, across, length, width) {
  const p = rwyPos(rwy, along, across);
  return { x: p.x, z: p.z, headingDeg: rwy.heading, length, width };
}

export function endFp(rwy, endName, distPastThr, length, width, across = 0) {
  const end = rwy.ends[endName];
  const along = thresholdAlong(rwy, endName) + landingSign(end) * distPastThr;
  return fp(rwy, along, across, length, width);
}
