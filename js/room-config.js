// Room model: the editable measures ("cotes") of the paper plan, and the pure function that turns
// them into geometry. Plan coordinates in cm: x → right, y → down, origin = top-left inner corner.

export const WALL_THICKNESS = 10;

/** Measures as written on the paper plan. Every value is editable in the "Pièce" sheet. */
export const DEFAULT_DIMENSIONS = {
  width: 510,            // mur du fond
  depth: 510,            // côté porte-fenêtre (66 + 250 + 79 + 96 + 19)
  wallHeight: 250,
  frenchWindowTop: 66,   // coin du fond → porte-fenêtre
  frenchWindowLength: 250,
  frenchWindowHeight: 215,
  frenchWindowToRadiator: 79,
  radiatorLength: 96,
  rightWall: 360,        // coin du fond → porte d'entrée
  doorWidth: 79,
  doorHeight: 205,
  stepWidth: 35,         // retour de mur après la porte
  windowOffset: 12,      // coin → fenêtre
  windowWidth: 167,
  windowSill: 90,
  windowHeight: 125,
  windowToNotch: 0,
  notchWidth: 74,
  notchDepth: 8,
};

/** @typedef {typeof DEFAULT_DIMENSIONS} Dimensions */

const RADIATOR_DEPTH = 8;

function cleanOutline(points) {
  const unique = points.filter((p, i) => {
    const q = points[(i + 1) % points.length];
    return p[0] !== q[0] || p[1] !== q[1];
  });
  return unique.filter((p, i) => {
    const prev = unique[(i - 1 + unique.length) % unique.length];
    const next = unique[(i + 1) % unique.length];
    const cross = (p[0] - prev[0]) * (next[1] - p[1]) - (p[1] - prev[1]) * (next[0] - p[0]);
    return cross !== 0;
  });
}

/** Lengths the user does not type: they are what remains on each wall. */
export function derivedLengths(d) {
  const doorEnd = d.rightWall + d.doorWidth;
  const notchEnd = d.windowOffset + d.windowWidth + d.windowToNotch + d.notchWidth;
  return {
    leftRest: d.depth - (d.frenchWindowTop + d.frenchWindowLength + d.frenchWindowToRadiator + d.radiatorLength),
    stepDepth: d.depth - doorEnd,
    bottomRest: d.width - d.stepWidth - notchEnd,
  };
}

/** @param {Dimensions} d @returns {string[]} human-readable problems (empty = valid) */
export function validateDimensions(d) {
  const errors = [];
  if (Object.values(d).some((v) => !Number.isFinite(v) || v < 0)) {
    return ['Une mesure est vide ou négative (case en rouge).'];
  }
  if (d.width < 100 || d.depth < 100) errors.push('La pièce doit faire au moins 100 cm de côté.');
  if (d.width > 3000 || d.depth > 3000) errors.push('La pièce doit faire au plus 30 m de côté.');
  const rest = derivedLengths(d);
  if (rest.leftRest < 0) errors.push(`Côté porte-fenêtre : les cotes dépassent la profondeur de ${-rest.leftRest} cm.`);
  if (rest.stepDepth < 0) errors.push(`Côté entrée : mur + porte dépassent la profondeur de ${-rest.stepDepth} cm.`);
  if (rest.bottomRest < 0) errors.push(`Côté fenêtre : les cotes dépassent la largeur de ${-rest.bottomRest} cm.`);
  if (d.frenchWindowHeight > d.wallHeight || d.doorHeight > d.wallHeight) errors.push('Une porte est plus haute que le plafond.');
  if (d.windowSill + d.windowHeight > d.wallHeight) errors.push('La fenêtre dépasse le plafond.');
  if (d.notchDepth >= d.depth / 2) errors.push('Le décroché est trop profond.');
  return errors;
}

/** Pure: measures → everything the 3D view and the collision checks need. Assumes valid input. */
export function computeRoom(d) {
  const W = d.width;
  const H = d.depth;
  const doorEnd = d.rightWall + d.doorWidth;
  const stepX = W - d.stepWidth;
  const pfEnd = d.frenchWindowTop + d.frenchWindowLength;
  const radiatorStart = pfEnd + d.frenchWindowToRadiator;
  const windowEnd = d.windowOffset + d.windowWidth;
  const notchStart = windowEnd + d.windowToNotch;
  const notchEnd = notchStart + d.notchWidth;
  const notchTop = H - d.notchDepth;

  const outline = cleanOutline([
    [0, 0], [W, 0], [W, doorEnd], [stepX, doorEnd], [stepX, H],
    [notchEnd, H], [notchEnd, notchTop], [notchStart, notchTop], [notchStart, H], [0, H],
  ]);

  const openings = [
    { kind: 'french-window', from: [0, d.frenchWindowTop], to: [0, pfEnd], sill: 0, height: d.frenchWindowHeight },
    { kind: 'door', from: [W, d.rightWall], to: [W, doorEnd], sill: 0, height: d.doorHeight },
    { kind: 'window', from: [d.windowOffset, H], to: [windowEnd, H], sill: d.windowSill, height: d.windowHeight },
  ].filter((o) => o.height > 0 && (o.from[0] !== o.to[0] || o.from[1] !== o.to[1]));

  const radiator = { x: 0, y: radiatorStart, depth: RADIATOR_DEPTH, length: d.radiatorLength, elevation: 15, height: 60 };
  const doorSwing = { label: "Ouverture de la porte d'entrée",
    minX: W - d.doorWidth, minY: d.rightWall, maxX: W, maxY: doorEnd };

  const obstacles = [
    { label: 'Décroché du mur', minX: notchStart, minY: notchTop, maxX: notchEnd, maxY: H },
    { label: 'Angle près de la porte', minX: stepX, minY: doorEnd, maxX: W, maxY: H },
    { label: 'Radiateur', minX: 0, minY: radiatorStart, maxX: RADIATOR_DEPTH, maxY: radiatorStart + d.radiatorLength },
    doorSwing,
  ].filter((r) => r.maxX - r.minX > 0 && r.maxY - r.minY > 0);

  return {
    dims: d,
    wallHeight: d.wallHeight,
    outline,
    bounds: { minX: 0, minY: 0, maxX: W, maxY: H },
    openings,
    radiator,
    doorSwing,
    obstacles,
  };
}

/** @typedef {ReturnType<typeof computeRoom>} Room */
