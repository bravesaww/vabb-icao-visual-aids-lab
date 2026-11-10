import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { RWY_0927, RWY_1432, TAXI_N, TAXI_S, TAXI_N1, HOLD_CAT2, rwyPos, rwyYaw, thresholdAlong, landingSign, physicalAlong, aimingInnerSpacing, } from "./world";
import { digitSegs, DIGIT_GAP, DIGIT_W } from "./digits";
import { useLab } from "./store";
function pushBox(list, rwy, along, across, alongLen, acrossW) {
    const p = rwyPos(rwy, along, across);
    list.push({ x: p.x, z: p.z, w: acrossW, d: alongLen, ry: rwyYaw(rwy) });
}
function centreline(rwy, out) {
    const usable0 = -rwy.length / 2;
    let a = usable0 + 5;
    const end = rwy.length / 2 - 5;
    while (a + 30 <= end) {
        pushBox(out, rwy, a + 15, 0, 30, rwy.clWidth);
        a += 50;
    }
}
function zebra(rwy, endName, out) {
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
function designation(rwy, endName, out) {
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
function aiming(rwy, endName, out) {
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
function tdz(rwy, endName, out) {
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
function sideStripes(rwy, out) {
    const across = rwy.width / 2 - 0.45;
    const segs = 16;
    const len = rwy.length / segs;
    for (let i = 0; i < segs; i++) {
        const along = -rwy.length / 2 + len / 2 + i * len;
        pushBox(out, rwy, along, across, len - 0.4, 0.9);
        pushBox(out, rwy, along, -across, len - 0.4, 0.9);
    }
}
function arrows(rwy, endName, out) {
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
function holdN1(out) {
    const zSolid1 = -75 + 1.35;
    const zSolid2 = -75 - 0.45;
    const zDash1 = -75 - 2.25;
    const zDash2 = -75 - 4.05;
    const x = TAXI_N1.x;
    const w = 18;
    out.push({ x, z: zSolid1, w, d: 0.9, ry: 0 });
    out.push({ x, z: zSolid2, w, d: 0.9, ry: 0 });
    for (let i = -3; i <= 3; i++) {
        out.push({ x: x + i * 2.6, z: zDash1, w: 1.4, d: 0.9, ry: 0 });
        out.push({ x: x + i * 2.6, z: zDash2, w: 1.4, d: 0.9, ry: 0 });
    }
}
function taxiCL(out) {
    const w = 0.3;
    const step = 40;
    for (let x = TAXI_N.x0; x < TAXI_N.x1; x += step) {
        out.push({ x: x + step / 2, z: TAXI_N.z, w, d: step * 0.98, ry: Math.PI / 2 });
    }
    for (let x = TAXI_S.x0; x < TAXI_S.x1; x += step) {
        out.push({ x: x + step / 2, z: TAXI_S.z, w, d: step * 0.98, ry: Math.PI / 2 });
    }
    for (let z = TAXI_N1.z0; z < TAXI_N1.z1; z += 8) {
        out.push({ x: TAXI_N1.x, z: z + 4, w, d: 7.6, ry: 0 });
    }
}

function holdPatternB(out) {
    const { x, z } = HOLD_CAT2;
    const w = 18;
    out.push({ x, z: z - 0.45, w, d: 0.3, ry: 0 });
    out.push({ x, z: z + 0.45, w, d: 0.3, ry: 0 });
    for (let i = -6; i <= 6; i++) {
        out.push({ x: x + i * 1.4, z, w: 0.3, d: 1.2, ry: 0 });
    }
}
function enhancedCL(out) {
    const x = TAXI_N1.x;
    for (let z = -96; z < -78; z += 6) {
        out.push({ x: x - 0.3, z: z + 1.5, w: 0.15, d: 3, ry: 0 });
        out.push({ x: x + 0.3, z: z + 1.5, w: 0.15, d: 3, ry: 0 });
    }
    for (let i = 0; i < 4; i++) {
        const cx = x + 8 + i * 6;
        out.push({ x: cx, z: TAXI_N.z - 0.3, w: 3, d: 0.15, ry: Math.PI / 2 });
        out.push({ x: cx, z: TAXI_N.z + 0.3, w: 3, d: 0.15, ry: Math.PI / 2 });
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
function taxiEdge(out) {
    for (const tw of [TAXI_N, TAXI_S]) {
        for (const side of [-1, 1]) {
            const z = tw.z + side * (tw.width / 2 - 0.25);
            for (let x = tw.x0; x < tw.x1; x += 40) {
                out.push({ x: x + 20, z: z - 0.15, w: 0.15, d: 39, ry: Math.PI / 2 });
                out.push({ x: x + 20, z: z + 0.15, w: 0.15, d: 39, ry: Math.PI / 2 });
            }
        }
    }
}
function intermediateHold(out) {
    for (let i = -4; i <= 4; i++) {
        out.push({ x: -800 + i * 2.4, z: TAXI_N.z, w: 1.4, d: 0.3, ry: 0 });
    }
}
function infoPaint(out) {
    const x = TAXI_N1.x + 40;
    const z = TAXI_N.z;
    out.push({ x: x - 1.6, z, w: 0.7, d: 4.5, ry: Math.PI / 2 });
    out.push({ x: x + 1.6, z, w: 0.7, d: 4.5, ry: Math.PI / 2 });
    out.push({ x, z, w: 0.7, d: 3.6, ry: Math.PI / 4 });
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
    for (const rwy of [RWY_0927, RWY_1432]) {
        centreline(rwy, m);
        sideStripes(rwy, m);
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
    holdN1(m);
    holdPatternB(m);
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
