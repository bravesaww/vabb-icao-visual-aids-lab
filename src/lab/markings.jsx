import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { RWY_0927, TAXI_N, TAXI_S, TAXI_N1, TAXI_WIDTH, LINKS, APRON_SPURS, rwyPos, rwyYaw } from "./world";
import { apronSpurPoints, connectorPaths, holdZ, sideStripeGaps } from "./taxiways";
import { junctionGeometry, stubHalfWidth, taxiwayEdges } from "./junctions";
import { digitSegs, DIGIT_W } from "./digits";
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
/** Pattern A across the full (fillet-widened) stub width at the holding position. */
function holdSpan(link, z) {
    const w = stubHalfWidth(link, z, -1);
    const e = stubHalfWidth(link, z, 1);
    return { x0: link.x - w + 0.5, x1: link.x + e - 0.5 };
}
function holdPatternA(out, link) {
    const z = holdZ(link);
    const towardRwy = -link.side;
    const { x0, x1 } = holdSpan(link, z);
    const xc = (x0 + x1) / 2;
    const w = x1 - x0;
    out.push({ x: xc, z: z + towardRwy * 1.35, w, d: 0.9, ry: 0 });
    out.push({ x: xc, z: z + towardRwy * 0.45, w, d: 0.9, ry: 0 });
    const n = Math.floor(w / 2.6);
    for (let i = 0; i < n; i++) {
        const x = x0 + 0.7 + i * 2.6 + (w - 1.4 - (n - 1) * 2.6) / 2;
        out.push({ x, z: z - towardRwy * 2.25, w: 1.4, d: 0.9, ry: 0 });
        out.push({ x, z: z - towardRwy * 4.05, w: 1.4, d: 0.9, ry: 0 });
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
        // intersects a runway-holding position marking.
        const hz = holdZ(link);
        const towardRwy = -link.side;
        const zA = hz + towardRwy * 1.9;
        const zB = hz - towardRwy * 4.6;
        const z0 = Math.min(zA, zB);
        const z1 = Math.max(zA, zB);
        const parts = [[], []];
        for (const pt of paths.straight) {
            if (pt.z <= z0)
                parts[0].push(pt);
            else if (pt.z >= z1)
                parts[1].push(pt);
        }
        // close the cut with points exactly on the gap edges
        const x = link.x;
        if (parts[0].length)
            parts[0].push({ x, z: z0 });
        if (parts[1].length)
            parts[1].unshift({ x, z: z1 });
        paintPolyline(out, parts[0], w);
        paintPolyline(out, parts[1], w);
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

function holdPatternB(out, link) {
    const z = holdZ(link) - (-link.side) * 6;
    const { x0, x1 } = holdSpan(link, z);
    const xc = (x0 + x1) / 2;
    const w = x1 - x0;
    out.push({ x: xc, z: z - 0.45, w, d: 0.3, ry: 0 });
    out.push({ x: xc, z: z + 0.45, w, d: 0.3, ry: 0 });
    for (let x = x0 + 0.5; x <= x1 - 0.5; x += 1.4) {
        out.push({ x, z, w: 0.3, d: 1.2, ry: 0 });
    }
}
function holdAllPatternB(out) {
    for (const link of LINKS)
        holdPatternB(out, link);
}
/**
 * Enhanced taxiway centre line (Annex 14 Vol I 5.2.8.9): two dashed lines either side of
 * the centre line from Pattern A out to 47 m. Where a junction turn curve leaves the stub
 * centre line inside that distance, dashes within 1.5 m of the curve are dropped (5.2.8.9 c
 * applied by analogy) and at least three dashes continue beyond it.
 */
function enhancedCL(out) {
    const DASH = 3;
    const GAP = 3;
    const OFF = 0.3;
    const turns = junctionGeometry().turns;
    for (const link of LINKS) {
        const hz = holdZ(link);
        const curves = turns.filter((t) => t.junction === link.id).map((t) => t.pts);
        for (const sx of [-1, 1]) {
            const x = link.x + sx * OFF;
            const near = (z) => curves.some((pts) => pts.some((p) => Math.abs(p.x - x) < 1.65 && Math.abs(p.z - z) < DASH / 2 + 1.5));
            let d = DASH / 2;
            let afterGap = 0;
            let gapSeen = false;
            while (d < 47 + 3 * (DASH + GAP)) {
                const z = hz + link.side * d;
                if (d > 47 && (!gapSeen || afterGap >= 3))
                    break;
                if (near(z)) {
                    gapSeen = true;
                    afterGap = 0;
                }
                else {
                    out.push({ x, z, w: 0.15, d: DASH, ry: 0 });
                    if (gapSeen)
                        afterGap++;
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
function mandatoryPaint(outRed, outWhite) {
    outRed.push({ x: TAXI_N1.x, z: -82, w: 16, d: 6, ry: 0, y: 0.025 });
    const scale = 0.32;
    const chars = ["0", "9", "-", "2", "7"];
    // hyphen as a simple bar
    let cursor = -6;
    for (const ch of chars) {
        if (ch === "-") {
            outWhite.push({ x: TAXI_N1.x + cursor + 0.8, z: -82, w: 1.4, d: 0.35, ry: 0, y: 0.045 });
            cursor += 2.2;
            continue;
        }
        for (const s of digitSegs(ch)) {
            outWhite.push({
                x: TAXI_N1.x + cursor + s.across * scale,
                z: -82 + (s.along - 4.5) * scale,
                w: s.w * scale,
                d: s.d * scale,
                ry: 0,
                y: 0.045,
            });
        }
        cursor += DIGIT_W * scale + 0.45;
    }
}

function buildWhite() {
    const m = [];
    const redDummy = [];
    mandatoryPaint(redDummy, m);
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
    const m = [];
    const whiteDummy = [];
    mandatoryPaint(m, whiteDummy);
    return m;
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
