// Low-poly 3D models built from boxes/cylinders, parameterised by the item size.
// Local frame: x = width, z = depth (front = +z), y = up, origin = footprint centre on the floor.
import * as THREE from 'three';

const WHITE = '#f7f5f0';
const DARK = '#2b2b2b';

function material(color) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.8, metalness: 0.05 });
}

/** Adds a box whose bottom-centre sits at (x, y, z). */
function box(group, w, h, d, color, x = 0, y = 0, z = 0) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material(color));
  mesh.position.set(x, y + h / 2, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);
  return mesh;
}

function cylinder(group, radius, h, color, x = 0, y = 0, z = 0) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, h, 32), material(color));
  mesh.position.set(x, y + h / 2, z);
  mesh.castShadow = true;
  group.add(mesh);
  return mesh;
}

function legs(g, w, d, h, color, inset = 4, size = 4) {
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    box(g, size, h, size, color, sx * (w / 2 - inset), 0, sz * (d / 2 - inset));
  }
}

function sofaBlock(g, w, d, h, c, { armLeft = true, armRight = true } = {}) {
  const arm = Math.min(18, w / 6);
  box(g, w, 42, d, c, 0, 0, 0);
  box(g, w, h - 42, 20, c, 0, 42, -d / 2 + 10);
  if (armLeft) box(g, arm, 22, d, c, -w / 2 + arm / 2, 42, 0);
  if (armRight) box(g, arm, 22, d, c, w / 2 - arm / 2, 42, 0);
}

const BUILDERS = {
  bed(g, { w, d, h, color }) {
    box(g, w, h * 0.5, d, color);
    box(g, w - 4, 20, d - 10, WHITE, 0, h * 0.5, 4);
    box(g, w, 100, 6, color, 0, 0, -d / 2 + 3);
    const pillows = w >= 120 ? [-w / 4, w / 4] : [0];
    for (const px of pillows) box(g, Math.min(60, w / pillows.length - 10), 10, 35, WHITE, px, h * 0.5 + 20, -d / 2 + 28);
  },
  nightstand(g, { w, d, h, color }) {
    box(g, w, h - 3, d, color, 0, 0, 0);
    box(g, w + 2, 3, d + 2, color, 0, h - 3, 0);
    box(g, w * 0.3, 2, 1, DARK, 0, h * 0.6, d / 2 + 0.5);
  },
  wardrobe(g, { w, d, h, color }) {
    box(g, w, h, d, color);
    box(g, 1, h - 10, 1, DARK, 0, 5, d / 2 + 0.5);
    for (const sx of [-1, 1]) box(g, 2, 25, 2, DARK, sx * 6, h * 0.45, d / 2 + 1);
  },
  dresser(g, { w, d, h, color }) {
    box(g, w, h, d, color);
    for (let i = 1; i <= 3; i++) box(g, w * 0.3, 2, 1, DARK, 0, (h / 4) * i - 8, d / 2 + 0.5);
  },
  sofa(g, { w, d, h, color }) { sofaBlock(g, w, d, h, color); },
  armchair(g, { w, d, h, color }) { sofaBlock(g, w, d, h, color); },
  'corner-sofa'(g, { w, d, h, color }) {
    const seat = Math.min(90, d * 0.6);
    const g1 = new THREE.Group();
    sofaBlock(g1, w, seat, h, color, { armLeft: false });
    g1.position.z = -d / 2 + seat / 2;
    g.add(g1);
    const chaiseDepth = d - seat;
    box(g, seat, 42, chaiseDepth, color, -w / 2 + seat / 2, 0, d / 2 - chaiseDepth / 2);
    box(g, 20, h - 42, d, color, -w / 2 + 10, 42, 0);
  },
  'coffee-table'(g, { w, d, h, color }) {
    box(g, w, 4, d, color, 0, h - 4, 0);
    legs(g, w, d, h - 4, color);
  },
  'tv-stand'(g, { w, d, h, color }) {
    box(g, w, h, d, color);
    const tvW = Math.min(w * 0.85, 145);
    const tvH = tvW * 0.5625;
    box(g, 20, 5, 15, DARK, 0, h, -d / 4);
    box(g, tvW, tvH, 4, '#111111', 0, h + 5, -d / 4);
  },
  table(g, { w, d, h, color }) {
    box(g, w, 3, d, color, 0, h - 3, 0);
    legs(g, w, d, h - 3, color, 6, 5);
  },
  'round-table'(g, { w, h, color }) {
    cylinder(g, w / 2, 3, color, 0, h - 3, 0);
    cylinder(g, 5, h - 3, color);
    cylinder(g, w / 5, 2, color);
  },
  chair(g, { w, d, h, color }) {
    box(g, w, 4, d, color, 0, 44, 0);
    box(g, w, h - 48, 4, color, 0, 48, -d / 2 + 2);
    legs(g, w, d, 44, color, 3, 3);
  },
  desk(g, { w, d, h, color }) {
    box(g, w, 3, d, color, 0, h - 3, 0);
    for (const sx of [-1, 1]) box(g, 3, h - 3, d, color, sx * (w / 2 - 1.5), 0, 0);
  },
  bookcase(g, { w, d, h, color }) {
    for (const sx of [-1, 1]) box(g, 2, h, d, color, sx * (w / 2 - 1), 0, 0);
    box(g, w, h, 1, color, 0, 0, -d / 2 + 0.5);
    const shelves = Math.max(2, Math.round(h / 38));
    for (let i = 0; i <= shelves; i++) box(g, w - 4, 2, d, color, 0, Math.min(i * (h / shelves), h - 2), 0);
  },
  fridge(g, { w, d, h, color }) {
    box(g, w, h, d, color);
    box(g, w - 2, 1, 1, '#b8b8b8', 0, h * 0.62, d / 2 + 0.5);
    box(g, 2, 30, 3, '#9a9a9a', w / 2 - 6, h * 0.68, d / 2 + 1.5);
  },
  kitchen(g, { w, d, h, color }) {
    box(g, w, h - 4, d - 4, color, 0, 0, -2);
    box(g, w, 4, d, '#7a7068', 0, h - 4, 0);
    box(g, Math.min(50, w / 3), 1, d * 0.6, '#c0c4c8', -w / 4, h, 0);
    box(g, Math.min(55, w / 3), 1, d * 0.75, DARK, w / 4, h, 0);
  },
  rug(g, { w, d, color }) { box(g, w, 1, d, color); },
  plant(g, { w, h, color }) {
    cylinder(g, w / 3, h * 0.3, '#8a5a3b');
    const leaves = new THREE.Mesh(new THREE.SphereGeometry(w / 2, 16, 12), material(color));
    leaves.position.y = h * 0.3 + w / 2;
    leaves.scale.y = Math.max(1, (h * 0.7) / w);
    leaves.castShadow = true;
    g.add(leaves);
  },
  box(g, { w, d, h, color }) { box(g, w, h, d, color); },
};

/** @param {{type:string, w:number, d:number, h:number, color:string}} item */
export function buildModel(item) {
  const group = new THREE.Group();
  (BUILDERS[item.type] ?? BUILDERS.box)(group, item);
  return group;
}

/** Highlight states: 'none' | 'selected' | 'invalid' | 'selected-invalid'. */
export function setHighlight(group, state) {
  const emissive = state.includes('invalid') ? 0x8a0000 : state === 'selected' ? 0x1d4ed8 : 0x000000;
  const intensity = state === 'none' ? 0 : state === 'selected' ? 0.25 : 0.55;
  group.traverse((obj) => {
    if (obj.isMesh) {
      obj.material.emissive.setHex(emissive);
      obj.material.emissiveIntensity = intensity;
    }
  });
}

export function disposeModel(group) {
  group.traverse((obj) => {
    if (obj.isMesh) {
      obj.geometry.dispose();
      obj.material.dispose();
    }
  });
}
