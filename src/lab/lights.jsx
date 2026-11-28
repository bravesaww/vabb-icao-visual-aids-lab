import { useFrame, useThree } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useLab } from "./store";
import { ILS_ALT_ZONE_M, apronSpurPoints, connectorPaths, holdZ } from "./taxiways";
import { apronFreeEdges, junctionGeometry, stubHalfWidth, taxiwayEdges, TAXI_SHOULDER_M } from "./junctions";
import { RWY_0927, TAXI_N, TAXI_S, LINKS, TAXI_WIDTH, APRON_SPURS, HOLD_DIST_A, HOLD_DIST_B, holdOf, rwyPos, headingVec, thresholdAlong, landingSign, physicalAlong, aimingInnerSpacing, linkTaxi } from "./world";

const C = {
    white: "#fff8f0",
    yellow: "#f0c040",
    red: "#ee4a3c",
    green: "#42d474",
    blue: "#4a8eec",
};
const HOUSING = "#2a2c2e";

function bucket() {
    return { white: [], yellow: [], red: [], green: [], blue: [] };
}
function push(sysBuckets, item) {
    const b = sysBuckets[item.sys] ?? (sysBuckets[item.sys] = bucket());
    if (item.color === C.yellow)
        b.yellow.push(item);
    else if (item.color === C.red)
        b.red.push(item);
    else if (item.color === C.green)
        b.green.push(item);
    else if (item.color === C.blue)
        b.blue.push(item);
    else
        b.white.push(item);
}

/** Annex 14 §5.3.9.7: yellow over the last 600 m or last third, whichever is less. */
export function edgeCautionLength(rwy) {
    return Math.min(600, rwy.length / 3);
}

/**
 * Distance remaining to the far (stop) end for traffic operating in direction `dir`
 * ("09" = travelling east, "27" = travelling west).
 */
function remainingFor(rwy, dir, along) {
    const travel = landingSign(rwy.ends[dir]);
    const half = rwy.length / 2;
    return travel > 0 ? half - along : along + half;
}

/**
 * Runway edge lights (§5.3.9). Fittings are bi-directional; the colour shown depends on
 * the direction of operation: variable white, yellow over the last 600 m toward the stop
 * end (§5.3.9.7), and red toward the approach over the displaced section before the
 * threshold in use (§5.3.9.8).
 */
function edgeLamps(rwy, sysBuckets, dir) {
    const step = 60;
    const half = rwy.length / 2;
    const edge = rwy.width / 2 + 0.2;
    const caution = edgeCautionLength(rwy);
    const end = rwy.ends[dir];
    const ls = landingSign(end);
    const thr = thresholdAlong(rwy, dir);
    const pre = end.preThrEdgeRedM ?? end.displaced;
    for (let along = -half; along <= half + 0.01; along += step) {
        let col = remainingFor(rwy, dir, along) <= caution + 0.01 ? C.yellow : C.white;
        const distBeforeThr = (thr - along) * ls;
        if (distBeforeThr > 0 && distBeforeThr <= pre + 1)
            col = C.red;
        for (const side of [-edge, edge]) {
            const p = rwyPos(rwy, along, side, 0.45);
            push(sysBuckets, { ...p, color: col, r: 0.28, sys: "edge" });
        }
    }
}

/** Runway CL lights (§5.3.12.5) coded by distance remaining in the direction of operation. */
function clLamps(rwy, sysBuckets, dir) {
    const step = rwy.clLightSpacing || 15;
    const half = rwy.length / 2;
    for (let along = -half + 8; along < half - 8; along += step) {
        const rem = remainingFor(rwy, dir, along);
        let col = C.white;
        if (rem <= 300)
            col = C.red;
        else if (rem <= 900)
            col = Math.round(along / step) % 2 === 0 ? C.red : C.white;
        const p = rwyPos(rwy, along, 0, 0.06);
        push(sysBuckets, { ...p, color: col, r: 0.16, sys: "centreLine", cap: 3.2 });
    }
}

function thresholdBar(rwy, endName, sysBuckets) {
    const end = rwy.ends[endName];
    const thr = thresholdAlong(rwy, endName);
    const n = Math.round(rwy.width / 3);
    for (let i = 0; i < n; i++) {
        const across = -rwy.width / 2 + 1.5 + i * 3;
        const p = rwyPos(rwy, thr, across, 0.4);
        push(sysBuckets, { ...p, color: C.green, r: 0.22, sys: "edge" });
    }
    for (const side of [-1, 1]) {
        for (let k = 1; k <= 5; k++) {
            const p = rwyPos(rwy, thr, side * (rwy.width / 2 + 2 + k * 2.4), 0.4);
            push(sysBuckets, { ...p, color: C.green, r: 0.22, sys: "edge" });
        }
    }
    const phys = physicalAlong(rwy, end.sign);
    for (let i = 0; i < n; i++) {
        const across = -rwy.width / 2 + 1.5 + i * 3;
        const p = rwyPos(rwy, phys, across, 0.4);
        push(sysBuckets, { ...p, color: C.red, r: 0.22, sys: "edge" });
    }
}

function als(rwy, endName, sysBuckets, rabbit) {
    const end = rwy.ends[endName];
    const ls = landingSign(end);
    const thr = thresholdAlong(rwy, endName);
    const len = end.alsM;
    const inner = aimingInnerSpacing(rwy.width);
    for (let d = 30; d <= len; d += 30) {
        const along = thr - ls * d;
        for (const ac of [-6, -3, 0, 3, 6]) {
            const p = rwyPos(rwy, along, ac, 0.55);
            push(sysBuckets, { ...p, color: C.white, r: 0.2, sys: "approach" });
        }
        const rf = rwyPos(rwy, along, 0, 0.9);
        rabbit.push({ ...rf, color: C.white, r: 0.2, sys: "approach" });
        if (d <= 270) {
            for (const side of [-1, 1]) {
                for (const k of [0, 1, 2, 3]) {
                    const p = rwyPos(rwy, along, side * (inner / 2 + 1 + k * 1.2), 0.55);
                    push(sysBuckets, { ...p, color: C.red, r: 0.18, sys: "approach" });
                }
            }
        }
        if (d === 300) {
            for (const ac of [-18, -15, -12, -9, 9, 12, 15, 18]) {
                const q = rwyPos(rwy, along, ac, 0.55);
                push(sysBuckets, { ...q, color: C.white, r: 0.18, sys: "approach" });
            }
        }
    }
}

function tdzLights(rwy, endName, sysBuckets) {
    const end = rwy.ends[endName];
    if (!end.tdzLightsM)
        return;
    const ls = landingSign(end);
    const thr = thresholdAlong(rwy, endName);
    const inner = aimingInnerSpacing(rwy.width);
    for (let d = 30; d <= end.tdzLightsM; d += 30) {
        const along = thr + ls * d;
        for (const side of [-1, 1]) {
            for (const k of [0, 1, 2]) {
                const p = rwyPos(rwy, along, side * (inner / 2 + 0.6 + k * 1.4), 0.06);
                push(sysBuckets, { ...p, color: C.white, r: 0.14, sys: "tdz" });
            }
        }
    }
}

/** Stop-bar z: just on the holding / taxiway side of the marking (5.3.20.4). */
function stopBarZ(link, which) {
    const away = link.side; // away from the runway
    return holdZ(link, which) + away * 0.45;
}

function stopAndGuard(sysBuckets, rgl, clicks) {
    // Inset stop bars at ≤ 3 m across the taxiway (5.3.20.5); a pair of elevated
    // lights at each end, not less than 3 m from the taxiway edge (5.3.20.6 / 5.3.20.4).
    // Runway guard lights, Configuration A, at Pattern A only (5.3.23.5 / 5.3.23.7).
    for (const link of LINKS) {
        for (const which of ["A", "B"]) {
            const z = stopBarZ(link, which);
            const hwW = stubHalfWidth(link, z, -1);
            const hwE = stubHalfWidth(link, z, 1);
            for (let x = -Math.floor((hwW - 0.75) / 3) * 3; x <= hwE - 0.75; x += 3) {
                push(sysBuckets, { x: link.x + x, y: 0.06, z, color: C.red, r: 0.08, sys: "stopBars", fit: "inset", hold: which, linkId: link.id });
            }
            push(sysBuckets, { x: link.x - hwW - TAXI_SHOULDER_M - 1.8, y: 0.45, z, color: C.red, r: 0.06, sys: "stopBars", fit: "elevated", hold: which, linkId: link.id });
            push(sysBuckets, { x: link.x + hwE + TAXI_SHOULDER_M + 1.8, y: 0.45, z, color: C.red, r: 0.06, sys: "stopBars", fit: "elevated", hold: which, linkId: link.id });
            clicks.push({ x: link.x, z, w: hwW + hwE, which, linkId: link.id });
        }
        // Config A: one unit (a pair of yellow lights) on each side, on the holding
        // side of the Pattern A marking, facing the approaching aircraft.
        const zA = holdZ(link, "A") + link.side * 1.4;
        const hwW = stubHalfWidth(link, zA, -1);
        const hwE = stubHalfWidth(link, zA, 1);
        rgl.push({ x: link.x - hwW - TAXI_SHOULDER_M - 1.2, z: zA, side: link.side, linkId: link.id });
        rgl.push({ x: link.x + hwE + TAXI_SHOULDER_M + 1.2, z: zA, side: link.side, linkId: link.id });
    }
}

function addReil(rwy, endName, reil) {
    const p = rwyPos(rwy, thresholdAlong(rwy, endName), 0);
    const { rx, rz } = headingVec(rwy.heading);
    const off = rwy.width / 2 + 10;
    reil.push({ x: p.x + rx * off, y: 1.6, z: p.z + rz * off, color: C.white, r: 0.38, sys: "approach" });
    reil.push({ x: p.x - rx * off, y: 1.6, z: p.z - rz * off, color: C.white, r: 0.38, sys: "approach" });
}

function uniquePts(pts, eps = 1.2) {
    const out = [];
    for (const p of pts) {
        if (out.some((q) => Math.hypot(q.x - p.x, q.z - p.z) < eps))
            continue;
        out.push(p);
    }
    return out;
}

function sampleAlong(pts, spacing) {
    if (pts.length === 0)
        return [];
    const out = [{ x: pts[0].x, z: pts[0].z }];
    let acc = 0;
    for (let i = 1; i < pts.length; i++) {
        const x0 = pts[i - 1].x;
        const z0 = pts[i - 1].z;
        const x1 = pts[i].x;
        const z1 = pts[i].z;
        const seg = Math.hypot(x1 - x0, z1 - z0) || 1e-6;
        let used = 0;
        while (acc + (seg - used) >= spacing) {
            const need = spacing - acc;
            used += need;
            const f = used / seg;
            out.push({ x: x0 + (x1 - x0) * f, z: z0 + (z1 - z0) * f });
            acc = 0;
        }
        acc += seg - used;
    }
    return out;
}

function pointsAlongPolyline(pts, spacing, includeEnds = true) {
    // Uniform spacing ≤ `spacing` along a polyline, both ends included.
    let L = 0;
    for (let i = 1; i < pts.length; i++)
        L += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].z - pts[i - 1].z);
    if (L < 0.5)
        return includeEnds ? [pts[0]] : [];
    const n = Math.max(1, Math.ceil(L / spacing));
    const out = [];
    let seg = 1;
    let acc = 0;
    for (let k = 0; k <= n; k++) {
        if (!includeEnds && (k === 0 || k === n))
            continue;
        const target = (L * k) / n;
        while (seg < pts.length - 1 && acc + Math.hypot(pts[seg].x - pts[seg - 1].x, pts[seg].z - pts[seg - 1].z) < target) {
            acc += Math.hypot(pts[seg].x - pts[seg - 1].x, pts[seg].z - pts[seg - 1].z);
            seg++;
        }
        const a = pts[seg - 1];
        const b = pts[seg];
        const sl = Math.hypot(b.x - a.x, b.z - a.z) || 1e-6;
        const f = Math.min(1, Math.max(0, (target - acc) / sl));
        out.push({ x: a.x + (b.x - a.x) * f, z: a.z + (b.z - a.z) * f });
    }
    return out;
}

function taxiLamps(sysBuckets) {
    // Blue edge lights (Annex 14 5.3.18): ≤ 60 m on straights, 7.5 m on fillet curves,
    // at the pavement edge, never on pavement, never on the runway (≥ 2 m outside its edge).
    const seen = new Set();
    const blue = (p) => {
        if (Math.abs(p.z) < RWY_0927.width / 2 + 2)
            return;
        const k = `${Math.round(p.x * 2)},${Math.round(p.z * 2)}`;
        if (seen.has(k))
            return;
        seen.add(k);
        push(sysBuckets, { x: p.x, y: 0.35, z: p.z, color: C.blue, r: 0.06, sys: "taxiway", fit: "elevated" });
    };
    for (const e of taxiwayEdges()) {
        for (const p of pointsAlongPolyline(e.pts, e.curved ? 7.5 : 60))
            blue(p);
    }
    // Apron edges (Annex 14 5.3.18.4: ≤ 60 m on an apron).
    for (const e of apronFreeEdges()) {
        for (const p of pointsAlongPolyline(e.pts, 60))
            blue(p);
    }
    for (const tw of [TAXI_N, TAXI_S]) {
        for (let x = tw.x0; x <= tw.x1; x += 30) {
            push(sysBuckets, { x, y: 0.06, z: tw.z, color: C.green, r: 0.08, sys: "taxiway", fit: "inset" });
        }
    }
    // Centre-line lights on the junction turn curves (5.3.17.14 / 5.3.17.15: 7.5 m on
    // curves under 400 m radius). Inside the 150 m coded zone they alternate green/yellow
    // with the perimeter (zone-boundary) lamp yellow; outside, green.
    for (const t of junctionGeometry().turns) {
        const pts = pointsAlongPolyline(t.pts, 7.5, false);
        const inZone = pts.map((p) => Math.abs(p.z) <= ILS_ALT_ZONE_M);
        // Points run from the parallel (index 0) toward the stub; the first in-zone lamp is
        // the one at the zone boundary (perimeter), which must be yellow.
        const k0 = inZone.indexOf(true);
        pts.forEach((p, i) => {
            let col = C.green;
            if (k0 >= 0 && inZone[i])
                col = (i - k0) % 2 === 0 ? C.yellow : C.green;
            push(sysBuckets, { x: p.x, y: 0.06, z: p.z, color: col, r: 0.08, sys: "taxiway", fit: "inset" });
        });
    }
    for (const link of LINKS) {
        // Centre-line lights follow the offset lead line (LEAD_OFFSET_M clear of the runway CL).
        // §5.3.17: alternate green/yellow from the runway end of the lead line out to the
        // ILS critical area / strip edge; first (nearest runway CL) green, last yellow.
        const paths = connectorPaths(link);
        const stubPts = sampleAlong([...paths.straight].reverse(), 15).slice(1);
        // Lights follow exactly the painted (clipped) lead pieces, so no lamp sits where the
        // yellow line is interrupted for white runway markings. Each lead's pieces are
        // sampled from the runway end back toward the stub to keep the colour sequence.
        const leads = [paths.east, paths.west].filter((l) => l.length > 0);
        const seqs = leads.map((pieces) => [...pieces].reverse().flatMap((pc) => sampleAlong([...pc].reverse(), 12)));
        const stubSeq = stubPts;
        const colourSeq = (seq, startIdx) => seq.map((pt, k) => ({ pt, i: startIdx + k }));
        const all = [];
        for (const s of seqs)
            all.push(...colourSeq(s, 0));
        const leadLen = seqs.length ? seqs[0].length : 0;
        all.push(...colourSeq(stubSeq, leadLen));
        const lastInZone = Math.max(...all.filter((a) => Math.abs(a.pt.z) <= ILS_ALT_ZONE_M).map((a) => a.i), 0);
        for (const { pt, i } of all) {
            let col = C.green;
            if (Math.abs(pt.z) <= ILS_ALT_ZONE_M) {
                col = i % 2 === 0 ? C.green : C.yellow;
                if (i === lastInZone)
                    col = C.yellow;
            }
            const nearCl = Math.abs(pt.z) < 4;
            push(sysBuckets, { x: pt.x, y: 0.06, z: pt.z, color: col, r: 0.08, sys: "taxiway", fit: "inset", leadOn: true, ...(nearCl ? { cap: 2.2 } : {}) });
        }
    }
    for (const spur of APRON_SPURS) {
        for (const pt of sampleAlong(apronSpurPoints(spur), 15)) {
            push(sysBuckets, { x: pt.x, y: 0.06, z: pt.z, color: C.green, r: 0.08, sys: "taxiway", fit: "inset" });
        }
    }
}

function glowScale(lighting) {
    // Tight halo only. Distant visibility uses a modest distance scale so
    // lamps stay small up close (walk mode) but readable from the approach.
    if (lighting === "night")
        return { core: 1.0, glow: 1.45, opacity: 0.3, k: 0.0017, maxMul: 6 };
    if (lighting === "dusk")
        return { core: 1.0, glow: 1.3, opacity: 0.2, k: 0.00115, maxMul: 4.5 };
    return { core: 1.0, glow: 1.2, opacity: 0.12, k: 0.0007, maxMul: 3 };
}

function scaledRadius(baseR, mul, dist, k, maxMul) {
    const close = baseR * mul;
    return Math.min(close * maxMul, Math.max(close, k * dist * mul));
}

function InstancedLamps({ items, color, pulse, lit, lighting }) {
    const coreRef = useRef(null);
    const glowRef = useRef(null);
    const { camera } = useThree();
    const geo = useMemo(() => new THREE.SphereGeometry(1, 8, 6), []);
    const coreMat = useMemo(() => new THREE.MeshBasicMaterial({
        color: lit ? color : HOUSING,
        toneMapped: false,
        fog: !lit,
    }), [color, lit]);
    const glowMat = useMemo(() => new THREE.MeshBasicMaterial({
        color,
        toneMapped: false,
        transparent: true,
        opacity: glowScale(lighting).opacity,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        fog: false,
    }), [color, lighting]);
    const base = useMemo(() => items.map((it) => it.r ?? 0.16), [items]);
    const caps = useMemo(() => items.map((it) => it.cap), [items]);
    const scales = glowScale(lighting);
    const scratch = useMemo(() => new THREE.Vector3(), []);
    useLayoutEffect(() => {
        const write = (mesh, mul) => {
            if (!mesh)
                return;
            const dummy = new THREE.Object3D();
            items.forEach((it, i) => {
                dummy.position.set(it.x, it.y, it.z);
                dummy.scale.setScalar(base[i] * mul);
                dummy.updateMatrix();
                mesh.setMatrixAt(i, dummy.matrix);
            });
            mesh.instanceMatrix.needsUpdate = true;
            mesh.computeBoundingSphere();
        };
        write(coreRef.current, lit ? scales.core : 0.85);
        if (lit)
            write(glowRef.current, scales.glow);
    }, [items, base, lit, scales.core, scales.glow]);
    useFrame(({ clock }) => {
        if (!coreRef.current)
            return;
        const t = clock.getElapsedTime();
        const dummy = new THREE.Object3D();
        items.forEach((it, i) => {
            const dist = camera.position.distanceTo(scratch.set(it.x, it.y, it.z));
            const flash = lit && pulse ? pulse(t, i) : 1;
            dummy.position.set(it.x, it.y, it.z);
            if (lit) {
                dummy.scale.setScalar(scaledRadius(base[i], scales.core, dist, scales.k, Math.min(scales.maxMul, caps[i] ?? Infinity)) * flash);
            }
            else {
                dummy.scale.setScalar(base[i] * 0.85);
            }
            dummy.updateMatrix();
            coreRef.current.setMatrixAt(i, dummy.matrix);
            if (lit && glowRef.current) {
                dummy.scale.setScalar(scaledRadius(base[i], scales.glow, dist, scales.k, Math.min(scales.maxMul, caps[i] ?? Infinity)) * flash);
                dummy.updateMatrix();
                glowRef.current.setMatrixAt(i, dummy.matrix);
            }
        });
        coreRef.current.instanceMatrix.needsUpdate = true;
        if (glowRef.current)
            glowRef.current.instanceMatrix.needsUpdate = true;
    });
    if (items.length === 0)
        return null;
    return (<>
      <instancedMesh ref={coreRef} args={[geo, coreMat, items.length]} frustumCulled={false}/>
      {lit ? <instancedMesh ref={glowRef} args={[geo, glowMat, items.length]} frustumCulled={false}/> : null}
    </>);
}

function PapiUnit({ position, headingDeg, angleDeg, lit }) {
    const lens = useRef(null);
    const { camera } = useThree();
    const { fx, fz } = headingVec(headingDeg);
    const approachX = -fx;
    const approachZ = -fz;
    useFrame(() => {
        if (!lens.current)
            return;
        const mat = lens.current.material;
        if (!lit) {
            mat.color.set(HOUSING);
            return;
        }
        const dx = camera.position.x - position[0];
        const dy = camera.position.y - position[1];
        const dz = camera.position.z - position[2];
        const along = dx * approachX + dz * approachZ;
        const ground = Math.hypot(along, dx * fx + dz * fz) || 0.001;
        const elev = (Math.atan2(dy, Math.max(ground, 1)) * 180) / Math.PI;
        const white = elev > angleDeg;
        mat.color.set(white ? "#f7f4ea" : "#e03a32");
    });
    const yaw = Math.atan2(fx, fz);
    return (<group position={position} rotation={[0, yaw, 0]}>
      <mesh position={[0, -0.55, 0]}>
        <boxGeometry args={[0.18, 1.1, 0.18]}/>
        <meshStandardMaterial color="#2a2c2e" roughness={0.8}/>
      </mesh>
      <mesh>
        <boxGeometry args={[1.15, 0.7, 0.9]}/>
        <meshStandardMaterial color="#1a1c1e" roughness={0.6}/>
      </mesh>
      <mesh ref={lens} position={[0, 0.05, -0.48]} rotation={[0, Math.PI, 0]}>
        <circleGeometry args={[0.28, 20]}/>
        <meshBasicMaterial color="#e03a32" toneMapped={false} side={THREE.DoubleSide} fog={false}/>
      </mesh>
      {lit ? <mesh position={[0, 0.05, -0.5]} rotation={[0, Math.PI, 0]}>
        <circleGeometry args={[0.36, 20]}/>
        <meshBasicMaterial color="#ffd0c0" toneMapped={false} transparent opacity={0.22} blending={THREE.AdditiveBlending} depthWrite={false} side={THREE.DoubleSide} fog={false}/>
      </mesh> : null}
    </group>);
}

/** Annex 14 Vol I 5.3.5.24 / 5.3.5.28 / Figure 5-19: four units on the left side
 *  unless impracticable; inboard unit 15 m (±1 m) from the runway edge, 9 m (±1 m)
 *  spacing (code 3/4). D1 is end.papiSitingM (aiming-point origin / schematic). */
function PapiRow({ rwy, endName, lit }) {
    const end = rwy.ends[endName];
    const ls = landingSign(end);
    const thr = thresholdAlong(rwy, endName);
    const along = thr + ls * (end.papiSitingM || 400);
    const sideSign = end.papiSide === "right" ? ls : -ls;
    const inboard = sideSign * (rwy.width / 2 + 15);
    const angles = [end.papiDeg - 0.5, end.papiDeg - 0.17, end.papiDeg + 0.17, end.papiDeg + 0.5];
    return (<group>
      {angles.map((ang, i) => {
            const across = inboard + sideSign * i * 9;
            const p = rwyPos(rwy, along, across, 1.15);
            return (<PapiUnit key={i} position={[p.x, p.y, p.z]} headingDeg={end.heading} angleDeg={ang} lit={lit}/>);
        })}
    </group>);
}


/** Small elevated taxiway-edge fitting: dark stem + blue lens, readable in daylight
 *  without a large glow (lens is MeshBasicMaterial). Night adds a tight halo only. */
function ElevatedEdgeFittings({ items, lit, lighting, color = C.blue }) {
    const stemRef = useRef(null);
    const lensRef = useRef(null);
    const glowRef = useRef(null);
    const { camera } = useThree();
    const stemGeo = useMemo(() => new THREE.CylinderGeometry(0.018, 0.022, 0.32, 6), []);
    const lensGeo = useMemo(() => new THREE.SphereGeometry(0.055, 10, 8), []);
    const glowGeo = useMemo(() => new THREE.SphereGeometry(1, 8, 6), []);
    const stemMat = useMemo(() => new THREE.MeshStandardMaterial({ color: "#2a2c2e", roughness: 0.85, metalness: 0.2 }), []);
    const lensMat = useMemo(() => new THREE.MeshBasicMaterial({
        color: lit ? color : HOUSING,
        toneMapped: false,
        fog: !lit,
    }), [lit, color]);
    const glowMat = useMemo(() => new THREE.MeshBasicMaterial({
        color,
        toneMapped: false,
        transparent: true,
        opacity: lighting === "night" ? 0.32 : lighting === "dusk" ? 0.18 : 0.08,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        fog: false,
    }), [lighting, color]);
    const scratch = useMemo(() => new THREE.Vector3(), []);
    useLayoutEffect(() => {
        const dummy = new THREE.Object3D();
        items.forEach((it, i) => {
            dummy.position.set(it.x, 0.16, it.z);
            dummy.scale.set(1, 1, 1);
            dummy.updateMatrix();
            if (stemRef.current)
                stemRef.current.setMatrixAt(i, dummy.matrix);
            dummy.position.set(it.x, 0.36, it.z);
            dummy.updateMatrix();
            if (lensRef.current)
                lensRef.current.setMatrixAt(i, dummy.matrix);
        });
        if (stemRef.current) {
            stemRef.current.instanceMatrix.needsUpdate = true;
            stemRef.current.computeBoundingSphere();
        }
        if (lensRef.current) {
            lensRef.current.instanceMatrix.needsUpdate = true;
            lensRef.current.computeBoundingSphere();
        }
    }, [items]);
    useFrame(() => {
        if (!lit || !glowRef.current)
            return;
        const dummy = new THREE.Object3D();
        const night = lighting !== "day";
        const k = lighting === "night" ? 0.0012 : lighting === "dusk" ? 0.0008 : 0.00035;
        const maxMul = lighting === "night" ? 4 : lighting === "dusk" ? 3 : 1.6;
        items.forEach((it, i) => {
            const dist = camera.position.distanceTo(scratch.set(it.x, it.y, it.z));
            const r = Math.min(0.055 * maxMul, Math.max(0.09, k * dist));
            dummy.position.set(it.x, 0.36, it.z);
            dummy.scale.setScalar(night ? r : 0.09);
            dummy.updateMatrix();
            glowRef.current.setMatrixAt(i, dummy.matrix);
        });
        glowRef.current.instanceMatrix.needsUpdate = true;
    });
    if (items.length === 0)
        return null;
    return (<>
      <instancedMesh ref={stemRef} args={[stemGeo, stemMat, items.length]} frustumCulled={false} castShadow={false}/>
      <instancedMesh ref={lensRef} args={[lensGeo, lensMat, items.length]} frustumCulled={false}/>
      {lit ? <instancedMesh ref={glowRef} args={[glowGeo, glowMat, items.length]} frustumCulled={false}/> : null}
    </>);
}

/** Flush taxiway centre-line lamp: dark ring + self-lit lens, small at all distances. */
function InsetTaxiLamps({ items, color, lit, lighting }) {
    const ringRef = useRef(null);
    const lensRef = useRef(null);
    const glowRef = useRef(null);
    const { camera } = useThree();
    const ringGeo = useMemo(() => new THREE.CylinderGeometry(0.11, 0.11, 0.02, 10), []);
    const lensGeo = useMemo(() => new THREE.CylinderGeometry(0.07, 0.07, 0.025, 10), []);
    const glowGeo = useMemo(() => new THREE.SphereGeometry(1, 8, 6), []);
    const ringMat = useMemo(() => new THREE.MeshStandardMaterial({ color: "#1a1c1e", roughness: 0.7, metalness: 0.4 }), []);
    const lensMat = useMemo(() => new THREE.MeshBasicMaterial({
        color: lit ? color : HOUSING,
        toneMapped: false,
        fog: !lit,
    }), [color, lit]);
    const glowMat = useMemo(() => new THREE.MeshBasicMaterial({
        color,
        toneMapped: false,
        transparent: true,
        opacity: lighting === "night" ? 0.28 : lighting === "dusk" ? 0.16 : 0.1,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        fog: false,
    }), [color, lighting]);
    const scratch = useMemo(() => new THREE.Vector3(), []);
    useLayoutEffect(() => {
        const dummy = new THREE.Object3D();
        items.forEach((it, i) => {
            dummy.position.set(it.x, 0.04, it.z);
            dummy.updateMatrix();
            if (ringRef.current)
                ringRef.current.setMatrixAt(i, dummy.matrix);
            dummy.position.set(it.x, 0.055, it.z);
            dummy.updateMatrix();
            if (lensRef.current)
                lensRef.current.setMatrixAt(i, dummy.matrix);
        });
        if (ringRef.current) {
            ringRef.current.instanceMatrix.needsUpdate = true;
            ringRef.current.computeBoundingSphere();
        }
        if (lensRef.current) {
            lensRef.current.instanceMatrix.needsUpdate = true;
            lensRef.current.computeBoundingSphere();
        }
    }, [items]);
    useFrame(() => {
        if (!lit || !glowRef.current)
            return;
        const dummy = new THREE.Object3D();
        const k = lighting === "night" ? 0.0011 : lighting === "dusk" ? 0.0007 : 0.0003;
        const maxR = lighting === "night" ? 0.28 : lighting === "dusk" ? 0.18 : 0.1;
        items.forEach((it, i) => {
            const dist = camera.position.distanceTo(scratch.set(it.x, it.y, it.z));
            const cap = it.cap ?? Infinity;
            const r = Math.min(maxR, cap * 0.08, Math.max(0.08, k * dist));
            dummy.position.set(it.x, 0.07, it.z);
            dummy.scale.setScalar(r);
            dummy.updateMatrix();
            glowRef.current.setMatrixAt(i, dummy.matrix);
        });
        glowRef.current.instanceMatrix.needsUpdate = true;
    });
    if (items.length === 0)
        return null;
    return (<>
      <instancedMesh ref={ringRef} args={[ringGeo, ringMat, items.length]} frustumCulled={false}/>
      <instancedMesh ref={lensRef} args={[lensGeo, lensMat, items.length]} frustumCulled={false}/>
      {lit ? <instancedMesh ref={glowRef} args={[glowGeo, glowMat, items.length]} frustumCulled={false}/> : null}
    </>);
}

const COLOR_KEYS = ["white", "yellow", "red", "green", "blue"];

/** Auto direction of operation: looking east = RWY 09 traffic, looking west = RWY 27. */
function ViewDirectionTracker() {
    const { camera } = useThree();
    const fwd = useMemo(() => new THREE.Vector3(), []);
    useFrame(() => {
        camera.getWorldDirection(fwd);
        const st = useLab.getState();
        if (st.opDirection !== "auto")
            return;
        // Hysteresis so a near-north/south view does not flicker the colours.
        if (fwd.x > 0.2 && st.viewDirection !== "09")
            st.setViewDirection("09");
        else if (fwd.x < -0.2 && st.viewDirection !== "27")
            st.setViewDirection("27");
    });
    return null;
}


/** Configuration A runway guard light (5.3.23.7 / 5.3.23.17 / 5.3.23.19):
 *  a small black unit with two yellow lenses that flash alternately at 45 cpm
 *  (within the 30–60 cpm range, equal on/off). Faces the approaching aircraft. */
function GuardUnit({ x, z, side, lit, lighting }) {
    const left = useRef(null);
    const right = useRef(null);
    const glowL = useRef(null);
    const glowR = useRef(null);
    useFrame(({ clock }) => {
        const onL = lit && ((clock.getElapsedTime() * 0.75) % 1 < 0.5);
        const onR = lit && !onL;
        if (left.current)
            left.current.material.color.set(onL ? C.yellow : HOUSING);
        if (right.current)
            right.current.material.color.set(onR ? C.yellow : HOUSING);
        if (glowL.current)
            glowL.current.visible = onL && lighting !== "day";
        if (glowR.current)
            glowR.current.visible = onR && lighting !== "day";
    });
    const face = side < 0 ? Math.PI : 0;
    return (<group position={[x, 0, z]} rotation={[0, face, 0]}>
      <mesh position={[0, 0.32, 0]}>
        <boxGeometry args={[0.12, 0.55, 0.12]}/>
        <meshStandardMaterial color="#2a2c2e" roughness={0.8}/>
      </mesh>
      <mesh position={[0, 0.55, 0]}>
        <boxGeometry args={[0.42, 0.28, 0.16]}/>
        <meshStandardMaterial color="#1a1c1e" roughness={0.7} metalness={0.25}/>
      </mesh>
      <mesh ref={left} position={[-0.1, 0.55, 0.09]}>
        <sphereGeometry args={[0.055, 10, 8]}/>
        <meshBasicMaterial color={HOUSING} toneMapped={false}/>
      </mesh>
      <mesh ref={right} position={[0.1, 0.55, 0.09]}>
        <sphereGeometry args={[0.055, 10, 8]}/>
        <meshBasicMaterial color={HOUSING} toneMapped={false}/>
      </mesh>
      <mesh ref={glowL} position={[-0.1, 0.55, 0.09]} visible={false}>
        <sphereGeometry args={[0.16, 8, 6]}/>
        <meshBasicMaterial color={C.yellow} toneMapped={false} transparent opacity={0.35} depthWrite={false}/>
      </mesh>
      <mesh ref={glowR} position={[0.1, 0.55, 0.09]} visible={false}>
        <sphereGeometry args={[0.16, 8, 6]}/>
        <meshBasicMaterial color={C.yellow} toneMapped={false} transparent opacity={0.35} depthWrite={false}/>
      </mesh>
    </group>);
}

function StopBarClicks({ items }) {
    const onClick = (which) => (e) => {
        e.stopPropagation();
        const st = useLab.getState();
        if (st.stopBarHold === which)
            st.toggleStopBarsClear();
        else {
            st.setStopBarHold(which);
            st.setStopBarsClear(true);
        }
    };
    return (<group>
      {items.map((it, i) => (<mesh key={`${it.linkId}-${it.which}-${i}`} position={[it.x, 0.12, it.z]} onClick={onClick(it.which)}>
          <boxGeometry args={[it.w, 0.2, 1.1]}/>
          <meshBasicMaterial transparent opacity={0} depthWrite={false}/>
        </mesh>))}
    </group>);
}

export function Lights() {
    const on = useLab((s) => s.layers.lights);
    const lighting = useLab((s) => s.lighting);
    const lampsOn = useLab((s) => s.lampsOn);
    const lampSystems = useLab((s) => s.lampSystems);
    const opDirection = useLab((s) => s.opDirection);
    const viewDirection = useLab((s) => s.viewDirection);
    const stopBarsClear = useLab((s) => s.stopBarsClear);
    const stopBarHold = useLab((s) => s.stopBarHold);
    const dir = opDirection === "auto" ? viewDirection : opDirection;
    const litTaxi = lampsOn && lampSystems.taxiway !== false;
    const built = useMemo(() => {
        const sys = {};
        const rabbit = [];
        const reil = [];
        const rgl = [];
        const clicks = [];
        edgeLamps(RWY_0927, sys, dir);
        clLamps(RWY_0927, sys, dir);
        for (const name of Object.keys(RWY_0927.ends)) {
            thresholdBar(RWY_0927, name, sys);
            als(RWY_0927, name, sys, rabbit);
            tdzLights(RWY_0927, name, sys);
            addReil(RWY_0927, name, reil);
        }
        taxiLamps(sys);
        stopAndGuard(sys, rgl, clicks);
        return { sys, rabbit, reil, rgl, clicks };
    }, [dir]);
    if (!on)
        return null;
    const sysOn = (k) => lampsOn && lampSystems[k] !== false;
    const renderGroup = (itemsByColor, sys, extra) => {
        const lit = sysOn(sys);
        return (<>
        {COLOR_KEYS.map((k) => (<InstancedLamps key={`${k}-${dir}-${itemsByColor?.[k]?.length ?? 0}`} items={itemsByColor?.[k] ?? []} color={C[k]} lit={lit} lighting={lighting}/>))}
        {extra}
      </>);
    };
    return (<group>
      <ViewDirectionTracker />
      {renderGroup(built.sys.edge, "edge")}
      {renderGroup(built.sys.centreLine, "centreLine")}
      {renderGroup(built.sys.tdz, "tdz")}
      {sysOn("taxiway") ? (<>
        <ElevatedEdgeFittings items={built.sys.taxiway?.blue ?? []} lit={litTaxi} lighting={lighting}/>
        {COLOR_KEYS.filter((k) => k !== "blue").map((k) => {
            const all = (built.sys.taxiway?.[k] ?? []).filter((it) => it.fit !== "elevated");
            const holdD = stopBarHold === "B" ? HOLD_DIST_B : HOLD_DIST_A;
            // 5.3.20.12 c/d: when the stop bar is on, extinguish CL lights beyond it
            // (toward and onto the runway) for at least 90 m; the lead-on path is
            // fully extinguished as a teaching stand-in for that rule.
            const off = (it) => stopBarsClear && it.leadOn && Math.abs(it.z) < holdD - 0.4;
            const litItems = all.filter((it) => !off(it));
            const darkItems = all.filter((it) => off(it));
            return (<group key={`taxi-${k}`}>
            <InsetTaxiLamps items={litItems} color={C[k]} lit={litTaxi} lighting={lighting}/>
            <InsetTaxiLamps items={darkItems} color={C[k]} lit={false} lighting={lighting}/>
          </group>);
        })}
      </>) : null}
      {sysOn("stopBars") ? (<>
        {["A", "B"].map((which) => {
            const barLit = lampsOn && stopBarsClear && stopBarHold === which;
            const items = built.sys.stopBars?.red ?? [];
            const inset = items.filter((it) => it.hold === which && it.fit !== "elevated");
            const elev = items.filter((it) => it.hold === which && it.fit === "elevated");
            return (<group key={`bar-${which}`}>
            <InsetTaxiLamps items={inset} color={C.red} lit={barLit} lighting={lighting}/>
            <ElevatedEdgeFittings items={elev} color={C.red} lit={barLit} lighting={lighting}/>
          </group>);
        })}
        {built.rgl.map((it) => (<GuardUnit key={`rgl-${it.linkId}-${it.x}`} {...it} lit={lampsOn && stopBarHold === "A"} lighting={lighting}/>))}
        <StopBarClicks items={built.clicks}/>
      </>) : null}
      {renderGroup(built.sys.approach, "approach", <>
        <InstancedLamps items={built.rabbit} color={C.white} lit={sysOn("approach")} lighting={lighting} pulse={(t, i) => {
            const n = built.rabbit.length || 1;
            const k = Math.floor(t * 8) % n;
            return i === n - 1 - k ? 1.35 : 0.2;
        }}/>
        <InstancedLamps items={built.reil} color={C.white} lit={sysOn("approach")} lighting={lighting} pulse={(t) => (Math.sin(t * Math.PI * 2) > 0 ? 1.3 : 0.2)}/>
      </>)}
      <PapiRow rwy={RWY_0927} endName="09" lit={sysOn("papi")}/>
      <PapiRow rwy={RWY_0927} endName="27" lit={sysOn("papi")}/>
    </group>);
}
