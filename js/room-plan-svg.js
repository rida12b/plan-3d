// Dimensioned 2D plan (like the paper plan): every measure is a tappable label.
import { derivedLengths } from './room-config.js';

/**
 * What each label means and how typing a new value changes the measures.
 * Derived lengths (rest of a wall) are editable too: they move the wall end or the door.
 */
export const COTES = {
  width: { label: 'Largeur de la pièce (mur du fond)' },
  depth: { label: 'Profondeur de la pièce (côté porte-fenêtre)' },
  frenchWindowTop: { label: 'Du coin du fond à la porte-fenêtre' },
  frenchWindowLength: { label: 'Largeur de la porte-fenêtre' },
  frenchWindowToRadiator: { label: 'Entre la porte-fenêtre et le radiateur' },
  radiatorLength: { label: 'Longueur du radiateur' },
  leftRest: { label: 'Entre le radiateur et le coin',
    apply: (d, v) => ({ ...d, depth: d.depth - derivedLengths(d).leftRest + v }) },
  rightWall: { label: "Du coin du fond à la porte d'entrée" },
  doorWidth: { label: "Largeur de la porte d'entrée" },
  stepDepth: { label: 'Après la porte, jusqu’au retour de mur',
    apply: (d, v) => ({ ...d, rightWall: d.depth - d.doorWidth - v }) },
  windowOffset: { label: 'Du coin à la fenêtre' },
  windowWidth: { label: 'Largeur de la fenêtre' },
  windowToNotch: { label: 'Entre la fenêtre et le décroché' },
  notchWidth: { label: 'Largeur du décroché' },
  notchDepth: { label: 'Profondeur du décroché' },
  bottomRest: { label: 'Entre le décroché et le retour de mur',
    apply: (d, v) => ({ ...d, width: d.width - derivedLengths(d).bottomRest + v }) },
  stepWidth: { label: 'Retour de mur près de la porte' },
};

/** Current value shown for a label (a measure or a derived length). */
export function coteValue(dims, key) {
  return key in dims ? dims[key] : derivedLengths(dims)[key];
}

const COLORS = { 'french-window': '#d64545', door: '#2847a8', window: '#5aa9d6' };

export function roomPlanSvg(room) {
  const d = room.dims;
  const { maxX: W, maxY: H } = room.bounds;
  const f = Math.max(W, H) / 16;      // font size, in plan cm
  const off = f * 1.9;                 // distance between the wall and its dimension line
  const tick = f * 0.35;
  const lines = [];
  const labels = [];

  const label = (x, y, key) => {
    const text = String(Math.round(coteValue(d, key)));
    const w = text.length * f * 0.62 + f * 0.9;
    const h = f * 1.45;
    labels.push(`<g class="cote" data-key="${key}" role="button" tabindex="0" aria-label="${COTES[key].label} : ${text} cm">
      <rect x="${x - w / 2}" y="${y - h / 2}" width="${w}" height="${h}" rx="${h / 2}"/>
      <text x="${x}" y="${y}" font-size="${f}" dy="0.35em" text-anchor="middle">${text}</text></g>`);
  };

  /** Dimension line between two points of the same row/column, with end ticks and a label. */
  const dim = (x1, y1, x2, y2, key) => {
    if (Math.round(coteValue(d, key)) <= 0) return;
    const vertical = x1 === x2;
    const t = (x, y) => (vertical
      ? `<line x1="${x - tick}" y1="${y}" x2="${x + tick}" y2="${y}"/>`
      : `<line x1="${x}" y1="${y - tick}" x2="${x}" y2="${y + tick}"/>`);
    lines.push(`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>${t(x1, y1)}${t(x2, y2)}`);
    label((x1 + x2) / 2, (y1 + y2) / 2, key);
  };

  const chain = (fixed, stops, keys, vertical) => keys.forEach((key, i) => (vertical
    ? dim(fixed, stops[i], fixed, stops[i + 1], key)
    : dim(stops[i], fixed, stops[i + 1], fixed, key)));

  const pfEnd = d.frenchWindowTop + d.frenchWindowLength;
  const radStart = pfEnd + d.frenchWindowToRadiator;
  const doorEnd = d.rightWall + d.doorWidth;
  const windowEnd = d.windowOffset + d.windowWidth;
  const notchStart = windowEnd + d.windowToNotch;
  const notchEnd = notchStart + d.notchWidth;
  const stepX = W - d.stepWidth;

  dim(0, -off, W, -off, 'width');
  dim(-off * 2.7, 0, -off * 2.7, H, 'depth');
  chain(-off, [0, d.frenchWindowTop, pfEnd, radStart, radStart + d.radiatorLength, H],
    ['frenchWindowTop', 'frenchWindowLength', 'frenchWindowToRadiator', 'radiatorLength', 'leftRest'], true);
  chain(W + off, [0, d.rightWall, doorEnd, H], ['rightWall', 'doorWidth', 'stepDepth'], true);
  chain(H + off, [0, d.windowOffset, windowEnd, notchStart, notchEnd, stepX, W],
    ['windowOffset', 'windowWidth', 'windowToNotch', 'notchWidth', 'bottomRest', 'stepWidth'], false);
  if (d.notchWidth > 0 && d.notchDepth > 0) label((notchStart + notchEnd) / 2, H - d.notchDepth - f * 1.2, 'notchDepth');

  const stroke = f / 9;
  const outline = room.outline.map(([x, y]) => `${x},${y}`).join(' ');
  const openings = room.openings.map((o) => `<line x1="${o.from[0]}" y1="${o.from[1]}" x2="${o.to[0]}" y2="${o.to[1]}"
    stroke="${COLORS[o.kind]}" stroke-width="${stroke * 5}" stroke-linecap="butt"/>`).join('');
  const r = room.radiator;
  const radiator = r.length > 0
    ? `<rect x="${r.x}" y="${r.y}" width="${f * 0.45}" height="${r.length}" fill="#3fa34d"/>` : '';

  const minX = -off * 2.7 - f * 1.6;
  const minY = -off - f * 1.2;
  const vbW = W + off + f * 1.9 - minX;
  const vbH = H + off + f * 1.2 - minY;
  return `<svg class="room-plan" viewBox="${minX} ${minY} ${vbW} ${vbH}" role="img" aria-label="Plan coté de la pièce">
    <polygon class="plan-floor" points="${outline}" stroke-width="${stroke * 2}"/>
    ${openings}${radiator}
    <g class="plan-dims" stroke-width="${stroke}">${lines.join('')}</g>
    <g stroke-width="${stroke * 1.4}">${labels.join('')}</g></svg>`;
}
