// Renderer, camera, orbit controls, lights, the room meshes and the two view modes.
// Top view (default) = placing furniture: almost orthographic, framed, one finger never moves it.
// 3D view = looking at the result: one finger orbits, two fingers zoom/pan.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { buildRoom, disposeRoom } from './room-builder.js';

const MARGIN = 40;        // walls + breathing space around the room, in cm
const TOP_FOV = 18;       // narrow lens from far away ≈ a flat plan, walls do not lean
const PERSPECTIVE_FOV = 50;

/**
 * @param {HTMLElement} container
 * @param {import('./room-config.js').Room} initialRoom
 * @param {() => {top:number, right:number, bottom:number, left:number}} getInsets screen areas covered by UI
 */
export function createScene(container, initialRoom, getInsets) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#e9edf2');

  const camera = new THREE.PerspectiveCamera(TOP_FOV, 1, 5, 40000);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.rotateSpeed = 0.6;
  controls.maxPolarAngle = Math.PI / 2 - 0.05;
  controls.minDistance = 80;

  scene.add(new THREE.HemisphereLight(0xffffff, 0xb9a88f, 1.1));
  const sun = new THREE.DirectionalLight(0xffffff, 1.5);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  scene.add(sun, sun.target);

  const center = new THREE.Vector3();
  const roomSize = { w: 0, h: 0, wallHeight: 0 };
  let view = 'top';
  let lowWalls = false;
  /** @type {{room: THREE.Group, walls: THREE.Group} | null} */
  let built = null;

  /** Shifts the projection so the room is centred in the part of the screen not covered by UI. */
  function applyViewOffset() {
    const { clientWidth: w, clientHeight: h } = container;
    const ins = getInsets();
    const sx = (ins.left - ins.right) / 2;
    const sy = (ins.top - ins.bottom) / 2;
    const fullW = w + 2 * Math.abs(sx);
    const fullH = h + 2 * Math.abs(sy);
    camera.aspect = fullW / fullH;
    camera.setViewOffset(fullW, fullH, sx > 0 ? 0 : 2 * Math.abs(sx), sy > 0 ? 0 : 2 * Math.abs(sy), w, h);
    camera.updateProjectionMatrix();
    return { fullH, visW: Math.max(120, w - ins.left - ins.right), visH: Math.max(120, h - ins.top - ins.bottom) };
  }

  function fitDistance(spanX, spanY) {
    const { fullH, visW, visH } = applyViewOffset();
    const k = fullH / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)));
    return Math.max((spanX * k) / visW, (spanY * k) / visH);
  }

  function setView(next) {
    view = next;
    controls.target.copy(center);
    if (view === 'top') {
      camera.fov = TOP_FOV;
      // Frame the wall TOPS (closest to the camera, so the biggest on screen), not the floor.
      const dist = fitDistance(roomSize.w + MARGIN, roomSize.h + MARGIN) + roomSize.wallHeight;
      camera.position.set(center.x, dist, center.z + 0.01);
      controls.enableRotate = false;
      controls.enablePan = true;
      controls.touches.ONE = null;               // one finger on empty floor does nothing
      controls.touches.TWO = THREE.TOUCH.DOLLY_PAN;
      controls.mouseButtons.LEFT = null;
      controls.mouseButtons.RIGHT = THREE.MOUSE.PAN;
    } else {
      camera.fov = PERSPECTIVE_FOV;
      const span = Math.max(roomSize.w, roomSize.h) + MARGIN;
      const dist = fitDistance(span * 1.15, span * 1.15);
      const dir = new THREE.Vector3(0, 0.85, 0.53).normalize();
      camera.position.copy(center).addScaledVector(dir, dist);
      controls.enableRotate = true;
      controls.touches.ONE = THREE.TOUCH.ROTATE;
      controls.touches.TWO = THREE.TOUCH.DOLLY_PAN;
      controls.mouseButtons.LEFT = THREE.MOUSE.ROTATE;
      controls.mouseButtons.RIGHT = THREE.MOUSE.PAN;
    }
    camera.updateProjectionMatrix();
    controls.update();
  }

  function setLowWalls(low) {
    lowWalls = low;
    if (built) built.walls.scale.y = low ? 0.4 : 1;
  }

  /** Rebuilds the room meshes, re-aims the sun and re-frames the camera. */
  function setRoom(room) {
    if (built) {
      scene.remove(built.room);
      disposeRoom(built.room);
    }
    built = buildRoom(room);
    scene.add(built.room);
    setLowWalls(lowWalls);

    roomSize.w = room.bounds.maxX;
    roomSize.h = room.bounds.maxY;
    roomSize.wallHeight = room.wallHeight;
    center.set(roomSize.w / 2, 0, roomSize.h / 2);
    const span = Math.max(roomSize.w, roomSize.h) + MARGIN;
    // Almost vertical sun: short wall shadows, the floor stays readable.
    sun.position.set(center.x + span * 0.2, span * 2.5, center.z + span * 0.15);
    sun.target.position.copy(center);
    const half = span * 0.85;
    Object.assign(sun.shadow.camera, { left: -half, right: half, top: half, bottom: -half, near: 10, far: span * 6 });
    sun.shadow.camera.updateProjectionMatrix();
    controls.maxDistance = span * 12;
    setView(view);
  }

  function resize() {
    const { clientWidth: w, clientHeight: h } = container;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    setView(view);
  }
  new ResizeObserver(resize).observe(container);
  renderer.setSize(container.clientWidth || 1, container.clientHeight || 1, false);
  setRoom(initialRoom);

  const frameListeners = new Set();
  renderer.setAnimationLoop(() => {
    controls.update();
    renderer.render(scene, camera);
    frameListeners.forEach((fn) => fn());
  });

  return {
    scene, camera, renderer, controls, setView, setLowWalls, setRoom,
    /** Re-frames the current view (also undoes any zoom/pan). */
    recenter: () => setView(view),
    onFrame: (fn) => frameListeners.add(fn),
    get view() { return view; },
  };
}
