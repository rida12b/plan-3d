// "Pièce" sheet: a dimensioned plan where each measure is tapped to be changed,
// plus a folded list with the heights and every measure.
import { validateDimensions } from './room-config.js';
import { COTES, coteValue, roomPlanSvg } from './room-plan-svg.js';

const MORE_FIELDS = [
  ['wallHeight', 'Hauteur sous plafond'], ['frenchWindowHeight', 'Hauteur porte-fenêtre'],
  ['doorHeight', "Hauteur porte d'entrée"], ['windowSill', 'Hauteur sous la fenêtre'], ['windowHeight', 'Hauteur fenêtre'],
  ...Object.entries(COTES).filter(([key]) => !COTES[key].apply).map(([key, c]) => [key, c.label]),
];

export function createRoomSheet(root, roomStore, layoutStore) {
  root.innerHTML = `
    <div class="panel-head">
      <strong>Dimensions de la pièce</strong>
      <button class="icon-btn" data-close aria-label="Fermer">✕</button>
    </div>
    <p class="plan-tip">👆 Touche un chiffre bleu pour le changer (en cm).</p>
    <div class="plan-box"></div>
    <details class="more-dims">
      <summary>Hauteurs (plafond, portes, fenêtre) et liste des mesures</summary>
      <div class="dim-group">
        ${MORE_FIELDS.map(([key, label]) => `
          <label class="dim-field">${label}<input type="number" inputmode="numeric" min="0" data-key="${key}" /></label>`).join('')}
      </div>
      <p class="more-error" role="alert"></p>
    </details>
    <div class="room-actions">
      <button data-reset-room>Remettre le plan d'origine</button>
      <button data-clear-furniture class="danger">Retirer tous les meubles</button>
    </div>
    <div class="cote-editor" hidden>
      <form class="cote-card">
        <label class="cote-title" for="cote-input"></label>
        <div class="cote-input-row"><input id="cote-input" type="number" inputmode="numeric" min="0" step="1" /><span>cm</span></div>
        <p class="cote-error" role="alert"></p>
        <div class="cote-buttons"><button type="button" data-cancel>Annuler</button><button type="submit" class="primary">OK</button></div>
      </form>
    </div>`;

  const planBox = root.querySelector('.plan-box');
  const listInputs = [...root.querySelectorAll('[data-key]')];
  const moreError = root.querySelector('.more-error');
  const editor = root.querySelector('.cote-editor');
  const editorTitle = editor.querySelector('.cote-title');
  const editorInput = editor.querySelector('input');
  const editorError = editor.querySelector('.cote-error');
  let editingKey = null;

  function render() {
    const { dims } = roomStore.room;
    planBox.innerHTML = roomPlanSvg(roomStore.room);
    for (const input of listInputs) {
      if (document.activeElement !== input) input.value = String(dims[input.dataset.key]);
      input.classList.remove('invalid');
    }
  }

  /** Applies new measures; returns the first problem, or '' when applied. */
  function tryApply(dims) {
    const errors = validateDimensions(dims);
    if (errors.length) return errors[0];
    roomStore.setDimensions(dims);
    render();
    return '';
  }

  function openEditor(key) {
    editingKey = key;
    editorTitle.textContent = COTES[key].label;
    editorInput.value = String(Math.round(coteValue(roomStore.room.dims, key)));
    editorError.textContent = '';
    editor.hidden = false;
    editorInput.focus();
    editorInput.select();
  }

  editor.querySelector('form').addEventListener('submit', (event) => {
    event.preventDefault();
    const value = Math.round(Number(editorInput.value));
    if (editorInput.value === '' || !Number.isFinite(value) || value < 0) {
      editorError.textContent = 'Tape un nombre positif.';
      return;
    }
    const dims = roomStore.room.dims;
    const next = COTES[editingKey].apply ? COTES[editingKey].apply(dims, value) : { ...dims, [editingKey]: value };
    const problem = tryApply(next);
    if (problem) editorError.textContent = `⚠️ ${problem}`;
    else editor.hidden = true;
  });

  editor.addEventListener('click', (event) => {
    if (event.target === editor || event.target.closest('[data-cancel]')) editor.hidden = true;
  });

  planBox.addEventListener('click', (event) => {
    const cote = event.target.closest('.cote');
    if (cote) openEditor(cote.dataset.key);
  });
  planBox.addEventListener('keydown', (event) => {
    const cote = event.target.closest('.cote');
    if (cote && (event.key === 'Enter' || event.key === ' ')) openEditor(cote.dataset.key);
  });

  for (const input of listInputs) {
    input.addEventListener('change', () => {
      const value = Math.round(Number(input.value));
      const problem = input.value === '' || !Number.isFinite(value) || value < 0
        ? 'Tape un nombre positif.'
        : tryApply({ ...roomStore.room.dims, [input.dataset.key]: value });
      input.classList.toggle('invalid', Boolean(problem));
      moreError.textContent = problem ? `⚠️ ${problem}` : '';
    });
  }

  root.addEventListener('click', (event) => {
    if (event.target.closest('[data-close]')) root.hidden = true;
    if (event.target.closest('[data-reset-room]')) {
      roomStore.reset();
      render();
    }
    if (event.target.closest('[data-clear-furniture]') && layoutStore.items.length
        && window.confirm('Retirer tous les meubles du plan ?')) {
      layoutStore.clear();
    }
  });

  return {
    open() {
      layoutStore.select(null);
      editor.hidden = true;
      render();
      root.hidden = false;
    },
  };
}
