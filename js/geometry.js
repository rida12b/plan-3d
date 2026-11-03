// Pure 2D geometry on the plan (no Three.js). Items are oriented rectangles (OBB).

/** @typedef {{x:number, y:number, w:number, d:number, rot:number}} Footprint  rot in degrees */
/** @typedef {{minX:number, minY:number, maxX:number, maxY:number}} Rect */

const toRad = (deg) => (deg * Math.PI) / 180;

/** @param {Footprint} f @returns {number[][]} the 4 corners */
export function corners(f) {
  const c = Math.cos(toRad(f.rot));
  const s = Math.sin(toRad(f.rot));
  const hw = f.w / 2;
  const hd = f.d / 2;
  return [[-hw, -hd], [hw, -hd], [hw, hd], [-hw, hd]].map(([lx, ly]) => [
    f.x + lx * c - ly * s,
    f.y + lx * s + ly * c,
  ]);
}

/** @param {Footprint} f @returns {{hx:number, hy:number}} half extents of the axis-aligned box */
export function halfExtents(f) {
  const c = Math.abs(Math.cos(toRad(f.rot)));
  const s = Math.abs(Math.sin(toRad(f.rot)));
  return { hx: (f.w / 2) * c + (f.d / 2) * s, hy: (f.w / 2) * s + (f.d / 2) * c };
}

/** @param {Rect} r */
function rectCorners(r) {
  return [[r.minX, r.minY], [r.maxX, r.minY], [r.maxX, r.maxY], [r.minX, r.maxY]];
}

function axesOf(poly) {
  return poly.map((p, i) => {
    const q = poly[(i + 1) % poly.length];
    return [-(q[1] - p[1]), q[0] - p[0]];
  });
}

function project(poly, axis) {
  let min = Infinity;
  let max = -Infinity;
  for (const [x, y] of poly) {
    const v = x * axis[0] + y * axis[1];
    min = Math.min(min, v);
    max = Math.max(max, v);
  }
  return [min, max];
}

const EPSILON = 0.5; // touching (flush against) is allowed, overlapping is not

/** Separating Axis Theorem on two convex polygons. */
export function polygonsOverlap(a, b) {
  for (const axis of [...axesOf(a), ...axesOf(b)]) {
    const len = Math.hypot(axis[0], axis[1]);
    const unit = [axis[0] / len, axis[1] / len];
    const [aMin, aMax] = project(a, unit);
    const [bMin, bMax] = project(b, unit);
    if (aMax - EPSILON <= bMin || bMax - EPSILON <= aMin) return false;
  }
  return true;
}

/** Keep the item centre so that its footprint stays inside the bounds. */
export function clampInside(f, bounds) {
  const { hx, hy } = halfExtents(f);
  const clamp = (v, lo, hi) => (lo > hi ? (lo + hi) / 2 : Math.min(Math.max(v, lo), hi));
  return {
    x: clamp(f.x, bounds.minX + hx, bounds.maxX - hx),
    y: clamp(f.y, bounds.minY + hy, bounds.maxY - hy),
  };
}

/** Distances from the item's axis-aligned box to each wall of the bounds. */
export function wallDistances(f, bounds) {
  const { hx, hy } = halfExtents(f);
  return {
    left: Math.round(f.x - hx - bounds.minX),
    right: Math.round(bounds.maxX - (f.x + hx)),
    top: Math.round(f.y - hy - bounds.minY),
    bottom: Math.round(bounds.maxY - (f.y + hy)),
  };
}

/**
 * List the reasons why an item is badly placed (empty list = OK).
 * @param {Footprint & {id:string, blocks:boolean}} item
 * @param {Array<Footprint & {id:string, blocks:boolean, name:string}>} others
 * @param {Array<Rect & {label:string}>} obstacles
 * @param {Rect} bounds
 */
export function placementIssues(item, others, obstacles, bounds) {
  const poly = corners(item);
  const issues = [];
  const outside = poly.some(([x, y]) =>
    x < bounds.minX - EPSILON || x > bounds.maxX + EPSILON || y < bounds.minY - EPSILON || y > bounds.maxY + EPSILON);
  if (outside) issues.push('dépasse du mur');
  for (const o of obstacles) {
    if (polygonsOverlap(poly, rectCorners(o))) issues.push(o.label.toLowerCase());
  }
  if (!item.blocks) return issues;
  for (const other of others) {
    if (other.id === item.id || !other.blocks) continue;
    if (polygonsOverlap(poly, corners(other))) issues.push(`touche : ${other.name}`);
  }
  return issues;
}
