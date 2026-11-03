// Holds the editable room measures and the room geometry computed from them.
import { DEFAULT_DIMENSIONS, computeRoom, validateDimensions } from './room-config.js';

const STORAGE_KEY = 'plan3d.room.v1';

function loadSaved() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const merged = { ...DEFAULT_DIMENSIONS, ...(raw ? JSON.parse(raw) : {}) };
    return validateDimensions(merged).length === 0 ? merged : { ...DEFAULT_DIMENSIONS };
  } catch {
    return { ...DEFAULT_DIMENSIONS };
  }
}

function save(dims) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dims));
  } catch {
    // Storage blocked: the room still works for this visit.
  }
}

export function createRoomStore() {
  let room = computeRoom(loadSaved());
  const listeners = new Set();

  return {
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    get room() { return room; },
    /** Applies the measures if they are valid. @returns {string[]} errors (empty = applied) */
    setDimensions(dims) {
      const errors = validateDimensions(dims);
      if (errors.length) return errors;
      room = computeRoom({ ...dims });
      save(room.dims);
      listeners.forEach((fn) => fn());
      return [];
    },
    reset() { return this.setDimensions({ ...DEFAULT_DIMENSIONS }); },
  };
}
