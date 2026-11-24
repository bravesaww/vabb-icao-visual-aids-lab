import { create } from "zustand";

export const LAMP_SYSTEMS = [
    { id: "approach", label: "ALS" },
    { id: "edge", label: "Edge" },
    { id: "centreLine", label: "CL" },
    { id: "tdz", label: "TDZ" },
    { id: "papi", label: "PAPI" },
    { id: "stopBars", label: "Stop" },
    { id: "taxiway", label: "Taxi" },
];

const allSystemsOn = () => Object.fromEntries(LAMP_SYSTEMS.map((s) => [s.id, true]));

const SENS_KEY = "vabb-lab-look-sensitivity";
function loadSensitivity() {
    try {
        const v = Number(globalThis.localStorage?.getItem(SENS_KEY));
        return Number.isFinite(v) && v >= 0.2 && v <= 2 ? v : 1;
    }
    catch {
        return 1;
    }
}

export const useLab = create((set) => ({
    mode: "start",
    lighting: "day",
    layers: { markings: true, lights: true, signs: true, buildings: true, physical: true },
    lampsOn: true,
    lampSystems: allSystemsOn(),
    /** "auto" follows the camera heading; "09" / "27" force the direction of operation. */
    opDirection: "auto",
    viewDirection: "09",
    /** Multiplier on the (already halved) base look / orbit sensitivity. */
    lookSensitivity: loadSensitivity(),
    selectedId: null,
    helpOpen: false,
    catalogOpen: false,
    walkReset: 0,
    focusToken: 0,
    pointerLocked: false,
    enter: (mode) => set({
        mode,
        helpOpen: false,
        catalogOpen: mode === "inspect" && typeof window !== "undefined" && window.innerWidth >= 768,
        walkReset: mode === "walk" ? Date.now() : 0,
    }),
    setMode: (mode) => set((s) => ({
        mode,
        walkReset: mode === "walk" ? Date.now() : s.walkReset,
        pointerLocked: mode === "walk" ? s.pointerLocked : false,
    })),
    setLighting: (lighting) => set({ lighting }),
    toggleLayer: (k) => set((s) => ({ layers: { ...s.layers, [k]: !s.layers[k] } })),
    setLampsOn: (lampsOn) => set({ lampsOn }),
    toggleLamps: () => set((s) => ({ lampsOn: !s.lampsOn })),
    toggleLampSystem: (k) => set((s) => ({
        lampSystems: { ...s.lampSystems, [k]: !s.lampSystems[k] },
    })),
    setLampSystem: (k, on) => set((s) => ({
        lampSystems: { ...s.lampSystems, [k]: on },
    })),
    setOpDirection: (opDirection) => set({ opDirection }),
    setViewDirection: (viewDirection) => set({ viewDirection }),
    setLookSensitivity: (v) => {
        const lookSensitivity = Math.min(2, Math.max(0.2, Number(v) || 1));
        try {
            globalThis.localStorage?.setItem(SENS_KEY, String(lookSensitivity));
        }
        catch {
            // storage unavailable (private mode / SSR) — keep in memory only
        }
        set({ lookSensitivity });
    },
    select: (selectedId) => set({ selectedId }),
    setHelpOpen: (helpOpen) => set({ helpOpen }),
    setCatalogOpen: (catalogOpen) => set({ catalogOpen }),
    setPointerLocked: (pointerLocked) => set({ pointerLocked }),
    focusFeature: (f) => set({
        selectedId: f.id,
        catalogOpen: true,
        focusToken: Date.now(),
    }),
}));
