// Builds the room meshes (floor, walls with openings, radiator) from room-config.
// Plan (x, y) maps to Three.js (x, 0, z=y).
import * as THREE from 'three';
import { WALL_THICKNESS } from './room-config.js';

/** @typedef {import('./room-config.js').Room} Room */

const WALL_COLOR = '#f2efe9';
const OPENING_STYLE = {
  'french-window': { glass: '#9fd3f0', frame: '#d64545' },
  window: { glass: '#bfe3f7', frame: '#5aa9d6' },
  door: { leaf: '#2847a8', frame: '#1b2f73' },
};

function floorTexture() {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#d8c3a5';
  ctx.fillRect(0, 0, size, size);
  ctx.strokeStyle = 'rgba(90, 60, 30, 0.35)';
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, size - 2, size - 2);
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1 / 50, 1 / 50); // one tile = 50 cm, helps judging distances
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function buildFloor(outline) {
  const shape = new THREE.Shape(outline.map(([x, y]) => new THREE.Vector2(x, -y)));
  const mesh = new THREE.Mesh(
    new THREE.ShapeGeometry(shape),
    new THREE.MeshStandardMaterial({ map: floorTexture(), roughness: 0.9 }),
  );
  mesh.rotation.x = -Math.PI / 2;
  mesh.receiveShadow = true;
  mesh.name = 'floor';
  return mesh;
}

function wallMaterial(color = WALL_COLOR, extra = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.95, ...extra });
}

/** Distance along segment [a,b] of point p, or null if p is not on the segment. */
function positionOnSegment(a, b, p) {
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const t = ((p[0] - a[0]) * (b[0] - a[0]) + (p[1] - a[1]) * (b[1] - a[1])) / len;
  const cross = (p[0] - a[0]) * (b[1] - a[1]) - (p[1] - a[1]) * (b[0] - a[0]);
  return Math.abs(cross / len) < 0.5 && t >= -0.5 && t <= len + 0.5 ? t : null;
}

function isConvexCorner(prev, curr, next) {
  const d1 = [curr[0] - prev[0], curr[1] - prev[1]];
  const d2 = [next[0] - curr[0], next[1] - curr[1]];
  return d1[0] * d2[1] - d1[1] * d2[0] > 0;
}

/** Adds a piece of wall along the segment local frame, from distance s0 to s1, height y0..y1. */
function addPiece(frame, s0, s1, y0, y1, mat, thickness = WALL_THICKNESS, inset = 0) {
  if (s1 - s0 < 0.1 || y1 - y0 < 0.1) return;
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(s1 - s0, y1 - y0, thickness), mat);
  mesh.position.set((s0 + s1) / 2, (y0 + y1) / 2, -(WALL_THICKNESS / 2 - inset));
  mesh.castShadow = mesh.receiveShadow = true;
  frame.add(mesh);
}

function addOpening(frame, opening, s0, s1, wallHeight) {
  const style = OPENING_STYLE[opening.kind];
  const top = opening.sill + opening.height;
  addPiece(frame, s0, s1, 0, opening.sill, wallMaterial());
  addPiece(frame, s0, s1, top, wallHeight, wallMaterial());
  if (opening.kind === 'door') {
    addPiece(frame, s0 + 2, s1 - 2, 0, top - 2, wallMaterial(style.leaf), 4, 2);
  } else {
    const glass = wallMaterial(style.glass, { transparent: true, opacity: 0.45, roughness: 0.1 });
    addPiece(frame, s0, s1, opening.sill, top, glass, 2);
  }
  const frameMat = wallMaterial(style.frame);
  addPiece(frame, s0, s0 + 4, opening.sill, top, frameMat, WALL_THICKNESS + 1);
  addPiece(frame, s1 - 4, s1, opening.sill, top, frameMat, WALL_THICKNESS + 1);
  addPiece(frame, s0, s1, top - 4, top, frameMat, WALL_THICKNESS + 1);
}

/** @param {Room} room */
function buildWalls({ outline, openings, wallHeight }) {
  const walls = new THREE.Group();
  walls.name = 'walls';
  const n = outline.length;
  for (let i = 0; i < n; i++) {
    const a = outline[i];
    const b = outline[(i + 1) % n];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const dir = [(b[0] - a[0]) / len, (b[1] - a[1]) / len];
    // Local frame: x along the segment, +z towards the room interior (outline is clockwise on
    // screen). Walls are placed on the -z side so the inner outline stays the usable floor.
    const frame = new THREE.Group();
    frame.position.set(a[0], 0, a[1]);
    frame.rotation.y = -Math.atan2(dir[1], dir[0]);
    const startExt = isConvexCorner(outline[(i - 1 + n) % n], a, b) ? WALL_THICKNESS : 0;
    const endExt = isConvexCorner(a, b, outline[(i + 2) % n]) ? WALL_THICKNESS : 0;

    const cuts = openings.map((o) => {
      const s0 = positionOnSegment(a, b, o.from);
      const s1 = positionOnSegment(a, b, o.to);
      return s0 === null || s1 === null ? null : { o, s0: Math.min(s0, s1), s1: Math.max(s0, s1) };
    }).filter(Boolean).sort((p, q) => p.s0 - q.s0);

    let cursor = -startExt;
    for (const cut of cuts) {
      addPiece(frame, cursor, cut.s0, 0, wallHeight, wallMaterial());
      addOpening(frame, cut.o, cut.s0, cut.s1, wallHeight);
      cursor = cut.s1;
    }
    addPiece(frame, cursor, len + endExt, 0, wallHeight, wallMaterial());
    walls.add(frame);
  }
  return walls;
}

function buildRadiator({ x, y, depth, length, elevation, height }) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(depth, height, length), wallMaterial('#3fa34d', { roughness: 0.5 }));
  mesh.position.set(x + depth / 2, elevation + height / 2, y + length / 2);
  mesh.castShadow = true;
  return mesh;
}

function buildDoorSwingMarker(zone) {
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(zone.maxX - zone.minX, zone.maxY - zone.minY),
    new THREE.MeshBasicMaterial({ color: '#2847a8', transparent: true, opacity: 0.18, depthWrite: false }),
  );
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set((zone.minX + zone.maxX) / 2, 0.3, (zone.minY + zone.maxY) / 2);
  return mesh;
}

/** @param {Room} room */
export function buildRoom(room) {
  const group = new THREE.Group();
  const walls = buildWalls(room);
  group.add(buildFloor(room.outline), walls);
  if (room.radiator.length > 0) group.add(buildRadiator(room.radiator));
  if (room.doorSwing.maxX > room.doorSwing.minX && room.doorSwing.maxY > room.doorSwing.minY) {
    group.add(buildDoorSwingMarker(room.doorSwing));
  }
  return { room: group, walls };
}

export function disposeRoom(group) {
  group.traverse((obj) => {
    if (!obj.isMesh) return;
    obj.geometry.dispose();
    obj.material.map?.dispose();
    obj.material.dispose();
  });
}
