import { HOLD_DIST_CAT2, LINKS, TAXI_N, TAXI_S, linkTaxi } from "./world";

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

/** Centre-line path pieces used for both paint and inset lights. */
export function connectorPaths(link) {
    const arcs = leadArcPoints(link);
    return {
        straight: stubStraightPoints(link),
        east: arcs.east,
        west: arcs.west,
    };
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
