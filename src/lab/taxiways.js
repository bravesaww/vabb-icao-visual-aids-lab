import { HOLD_DIST_CAT2, LINKS, RWY_0927, TAXI_N, TAXI_S, headingVec, linkTaxi } from "./world";
import { distToMark, runwayObstacleMarks } from "./runwayPaint";

/** Pavement fillet radius at stub/runway and stub/parallel junctions (schematic). */
export const FILLET_R = 22;
/** Lead-on / lead-off centre-line curve radius onto the runway centre line (schematic). */
export const LEAD_R = 36;
/**
 * Alternate green/yellow taxiway centre-line lights from the runway centre line
 * out to this distance (Annex 14 §5.3.17 — ILS critical/sensitive area or the
 * inner edge of the strip; code-4 strip is 150 m each side of the centre line).
 */
export const ILS_ALT_ZONE_M = 150;

export function holdZ(link) {
    return link.side * HOLD_DIST_CAT2;
}

export function arcPoints(cx, cz, r, theta0, theta1, stepM = 3) {
    const sweep = theta1 - theta0;
    const n = Math.max(2, Math.round((Math.abs(sweep) * r) / stepM));
    const pts = [];
    for (let i = 0; i <= n; i++) {
        const t = theta0 + (sweep * i) / n;
        pts.push({ x: cx + r * Math.cos(t), z: cz + r * Math.sin(t) });
    }
    return pts;
}

/**
 * Lateral offset of the lead-on/lead-off line from the runway centre line (centre to centre).
 * Runway CL paint is 0.90 m wide (±0.45 m), taxi CL 0.30 m: 1.2 m leaves a clear 0.6 m
 * gap so the yellow line never lies on the white runway centre line (schematic/approximate).
 */
export const LEAD_OFFSET_M = 1.2;
/** Length of the parallel run beyond the point of tangency before the lead line ends (schematic). */
export const LEAD_PARALLEL_M = 60;

function straight(x0, z0, x1, z1, stepM = 4) {
    const n = Math.max(2, Math.round(Math.hypot(x1 - x0, z1 - z0) / stepM));
    const pts = [];
    for (let i = 0; i <= n; i++)
        pts.push({ x: x0 + ((x1 - x0) * i) / n, z: z0 + ((z1 - z0) * i) / n });
    return pts;
}

/**
 * Lead-on/lead-off curves. Each runs from the stub (tangent to the stub CL) round a
 * quarter circle to a tangency point offset LEAD_OFFSET_M from the runway CL on the
 * taxiway side, then parallel for LEAD_PARALLEL_M and stops.
 * Returned point order: stub end → tangency → parallel end.
 */
export function leadArcPoints(link, R = LEAD_R) {
    const { x, side } = link;
    const leads = link.leads ?? "both";
    const cz = side * (R + LEAD_OFFSET_M);
    const zLine = side * LEAD_OFFSET_M;
    const east = [];
    const west = [];
    if (leads !== "west") {
        const arc = side < 0 ? arcPoints(x + R, cz, R, Math.PI, Math.PI / 2) : arcPoints(x + R, cz, R, Math.PI, Math.PI * 1.5);
        east.push(...arc, ...straight(x + R, zLine, x + R + LEAD_PARALLEL_M, zLine).slice(1));
    }
    if (leads !== "east") {
        const arc = side < 0 ? arcPoints(x - R, cz, R, 0, Math.PI / 2) : arcPoints(x - R, cz, R, 0, -Math.PI / 2);
        west.push(...arc, ...straight(x - R, zLine, x - R - LEAD_PARALLEL_M, zLine).slice(1));
    }
    return { east, west };
}

/** Stub centre line from the parallel taxiway to the start of the lead curves. */
export function stubStraightPoints(link, stepM = 4) {
    const taxi = linkTaxi(link);
    return straight(link.x, taxi.z, link.x, link.side * (LEAD_R + LEAD_OFFSET_M), stepM);
}

/**
 * Clear gap kept between the edge of yellow taxiway centre-line paint and any white runway
 * marking it would otherwise meet. 1.5 m follows the State practice of breaking the taxiway
 * centre line 1.5 m from threshold / designation markings (e.g. UK RA 3514); Annex 14 itself
 * (Vol I 5.2.1.3, Standard) only requires the taxiway marking to be interrupted.
 */
export const RWY_MARK_CLEARANCE_M = 1.5;
const TAXI_CL_HALF_W = 0.15;
const MIN_PIECE_M = 3;

function densify(pts, stepM = 0.5) {
    const out = [pts[0]];
    for (let i = 1; i < pts.length; i++) {
        const a = pts[i - 1];
        const b = pts[i];
        const n = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) / stepM));
        for (let k = 1; k <= n; k++)
            out.push({ x: a.x + ((b.x - a.x) * k) / n, z: a.z + ((b.z - a.z) * k) / n });
    }
    return out;
}
function pathLen(pts) {
    let L = 0;
    for (let i = 1; i < pts.length; i++)
        L += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].z - pts[i - 1].z);
    return L;
}

let obstacleCache = null;
function obstacles() {
    if (!obstacleCache)
        obstacleCache = runwayObstacleMarks(RWY_0927);
    return obstacleCache;
}
function tooClose(pt) {
    const lim = RWY_MARK_CLEARANCE_M + TAXI_CL_HALF_W;
    for (const m of obstacles()) {
        if (Math.abs(pt.x - m.x) > 20 || Math.abs(pt.z - m.z) > 20)
            continue;
        if (distToMark(pt.x, pt.z, m) < lim)
            return true;
    }
    return false;
}

/**
 * Clip a lead line (stub end → tangency → parallel end) against white runway marks.
 * Annex 14 Vol I 5.2.1.3: the runway markings are displayed and the taxiway marking is
 * interrupted. On the curve the line is interrupted (gap, then resumes); on the parallel
 * run alongside the runway centre line it terminates at the first conflict, so no short
 * yellow fragments are left between threshold / arrow / TDZ marks.
 * Returns an array of polylines (pieces), each still ordered stub → runway.
 */
export function clipLeadAgainstRunwayPaint(raw) {
    const pts = densify(raw);
    const pieces = [];
    let cur = [];
    for (const pt of pts) {
        const onParallel = Math.abs(Math.abs(pt.z) - LEAD_OFFSET_M) < 0.01;
        if (tooClose(pt)) {
            if (cur.length)
                pieces.push(cur);
            cur = [];
            if (onParallel)
                break;
            continue;
        }
        cur.push(pt);
    }
    if (cur.length)
        pieces.push(cur);
    return pieces.filter((p) => p.length > 1 && pathLen(p) >= MIN_PIECE_M);
}

const pathCache = new Map();
/**
 * Centre-line path pieces used for both paint and inset lights.
 * `straight` is one polyline; `east` / `west` are arrays of clipped polylines.
 */
export function connectorPaths(link) {
    const key = link.id ?? `${link.x},${link.side}`;
    if (pathCache.has(key))
        return pathCache.get(key);
    const arcs = leadArcPoints(link);
    const res = {
        straight: stubStraightPoints(link),
        east: arcs.east.length ? clipLeadAgainstRunwayPaint(arcs.east) : [],
        west: arcs.west.length ? clipLeadAgainstRunwayPaint(arcs.west) : [],
    };
    pathCache.set(key, res);
    return res;
}

/**
 * Along-runway intervals where each runway side stripe is interrupted for a lead line to
 * cross it (Annex 14 Vol I 5.2.1.3 permits interrupting side stripes), with the same
 * RWY_MARK_CLEARANCE_M either side so no yellow paint touches the white stripe.
 */
export function sideStripeGaps(rwy = RWY_0927) {
    const { fx, fz, rx, rz } = headingVec(rwy.heading);
    const stripeAcross = rwy.width / 2 - 0.45;
    const lim = 0.45 + RWY_MARK_CLEARANCE_M + TAXI_CL_HALF_W;
    const gaps = [];
    for (const link of LINKS) {
        const p = connectorPaths(link);
        for (const piece of [...p.east, ...p.west]) {
            for (const side of [1, -1]) {
                let a0 = Infinity;
                let a1 = -Infinity;
                for (const pt of piece) {
                    const dx = pt.x - rwy.center.x;
                    const dz = pt.z - rwy.center.z;
                    const along = dx * fx + dz * fz;
                    const across = dx * rx + dz * rz;
                    if (Math.abs(across - side * stripeAcross) < lim) {
                        a0 = Math.min(a0, along);
                        a1 = Math.max(a1, along);
                    }
                }
                if (a1 >= a0)
                    gaps.push({ side, a0: a0 - TAXI_CL_HALF_W - RWY_MARK_CLEARANCE_M, a1: a1 + TAXI_CL_HALF_W + RWY_MARK_CLEARANCE_M });
            }
        }
    }
    return gaps;
}

export function apronSpurPoints(spur, stepM = 4) {
    const span = spur.z1 - spur.z0;
    const n = Math.max(2, Math.round(Math.abs(span) / stepM));
    const pts = [];
    for (let i = 0; i <= n; i++) {
        pts.push({ x: spur.x, z: spur.z0 + (span * i) / n });
    }
    return pts;
}

export function allLinks() {
    return LINKS;
}

export { TAXI_N, TAXI_S, LINKS };
