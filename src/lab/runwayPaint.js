/**
 * White runway markings (Annex 14 Vol I 5.2). Shared by the paint renderer (markings.jsx)
 * and by the taxiway lead-line clipping (taxiways.js), so that yellow taxiway paint can be
 * interrupted wherever it would meet white runway paint (Annex 14 Vol I 5.2.1.3).
 */
import { RWY_0927, rwyPos, rwyYaw, thresholdAlong, landingSign, physicalAlong, aimingInnerSpacing } from "./world";
import { digitSegs, DIGIT_GAP, DIGIT_W } from "./digits";

export function pushBox(list, rwy, along, across, alongLen, acrossW) {
    const p = rwyPos(rwy, along, across);
    list.push({ x: p.x, z: p.z, w: acrossW, d: alongLen, ry: rwyYaw(rwy) });
}
export function centreline(rwy, out) {
    const usable0 = -rwy.length / 2;
    let a = usable0 + 5;
    const end = rwy.length / 2 - 5;
    while (a + 30 <= end) {
        pushBox(out, rwy, a + 15, 0, 30, rwy.clWidth);
        a += 50;
    }
}
export function zebra(rwy, endName, out) {
    const end = rwy.ends[endName];
    const ls = landingSign(end);
    const thr = thresholdAlong(rwy, endName);
    const count = rwy.width >= 60 ? 16 : 12;
    const alongC = thr + ls * (6 + 15);
    const pattern = (2 * count - 1) * 1.8;
    const first = -pattern / 2 + 0.9;
    for (let i = 0; i < count; i++) {
        pushBox(out, rwy, alongC, first + i * 3.6, 30, 1.8);
    }
    pushBox(out, rwy, thr + ls * 0.9, 0, 1.8, rwy.width - 2);
}
export function designation(rwy, endName, out) {
    const end = rwy.ends[endName];
    const ls = landingSign(end);
    const thr = thresholdAlong(rwy, endName);
    const chars = endName.split("");
    const totalW = chars.length * DIGIT_W + (chars.length - 1) * DIGIT_GAP;
    chars.forEach((ch, i) => {
        const across0 = -totalW / 2 + DIGIT_W / 2 + i * (DIGIT_W + DIGIT_GAP);
        for (const s of digitSegs(ch)) {
            const along = thr + ls * (48 + s.along);
            const across = across0 + s.across;
            const p = rwyPos(rwy, along, across);
            out.push({
                x: p.x,
                z: p.z,
                w: s.w,
                d: s.d,
                ry: rwyYaw(rwy),
            });
        }
    });
}
export function aiming(rwy, endName, out) {
    const end = rwy.ends[endName];
    const ls = landingSign(end);
    const thr = thresholdAlong(rwy, endName);
    const along = thr + ls * (400 + 25);
    const inner = aimingInnerSpacing(rwy.width);
    const rectW = 8;
    const across = inner / 2 + rectW / 2;
    for (const side of [-1, 1]) {
        pushBox(out, rwy, along, side * across, 50, rectW);
    }
}
export function tdz(rwy, endName, out) {
    const end = rwy.ends[endName];
    const ls = landingSign(end);
    const thr = thresholdAlong(rwy, endName);
    const inner = aimingInnerSpacing(rwy.width);
    const pattern = { 150: 3, 300: 2, 600: 1, 750: 1, 900: 1 };
    for (const dist of [150, 300, 600, 750, 900]) {
        const n = pattern[dist];
        const along = thr + ls * dist;
        const stripeW = n > 1 ? 1.8 : 3;
        const gap = 1.5;
        for (const side of [-1, 1]) {
            for (let k = 0; k < n; k++) {
                const across = side * (inner / 2 + stripeW / 2 + k * (stripeW + gap));
                pushBox(out, rwy, along, across, 22.5, stripeW);
            }
        }
    }
}
/**
 * Runway side stripes. `gaps` = [{ side: ±1, a0, a1 }] (along-runway intervals) where the
 * stripe is interrupted so a taxiway centre line can cross it without touching white paint
 * (Annex 14 Vol I 5.2.1.3: "runway side stripe markings may be interrupted").
 */
export function sideStripes(rwy, out, gaps = []) {
    const across = rwy.width / 2 - 0.45;
    const segs = 16;
    const len = rwy.length / segs;
    for (let i = 0; i < segs; i++) {
        const a0 = -rwy.length / 2 + i * len + 0.2;
        const a1 = a0 + len - 0.4;
        for (const side of [1, -1]) {
            let pieces = [[a0, a1]];
            for (const g of gaps) {
                if (g.side !== side)
                    continue;
                const next = [];
                for (const [p0, p1] of pieces) {
                    if (g.a1 <= p0 || g.a0 >= p1) {
                        next.push([p0, p1]);
                        continue;
                    }
                    if (g.a0 > p0)
                        next.push([p0, g.a0]);
                    if (g.a1 < p1)
                        next.push([g.a1, p1]);
                }
                pieces = next;
            }
            for (const [p0, p1] of pieces) {
                if (p1 - p0 < 0.3)
                    continue;
                pushBox(out, rwy, (p0 + p1) / 2, side * across, p1 - p0, 0.9);
            }
        }
    }
}
export function arrows(rwy, endName, out) {
    const end = rwy.ends[endName];
    if (end.displaced < 40)
        return;
    const ls = landingSign(end);
    const phys = physicalAlong(rwy, end.sign);
    const thr = thresholdAlong(rwy, endName);
    const closed = Math.abs(thr - phys);
    const step = 55;
    const n = Math.max(2, Math.floor((closed - 20) / step));
    const yaw = rwyYaw(rwy);
    for (let i = 0; i < n; i++) {
        const along = phys + ls * (18 + i * step);
        const p = rwyPos(rwy, along, 0);
        const arm = 11;
        const thick = 1.1;
        const ang = 0.72;
        out.push({
            x: p.x,
            z: p.z,
            w: thick,
            d: arm,
            ry: yaw + ang * ls,
        });
        out.push({
            x: p.x,
            z: p.z,
            w: thick,
            d: arm,
            ry: yaw - ang * ls,
        });
    }
}

/**
 * White runway marks that taxiway centre-line paint must never touch: threshold
 * (stripes + transverse bar), designation, aiming point, TDZ and displaced-threshold
 * arrows. Excluded: the runway centre line (the lead line runs parallel to it at a
 * fixed offset, never across it) and the side stripes (interrupted instead).
 */
export function runwayObstacleMarks(rwy = RWY_0927) {
    const m = [];
    for (const name of Object.keys(rwy.ends)) {
        zebra(rwy, name, m);
        designation(rwy, name, m);
        aiming(rwy, name, m);
        tdz(rwy, name, m);
        arrows(rwy, name, m);
    }
    return m;
}

/** Shortest distance from a point to an oriented box item {x, z, w, d, ry}. */
export function distToMark(px, pz, m) {
    const dx = px - m.x;
    const dz = pz - m.z;
    const c = Math.cos(m.ry);
    const s = Math.sin(m.ry);
    const lx = dx * c - dz * s; // local across (w)
    const lz = dx * s + dz * c; // local along (d)
    const ex = Math.max(Math.abs(lx) - m.w / 2, 0);
    const ez = Math.max(Math.abs(lz) - m.d / 2, 0);
    return Math.hypot(ex, ez);
}
