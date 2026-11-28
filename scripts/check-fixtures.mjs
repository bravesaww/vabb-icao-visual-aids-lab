/**
 * Fail if an elevated fixture (PAPI, signs, elevated stop-bar ends, RGL,
 * taxiway-edge lights) sits on load-bearing taxiway / runway / apron / fillet
 * pavement or on a shoulder. Taxiway-edge lights are allowed within 0.4 m of
 * an edge line or up to 3 m outside it (Annex 14 5.3.18.6).
 */
import {
  RWY_0927, TAXI_N, TAXI_S, TAXI_WIDTH, LINKS, APRON_S, APRON_N, TAXI_N1,
  holdOf, runwayDesignationLegend, catHoldLegend,
  rwyPos, thresholdAlong, landingSign, headingVec,
} from "../src/lab/world.js";
import { holdZ } from "../src/lab/taxiways.js";
import {
  stubHalfWidth, taxiwayEdges, taxiwayShoulderPolys, apronShoulderPolys,
  runwayShoulderBands, junctionGeometry, TAXI_SHOULDER_M, apronFreeEdges,
} from "../src/lab/junctions.js";

const RWY_SHOULDER_M = RWY_0927.shoulderM;
const half = RWY_0927.width / 2;

function pip(poly, x, z) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].x, zi = poly[i].z, xj = poly[j].x, zj = poly[j].z;
    const hit = (zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi + 0) + xi;
    if (hit) inside = !inside;
  }
  return inside;
}
function inBox(x, z, cx, cz, len, wid) {
  // axis-aligned, length along x, width along z
  return Math.abs(x - cx) <= len / 2 && Math.abs(z - cz) <= wid / 2;
}

function loadBearingPolys() {
  const polys = [];
  // runway
  polys.push({ kind: "runway", pts: [
    { x: -RWY_0927.length / 2, z: -half }, { x: RWY_0927.length / 2, z: -half },
    { x: RWY_0927.length / 2, z: half }, { x: -RWY_0927.length / 2, z: half },
  ]});
  // parallels
  for (const tw of [TAXI_N, TAXI_S]) {
    const h = tw.width / 2;
    polys.push({ kind: "taxiway-parallel", pts: [
      { x: tw.x0, z: tw.z - h }, { x: tw.x1, z: tw.z - h },
      { x: tw.x1, z: tw.z + h }, { x: tw.x0, z: tw.z + h },
    ]});
  }
  // stubs (sample half-width along z, build a tapered outline)
  for (const link of LINKS) {
    const zRwy = link.side * half;
    const zPar = link.side * Math.abs(linkTaxiZ(link));
    const z0 = Math.min(zRwy, zPar), z1 = Math.max(zRwy, zPar);
    const steps = 24;
    const west = [], east = [];
    for (let i = 0; i <= steps; i++) {
      const z = z0 + ((z1 - z0) * i) / steps;
      west.push({ x: link.x - stubHalfWidth(link, z, -1), z });
      east.push({ x: link.x + stubHalfWidth(link, z, 1), z });
    }
    polys.push({ kind: `taxiway-stub-${link.id}`, pts: [...west, ...east.reverse()] });
  }
  for (const f of junctionGeometry().fillets) {
    polys.push({ kind: "fillet", pts: f.polygon });
  }
  for (const a of [APRON_S, APRON_N]) {
    polys.push({ kind: `apron-${a.id}`, pts: [
      { x: a.x - a.width / 2, z: a.z - a.depth / 2 },
      { x: a.x + a.width / 2, z: a.z - a.depth / 2 },
      { x: a.x + a.width / 2, z: a.z + a.depth / 2 },
      { x: a.x - a.width / 2, z: a.z + a.depth / 2 },
    ]});
  }
  return polys;
}
function linkTaxiZ(link) {
  return link.side < 0 ? TAXI_N.z : TAXI_S.z;
}
function shoulderPolys() {
  const out = taxiwayShoulderPolys().map((pts) => ({ kind: "taxiway-shoulder", pts }));
  for (const p of apronShoulderPolys()) out.push({ kind: "apron-shoulder", pts: p });
  for (const b of runwayShoulderBands()) {
    out.push({ kind: "runway-shoulder", pts: [
      { x: b.x - b.length / 2, z: b.z - b.width / 2 },
      { x: b.x + b.length / 2, z: b.z - b.width / 2 },
      { x: b.x + b.length / 2, z: b.z + b.width / 2 },
      { x: b.x - b.length / 2, z: b.z + b.width / 2 },
    ]});
  }
  return out;
}

function classify(x, z, load, sh) {
  for (const p of load) if (pip(p.pts, x, z)) return p.kind;
  for (const p of sh) if (pip(p.pts, x, z)) return p.kind;
  return null;
}
function distToEdge(x, z) {
  let best = Infinity;
  for (const e of [...taxiwayEdges(), ...apronFreeEdges()]) {
    const pts = e.pts;
    for (let i = 1; i < pts.length; i++) {
      const ax = pts[i - 1].x, az = pts[i - 1].z, bx = pts[i].x, bz = pts[i].z;
      const dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz || 1;
      let t = ((x - ax) * dx + (z - az) * dz) / l2;
      t = Math.max(0, Math.min(1, t));
      best = Math.min(best, Math.hypot(x - (ax + t * dx), z - (az + t * dz)));
    }
  }
  return best;
}

function papiUnits() {
  const out = [];
  for (const name of ["09", "27"]) {
    const end = RWY_0927.ends[name];
    const ls = landingSign(end);
    const along = thresholdAlong(RWY_0927, name) + ls * end.papiSitingM;
    const sideSign = end.papiSide === "right" ? ls : -ls;
    const inboard = sideSign * (RWY_0927.width / 2 + 15);
    for (let i = 0; i < 4; i++) {
      const p = rwyPos(RWY_0927, along, inboard + sideSign * i * 9, 1.15);
      out.push({ name: `PAPI ${name} #${i + 1}`, x: p.x, z: p.z, allowEdge: false });
    }
  }
  return out;
}

function holdSigns() {
  const out = [];
  for (const link of LINKS) {
    const rwy = runwayDesignationLegend(link);
    const cat = catHoldLegend(link);
    const locW = Math.max(2.0, 0.55 * link.id.length + 1.4);
    const rwyW = rwy.length > 5 ? 3.6 : rwy.length > 2 ? 3.2 : 2.4;
    const catW = cat.length > 12 ? 5.6 : cat.length > 9 ? 5.0 : 4.4;
    for (const sx of [-1, 1]) {
      const zA = holdZ(link, "A");
      const zB = holdZ(link, "B");
      const xEdgeA = stubHalfWidth(link, zA, sx) + TAXI_SHOULDER_M + 2.2;
      const xEdgeB = stubHalfWidth(link, zB, sx) + TAXI_SHOULDER_M + 2.2;
      const inboard = link.x + sx * xEdgeA;
      out.push({ name: `sign ${link.id} des`, x: inboard + sx * (rwyW / 2), z: zA });
      out.push({ name: `sign ${link.id} loc`, x: inboard + sx * (rwyW + 0.12 + locW / 2), z: zA });
      out.push({ name: `sign ${link.id} cat`, x: link.x + sx * (xEdgeB + catW / 2), z: zB });
    }
  }
  out.push({ name: "sign NO ENTRY", x: 620, z: TAXI_S.z - 42 });
  out.push({ name: "sign N/E dest", x: TAXI_N1.x, z: TAXI_N.z - (TAXI_WIDTH / 2 + TAXI_SHOULDER_M + 3) });
  out.push({ name: "sign loc N", x: -1100, z: TAXI_N.z - 26 });
  out.push({ name: "sign loc S", x: APRON_S.x - APRON_S.width / 2 - 26, z: TAXI_S.z + TAXI_WIDTH / 2 + TAXI_SHOULDER_M + 6 });
  out.push({ name: "sign T2", x: APRON_S.x + APRON_S.width / 2 + 26, z: TAXI_S.z + TAXI_WIDTH / 2 + TAXI_SHOULDER_M + 6 });
  out.push({ name: "sign N1 dir", x: holdOf(LINKS[0]).x + 80, z: -42 });
  out.push({ name: "sign APN", x: 480, z: 220 });
  return out;
}

function stopAndRgl() {
  const out = [];
  const stopBarZ = (link, which) => holdZ(link, which) + link.side * 0.45;
  for (const link of LINKS) {
    for (const which of ["A", "B"]) {
      const z = stopBarZ(link, which);
      const hwW = stubHalfWidth(link, z, -1);
      const hwE = stubHalfWidth(link, z, 1);
      out.push({ name: `stop-elev ${link.id} ${which} W`, x: link.x - hwW - TAXI_SHOULDER_M - 1.8, z });
      out.push({ name: `stop-elev ${link.id} ${which} E`, x: link.x + hwE + TAXI_SHOULDER_M + 1.8, z });
    }
    const zA = holdZ(link, "A") + link.side * 1.4;
    const hwW = stubHalfWidth(link, zA, -1);
    const hwE = stubHalfWidth(link, zA, 1);
    out.push({ name: `RGL ${link.id} W`, x: link.x - hwW - TAXI_SHOULDER_M - 1.2, z: zA });
    out.push({ name: `RGL ${link.id} E`, x: link.x + hwE + TAXI_SHOULDER_M + 1.2, z: zA });
  }
  return out;
}

function edgeLights() {
  const out = [];
  const seen = new Set();
  const add = (p, tag) => {
    if (Math.abs(p.z) < RWY_0927.width / 2 + 2) return;
    const k = `${Math.round(p.x * 2)},${Math.round(p.z * 2)}`;
    if (seen.has(k)) return;
    seen.add(k);
    out.push({ name: `edge ${tag}`, x: p.x, z: p.z, allowEdge: true });
  };
  const along = (pts, spacing) => {
    if (pts.length === 0) return [];
    const acc = [{ x: pts[0].x, z: pts[0].z }];
    let a = 0;
    for (let i = 1; i < pts.length; i++) {
      const x0 = pts[i - 1].x, z0 = pts[i - 1].z, x1 = pts[i].x, z1 = pts[i].z;
      const seg = Math.hypot(x1 - x0, z1 - z0) || 1e-6;
      let used = 0;
      while (a + (seg - used) >= spacing) {
        const need = spacing - a;
        used += need;
        const f = used / seg;
        acc.push({ x: x0 + (x1 - x0) * f, z: z0 + (z1 - z0) * f });
        a = 0;
      }
      a += seg - used;
    }
    return acc;
  };
  for (const e of taxiwayEdges()) {
    for (const p of along(e.pts, e.curved ? 7.5 : 60)) add(p, "taxi");
  }
  for (const e of apronFreeEdges()) {
    for (const p of along(e.pts, 60)) add(p, "apron");
  }
  return out;
}

const load = loadBearingPolys();
const sh = shoulderPolys();
const fixtures = [...papiUnits(), ...holdSigns(), ...stopAndRgl(), ...edgeLights()];
const hits = [];
for (const f of fixtures) {
  const kind = classify(f.x, f.z, load, sh);
  if (!kind) continue;
  if (f.allowEdge) {
    const d = distToEdge(f.x, f.z);
    // at or just outside the edge is legal (5.3.18.6: at the edge or ≤ 3 m outside).
    if (d <= 3.05 && !kind.startsWith("taxiway-stub") && !kind.startsWith("taxiway-parallel") && kind !== "fillet" && !kind.startsWith("apron-") || d <= 0.45) {
      // If classified as shoulder but within 3 m of the edge, that's "just outside" or on the edge — OK.
      if (kind.includes("shoulder") && d <= 3.05) continue;
      if (d <= 0.45) continue;
    }
    // edge light clearly inside load-bearing pavement
    hits.push({ ...f, kind, d: distToEdge(f.x, f.z) });
    continue;
  }
  hits.push({ ...f, kind, d: 0 });
}

console.log(`checked ${fixtures.length} fixtures`);
if (hits.length) {
  console.log(`FAIL ${hits.length} on pavement/shoulder:`);
  for (const h of hits) console.log(`  ${h.name}  (${h.x.toFixed(2)}, ${h.z.toFixed(2)})  ${h.kind}  dEdge=${h.d?.toFixed?.(2) ?? "-"}`);
  process.exit(1);
}
console.log("OK — no elevated PAPI, sign, stop-bar end or RGL on pavement or shoulder.");
for (const f of papiUnits()) {
  console.log(`  ${f.name}: x=${f.x.toFixed(2)} z=${f.z.toFixed(2)}`);
}
