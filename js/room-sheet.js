// "Pièce" sheet: every measure of the plan is editable, with a live 2D preview.
// Valid measures are applied immediately; invalid ones are explained and not applied.
import { computeRoom, derivedLengths, validateDimensions } from './room-config.js';

const GROUPS = [
  { title: 'Pièce', fields: [
    ['width', 'Largeur (mur du fond)'], ['depth', 'Profondeur (côté porte-fenêtre)'], ['wallHeight', 'Hauteur sous plafond'],
  ] },
  { title: 'Côté porte-fenêtre (gauche)', rest: 'leftRest', restLabel: 'Reste jusqu’au coin', fields: [
    ['frenchWindowTop', 'Du coin du fond à la porte-fenêtre'], ['frenchWindowLength', 'Largeur porte-fenêtre'],
    ['frenchWindowHeight', 'Hauteur porte-fenêtre'], ['frenchWindowToRadiator', 'Porte-fenêtre → radiateur'],
    ['radiatorLength', 'Longueur radiateur'],
  ] },
  { title: 'Côté entrée (droite)', rest: 'stepDepth', restLabel: 'Retour de mur après la porte (vertical)', fields: [
    ['rightWall', 'Du coin du fond à la porte'], ['doorWidth', 'Largeur porte'], ['doorHeight', 'Hauteur porte'],
    ['stepWidth', 'Retour de mur (horizontal)'],
  ] },
  { title: 'Côté fenêtre (bas)', rest: 'bottomRest', restLabel: 'Mur entre décroché et retour', fields: [
    ['windowOffset', 'Du coin à la fenêtre'], ['windowWidth', 'Largeur fenêtre'], ['windowSill', 'Hauteur sous la fenêtre'],
    ['windowHeight', 'Hauteur fenêtre'], ['windowToNotch', 'Fenêtre → décroché'], ['notchWidth', 'Largeur décroché'],
    ['notchDepth', 'Profondeur décroché'],
  ] },
];

const COLORS = { 'french-window': '#d64545', door: '#2847a8', window: '#5aa9d6' };

function previewSvg(room) {
  const { maxX, maxY } = room.bounds;
  const pad = Math.max(maxX, maxY) * 0.06;
  const stroke = Math.max(maxX, maxY) / 90;
  const points = room.outline.map(([x, y]) => `${x},${y}`).join(' ');
  const openings = room.openings.map((o) =>
    `<line x1="${o.from[0]}" y1="${o.from[1]}" x2="${o.to[0]}" y2="${o.to[1]}" stroke="${COLORS[o.kind]}" stroke-width="${stroke * 2.2}"/>`).join('');
  const r = room.radiator;
  const radiator = r.length > 0 ? `<rect x="${r.x}" y="${r.y}" width="${r.depth * 1.5}" height="${r.length}" fill="#3fa34d"/>` : '';
  return `<svg viewBox="${-pad} ${-pad} ${maxX + 2 * pad} ${maxY + 2 * pad}" role="img" aria-label="Aperçu du plan">
    <polygon points="${points}" fill="#d8c3a5" stroke="currentColor" stroke-width="${stroke}" stroke-linejoin="round"/>
    ${openings}${radiator}</svg>`;
}

export function createRoomSheet(root, roomStore, layoutStore) {
  root.innerHTML = `
    <div class="panel-head">
      <strong>Dimensions de la pièce</strong>
      <button class="icon-btn" data-close aria-label="Fermer">✕</button>
    </div>
    <p class="sheet-tip">Toutes les mesures sont en cm. La 3D se met à jour pendant que tu tapes.</p>
    <div class="room-preview"></div>
    <div class="room-errors" role="alert" hidden></div>
    ${GROUPS.map((g) => `
      <fieldset class="dim-group">
        <legend>${g.title}</legend>
        ${g.fields.map(([key, label]) => `
          <label class="dim-field">${label}<input type="number" inputmode="numeric" min="0" data-key="${key}" /></label>`).join('')}
        ${g.rest ? `<p class="dim-rest">${g.restLabel} : <b data-rest="${g.rest}"></b></p>` : ''}
      </fieldset>`).join('')}
    <div class="room-actions">
      <button data-reset-room>Remettre le plan d'origine</button>
      <button data-clear-furniture class="danger">Retirer tous les meubles</button>
    </div>`;

  const inputs = [...root.querySelectorAll('[data-key]')];
  const preview = root.querySelector('.room-preview');
  const errorBox = root.querySelector('.room-errors');

  const readForm = () => Object.fromEntries(inputs.map((i) => [i.dataset.key, i.value === '' ? NaN : Number(i.value)]));

  function fillForm(dims) {
    for (const input of inputs) input.value = String(dims[input.dataset.key]);
  }

  function refresh(dims) {
    for (const input of inputs) {
      const v = dims[input.dataset.key];
      input.classList.toggle('invalid', !Number.isFinite(v) || v < 0);
    }
    const rest = derivedLengths(dims);
    for (const el of root.querySelectorAll('[data-rest]')) {
      const value = rest[el.dataset.rest];
      el.textContent = Number.isFinite(value) ? `${value} cm` : '—';
      el.classList.toggle('bad', !(value >= 0));
    }
    const errors = validateDimensions(dims);
    errorBox.hidden = errors.length === 0;
    errorBox.innerHTML = errors.map((e) => `<p>⚠️ ${e}</p>`).join('');
    if (errors.length === 0) preview.innerHTML = previewSvg(computeRoom(dims));
    return errors;
  }

  root.addEventListener('input', (event) => {
    if (!event.target.matches('[data-key]')) return;
    const dims = readForm();
    if (refresh(dims).length === 0) roomStore.setDimensions(dims);
  });

  root.addEventListener('click', (event) => {
    if (event.target.closest('[data-close]')) root.hidden = true;
    if (event.target.closest('[data-reset-room]')) {
      roomStore.reset();
      fillForm(roomStore.room.dims);
      refresh(roomStore.room.dims);
    }
    if (event.target.closest('[data-clear-furniture]') && layoutStore.items.length
        && window.confirm('Retirer tous les meubles du plan ?')) {
      layoutStore.clear();
    }
  });

  return {
    open() {
      layoutStore.select(null);
      fillForm(roomStore.room.dims);
      refresh(roomStore.room.dims);
      root.hidden = false;
    },
  };
}
