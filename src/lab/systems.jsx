import { OrbitControls } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { FEATURE_BY_ID, nearestFeature, pickFeature } from "./catalog";
import { input } from "./input";
import { useLab } from "./store";
import { INSPECT_START, WALK_START, RWY_0927, WALK_SPEED, TAXI_N, TAXI_S, TAXI_WIDTH, LINKS, APRON_S, APRON_N, rwyPos, headingVec, physicalAlong, linkTaxi } from "./world";
import { junctionGeometry, apronShoulderPolys, runwayShoulderBands, taxiwayShoulderPolys } from "./junctions";
export function SceneLighting() {
    const lighting = useLab((s) => s.lighting);
    const { scene } = useThree();
    useEffect(() => {
        if (lighting === "day") {
            scene.background = new THREE.Color("#87a0b4");
            scene.fog = new THREE.Fog("#9aafbe", 1800, 7200);
        }
        else if (lighting === "dusk") {
            scene.background = new THREE.Color("#2a3340");
            scene.fog = new THREE.Fog("#2a3340", 900, 5200);
        }
        else {
            scene.background = new THREE.Color("#050608");
            scene.fog = new THREE.Fog("#050608", 700, 4200);
        }
    }, [lighting, scene]);
    if (lighting === "day") {
        return (<>
        <hemisphereLight args={["#d7e4ef", "#3e4a3a", 0.55]}/>
        <ambientLight intensity={0.28}/>
        <directionalLight position={[420, 620, -180]} intensity={1.35} color="#fff4e0"/>
      </>);
    }
    if (lighting === "dusk") {
        return (<>
        <hemisphereLight args={["#c47a4a", "#1a1e24", 0.28]}/>
        <ambientLight intensity={0.12}/>
        <directionalLight position={[-200, 80, 40]} intensity={0.45} color="#e08a4a"/>
      </>);
    }
    return (<>
      <hemisphereLight args={["#1a2230", "#050608", 0.08]}/>
      <ambientLight intensity={0.045}/>
    </>);
}
export function Ground() {
    const lighting = useLab((s) => s.lighting);
    const grass = lighting === "night" ? "#141a12" : lighting === "dusk" ? "#2a3324" : "#4a5a3a";
    return (<group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.04, 0]} receiveShadow>
        <planeGeometry args={[9000, 9000]}/>
        <meshLambertMaterial color={grass}/>
      </mesh>
      <Pavement />
      <PhysicalOverlays />
    </group>);
}
function FilletShape({ polygon, color = "#323436", y = 0.007 }) {
    const geo = useMemo(() => {
        const shape = new THREE.Shape();
        // Shape XY → rotateX(−90°) → world (x, −y): so feed y = −z.
        shape.moveTo(polygon[0].x, -polygon[0].z);
        for (let i = 1; i < polygon.length; i++)
            shape.lineTo(polygon[i].x, -polygon[i].z);
        shape.closePath();
        const g = new THREE.ShapeGeometry(shape);
        g.rotateX(-Math.PI / 2);
        return g;
    }, [polygon]);
    return (<mesh geometry={geo} position={[0, y, 0]} receiveShadow>
      <meshLambertMaterial color={color}/>
    </mesh>);
}

function Pavement() {
    const asphalt = "#2b2d2f";
    const taxiColor = "#323436";
    const nLen = TAXI_N.x1 - TAXI_N.x0;
    const sLen = TAXI_S.x1 - TAXI_S.x0;
    return (<group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[3448, 60]}/>
        <meshLambertMaterial color={asphalt}/>
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[(TAXI_N.x0 + TAXI_N.x1) / 2, 0.006, TAXI_N.z]} receiveShadow>
        <planeGeometry args={[nLen, TAXI_N.width]}/>
        <meshLambertMaterial color={taxiColor}/>
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[(TAXI_S.x0 + TAXI_S.x1) / 2, 0.006, TAXI_S.z]} receiveShadow>
        <planeGeometry args={[sLen, TAXI_S.width]}/>
        <meshLambertMaterial color={taxiColor}/>
      </mesh>
      {LINKS.map((link) => {
            const taxi = linkTaxi(link);
            return (<group key={link.id}>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[link.x, 0.007, (taxi.z + link.side * 30) / 2]} receiveShadow>
            <planeGeometry args={[TAXI_WIDTH, Math.abs(taxi.z) - 30]}/>
            <meshLambertMaterial color={taxiColor}/>
          </mesh>
        </group>);
        })}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[APRON_S.x, 0.005, APRON_S.z]} receiveShadow>
        <planeGeometry args={[APRON_S.width, APRON_S.depth]}/>
        <meshLambertMaterial color={taxiColor}/>
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[APRON_N.x, 0.005, APRON_N.z]} receiveShadow>
        <planeGeometry args={[APRON_N.width, APRON_N.depth]}/>
        <meshLambertMaterial color={taxiColor}/>
      </mesh>
      {/* Junction fillets: taxiway/taxiway, taxiway/runway (sized from a code-C A320 main-gear
          track, Annex 14 3.9.3 / 3.9.6) and apron T-joins. See junctions.js. */}
      {junctionGeometry().fillets.map((f, i) => <FilletShape key={i} polygon={f.polygon}/>)}
      {/* Paved non-load-bearing shoulders: lighter than the load-bearing asphalt, flush
          with it (Annex 14 3.2 / 3.10). The old 75 m under-plane is gone — it showed as
          a dark patch along the runway edge at every join. */}
      {runwayShoulderBands().map((b, i) => (
        <mesh key={`rwy-sh-${i}`} rotation={[-Math.PI / 2, 0, 0]} position={[b.x, 0.003, b.z]} receiveShadow>
          <planeGeometry args={[b.length, b.width]}/>
          <meshLambertMaterial color="#5c574c"/>
        </mesh>
      ))}
      {taxiwayShoulderPolys().map((poly, i) => <FilletShape key={`tx-sh-${i}`} polygon={poly} color="#5c574c" y={0.004}/>)}
      {apronShoulderPolys().map((poly, i) => <FilletShape key={`ap-sh-${i}`} polygon={poly} color="#5c574c" y={0.004}/>)}
    </group>);
}
function ResaBox({ rwy, endName }) {
    const end = rwy.ends[endName];
    const along = physicalAlong(rwy, end.sign) + end.sign * (end.resa.length / 2);
    const p = rwyPos(rwy, along, 0, -0.02);
    const yaw = headingVec(rwy.heading).yaw;
    return (
      <mesh position={[p.x, p.y, p.z]} rotation={[0, yaw, 0]}>
        <boxGeometry args={[end.resa.width, 0.03, end.resa.length]}/>
        <meshLambertMaterial color="#6b5a3a" transparent opacity={0.55}/>
      </mesh>
    );
}
function PhysicalOverlays() {
    const on = useLab((s) => s.layers.physical);
    if (!on)
        return null;
    return (
      <group>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.03, 0]}>
          <planeGeometry args={[3568, 300]}/>
          <meshLambertMaterial color="#3d4a32" transparent opacity={0.28}/>
        </mesh>
        <ResaBox rwy={RWY_0927} endName="09"/>
        <ResaBox rwy={RWY_0927} endName="27"/>
      </group>
    );
}
export function InspectRig() {
    const mode = useLab((s) => s.mode);
    const selectedId = useLab((s) => s.selectedId);
    const focusToken = useLab((s) => s.focusToken);
    const controls = useRef(null);
    const { camera } = useThree();
    useEffect(() => {
        if (mode !== "inspect")
            return;
        const f = selectedId ? FEATURE_BY_ID.get(selectedId) : null;
        if (!f || !controls.current) {
            if (!selectedId) {
                camera.position.set(...INSPECT_START.position);
                controls.current?.target.set(...INSPECT_START.target);
            }
            return;
        }
        const fp = f.footprint;
        const dist = Math.max(40, Math.min(280, Math.max(fp.length, fp.width) * 0.9));
        controls.current.target.set(fp.x, 0.5, fp.z);
        camera.position.set(fp.x + dist * 0.35, dist * 0.55, fp.z + dist * 0.7);
        controls.current.update();
    }, [focusToken, mode, selectedId, camera]);
    useEffect(() => {
        window.__labShot = {
            top(x = 40, z = 8, height = 2400) {
                camera.position.set(x, height, z);
                if (controls.current) {
                    controls.current.target.set(x, 0, 0);
                    controls.current.update();
                }
                else {
                    camera.lookAt(x, 0, 0);
                }
            },
            orbit() {
                camera.position.set(...INSPECT_START.position);
                if (controls.current) {
                    controls.current.target.set(...INSPECT_START.target);
                    controls.current.update();
                }
            },
            select(id) {
                const f = FEATURE_BY_ID.get(id);
                if (f)
                    useLab.getState().focusFeature(f);
                else
                    useLab.getState().select(id);
            },
            look(px, py, pz, tx = 0, ty = 0, tz = 0) {
                camera.position.set(px, py, pz);
                if (controls.current) {
                    controls.current.target.set(tx, ty, tz);
                    controls.current.update();
                }
                else {
                    camera.lookAt(tx, ty, tz);
                }
            },
            setLighting(mode) {
                useLab.getState().setLighting(mode);
            },
            setLampsOn(on) {
                useLab.getState().setLampsOn(on);
            },
            enter(mode = "inspect") {
                useLab.getState().enter(mode);
            },
            setCatalogOpen(on) {
                useLab.getState().setCatalogOpen(!!on);
            },
        };
        return () => {
            delete window.__labShot;
        };
    }, [camera]);
    const sens = useLab((s) => s.lookSensitivity);
    // Defaults are rotate 1 / zoom 1 / pan 1. Halved, then scaled by the HUD slider.
    return (<OrbitControls ref={controls} enabled={mode === "inspect"} enableDamping dampingFactor={0.12} rotateSpeed={0.5 * sens} zoomSpeed={0.55 * sens} panSpeed={0.5 * sens} minDistance={6} maxDistance={4200} maxPolarAngle={Math.PI / 2 - 0.03} makeDefault={mode === "inspect"}/>);
}
/** Walk mouse-look (pointer lock): 0.0011 rad/px, half the previous 0.0022. */
const WALK_LOOK_RAD_PER_PX = 0.0011;
/** Touch / drag look when not locked: 0.006 rad/px, half the previous 0.012. */
const TOUCH_LOOK_RAD_PER_PX = 0.006;
export function WalkRig() {
    const mode = useLab((s) => s.mode);
    const selectedId = useLab((s) => s.selectedId);
    const focusToken = useLab((s) => s.focusToken);
    const walkReset = useLab((s) => s.walkReset);
    const layers = useLab((s) => s.layers);
    const select = useLab((s) => s.select);
    const setPointerLocked = useLab((s) => s.setPointerLocked);
    const { camera, gl } = useThree();
    const yaw = useRef(WALK_START.yaw);
    const pitch = useRef(-0.04);
    const pos = useRef(new THREE.Vector3(WALK_START.x, WALK_START.y, WALK_START.z));
    const speed = useRef(0);
    const vel = useRef(new THREE.Vector3());
    const locked = useRef(false);
    const skipMoves = useRef(0);
    useEffect(() => {
        pos.current.set(WALK_START.x, WALK_START.y, WALK_START.z);
        yaw.current = WALK_START.yaw;
        pitch.current = -0.04;
        speed.current = 0;
        vel.current.set(0, 0, 0);
    }, [walkReset]);
    useEffect(() => {
        if (mode !== "walk")
            return;
        if (!focusToken || focusToken <= walkReset)
            return;
        const f = selectedId ? FEATURE_BY_ID.get(selectedId) : null;
        if (!f)
            return;
        pos.current.set(f.footprint.x + 16, Math.max(pos.current.y, 1.7), f.footprint.z + 16);
        const dx = f.footprint.x - pos.current.x;
        const dz = f.footprint.z - pos.current.z;
        yaw.current = Math.atan2(-dx, -dz);
    }, [focusToken, mode, selectedId, walkReset]);
    useEffect(() => {
        window.__controlsTest = {
            getYaw: () => yaw.current,
            getSpeed: () => speed.current,
            setKeys: (codes) => input.setInjected(codes),
            getPosition: () => ({ x: pos.current.x, y: pos.current.y, z: pos.current.z }),
        };
        window.__labWalk = {
            set(x, y, z, yawRad, pitchRad) {
                pos.current.set(x, y, z);
                if (yawRad != null)
                    yaw.current = yawRad;
                if (pitchRad != null)
                    pitch.current = pitchRad;
            },
        };
        return () => {
            delete window.__controlsTest;
            delete window.__labWalk;
        };
    }, []);
    useEffect(() => {
        const el = gl.domElement;
        const onMove = (e) => {
            if (mode !== "walk" || !locked.current)
                return;
            // Browsers can report a huge bogus movementX/Y right after pointer lock and on
            // some high-polling mice; skip the first events and clamp spikes.
            if (skipMoves.current > 0) {
                skipMoves.current -= 1;
                return;
            }
            const MAX = 60;
            const mx = Math.max(-MAX, Math.min(MAX, e.movementX || 0));
            const my = Math.max(-MAX, Math.min(MAX, e.movementY || 0));
            const k = WALK_LOOK_RAD_PER_PX * useLab.getState().lookSensitivity;
            yaw.current -= mx * k;
            pitch.current -= my * k;
            const lim = Math.PI / 2 - 0.04;
            pitch.current = Math.max(-lim, Math.min(lim, pitch.current));
        };
        const onLock = () => {
            const was = locked.current;
            locked.current = document.pointerLockElement === el;
            setPointerLocked(locked.current);
            if (locked.current && !was)
                skipMoves.current = 2;
            if (!locked.current && was) {
                // Esc / alt-tab: release held keys so Shift-sprint or W never sticks.
                input.reset();
                vel.current.set(0, 0, 0);
            }
        };
        const onClick = () => {
            if (mode !== "walk")
                return;
            if (!locked.current) {
                const p = el.requestPointerLock();
                if (p && typeof p.catch === "function") {
                    p.catch(() => { });
                }
            }
            else {
                const ndc = new THREE.Vector2(0, 0);
                const ray = new THREE.Raycaster();
                ray.setFromCamera(ndc, camera);
                const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
                const hit = new THREE.Vector3();
                ray.ray.intersectPlane(plane, hit);
                if (hit) {
                    const f = pickFeature(hit.x, hit.z, layers);
                    if (f)
                        select(f.id);
                }
            }
        };
        el.addEventListener("mousemove", onMove);
        document.addEventListener("pointerlockchange", onLock);
        el.addEventListener("click", onClick);
        return () => {
            el.removeEventListener("mousemove", onMove);
            document.removeEventListener("pointerlockchange", onLock);
            el.removeEventListener("click", onClick);
        };
    }, [camera, gl, layers, mode, select, setPointerLocked]);
    useFrame((_, dt) => {
        // Clamp dt so a hitch (tab switch, GC, shader compile) cannot teleport the camera;
        // movement below is integrated in ≤50 ms sub-steps so speed is the same at any fps.
        const frameDt = Math.min(Math.max(dt, 0), 0.25);
        if (mode !== "walk")
            return;
        const look = input.consumeLook();
        if (!locked.current) {
            const k = TOUCH_LOOK_RAD_PER_PX * useLab.getState().lookSensitivity;
            yaw.current -= Math.max(-80, Math.min(80, look.dx)) * k;
            pitch.current -= Math.max(-80, Math.min(80, look.dy)) * k;
            const lim = Math.PI / 2 - 0.04;
            pitch.current = Math.max(-lim, Math.min(lim, pitch.current));
        }
        if (input.consumeF()) {
            const f = nearestFeature(pos.current.x, pos.current.z, layers);
            if (f)
                select(f.id);
        }
        const sprint = input.has("ShiftLeft") || input.has("ShiftRight");
        const crouch = input.has("KeyC");
        const max = sprint ? WALK_SPEED.sprint : WALK_SPEED.base;
        let ax = 0;
        let az = 0;
        if (input.has("KeyW") || input.has("ArrowUp"))
            az += 1;
        if (input.has("KeyS") || input.has("ArrowDown"))
            az -= 1;
        if (input.has("KeyD") || input.has("ArrowRight"))
            ax += 1;
        if (input.has("KeyA") || input.has("ArrowLeft"))
            ax -= 1;
        ax += input.touchX;
        az += input.touchY;
        const len = Math.hypot(ax, az);
        if (len > 1) {
            ax /= len;
            az /= len;
        }
        let vy = 0;
        if (input.has("Space") || input.has("KeyE"))
            vy += 1;
        if (input.has("ControlLeft") || input.has("ControlRight") || input.has("KeyQ"))
            vy -= 1;
        const eye = crouch ? 1.05 : 1.7;
        const fx = -Math.sin(yaw.current);
        const fz = -Math.cos(yaw.current);
        const rx = Math.cos(yaw.current);
        const rz = -Math.sin(yaw.current);
        const moving = len > 0.01;
        // Frame-rate-independent exponential approach to the target velocity, so speed
        // (and Shift sprint) ramps the same at 30, 60 or 144 fps instead of snapping.
        const tx = moving ? (fx * az + rx * ax) * max : 0;
        const tz = moving ? (fz * az + rz * ax) * max : 0;
        const steps = Math.max(1, Math.ceil(frameDt / 0.05));
        const d = frameDt / steps;
        const a = 1 - Math.exp(-d * (moving ? 6 : 9));
        for (let i = 0; i < steps; i++) {
            vel.current.x += (tx - vel.current.x) * a;
            vel.current.z += (tz - vel.current.z) * a;
            pos.current.x += vel.current.x * d;
            pos.current.z += vel.current.z * d;
        }
        speed.current = Math.hypot(vel.current.x, vel.current.z);
        pos.current.y += vy * (sprint ? WALK_SPEED.verticalSprint : WALK_SPEED.vertical) * frameDt;
        if (vy === 0 && pos.current.y < eye + 0.02)
            pos.current.y = eye;
        if (pos.current.y < 0.4)
            pos.current.y = 0.4;
        if (pos.current.y > 900)
            pos.current.y = 900;
        camera.position.copy(pos.current);
        camera.rotation.order = "YXZ";
        camera.rotation.y = yaw.current;
        camera.rotation.x = pitch.current;
    });
    return null;
}
export function Picker() {
    const mode = useLab((s) => s.mode);
    const select = useLab((s) => s.select);
    const layers = useLab((s) => s.layers);
    const down = useRef({ x: 0, y: 0 });
    const { camera, gl } = useThree();
    useEffect(() => {
        if (mode !== "inspect")
            return;
        const el = gl.domElement;
        const onDown = (e) => {
            down.current = { x: e.clientX, y: e.clientY };
        };
        const onUp = (e) => {
            if (Math.hypot(e.clientX - down.current.x, e.clientY - down.current.y) > 7)
                return;
            const rect = el.getBoundingClientRect();
            const ndc = new THREE.Vector2(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
            const ray = new THREE.Raycaster();
            ray.setFromCamera(ndc, camera);
            const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
            const hit = new THREE.Vector3();
            if (!ray.ray.intersectPlane(plane, hit))
                return;
            const f = pickFeature(hit.x, hit.z, layers);
            select(f ? f.id : null);
        };
        el.addEventListener("pointerdown", onDown);
        el.addEventListener("pointerup", onUp);
        return () => {
            el.removeEventListener("pointerdown", onDown);
            el.removeEventListener("pointerup", onUp);
        };
    }, [camera, gl, layers, mode, select]);
    return null;
}
