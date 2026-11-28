import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { RWY_0927, TAXI_N, TAXI_S, TAXI_N1, TAXI_WIDTH, LINKS, APRON_SPURS, rwyPos, rwyYaw } from "./world";
import { apronSpurPoints, connectorPaths, holdZ, holdMarkRange, sideStripeGaps } from "./taxiways";
import { junctionGeometry, stubHalfWidth, taxiwayEdges } from "./junctions";
import { centreline, zebra, designation, aiming, tdz, sideStripes, arrows } from "./runwayPaint";
import { useLab } from "./store";
function paintPolyline(out, pts, width = 0.3, y) {
    for (let i = 1; i < pts.length; i++) {
        const a = pts[i - 1];
        const b = pts[i];
        const dx = b.x - a.x;
        const dz = b.z - a.z;
        const len = Math.hypot(dx, dz);
        if (len < 0.12)
            continue;
        out.push({
            x: (a.x + b.x) / 2,
            z: (a.z + b.z) / 2,
            w: width,
            d: len,
            ry: Math.atan2(dx, dz),
            ...(y != null ? { y } : {}),
        });
    }
}
/** Pattern A2 / B2 across the full (fillet-widened) stub width at the holding position. */
function holdSpan(link, z) {
    const w = stubHalfWidth(link, z, -1);
    const e = stubHalfWidth(link, z, 1);
    return { x0: link.x - w + 0.5, x1: link.x + e - 0.5 };
}
/**
 * Pattern A2 (Annex 14 Vol I 5.2.10.6 / Figure 5-8, as of 26 Nov 2026):
 * four 0.3 m lines and three 0.3 m spaces (2.10 m). Two solid lines on the
 * holding side, two dashed lines (0.9 m dash / 0.9 m gap) on the runway side.
 */
function holdPatternA(out, link) {
    const zHold = holdZ(link, "A");
    const towardRwy = -link.side;
    const { x0, x1 } = holdSpan(link, zHold);
    const xc = (x0 + x1) / 2;
    const w = x1 - x0;
    const centres = [0.15, 0.75, 1.35, 1.95];
    out.push({ x: xc, z: zHold + towardRwy * centres[0], w, d: 0.3, ry: 0 });
    out.push({ x: xc, z: zHold + towardRwy * centres[1], w, d: 0.3, ry: 0 });
    const dash = 0.9;
    const gap = 0.9;
    const pitch = dash + gap;
    const n = Math.max(1, Math.floor((w + gap) / pitch));
    const span = n * dash + (n - 1) * gap;
    const xStart = xc - span / 2 + dash / 2;
    for (const c of [centres[2], centres[3]]) {
        for (let i = 0; i < n; i++) {
            out.push({ x: xStart + i * pitch, z: zHold + towardRwy * c, w: dash, d: 0.3, ry: 0 });
        }
    }
}
function holdAllPatternA(out) {
    for (const link of LINKS)
        holdPatternA(out, link);
}
function paintXRun(out, x0, x1, z, w, step = 40) {
    for (let x = x0; x < x1; x += step) {
        const xB = Math.min(x + step, x1);
        const d = xB - x;
        if (d < 0.4)
            continue;
        out.push({ x: (x + xB) / 2, z, w, d, ry: Math.PI / 2 });
    }
}
function taxiCL(out) {
    const w = 0.3;
    paintXRun(out, TAXI_N.x0, TAXI_N.x1, TAXI_N.z, w);
    paintXRun(out, TAXI_S.x0, TAXI_S.x1, TAXI_S.z, w);
    for (const link of LINKS) {
        const paths = connectorPaths(link);
        // Annex 14 5.2.8.10: the taxiway centre line is continuous except where it
        // intersects a runway-holding position marking. Interrupt at Pattern A and B.
        const gaps = ["A", "B"].map((which) => {
            const r = holdMarkRange(link, which);
            return { z0: r.z0 - 0.15, z1: r.z1 + 0.15 };
        }).sort((a, b) => a.z0 - b.z0);
        const x = link.x;
        const parts = [];
        let bucket = [];
        for (const pt of paths.straight) {
            if (gaps.some((g) => pt.z > g.z0 && pt.z < g.z1)) {
                if (bucket.length)
                    parts.push(bucket);
                bucket = [];
            }
            else {
                bucket.push(pt);
            }
        }
        if (bucket.length)
            parts.push(bucket);
        // Close each piece on the gap edges so the cut is exact.
        for (const piece of parts) {
            const lo = Math.min(piece[0].z, piece[piece.length - 1].z);
            const hi = Math.max(piece[0].z, piece[piece.length - 1].z);
            for (const g of gaps) {
                if (lo <= g.z0 && hi >= g.z0 - 0.01 && !piece.some((q) => Math.abs(q.z - g.z0) < 1e-4))
                    piece.push({ x, z: g.z0 });
                if (lo <= g.z1 && hi >= g.z1 - 0.01 && !piece.some((q) => Math.abs(q.z - g.z1) < 1e-4))
                    piece.push({ x, z: g.z1 });
            }
            piece.sort((a, b) => a.z - b.z);
            paintPolyline(out, piece, w);
        }
        // Lead lines sit on runway pavement. They are pre-clipped (taxiways.js) so they never
        // touch white runway paint; they stay LEAD_OFFSET_M clear of the runway CL.
        for (const piece of [...paths.east, ...paths.west])
            paintPolyline(out, piece, w, 0.036);
    }
    for (const spur of APRON_SPURS) {
        paintPolyline(out, apronSpurPoints(spur), w);
    }
    // Curved centre-line turn markings at every taxiway/taxiway and taxiway/apron junction
    // (Annex 14 Vol I 5.2.8.6). The straight through-lines above are kept.
    for (const t of junctionGeometry().turns) {
        paintPolyline(out, t.pts, w);
    }
}

/**
 * Pattern B2 (5.2.10.6 / Figure 5-8): two 0.3 m lines with a 1.5 m space (2.10 m),
 * joined by 0.3 m rungs. Rung pitch 0.9 m / 0.9 m follows the figure labels
 * (schematic/approximate — the Annex does not state a pitch in the text).
 */
function holdPatternB(out, link) {
    const zHold = holdZ(link, "B");
    const towardRwy = -link.side;
    const { x0, x1 } = holdSpan(link, zHold);
    const xc = (x0 + x1) / 2;
    const w = x1 - x0;
    const z1 = zHold + towardRwy * 0.15;
    const z2 = zHold + towardRwy * 1.95;
    const zMid = (z1 + z2) / 2;
    out.push({ x: xc, z: z1, w, d: 0.3, ry: 0 });
    out.push({ x: xc, z: z2, w, d: 0.3, ry: 0 });
    const rung = 0.9;
    const gap = 0.9;
    const pitch = rung + gap;
    const n = Math.max(1, Math.floor((w + gap) / pitch));
    const span = n * rung + (n - 1) * gap;
    const xStart = xc - span / 2 + rung / 2;
    for (let i = 0; i < n; i++) {
        out.push({ x: xStart + i * pitch, z: zMid, w: rung, d: 1.5, ry: 0 });
    }
}
function holdAllPatternB(out) {
    for (const link of LINKS)
        holdPatternB(out, link);
}
/**
 * Enhanced taxiway centre line (Annex 14 Vol I 5.2.8.9): two dashed lines either side of
 * the centre line, starting 0.9 m from Pattern A and extending up to 47 m away from the
 * runway. Pattern B lies within that 47 m, so 5.2.8.9 b applies: interrupt 0.9 m before
 * and after Pattern B, then continue for at least three dashes or 47 m from the start,
 * whichever is greater. Dashes within 1.5 m of a junction turn line are dropped (5.2.8.9 c)
 * and at least three dashes continue beyond it.
 */
function enhancedCL(out) {
    const DASH = 3;
    const GAP = 3;
    const OFF = 0.3;
    const turns = junctionGeometry().turns;
    for (const link of LINKS) {
        const zA = holdZ(link, "A");
        const bRange = holdMarkRange(link, "B");
        const curves = turns.filter((t) => t.junction === link.id).map((t) => t.pts);
        const away = link.side; // sign of increasing |z|, away from the runway
        for (const sx of [-1, 1]) {
            const x = link.x + sx * OFF;
            const nearCurve = (z) => curves.some((pts) => pts.some((p) => Math.abs(p.x - x) < 1.65 && Math.abs(p.z - z) < DASH / 2 + 1.5));
            const inB = (z) => z > bRange.z0 - 0.9 && z < bRange.z1 + 0.9;
            let d = 0.9 + DASH / 2;
            let afterCurve = 0;
            let curveSeen = false;
            let afterB = 0;
            let bSeen = false;
            while (d < 47 + 4 * (DASH + GAP)) {
                const z = zA + away * d;
                const pastB = bSeen && afterB >= 3;
                if (d > 47 && (!curveSeen || afterCurve >= 3) && pastB)
                    break;
                if (nearCurve(z) || inB(z)) {
                    if (nearCurve(z)) {
                        curveSeen = true;
                        afterCurve = 0;
                    }
                    if (inB(z)) {
                        bSeen = true;
                        afterB = 0;
                    }
                }
                else {
                    out.push({ x, z, w: 0.15, d: DASH, ry: 0 });
                    if (curveSeen)
                        afterCurve++;
                    if (bSeen)
                        afterB++;
                }
                d += DASH + GAP;
            }
        }
    }
}
function blastChevrons(out) {
    const rwy = RWY_0927;
    const yaw = rwyYaw(rwy);
    for (let i = 0; i < 5; i++) {
        const along = -rwy.length / 2 - 12 - i * 14;
        const p = rwyPos(rwy, along, 0);
        out.push({ x: p.x, z: p.z, w: 1.2, d: 12, ry: yaw + 0.7 });
        out.push({ x: p.x, z: p.z, w: 1.2, d: 12, ry: yaw - 0.7 });
    }
}
/** Double yellow taxi side stripe (Annex 14 Vol I 7.2.3) that follows the junction fillets. */
function offsetPolyline(pts, normals, d) {
    return pts.map((p, i) => ({ x: p.x + normals[i].x * d, z: p.z + normals[i].z * d }));
}
function taxiEdge(out) {
    for (const e of taxiwayEdges()) {
        for (const off of [0.1, 0.4]) {
            const line = offsetPolyline(e.pts, e.normals, off);
            if (!e.curved) {
                // split long straights into ≤40 m boxes
                const [a0, b0] = line;
                const zLim = RWY_0927.width / 2 + 1;
                const clampZ = (q) => (Math.abs(q.z) < zLim ? { x: q.x, z: Math.sign(q.z) * zLim } : q);
                const a = clampZ(a0);
                const b = clampZ(b0);
                const L = Math.hypot(b.x - a.x, b.z - a.z);
                const n = Math.max(1, Math.ceil(L / 40));
                const seg = [];
                for (let k = 0; k <= n; k++)
                    seg.push({ x: a.x + ((b.x - a.x) * k) / n, z: a.z + ((b.z - a.z) * k) / n });
                paintPolyline(out, seg, 0.15);
            }
            else {
                // Never paint yellow on or against the runway: stop ≥ 1 m outside the runway edge.
                let piece = [];
                for (const q of line) {
                    if (Math.abs(q.z) < RWY_0927.width / 2 + 1) {
                        if (piece.length > 1)
                            paintPolyline(out, piece, 0.15);
                        piece = [];
                        continue;
                    }
                    piece.push(q);
                }
                if (piece.length > 1)
                    paintPolyline(out, piece, 0.15);
            }
        }
    }
}
/**
 * Intermediate holding position marking (Annex 14 Vol I 5.2.11): a single broken yellow
 * line ACROSS taxiway N. Dash 1 m / gap 1 m, width 0.3 m (schematic).
 */
export const IHP_X = -800;
function intermediateHold(out) {
    const half = TAXI_WIDTH / 2 - 0.6;
    for (let z = -half + 0.5; z <= half - 0.5 + 1e-6; z += 2) {
        out.push({ x: IHP_X, z: TAXI_N.z + z, w: 0.3, d: 1, ry: 0 });
    }
}
/** Information marking "N": placed clear of the N1 junction curves, beside the centre line. */
export const INFO_N_POS = { x: TAXI_N1.x + 75, z: TAXI_N.z - 5 };
function infoPaint(out) {
    const { x, z } = INFO_N_POS;
    // Reads for an aircraft taxiing east: strokes along +x, separated across the taxiway.
    out.push({ x, z: z - 1.6, w: 0.7, d: 4.5, ry: Math.PI / 2 });
    out.push({ x, z: z + 1.6, w: 0.7, d: 4.5, ry: Math.PI / 2 });
    out.push({ x, z, w: 0.7, d: Math.hypot(4.5, 3.2), ry: Math.atan2(-4.5, 3.2) });
}
function buildWhite() {
    const m = [];
    for (const rwy of [RWY_0927]) {
        centreline(rwy, m);
        sideStripes(rwy, m, sideStripeGaps());
        for (const name of Object.keys(rwy.ends)) {
            zebra(rwy, name, m);
            designation(rwy, name, m);
            aiming(rwy, name, m);
            tdz(rwy, name, m);
            arrows(rwy, name, m);
        }
    }
    return m;
}
function buildYellow() {
    const m = [];
    holdAllPatternA(m);
    holdAllPatternB(m);
    taxiCL(m);
    enhancedCL(m);
    blastChevrons(m);
    taxiEdge(m);
    intermediateHold(m);
    infoPaint(m);
    return m;
}
function buildRed() {
    return [];
}
function InstancedMarks({ items, color }) {
    const ref = useRef(null);
    const geo = useMemo(() => new THREE.BoxGeometry(1, 1, 1), []);
    const mat = useMemo(() => new THREE.MeshBasicMaterial({ color, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }), [color]);
    useLayoutEffect(() => {
        const mesh = ref.current;
        if (!mesh)
            return;
        const dummy = new THREE.Object3D();
        items.forEach((it, i) => {
            dummy.position.set(it.x, it.y ?? 0.03, it.z);
            dummy.rotation.set(0, it.ry, 0);
            dummy.scale.set(it.w, 0.04, it.d);
            dummy.updateMatrix();
            mesh.setMatrixAt(i, dummy.matrix);
        });
        mesh.instanceMatrix.needsUpdate = true;
        mesh.computeBoundingSphere();
    }, [items]);
    return <instancedMesh ref={ref} args={[geo, mat, items.length]} frustumCulled={false}/>;
}
export function Markings() {
    const on = useLab((s) => s.layers.markings);
    const white = useMemo(buildWhite, []);
    const yellow = useMemo(buildYellow, []);
    const red = useMemo(buildRed, []);
    if (!on)
        return null;
    return (<group>
      <InstancedMarks items={white} color="#f3f1ea"/>
      <InstancedMarks items={yellow} color="#c4a035"/>
      <InstancedMarks items={red} color="#9b241c"/>
    </group>);
}
