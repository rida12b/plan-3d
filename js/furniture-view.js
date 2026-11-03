// Keeps the 3D furniture meshes in sync with the store (one-way data flow: store → view).
import * as THREE from 'three';
import { buildModel, setHighlight, disposeModel } from './furniture-models.js';
import { placementIssues } from './geometry.js';

const signature = (i) => `${i.type}|${i.w}|${i.d}|${i.h}|${i.color}`;

export function createFurnitureView(scene, store) {
  const root = new THREE.Group();
  root.name = 'furniture';
  scene.add(root);
  /** @type {Map<string, {group: THREE.Group, sig: string}>} */
  const entries = new Map();

  function removeEntry(id) {
    const entry = entries.get(id);
    if (!entry) return;
    root.remove(entry.group);
    disposeModel(entry.group);
    entries.delete(id);
  }

  function sync() {
    const liveIds = new Set(store.items.map((i) => i.id));
    for (const id of [...entries.keys()]) if (!liveIds.has(id)) removeEntry(id);

    for (const item of store.items) {
      const sig = signature(item);
      let entry = entries.get(item.id);
      if (!entry || entry.sig !== sig) {
        removeEntry(item.id);
        const group = buildModel(item);
        group.userData.itemId = item.id;
        root.add(group);
        entry = { group, sig };
        entries.set(item.id, entry);
      }
      entry.group.position.set(item.x, 0, item.y);
      entry.group.rotation.y = -THREE.MathUtils.degToRad(item.rot);
      const invalid = placementIssues(item, store.items, store.room.obstacles, store.room.bounds).length > 0;
      const selected = item.id === store.selectedId;
      setHighlight(entry.group, invalid ? (selected ? 'selected-invalid' : 'invalid') : selected ? 'selected' : 'none');
    }
  }

  store.subscribe(sync);
  sync();

  return {
    root,
    /** Walks up from a hit mesh to the furniture group and returns its item id. */
    itemIdOf(object) {
      for (let o = object; o; o = o.parent) if (o.userData.itemId) return o.userData.itemId;
      return null;
    },
  };
}
