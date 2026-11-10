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

export function leadArcPoints(link, R = LEAD_R) {
    const { x, side } = link;
    const leads = link.leads ?? "both";
    const east = [];
    const west = [];
    if (side < 0) {
        if (leads !== "west")
            east.push(...arcPoints(x + R, -R, R, Math.PI, Math.PI / 2));
        if (leads !== "east")
            west.push(...arcPoints(x - R, -R, R, 0, Math.PI / 2));
    }
    else {
        if (leads !== "west")
            east.push(...arcPoints(x + R, R, R, Math.PI, Math.PI * 1.5));
        if (leads !== "east")
            west.push(...arcPoints(x - R, R, R, 0, -Math.PI / 2));
    }
    return { east, west };
}

export function stubStraightPoints(link, stepM = 4) {
    const taxi = linkTaxi(link);
    const z0 = taxi.z;
    const z1 = link.side * LEAD_R;
    const span = z1 - z0;
    const n = Math.max(2, Math.round(Math.abs(span) / stepM));
    const pts = [];
    for (let i = 0; i <= n; i++) {
        pts.push({ x: link.x, z: z0 + (span * i) / n });
    }
    return pts;
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
