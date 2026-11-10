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

export const useLab = create((set) => ({
    mode: "start",
    lighting: "day",
    layers: { markings: true, lights: true, signs: true, buildings: true, physical: true },
    lampsOn: true,
    lampSystems: allSystemsOn(),
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
