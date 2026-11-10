import { useFrame, useThree } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useLab } from "./store";
import { ILS_ALT_ZONE_M, connectorPaths } from "./taxiways";
import { RWY_0927, TAXI_N, TAXI_S, LINKS, TAXI_WIDTH, holdOf, rwyPos, headingVec, thresholdAlong, landingSign, physicalAlong, aimingInnerSpacing, linkTaxi } from "./world";

const C = {
    white: "#f4f1ea",
    yellow: "#e0b43a",
    red: "#d4453a",
    green: "#3dbe6a",
    blue: "#3a7bd4",
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

function edgeLamps(rwy, sysBuckets) {
    const step = 60;
    const half = rwy.length / 2;
    const edge = rwy.width / 2 + 0.2;
    for (let along = -half; along <= half + 0.01; along += step) {
        const remainingPos = half - along;
        const remainingNeg = along + half;
        let col = remainingPos <= 600 || remainingNeg <= 600 ? C.yellow : C.white;
        for (const end of Object.values(rwy.ends)) {
            const ls = landingSign(end);
            const thr = thresholdAlong(rwy, end.name);
            const pre = end.preThrEdgeRedM ?? end.displaced;
            const distBeforeThr = (thr - along) * ls;
            if (distBeforeThr > 0 && distBeforeThr <= pre + 1) {
                col = C.red;
            }
        }
        for (const side of [-edge, edge]) {
            const p = rwyPos(rwy, along, side, 0.45);
            push(sysBuckets, { ...p, color: col, r: 0.42, sys: "edge" });
        }
    }
}

function clLamps(rwy, sysBuckets) {
    const step = rwy.clLightSpacing || 15;
    const half = rwy.length / 2;
    for (let along = -half + 8; along < half - 8; along += step) {
        const remPos = half - along;
        const remNeg = along + half;
        const code = (rem) => {
            if (rem <= 300)
                return C.red;
            if (rem <= 900) {
                const i = Math.round(along / step);
                return i % 2 === 0 ? C.red : C.white;
            }
            return C.white;
        };
        const col = remPos <= 900 ? code(remPos) : remNeg <= 900 ? code(remNeg) : C.white;
        const p = rwyPos(rwy, along, 0, 0.06);
        push(sysBuckets, { ...p, color: col, r: 0.26, sys: "centreLine" });
    }
}

function thresholdBar(rwy, endName, sysBuckets) {
    const end = rwy.ends[endName];
    const thr = thresholdAlong(rwy, endName);
    const n = Math.round(rwy.width / 3);
    for (let i = 0; i < n; i++) {
        const across = -rwy.width / 2 + 1.5 + i * 3;
        const p = rwyPos(rwy, thr, across, 0.4);
        push(sysBuckets, { ...p, color: C.green, r: 0.34, sys: "edge" });
    }
    for (const side of [-1, 1]) {
        for (let k = 1; k <= 5; k++) {
            const p = rwyPos(rwy, thr, side * (rwy.width / 2 + 2 + k * 2.4), 0.4);
            push(sysBuckets, { ...p, color: C.green, r: 0.34, sys: "edge" });
        }
    }
    const phys = physicalAlong(rwy, end.sign);
    for (let i = 0; i < n; i++) {
        const across = -rwy.width / 2 + 1.5 + i * 3;
        const p = rwyPos(rwy, phys, across, 0.4);
        push(sysBuckets, { ...p, color: C.red, r: 0.34, sys: "edge" });
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
            push(sysBuckets, { ...p, color: C.white, r: 0.32, sys: "approach" });
        }
        const rf = rwyPos(rwy, along, 0, 0.9);
        rabbit.push({ ...rf, color: C.white, r: 0.4, sys: "approach" });
        if (d <= 270) {
            for (const side of [-1, 1]) {
                for (const k of [0, 1, 2, 3]) {
                    const p = rwyPos(rwy, along, side * (inner / 2 + 1 + k * 1.2), 0.55);
                    push(sysBuckets, { ...p, color: C.red, r: 0.28, sys: "approach" });
                }
            }
        }
        if (d === 300) {
            for (const ac of [-18, -15, -12, -9, 9, 12, 15, 18]) {
                const q = rwyPos(rwy, along, ac, 0.55);
                push(sysBuckets, { ...q, color: C.white, r: 0.3, sys: "approach" });
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
                push(sysBuckets, { ...p, color: C.white, r: 0.22, sys: "tdz" });
            }
        }
    }
}

function stopAndGuard(sysBuckets, wig) {
    for (const link of LINKS) {
        const hold = holdOf(link);
        for (let i = -3; i <= 3; i++) {
            push(sysBuckets, { x: hold.x + i * 3, y: 0.08, z: hold.z, color: C.red, r: 0.22, sys: "stopBars" });
        }
        push(sysBuckets, { x: hold.x - 12, y: 0.7, z: hold.z, color: C.red, r: 0.32, sys: "stopBars" });
        push(sysBuckets, { x: hold.x + 12, y: 0.7, z: hold.z, color: C.red, r: 0.32, sys: "stopBars" });
        wig.push({ x: hold.x - 14, y: 1.2, z: hold.z, color: C.yellow, r: 0.38, sys: "stopBars" });
        wig.push({ x: hold.x + 14, y: 1.2, z: hold.z, color: C.yellow, r: 0.38, sys: "stopBars" });
    }
}

function addReil(rwy, endName, reil) {
    const p = rwyPos(rwy, thresholdAlong(rwy, endName), 0);
    const { rx, rz } = headingVec(rwy.heading);
    const off = rwy.width / 2 + 10;
    reil.push({ x: p.x + rx * off, y: 1.6, z: p.z + rz * off, color: C.white, r: 0.5, sys: "approach" });
    reil.push({ x: p.x - rx * off, y: 1.6, z: p.z - rz * off, color: C.white, r: 0.5, sys: "approach" });
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

function taxiLamps(sysBuckets) {
    for (const tw of [TAXI_N, TAXI_S]) {
        for (let x = tw.x0; x <= tw.x1; x += 60) {
            push(sysBuckets, { x, y: 0.35, z: tw.z - tw.width / 2, color: C.blue, r: 0.24, sys: "taxiway" });
            push(sysBuckets, { x, y: 0.35, z: tw.z + tw.width / 2, color: C.blue, r: 0.24, sys: "taxiway" });
        }
        for (let x = tw.x0; x <= tw.x1; x += 30) {
            push(sysBuckets, { x, y: 0.06, z: tw.z, color: C.green, r: 0.2, sys: "taxiway" });
        }
    }
    for (const link of LINKS) {
        const taxi = linkTaxi(link);
        const zA = taxi.z;
        const zB = link.side * 10;
        const z0 = Math.min(zA, zB);
        const z1 = Math.max(zA, zB);
        for (let z = z0; z <= z1; z += 20) {
            push(sysBuckets, { x: link.x - TAXI_WIDTH / 2, y: 0.35, z, color: C.blue, r: 0.24, sys: "taxiway" });
            push(sysBuckets, { x: link.x + TAXI_WIDTH / 2, y: 0.35, z, color: C.blue, r: 0.24, sys: "taxiway" });
        }
        const paths = connectorPaths(link);
        const pts = uniquePts([
            ...sampleAlong(paths.straight, 15),
            ...sampleAlong(paths.east, 12),
            ...sampleAlong(paths.west, 12),
        ]);
        const inZone = pts.filter((p) => Math.abs(p.z) <= ILS_ALT_ZONE_M).sort((a, b) => Math.abs(a.z) - Math.abs(b.z));
        const outZone = pts.filter((p) => Math.abs(p.z) > ILS_ALT_ZONE_M);
        inZone.forEach((p, i) => {
            let col = i % 2 === 0 ? C.green : C.yellow;
            if (i === 0)
                col = C.green;
            if (i === inZone.length - 1)
                col = C.yellow;
            push(sysBuckets, { x: p.x, y: 0.06, z: p.z, color: col, r: 0.2, sys: "taxiway" });
        });
        for (const p of outZone) {
            push(sysBuckets, { x: p.x, y: 0.06, z: p.z, color: C.green, r: 0.2, sys: "taxiway" });
        }
    }
}

function glowScale(lighting) {
    if (lighting === "night")
        return { core: 2.6, glow: 9, opacity: 0.58 };
    if (lighting === "dusk")
        return { core: 2.15, glow: 6.6, opacity: 0.42 };
    return { core: 1.55, glow: 3.4, opacity: 0.24 };
}

function InstancedLamps({ items, color, pulse, lit, lighting }) {
    const coreRef = useRef(null);
    const glowRef = useRef(null);
    const geo = useMemo(() => new THREE.SphereGeometry(1, 10, 8), []);
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
    const base = useMemo(() => items.map((it) => it.r ?? 0.2), [items]);
    const scales = glowScale(lighting);
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
        if (!pulse || !coreRef.current)
            return;
        const t = clock.getElapsedTime();
        const dummy = new THREE.Object3D();
        items.forEach((it, i) => {
            const s = pulse(t, i);
            dummy.position.set(it.x, it.y, it.z);
            dummy.scale.setScalar(base[i] * (lit ? scales.core : 0.85) * (lit ? s : 1));
            dummy.updateMatrix();
            coreRef.current.setMatrixAt(i, dummy.matrix);
            if (lit && glowRef.current) {
                dummy.scale.setScalar(base[i] * scales.glow * s);
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
        <circleGeometry args={[0.34, 22]}/>
        <meshBasicMaterial color="#e03a32" toneMapped={false} side={THREE.DoubleSide} fog={false}/>
      </mesh>
      {lit ? <mesh position={[0, 0.05, -0.5]} rotation={[0, Math.PI, 0]}>
        <circleGeometry args={[0.7, 22]}/>
        <meshBasicMaterial color="#ffb8a0" toneMapped={false} transparent opacity={0.28} blending={THREE.AdditiveBlending} depthWrite={false} side={THREE.DoubleSide} fog={false}/>
      </mesh> : null}
    </group>);
}

function PapiRow({ rwy, endName, lit }) {
    const end = rwy.ends[endName];
    const ls = landingSign(end);
    const thr = thresholdAlong(rwy, endName);
    const along = thr + ls * (end.papiSitingM || 300);
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

const COLOR_KEYS = ["white", "yellow", "red", "green", "blue"];

export function Lights() {
    const on = useLab((s) => s.layers.lights);
    const lighting = useLab((s) => s.lighting);
    const lampsOn = useLab((s) => s.lampsOn);
    const lampSystems = useLab((s) => s.lampSystems);
    const built = useMemo(() => {
        const sys = {};
        const rabbit = [];
        const reil = [];
        const wig = [];
        edgeLamps(RWY_0927, sys);
        clLamps(RWY_0927, sys);
        for (const name of Object.keys(RWY_0927.ends)) {
            thresholdBar(RWY_0927, name, sys);
            als(RWY_0927, name, sys, rabbit);
            tdzLights(RWY_0927, name, sys);
            addReil(RWY_0927, name, reil);
        }
        taxiLamps(sys);
        stopAndGuard(sys, wig);
        return { sys, rabbit, reil, wig };
    }, []);
    if (!on)
        return null;
    const sysOn = (k) => lampsOn && lampSystems[k] !== false;
    const renderGroup = (itemsByColor, sys, extra) => {
        const lit = sysOn(sys);
        return (<>
        {COLOR_KEYS.map((k) => (<InstancedLamps key={k} items={itemsByColor?.[k] ?? []} color={C[k]} lit={lit} lighting={lighting}/>))}
        {extra}
      </>);
    };
    return (<group>
      {renderGroup(built.sys.edge, "edge")}
      {renderGroup(built.sys.centreLine, "centreLine")}
      {renderGroup(built.sys.tdz, "tdz")}
      {renderGroup(built.sys.taxiway, "taxiway")}
      {renderGroup(built.sys.stopBars, "stopBars", <InstancedLamps items={built.wig} color={C.yellow} lit={sysOn("stopBars")} lighting={lighting} pulse={(t, i) => (Math.sin(t * Math.PI * 3 + i * Math.PI) > 0 ? 2.15 : 0.22)}/>)}
      {renderGroup(built.sys.approach, "approach", <>
        <InstancedLamps items={built.rabbit} color={C.white} lit={sysOn("approach")} lighting={lighting} pulse={(t, i) => {
            const n = built.rabbit.length || 1;
            const k = Math.floor(t * 8) % n;
            return i === n - 1 - k ? 2.6 : 0.12;
        }}/>
        <InstancedLamps items={built.reil} color={C.white} lit={sysOn("approach")} lighting={lighting} pulse={(t) => (Math.sin(t * Math.PI * 2) > 0 ? 2.4 : 0.18)}/>
      </>)}
      <PapiRow rwy={RWY_0927} endName="09" lit={sysOn("papi")}/>
      <PapiRow rwy={RWY_0927} endName="27" lit={sysOn("papi")}/>
    </group>);
}
