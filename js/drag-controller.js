// Touch/mouse dragging of furniture on the floor plane.
// Listens in the CAPTURE phase on the container so it runs before OrbitControls (attached to the
// canvas): when a finger lands on (or close to) a piece of furniture, camera controls switch off.
import * as THREE from 'three';
import { distanceToFootprint } from './geometry.js';

const TOUCH_RADIUS_PX = 28;  // a finger is not a mouse pointer: accept "almost on it"
const MOVE_THRESHOLD_PX = 6; // below this, the finger is shaking, not dragging

export function attachDrag({ container, camera, renderer, controls }, furnitureView, store) {
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const floor = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const canvas = renderer.domElement;
  const activePointers = new Set();

  /** @type {{id:string, pointerId:number, offsetX:number, offsetY:number, startX:number, startY:number, moving:boolean} | null} */
  let drag = null;
  /** @type {{pointerId:number, x:number, y:number} | null} */
  let emptyTap = null;

  function floorPointAt(clientX, clientY) {
    const r = canvas.getBoundingClientRect();
    ndc.set(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    const p = new THREE.Vector3();
    return raycaster.ray.intersectPlane(floor, p) ? p : null;
  }

  /** Item under the finger: exact 3D hit first, else the closest footprint within the touch radius. */
  function pickItem(event) {
    const point = floorPointAt(event.clientX, event.clientY); // also aims the raycaster
    const hit = raycaster.intersectObjects(furnitureView.root.children, true)[0];
    const hitId = hit ? furnitureView.itemIdOf(hit.object) : null;
    if (hitId) return { item: store.items.find((i) => i.id === hitId), point };
    if (!point) return null;
    const side = floorPointAt(event.clientX + TOUCH_RADIUS_PX, event.clientY);
    const radiusCm = side ? side.distanceTo(point) : 30;
    floorPointAt(event.clientX, event.clientY);
    let best = null;
    for (const item of store.items) {
      const dist = distanceToFootprint(point.x, point.z, item);
      if (dist <= radiusCm && (!best || dist < best.dist)) best = { item, dist };
    }
    return best ? { item: best.item, point } : null;
  }

  function endDrag() {
    if (!drag) return;
    const moved = drag.moving;
    drag = null;
    controls.enabled = true;
    if (moved) store.commit();
  }

  function onPointerDown(event) {
    if (event.target !== canvas) return;
    activePointers.add(event.pointerId);
    if (activePointers.size > 1) {
      // Second finger: the user wants to zoom/pan, never to drag.
      emptyTap = null;
      endDrag();
      return;
    }
    const picked = pickItem(event);
    if (!picked || !picked.point) {
      emptyTap = { pointerId: event.pointerId, x: event.clientX, y: event.clientY };
      return;
    }
    const { item, point } = picked;
    controls.enabled = false;
    drag = { id: item.id, pointerId: event.pointerId, offsetX: point.x - item.x, offsetY: point.z - item.y,
      startX: event.clientX, startY: event.clientY, moving: false };
    store.select(item.id);
    event.preventDefault();
  }

  function onPointerMove(event) {
    if (emptyTap && event.pointerId === emptyTap.pointerId &&
        Math.hypot(event.clientX - emptyTap.x, event.clientY - emptyTap.y) > MOVE_THRESHOLD_PX) {
      emptyTap = null;
    }
    if (!drag || event.pointerId !== drag.pointerId) return;
    if (!drag.moving && Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) < MOVE_THRESHOLD_PX) return;
    drag.moving = true;
    const p = floorPointAt(event.clientX, event.clientY);
    if (!p) return;
    store.update(drag.id, { x: Math.round(p.x - drag.offsetX), y: Math.round(p.z - drag.offsetY) }, { persist: false });
  }

  function onPointerUp(event) {
    activePointers.delete(event.pointerId);
    if (emptyTap && event.pointerId === emptyTap.pointerId) {
      store.select(null);
      emptyTap = null;
    }
    if (drag && event.pointerId === drag.pointerId) endDrag();
  }

  container.addEventListener('pointerdown', onPointerDown, { capture: true });
  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerUp);
  window.addEventListener('pointercancel', onPointerUp);
}
