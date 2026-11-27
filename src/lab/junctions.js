/**
 * Taxiway / taxiway, taxiway / runway and taxiway / apron junction geometry:
 * curved centre-line turn markings, fillet pavement, and the taxiway edges (paint +
 * blue edge lights) that follow the fillets.
 *
 * ICAO basis (Annex 14 Vol I, 9th ed.):
 *  - 3.9.3 (Standard): with the cockpit over the centre-line marking, the outer main wheel
 *    keeps a clearance to the taxiway edge — 4 m for OMGWS 9–15 m (code E/F) on curves
 *    when the wheel base is 18 m or more.
 *  - 3.9.5 / 3.9.6 (Recommendations): curves and fillets designed so those clearances are
 *    kept; fillet design uses the aeroplane datum length (guidance: Doc 9157 ADM Part 2).
 *  - 5.2.8.6 (Recommendation): on a curve the centre line continues from the straight at
 *    a constant distance from the outside edge.
 *  - 5.3.17.14 / 5.3.17.15 (Recommendations): centre-line lights follow the curve; on
 *    curves of less than 400 m radius, 7.5 m spacing (RVR < 300 m case, applied here).
 *  - 5.3.18.3 / 5.3.18.6 (Recommendations): edge lights ≤ 60 m on straights, closer on
 *    curves; at the edge or not more than 3 m outside it.
 *
 * Fillet shapes are not drawn from a published VABB chart: they are computed by tracking
 * the main gear of a code-F design aeroplane (datum length / OMGWS below, approximate)
 * whose cockpit follows the curved centre line, then adding the 4 m clearance.
 * Everything here is schematic/approximate.
 */
import { APRON_N, APRON_S, APRON_SPURS, LINKS, RWY_0927, TAXI_N, TAXI_S, TAXI_WIDTH, linkTaxi } from "./world";
import { LEAD_OFFSET_M, LEAD_R, leadArcPoints } from "./taxiways";

/** Centre-line radius of the turn curves at taxiway/taxiway junctions (schematic). */
export const TURN_R = 45;
/** Code F design aeroplane (A380-class), approximate: cockpit → main-gear centre. */
export const DATUM_LENGTH_M = 33;
/** Outer main gear wheel span (A380-class ≈ 14.3 m), approximate. */
export const OMGWS_M = 14.3;
/** Annex 14 3.9.3: OMGWS 9–15 m, curved portion, wheel base ≥ 18 m → 4 m. */
export const WHEEL_CLEARANCE_M = 4;
/** Simple concave fillet radius where aprons T-join a parallel taxiway (schematic). */
export const APRON_FILLET_R = 22;

const HW = TAXI_WIDTH / 2;
const RWY_EDGE = RWY_0927.width / 2;

const v = (x, z) => ({ x, z });
const add = (a, b) => v(a.x + b.x, a.z + b.z);
const sub = (a, b) => v(a.x - b.x, a.z - b.z);
const mul = (a, k) => v(a.x * k, a.z * k);
const dot = (a, b) => a.x * b.x + a.z * b.z;
const len = (a) => Math.hypot(a.x, a.z);

function densify(pts, step = 0.5) {
    const out = [pts[0]];
    for (let i = 1; i < pts.length; i++) {
        const a = pts[i - 1];
        const b = pts[i];
        const n = Math.max(1, Math.ceil(len(sub(b, a)) / step));
        for (let k = 1; k <= n; k++)
            out.push(add(a, mul(sub(b, a), k / n)));
    }
    return out;
}

/** Quarter arc between two perpendicular centre-line rays from O (unit uA, uB), radius R. */
export function turnArc(O, uA, uB, R = TURN_R, step = 1.5) {
    const C = add(O, mul(add(uA, uB), R));
    const a0 = Math.atan2(-uB.z, -uB.x); // C→tangent on arm A is −uB
    const a1 = Math.atan2(-uA.z, -uA.x); // C→tangent on arm B is −uA
    let d = a1 - a0;
    while (d > Math.PI) d -= 2 * Math.PI;
    while (d < -Math.PI) d += 2 * Math.PI;
    const n = Math.max(4, Math.ceil((Math.abs(d) * R) / step));
    const pts = [];
    for (let i = 0; i <= n; i++) {
        const t = a0 + (d * i) / n;
        pts.push(v(C.x + R * Math.cos(t), C.z + R * Math.sin(t)));
    }
    return { pts, centre: C };
}

/**
 * Track the main gear (pursuit curve at datum length) while the cockpit follows `nose`,
 * and return the points the pavement must reach: inner outer-wheel edge + clearance.
 */
function gearEnvelope(nose, turnCentre) {
    const pts = densify(nose, 0.5);
    const d = DATUM_LENGTH_M;
    const dir0 = sub(pts[1], pts[0]);
    let M = sub(pts[0], mul(dir0, d / len(dir0)));
    const reach = OMGWS_M / 2 + WHEEL_CLEARANCE_M;
    const out = [];
    for (const N of pts) {
        const w = sub(N, M);
        const L = len(w);
        if (L > d)
            M = sub(N, mul(w, d / L));
        const h = mul(w, 1 / Math.max(L, 1e-6));
        let n = v(-h.z, h.x);
        if (dot(n, sub(turnCentre, M)) < 0)
            n = mul(n, -1);
        out.push(add(M, mul(n, reach)));
    }
    return out;
}

/**
 * Fillet in the grass quadrant at corner K, between edge rays K + s·e1 and K + t·e2.
 * Region = union of K-anchored rectangles reaching every required point, so the boundary
 * t = f(s) is monotone and the fillet always contains every required point.
 * Required points encroaching less than 0.1 m past an edge are ignored (numerical tail).
 */
function filletFromPoints(K, e1, e2, req, margin = 0.3) {
    const loc = [];
    for (const p of req) {
        const s = dot(sub(p, K), e1);
        const t = dot(sub(p, K), e2);
        if (s > 0.1 && t > 0.1)
            loc.push({ s: s + margin, t: t + margin });
    }
    if (!loc.length)
        return null;
    loc.sort((a, b) => b.s - a.s);
    const sMax = loc[0].s;
    const steps = Math.max(2, Math.ceil(sMax / 0.5));
    const boundary = [];
    let j = 0;
    let tMax = 0;
    for (let i = steps; i >= 0; i--) {
        const sv = (sMax * i) / steps;
        while (j < loc.length && loc[j].s >= sv) {
            tMax = Math.max(tMax, loc[j].t);
            j++;
        }
        boundary.push({ s: sv, t: tMax });
    }
    boundary.reverse(); // s ascending: 0 → sMax, t descending
    const out = [...boundary, { s: sMax, t: 0 }];
    return makeFillet(K, e1, e2, simplify(out));
}

/** Drop collinear staircase points (keeps the outline light). */
function simplify(b) {
    const out = [b[0]];
    for (let i = 1; i < b.length - 1; i++) {
        const p = out[out.length - 1];
        const q = b[i + 1];
        const c = b[i];
        const cross = (c.s - p.s) * (q.t - p.t) - (c.t - p.t) * (q.s - p.s);
        if (Math.abs(cross) > 0.02)
            out.push(c);
    }
    out.push(b[b.length - 1]);
    return out;
}

function circularFillet(K, e1, e2, R) {
    const boundary = [];
    const n = 16;
    for (let i = 0; i <= n; i++) {
        const th = (Math.PI / 2) * (i / n);
        boundary.push({ s: R - R * Math.cos(th), t: R - R * Math.sin(th) });
    }
    return makeFillet(K, e1, e2, boundary);
}

function makeFillet(K, e1, e2, boundary) {
    const toW = (s, t) => add(K, add(mul(e1, s), mul(e2, t)));
    const edge = boundary.map((b) => toW(b.s, b.t));
    return {
        K,
        e1,
        e2,
        boundary,
        sExtent: boundary[boundary.length - 1].s,
        tExtent: boundary[0].t,
        /** Fillet pavement outline (corner first). */
        polygon: [K, ...edge],
        /** Pavement edge along the fillet, from edge 2 (t axis) to edge 1 (s axis). */
        edge,
    };
}

function insideApron(p, shrink = 1) {
    for (const a of [APRON_S, APRON_N]) {
        if (Math.abs(p.x - a.x) < a.width / 2 - shrink && Math.abs(p.z - a.z) < a.depth / 2 - shrink)
            return true;
    }
    return false;
}

/** Build every junction once. */
function build() {
    const junctions = [];
    const E = v(1, 0);
    const W = v(-1, 0);
    const spursUsed = new Set();
    for (const link of LINKS) {
        const taxi = linkTaxi(link);
        const O = v(link.x, taxi.z);
        const uR = v(0, -link.side);
        const leads = link.leads ?? "both";
        const H = [];
        if (leads !== "west")
            H.push(E);
        if (leads !== "east")
            H.push(W);
        const V = [uR];
        const spur = APRON_SPURS.find((s) => s.x === link.x && s.side === link.side);
        if (spur) {
            V.push(mul(uR, -1));
            spursUsed.add(spur.id);
        }
        junctions.push({ id: link.id, link, O, H, V, uR, end: leads !== "both" });
    }
    for (const spur of APRON_SPURS) {
        if (spursUsed.has(spur.id))
            continue;
        const taxi = spur.side < 0 ? TAXI_N : TAXI_S;
        junctions.push({ id: spur.id, link: null, O: v(spur.x, taxi.z), H: [E, W], V: [v(0, spur.side)], uR: v(0, -spur.side), end: false });
    }

    const turns = [];
    const fillets = [];
    for (const j of junctions) {
        j.fillets = {};
        for (const uH of j.H) {
            for (const uV of j.V) {
                const arc = turnArc(j.O, uH, uV);
                turns.push({ junction: j.id, uH, uV, pts: arc.pts, centre: arc.centre });
                const K = add(j.O, mul(add(uH, uV), HW));
                if (insideApron(K))
                    continue;
                const runIn = 300;
                const pathHV = [add(j.O, mul(uH, TURN_R + runIn)), ...arc.pts, add(j.O, mul(uV, TURN_R + runIn))];
                const pathVH = [...pathHV].reverse();
                const req = [...gearEnvelope(pathHV, arc.centre), ...gearEnvelope(pathVH, arc.centre)];
                const f = filletFromPoints(K, uH, uV, req);
                if (f) {
                    f.kind = "taxi";
                    f.junction = j.id;
                    f.side = uH.x; // +1 east corner, −1 west corner
                    f.toward = uV.z === j.uR.z ? "runway" : "apron";
                    fillets.push(f);
                    j.fillets[`${uH.x}:${f.toward}`] = f;
                }
            }
        }
    }

    // Runway / stub fillets from the lead-on / lead-off curves (both directions of travel).
    for (const link of LINKS) {
        const raw = leadArcPoints(link, LEAD_R);
        const j = junctions.find((q) => q.id === link.id);
        for (const [key, sgn] of [["east", 1], ["west", -1]]) {
            const lead = raw[key];
            if (!lead.length)
                continue;
            const zStub = link.side * (LEAD_R + LEAD_OFFSET_M);
            const pre = v(link.x, link.side * (LEAD_R + LEAD_OFFSET_M + 110));
            const last = lead[lead.length - 1];
            const post = v(last.x + sgn * 300, last.z);
            const path = [pre, v(link.x, zStub), ...lead, post];
            const centre = v(link.x + sgn * LEAD_R, link.side * (LEAD_R + LEAD_OFFSET_M));
            const req = [...gearEnvelope(path, centre), ...gearEnvelope([...path].reverse(), centre)];
            const K = v(link.x + sgn * HW, link.side * RWY_EDGE);
            const f = filletFromPoints(K, v(sgn, 0), v(0, link.side), req);
            if (f) {
                f.kind = "runway";
                f.junction = link.id;
                f.side = sgn;
                fillets.push(f);
                j.fillets[`rwy:${sgn}`] = f;
            }
        }
    }

    // Apron T-joins: plain concave fillets at the apron's outer corners.
    const apronFillets = [];
    for (const [a, taxi, s] of [[APRON_S, TAXI_S, 1], [APRON_N, TAXI_N, -1]]) {
        const zFar = taxi.z + s * HW;
        for (const sx of [-1, 1]) {
            const K = v(a.x + sx * (a.width / 2), zFar);
            const f = circularFillet(K, v(sx, 0), v(0, s), APRON_FILLET_R);
            f.kind = "apron";
            f.apron = a.id;
            fillets.push(f);
            apronFillets.push(f);
        }
    }
    // Merge, per stub side, the runway-corner fillet and the parallel-junction fillet into one
    // outline: lateral widening w(z) = max of both, so tails that overlap along the stub
    // become a single pavement edge (one edge line, one row of edge lights).
    const stubSides = [];
    for (const j of junctions) {
        if (!j.link)
            continue;
        const link = j.link;
        const taxi = linkTaxi(link);
        const sd = link.side;
        for (const sx of [-1, 1]) {
            const fR = j.fillets[`rwy:${sx}`];
            const fJ = j.fillets[`${sx}:runway`];
            if (!fR && !fJ)
                continue;
            const KR = v(link.x + sx * HW, sd * RWY_EDGE);
            const KJ = v(link.x + sx * HW, taxi.z - sd * HW);
            const L = Math.abs(KJ.z - KR.z);
            const eS = v(sx, 0);
            const eT = v(0, sd);
            const outline = [];
            for (let i = 0; i <= Math.ceil(L / 0.5); i++) {
                const t = Math.min(L, i * 0.5);
                const w = Math.max(fR ? sOf(fR, t) : 0, fJ ? sOf(fJ, L - t) : 0);
                outline.push(add(KR, add(mul(eS, w), mul(eT, t))));
            }
            // Ensure the outline starts on the runway edge and ends on the parallel edge.
            const lean = simplifyPts(outline);
            const polygon = [KR, ...lean, KJ];
            if (fR)
                fR.merged = true;
            if (fJ)
                fJ.merged = true;
            stubSides.push({ link: link.id, sx, polygon, edge: lean, kind: "stub" });
        }
    }
    return { junctions, turns, fillets, apronFillets, stubSides };
}

/** Lateral widening of a fillet at distance t along its e2 (stub) edge. */
function sOf(f, t) {
    const b = f.boundary; // s ascending, t descending
    if (t >= b[0].t)
        return t <= b[0].t + 1e-9 ? b[0].s : 0;
    for (let i = 1; i < b.length; i++) {
        if (b[i].t <= t) {
            const a = b[i - 1];
            const c = b[i];
            if (Math.abs(a.t - c.t) < 1e-9)
                return c.s;
            return a.s + ((c.s - a.s) * (a.t - t)) / (a.t - c.t);
        }
    }
    return b[b.length - 1].s;
}
function simplifyPts(pts) {
    const out = [pts[0]];
    for (let i = 1; i < pts.length - 1; i++) {
        const p = out[out.length - 1];
        const q = pts[i + 1];
        const c = pts[i];
        const cross = (c.x - p.x) * (q.z - p.z) - (c.z - p.z) * (q.x - p.x);
        if (Math.abs(cross) > 0.02)
            out.push(c);
    }
    out.push(pts[pts.length - 1]);
    return out;
}

let cache = null;
export function junctionGeometry() {
    if (!cache)
        cache = build();
    return cache;
}

function subtractIntervals(a0, a1, holes) {
    let pieces = [[a0, a1]];
    for (const [h0, h1] of holes) {
        const next = [];
        for (const [p0, p1] of pieces) {
            if (h1 <= p0 || h0 >= p1) {
                next.push([p0, p1]);
                continue;
            }
            if (h0 > p0)
                next.push([p0, h0]);
            if (h1 < p1)
                next.push([h1, p1]);
        }
        pieces = next;
    }
    return pieces.filter(([p0, p1]) => p1 - p0 > 0.5);
}

/** Signed-area orientation → which side of an outline (corner-first polygon) is pavement. */
function polygonInterior(poly) {
    let A = 0;
    for (let i = 0; i < poly.length; i++) {
        const a = poly[i];
        const b = poly[(i + 1) % poly.length];
        A += a.x * b.z - b.x * a.z;
    }
    return A > 0 ? "left" : "right";
}
/**
 * Attach per-vertex inward (pavement-side) unit normals. `hint` is either a fixed vector
 * (straights) or "left"/"right" relative to the polyline direction in x–z.
 */
function withNormals(pts, hint, curved, kind) {
    const normals = pts.map((_, i) => {
        if (typeof hint === "object")
            return hint;
        const a = pts[Math.max(0, i - 1)];
        const b = pts[Math.min(pts.length - 1, i + 1)];
        const d = sub(b, a);
        const L = len(d) || 1;
        // In x–z with signed area a.x*b.z − b.x*a.z > 0, the interior lies on the side of (−dz, dx).
        const left = v(-d.z / L, d.x / L);
        return hint === "left" ? left : mul(left, -1);
    });
    return { pts, normals, curved, kind };
}

/**
 * Taxiway edge lines as polylines, each with the inward (pavement-side) direction:
 * straight runs of the parallels and stubs with the junction mouths removed, plus the
 * fillet edges. { pts: [{x,z}...], normals: [{x,z}...] (inward), curved: bool, kind }
 */
export function taxiwayEdges() {
    const { junctions, fillets, apronFillets } = junctionGeometry();
    const edges = [];
    for (const taxi of [TAXI_N, TAXI_S]) {
        const side = taxi.z < 0 ? -1 : 1;
        const zNear = taxi.z - side * HW;
        const zFar = taxi.z + side * HW;
        // near (runway-side) edge
        const holesNear = [];
        for (const j of junctions) {
            if (!j.link || j.link.side !== side)
                continue;
            const fE = j.fillets["1:runway"];
            const fW = j.fillets["-1:runway"];
            const x0 = j.link.leads === "east" ? taxi.x0 - 1 : j.O.x - HW - (fW ? fW.sExtent : 0);
            const x1 = j.link.leads === "west" ? taxi.x1 + 1 : j.O.x + HW + (fE ? fE.sExtent : 0);
            holesNear.push([x0, x1]);
        }
        for (const [a, b] of subtractIntervals(taxi.x0, taxi.x1, holesNear))
            edges.push(withNormals([v(a, zNear), v(b, zNear)], v(0, side), false, "parallel"));
        // far edge: open where an apron adjoins (plus its fillets) or an apron-side turn fillet
        const holesFar = [];
        for (const f of apronFillets) {
            if (Math.sign(f.e2.z) !== side)
                continue;
            const xs = [f.K.x, f.K.x + f.e1.x * f.sExtent];
            holesFar.push([Math.min(...xs), Math.max(...xs)]);
        }
        for (const a of [APRON_S, APRON_N]) {
            if (Math.sign(a.z) === side)
                holesFar.push([a.x - a.width / 2, a.x + a.width / 2]);
        }
        for (const [a, b] of subtractIntervals(taxi.x0, taxi.x1, holesFar))
            edges.push(withNormals([v(a, zFar), v(b, zFar)], v(0, -side), false, "parallel"));
    }
    // stub edges: outboard sides of the end links are plain straights; every other stub
    // side is the merged fillet outline.
    const { stubSides } = junctionGeometry();
    for (const j of junctions) {
        if (!j.link)
            continue;
        const link = j.link;
        const taxi = linkTaxi(link);
        const sd = link.side;
        for (const sx of [-1, 1]) {
            if (stubSides.some((q) => q.link === link.id && q.sx === sx))
                continue;
            const x = link.x + sx * HW;
            const outboard = (link.leads === "east" && sx < 0) || (link.leads === "west" && sx > 0);
            const zP = outboard ? taxi.z + sd * HW : taxi.z - sd * HW;
            edges.push(withNormals([v(x, sd * RWY_EDGE), v(x, zP)], v(-sx, 0), false, "stub"));
        }
    }
    for (const q of stubSides)
        edges.push(withNormals(q.edge, polygonInterior(q.polygon), true, "stub"));
    for (const f of fillets) {
        if (f.merged)
            continue;
        edges.push(withNormals(f.edge, polygonInterior(f.polygon), true, f.kind));
    }
    return edges;
}


/** Half-width of a connector stub on side sx (±1) at world z, including fillet widening. */
export function stubHalfWidth(link, z, sx) {
    const q = junctionGeometry().stubSides.find((s) => s.link === link.id && s.sx === sx);
    if (!q)
        return HW;
    const pts = q.edge;
    for (let i = 1; i < pts.length; i++) {
        const a = pts[i - 1];
        const b = pts[i];
        if ((a.z - z) * (b.z - z) <= 0 && a.z !== b.z) {
            const f = (z - a.z) / (b.z - a.z);
            return Math.max(HW, Math.abs(a.x + (b.x - a.x) * f - link.x));
        }
    }
    return HW;
}
