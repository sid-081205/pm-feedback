import { useSyncExternalStore } from "react";

type Listener = () => void;

let isOpen = false;
let latestRunId: string | null = null;
const listeners = new Set<Listener>();

function emit() {
  for (const listener of listeners) {
    listener();
  }
}

function subscribe(listener: Listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return isOpen;
}

export function openAnalysisDialog() {
  isOpen = true;
  emit();
}

export function closeAnalysisDialog() {
  isOpen = false;
  emit();
}

export function setLatestAnalysisRunId(runId: string | null) {
  latestRunId = runId;
  emit();
}

export function useLatestAnalysisRunId() {
  return useSyncExternalStore(subscribe, () => latestRunId, () => latestRunId);
}

export function useAnalysisDialogOpen() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
