// Single source of truth for the furniture layout. Observer pattern: views subscribe to changes.
import { clampInside, placementIssues } from './geometry.js';

const GRID_CELLS = 60; // search grid resolution, whatever the room size

const centerOf = (b) => ({ x: Math.round((b.minX + b.maxX) / 2), y: Math.round((b.minY + b.maxY) / 2) });

/** Free spot closest to the room centre, so a new item does not land on top of another. */
function findFreeSpot(candidate, items, room) {
  const { bounds, obstacles } = room;
  const center = centerOf(bounds);
  const step = Math.max(10, Math.ceil(Math.max(bounds.maxX, bounds.maxY) / GRID_CELLS));
  const spots = [];
  for (let x = bounds.minX; x <= bounds.maxX; x += step) {
    for (let y = bounds.minY; y <= bounds.maxY; y += step) spots.push({ x, y });
  }
  spots.sort((a, b) => Math.hypot(a.x - center.x, a.y - center.y) - Math.hypot(b.x - center.x, b.y - center.y));
  for (const spot of spots) {
    const placed = { ...candidate, ...clampInside({ ...candidate, ...spot }, bounds) };
    if (placementIssues(placed, items, obstacles, bounds).length === 0) return placed;
  }
  return { ...candidate, ...clampInside({ ...candidate, ...center }, bounds) };
}

/** @typedef {{id:string, type:string, name:string, x:number, y:number, w:number, d:number, h:number, rot:number, color:string, blocks:boolean}} Item */

const STORAGE_KEY = 'plan3d.layout.v1';

function loadSaved() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((i) => i && typeof i.id === 'string') : [];
  } catch {
    return [];
  }
}

function save(items) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // Private mode / storage blocked: the layout still works, it is just not remembered.
  }
}

const newId = () => `i${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

/** @param {ReturnType<typeof import('./room-store.js').createRoomStore>} roomStore */
export function createStore(roomStore) {
  /** @type {Item[]} */
  let items = loadSaved();
  /** @type {string|null} */
  let selectedId = null;
  const listeners = new Set();

  const emit = (persist = true) => {
    if (persist) save(items);
    listeners.forEach((fn) => fn());
  };
  const fit = (item) => ({ ...item, ...clampInside(item, roomStore.room.bounds) });

  items = items.map(fit);
  // The room got smaller or bigger: pull every item back inside, then redraw.
  roomStore.subscribe(() => {
    items = items.map(fit);
    emit();
  });

  return {
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    get room() { return roomStore.room; },
    get items() { return items; },
    get selectedId() { return selectedId; },
    get selected() { return items.find((i) => i.id === selectedId) ?? null; },

    add(entry) {
      const item = findFreeSpot({ id: newId(), type: entry.type, name: entry.name, x: 0, y: 0,
        w: entry.w, d: entry.d, h: entry.h, rot: 0, color: entry.color, blocks: entry.blocks }, items, roomStore.room);
      items = [...items, item];
      selectedId = item.id;
      emit();
      return item;
    },
    /** @param {Partial<Item>} patch  @param {{persist?:boolean}} [opts] persist=false while dragging */
    update(id, patch, { persist = true } = {}) {
      items = items.map((i) => (i.id === id ? fit({ ...i, ...patch }) : i));
      emit(persist);
    },
    commit() { save(items); },
    remove(id) {
      items = items.filter((i) => i.id !== id);
      if (selectedId === id) selectedId = null;
      emit();
    },
    duplicate(id) {
      const src = items.find((i) => i.id === id);
      if (!src) return;
      const copy = fit({ ...src, id: newId(), x: src.x + 20, y: src.y + 20 });
      items = [...items, copy];
      selectedId = copy.id;
      emit();
    },
    select(id) {
      if (selectedId === id) return;
      selectedId = id;
      emit(false);
    },
    clear() {
      items = [];
      selectedId = null;
      emit();
    },
  };
}
