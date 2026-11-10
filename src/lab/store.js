import { create } from "zustand";
export const useLab = create((set) => ({
    mode: "start",
    lighting: "day",
    layers: { markings: true, lights: true, signs: true, buildings: true, physical: true },
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
