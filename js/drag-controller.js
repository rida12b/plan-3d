// Touch/mouse dragging of furniture on the floor plane.
// Listens in the CAPTURE phase on the container so it runs before OrbitControls (attached to the
// canvas): when a finger lands on a piece of furniture, the camera controls are switched off.
import * as THREE from 'three';

const TAP_TOLERANCE_PX = 8;

export function attachDrag({ container, camera, renderer, controls }, furnitureView, store) {
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const floor = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const canvas = renderer.domElement;

  /** @type {{id:string, pointerId:number, offsetX:number, offsetY:number} | null} */
  let drag = null;
  /** @type {{pointerId:number, x:number, y:number} | null} */
  let emptyTap = null;

  function aim(event) {
    const r = canvas.getBoundingClientRect();
    ndc.set(((event.clientX - r.left) / r.width) * 2 - 1, -((event.clientY - r.top) / r.height) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
  }

  function floorPoint() {
    const p = new THREE.Vector3();
    return raycaster.ray.intersectPlane(floor, p) ? p : null;
  }

  function onPointerDown(event) {
    if (event.target !== canvas || drag) return;
    if (emptyTap) {
      emptyTap = null; // second finger = pinch/pan gesture, not a tap
      return;
    }
    aim(event);
    const hit = raycaster.intersectObjects(furnitureView.root.children, true)[0];
    const id = hit ? furnitureView.itemIdOf(hit.object) : null;
    const item = id ? store.items.find((i) => i.id === id) : null;
    const p = item ? floorPoint() : null;
    if (!item || !p) {
      emptyTap = { pointerId: event.pointerId, x: event.clientX, y: event.clientY };
      return;
    }
    controls.enabled = false;
    drag = { id, pointerId: event.pointerId, offsetX: p.x - item.x, offsetY: p.z - item.y };
    store.select(id);
    event.preventDefault();
  }

  function onPointerMove(event) {
    if (emptyTap && event.pointerId === emptyTap.pointerId &&
        Math.hypot(event.clientX - emptyTap.x, event.clientY - emptyTap.y) > TAP_TOLERANCE_PX) {
      emptyTap = null;
    }
    if (!drag || event.pointerId !== drag.pointerId) return;
    aim(event);
    const p = floorPoint();
    if (!p) return;
    store.update(drag.id, { x: Math.round(p.x - drag.offsetX), y: Math.round(p.z - drag.offsetY) }, { persist: false });
  }

  function onPointerUp(event) {
    if (emptyTap && event.pointerId === emptyTap.pointerId) {
      store.select(null);
      emptyTap = null;
    }
    if (!drag || event.pointerId !== drag.pointerId) return;
    drag = null;
    controls.enabled = true;
    store.commit();
  }

  container.addEventListener('pointerdown', onPointerDown, { capture: true });
  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerUp);
  window.addEventListener('pointercancel', onPointerUp);
}
