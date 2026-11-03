// Furniture names drawn over the 3D canvas (HTML layer), so boxes seen from above are identifiable.
import * as THREE from 'three';

const LABEL_HEIGHT = 2; // cm above the floor: the label follows the footprint, not the top of tall items

export function createLabelsView(container, camera, store) {
  const layer = document.createElement('div');
  layer.className = 'labels-layer';
  layer.setAttribute('aria-hidden', 'true');
  container.append(layer);
  /** @type {Map<string, HTMLSpanElement>} */
  const spans = new Map();
  const v = new THREE.Vector3();

  function sync() {
    const live = new Set(store.items.map((i) => i.id));
    for (const [id, span] of spans) if (!live.has(id)) { span.remove(); spans.delete(id); }
    for (const item of store.items) {
      let span = spans.get(item.id);
      if (!span) {
        span = document.createElement('span');
        span.className = 'furniture-label';
        layer.append(span);
        spans.set(item.id, span);
      }
      span.textContent = item.name;
      span.classList.toggle('selected', item.id === store.selectedId);
    }
  }

  /** Called every frame: project each item centre to screen pixels. */
  function update() {
    const w = container.clientWidth;
    const h = container.clientHeight;
    for (const item of store.items) {
      const span = spans.get(item.id);
      if (!span) continue;
      v.set(item.x, LABEL_HEIGHT, item.y).project(camera);
      const visible = v.z < 1 && Math.abs(v.x) < 1.1 && Math.abs(v.y) < 1.1;
      span.style.display = visible ? '' : 'none';
      if (visible) span.style.transform = `translate(-50%, -50%) translate(${((v.x + 1) / 2) * w}px, ${((1 - v.y) / 2) * h}px)`;
    }
  }

  store.subscribe(sync);
  sync();
  return { update };
}
