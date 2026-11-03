// Renderer, camera, orbit controls, lights, the room meshes and the two view modes (3D / top view).
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { buildRoom, disposeRoom } from './room-builder.js';

const MARGIN = 50; // walls + breathing space around the room when framing the camera

/** @param {HTMLElement} container @param {import('./room-config.js').Room} initialRoom */
export function createScene(container, initialRoom) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#e9edf2');

  const camera = new THREE.PerspectiveCamera(50, 1, 5, 20000);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.maxPolarAngle = Math.PI / 2 - 0.05;
  controls.minDistance = 80;

  scene.add(new THREE.HemisphereLight(0xffffff, 0xb9a88f, 1.1));
  const sun = new THREE.DirectionalLight(0xffffff, 1.5);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  scene.add(sun, sun.target);

  const center = new THREE.Vector3();
  let span = 0;
  let view = '3d';
  let lowWalls = false;
  /** @type {{room: THREE.Group, walls: THREE.Group} | null} */
  let built = null;

  const fitDistance = () => {
    const halfFov = THREE.MathUtils.degToRad(camera.fov / 2);
    return (span / 2 / Math.tan(halfFov)) / Math.min(1, camera.aspect) * 1.35;
  };

  function setView(next) {
    view = next;
    controls.target.copy(center);
    const dist = fitDistance();
    if (view === 'top') {
      camera.position.set(center.x, dist, center.z + 0.01);
      controls.enableRotate = false;
      controls.touches.ONE = THREE.TOUCH.PAN;
      controls.mouseButtons.LEFT = THREE.MOUSE.PAN;
    } else {
      const dir = new THREE.Vector3(0, 0.85, 0.53).normalize();
      camera.position.copy(center).addScaledVector(dir, dist);
      controls.enableRotate = true;
      controls.touches.ONE = THREE.TOUCH.ROTATE;
      controls.mouseButtons.LEFT = THREE.MOUSE.ROTATE;
    }
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

    const { maxX, maxY } = room.bounds;
    center.set(maxX / 2, 0, maxY / 2);
    span = Math.max(maxX, maxY) + MARGIN;
    // Almost vertical sun: short wall shadows, the floor stays readable.
    sun.position.set(center.x + span * 0.2, span * 2.5, center.z + span * 0.15);
    sun.target.position.copy(center);
    const half = span * 0.85;
    Object.assign(sun.shadow.camera, { left: -half, right: half, top: half, bottom: -half, near: 10, far: span * 6 });
    sun.shadow.camera.updateProjectionMatrix();
    controls.maxDistance = span * 5;
    setView(view);
  }

  function resize() {
    const { clientWidth: w, clientHeight: h } = container;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(container);
  resize();
  setRoom(initialRoom);

  renderer.setAnimationLoop(() => {
    controls.update();
    renderer.render(scene, camera);
  });

  return {
    scene, camera, renderer, controls, setView, setLowWalls, setRoom,
    get view() { return view; },
  };
}
