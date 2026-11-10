import { useFrame, useThree } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useLab } from "./store";
import { RWY_0927, TAXI_N, TAXI_S, TAXI_N1, HOLD_N1, rwyPos, headingVec, thresholdAlong, landingSign, physicalAlong, aimingInnerSpacing, } from "./world";
const C = {
    white: "#f4f1ea",
    yellow: "#e0b43a",
    red: "#d4453a",
    green: "#3dbe6a",
    blue: "#3a7bd4",
};
function edgeLamps(rwy, out) {
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
            out.push({ ...p, color: col, r: 0.28 });
        }
    }
}
function clLamps(rwy, out) {
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
        out.push({ ...p, color: col, r: 0.16 });
    }
}
function thresholdBar(rwy, endName, out) {
    const end = rwy.ends[endName];
    const ls = landingSign(end);
    const thr = thresholdAlong(rwy, endName);
    const n = Math.round(rwy.width / 3);
    for (let i = 0; i < n; i++) {
        const across = -rwy.width / 2 + 1.5 + i * 3;
        const p = rwyPos(rwy, thr, across, 0.4);
        out.push({ ...p, color: C.green, r: 0.22 });
    }
    for (const side of [-1, 1]) {
        for (let k = 1; k <= 5; k++) {
            const p = rwyPos(rwy, thr, side * (rwy.width / 2 + 2 + k * 2.4), 0.4);
            out.push({ ...p, color: C.green, r: 0.22 });
        }
    }
    const phys = physicalAlong(rwy, end.sign);
    for (let i = 0; i < n; i++) {
        const across = -rwy.width / 2 + 1.5 + i * 3;
        const p = rwyPos(rwy, phys, across, 0.4);
        out.push({ ...p, color: C.red, r: 0.22 });
    }
    void ls;
}
function als(rwy, endName, out, rabbit) {
    const end = rwy.ends[endName];
    const ls = landingSign(end);
    const thr = thresholdAlong(rwy, endName);
    const len = end.alsM;
    const cat2 = end.cat === "CAT II";
    for (let d = 30; d <= len; d += 30) {
        const along = thr - ls * d;
        if (cat2) {
            for (const ac of [-6, -3, 0, 3, 6]) {
                const p = rwyPos(rwy, along, ac, 0.55);
                out.push({ ...p, color: C.white, r: 0.2 });
            }
            const inner = aimingInnerSpacing(rwy.width);
            if (d <= 270) {
                for (const side of [-1, 1]) {
                    for (const k of [0, 1, 2, 3]) {
                        const p = rwyPos(rwy, along, side * (inner / 2 + 1 + k * 1.2), 0.55);
                        out.push({ ...p, color: C.red, r: 0.18 });
                    }
                }
            }
            if (d === 150 || d === 300) {
                for (const ac of [-15, -10, -5, 5, 10, 15]) {
                    const q = rwyPos(rwy, along, ac, 0.55);
                    out.push({ ...q, color: C.white, r: 0.18 });
                }
            }
            void rabbit;
        }
        else {
            const p = rwyPos(rwy, along, 0, 0.55);
            out.push({ ...p, color: C.white, r: 0.2 });
            if (d === 300 || (len >= 540 && d === 150)) {
                for (const ac of [-15, -10, -5, 5, 10, 15]) {
                    const q = rwyPos(rwy, along, ac, 0.55);
                    out.push({ ...q, color: C.white, r: 0.18 });
                }
            }
        }
    }
}
function tdzLights(rwy, endName, out) {
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
                out.push({ ...p, color: C.white, r: 0.14 });
            }
        }
    }
}
function stopBarN1(out) {
    for (let i = -3; i <= 3; i++) {
        out.push({ x: HOLD_N1.x + i * 3, y: 0.08, z: HOLD_N1.z, color: C.red, r: 0.16 });
    }
    out.push({ x: HOLD_N1.x - 12, y: 0.7, z: HOLD_N1.z, color: C.red, r: 0.22 });
    out.push({ x: HOLD_N1.x + 12, y: 0.7, z: HOLD_N1.z, color: C.red, r: 0.22 });
}
function addReil(rwy, endName, out) {
    const p = rwyPos(rwy, thresholdAlong(rwy, endName), 0);
    const { rx, rz } = headingVec(rwy.heading);
    const off = rwy.width / 2 + 10;
    out.push({ x: p.x + rx * off, y: 1.6, z: p.z + rz * off, color: C.white, r: 0.38 });
    out.push({ x: p.x - rx * off, y: 1.6, z: p.z - rz * off, color: C.white, r: 0.38 });
}
function taxiLamps(edge, cl) {
    for (const tw of [TAXI_N, TAXI_S]) {
        for (let x = tw.x0; x <= tw.x1; x += 60) {
            edge.push({ x, y: 0.35, z: tw.z - tw.width / 2, color: C.blue, r: 0.16 });
            edge.push({ x, y: 0.35, z: tw.z + tw.width / 2, color: C.blue, r: 0.16 });
        }
        for (let x = tw.x0; x <= tw.x1; x += 30) {
            cl.push({ x, y: 0.06, z: tw.z, color: C.green, r: 0.12 });
        }
    }
    for (let z = TAXI_N1.z0; z <= TAXI_N1.z1; z += 20) {
        edge.push({ x: TAXI_N1.x - TAXI_N1.width / 2, y: 0.35, z, color: C.blue, r: 0.16 });
        edge.push({ x: TAXI_N1.x + TAXI_N1.width / 2, y: 0.35, z, color: C.blue, r: 0.16 });
        cl.push({ x: TAXI_N1.x, y: 0.06, z, color: C.green, r: 0.12 });
    }
}
function InstancedLamps({ items, color, pulse, }) {
    const ref = useRef(null);
    const geo = useMemo(() => new THREE.SphereGeometry(1, 10, 8), []);
    const mat = useMemo(() => new THREE.MeshBasicMaterial({
        color,
        toneMapped: false,
    }), [color]);
    const base = useMemo(() => items.map((it) => it.r ?? 0.2), [items]);
    useLayoutEffect(() => {
        const mesh = ref.current;
        if (!mesh)
            return;
        const dummy = new THREE.Object3D();
        items.forEach((it, i) => {
            dummy.position.set(it.x, it.y, it.z);
            dummy.scale.setScalar(base[i]);
            dummy.updateMatrix();
            mesh.setMatrixAt(i, dummy.matrix);
        });
        mesh.instanceMatrix.needsUpdate = true;
        mesh.computeBoundingSphere();
    }, [items, base]);
    useFrame(({ clock }) => {
        if (!pulse || !ref.current)
            return;
        const t = clock.getElapsedTime();
        const dummy = new THREE.Object3D();
        items.forEach((it, i) => {
            const s = base[i] * pulse(t, i);
            dummy.position.set(it.x, it.y, it.z);
            dummy.scale.setScalar(s);
            dummy.updateMatrix();
            ref.current.setMatrixAt(i, dummy.matrix);
        });
        ref.current.instanceMatrix.needsUpdate = true;
    });
    if (items.length === 0)
        return null;
    return <instancedMesh ref={ref} args={[geo, mat, items.length]} frustumCulled={false}/>;
}
function PapiUnit({ position, headingDeg, angleDeg, offset, }) {
    const lens = useRef(null);
    const { camera } = useThree();
    const { fx, fz } = headingVec(headingDeg);
    const approachX = -fx;
    const approachZ = -fz;
    useFrame(() => {
        if (!lens.current)
            return;
        const mat = lens.current.material;
        const dx = camera.position.x - position[0];
        const dy = camera.position.y - position[1];
        const dz = camera.position.z - position[2];
        const along = dx * approachX + dz * approachZ;
        const ground = Math.hypot(along, dx * fx + dz * fz) || 0.001;
        const elev = (Math.atan2(dy, Math.max(ground, 1)) * 180) / Math.PI;
        const white = elev > angleDeg;
        mat.color.set(white ? "#f7f4ea" : "#e03a32");
    });
    const { rx, rz } = headingVec(headingDeg);
    const yaw = Math.atan2(fx, fz);
    void rx;
    void rz;
    void offset;
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
        <meshBasicMaterial color="#e03a32" toneMapped={false} side={THREE.DoubleSide}/>
      </mesh>
    </group>);
}
function PapiRow({ rwy, endName }) {
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
            return (<PapiUnit key={i} position={[p.x, p.y, p.z]} headingDeg={end.heading} angleDeg={ang} offset={i}/>);
        })}
    </group>);
}
export function Lights() {
    const on = useLab((s) => s.layers.lights);
    const lighting = useLab((s) => s.lighting);
    const built = useMemo(() => {
        const white = [];
        const yellow = [];
        const red = [];
        const green = [];
        const blue = [];
        const rabbit = [];
        const reil = [];
        const wig = [];
        for (const rwy of [RWY_0927]) {
            const tmp = [];
            edgeLamps(rwy, tmp);
            for (const l of tmp)
                (l.color === C.red ? red : l.color === C.yellow ? yellow : white).push(l);
            const cl = [];
            clLamps(rwy, cl);
            for (const l of cl)
                (l.color === C.red ? red : white).push(l);
            for (const name of Object.keys(rwy.ends)) {
                const t = [];
                thresholdBar(rwy, name, t);
                for (const l of t)
                    (l.color === C.green ? green : red).push(l);
                const a = [];
                als(rwy, name, a, rabbit);
                for (const l of a)
                    (l.color === C.red ? red : white).push(l);
            }
        }
        tdzLights(RWY_0927, "27", white);
        taxiLamps(blue, green);
        stopBarN1(red);
        addReil(RWY_0927, "27", reil);
        addReil(RWY_0927, "09", reil);
        wig.push({ x: HOLD_N1.x - 14, y: 1.2, z: HOLD_N1.z, color: C.yellow, r: 0.3 });
        wig.push({ x: HOLD_N1.x + 14, y: 1.2, z: HOLD_N1.z, color: C.yellow, r: 0.3 });
        return { white, yellow, red, green, blue, rabbit, reil, wig };
    }, []);
    if (!on)
        return null;
    const night = lighting === "night" || lighting === "dusk";
    const boost = night ? 1 : 0.85;
    return (<group>
      <InstancedLamps items={built.white} color={C.white} pulse={() => boost}/>
      <InstancedLamps items={built.yellow} color={C.yellow} pulse={() => boost}/>
      <InstancedLamps items={built.red} color={C.red} pulse={() => boost}/>
      <InstancedLamps items={built.green} color={C.green} pulse={() => boost}/>
      <InstancedLamps items={built.blue} color={C.blue} pulse={() => boost}/>
      <InstancedLamps items={built.rabbit} color={C.white} pulse={(t, i) => {
            const n = built.rabbit.length || 1;
            const k = Math.floor(t * 8) % n;
            return i === n - 1 - k ? 2.4 : 0.15;
        }}/>
      <InstancedLamps items={built.reil} color={C.white} pulse={(t) => (Math.sin(t * Math.PI * 2) > 0 ? 2.2 : 0.2)}/>
      <InstancedLamps items={built.wig} color={C.yellow} pulse={(t, i) => (Math.sin(t * Math.PI * 3 + i * Math.PI) > 0 ? 2 : 0.25)}/>
      <PapiRow rwy={RWY_0927} endName="09"/>
      <PapiRow rwy={RWY_0927} endName="27"/>
    </group>);
}
