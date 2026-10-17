"use client";

import { useCallback, useSyncExternalStore } from "react";
import { DEFAULT_VIEW_MODE, loadViewMode, saveViewMode, type ViewMode } from "@/lib/view-mode";

const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

/** 2D ou 3D, guardado no navegador. No servidor e na hidratação vale o padrão. */
export function useViewMode(): [ViewMode, (mode: ViewMode) => void] {
  const mode = useSyncExternalStore(subscribe, loadViewMode, () => DEFAULT_VIEW_MODE);
  const setMode = useCallback((next: ViewMode) => {
    saveViewMode(next);
    for (const listener of listeners) listener();
  }, []);
  return [mode, setMode];
}
