// Bottom panel for the selected item: status, distances to walls, size, colour, actions.
import { COLOR_SWATCHES } from './catalog.js';
import { placementIssues, wallDistances } from './geometry.js';

const SIZE_LIMITS = { min: 1, max: 600 };

export function createItemPanel(root, store, { onVisibilityChange, onAddRequest }) {
  root.innerHTML = `
    <div class="panel-head">
      <input class="panel-name" aria-label="Nom du meuble" maxlength="40" />
      <button data-action="add" class="primary">＋ Meuble</button>
      <button class="icon-btn" data-action="close" aria-label="Fermer">✕</button>
    </div>
    <p class="panel-status" aria-live="polite"></p>
    <p class="panel-distances"></p>
    <div class="size-row">
      <label>Largeur<input type="number" inputmode="numeric" data-dim="w" /></label>
      <label>Profondeur<input type="number" inputmode="numeric" data-dim="d" /></label>
      <label>Hauteur<input type="number" inputmode="numeric" data-dim="h" /></label>
      <span class="unit">cm</span>
    </div>
    <div class="swatches">${COLOR_SWATCHES.map((c) =>
      `<button class="swatch" data-color="${c}" style="background:${c}" aria-label="Couleur ${c}"></button>`).join('')}
    </div>
    <div class="panel-actions">
      <button data-action="rot90">↻ 90°</button>
      <button data-action="rot15">↻ 15°</button>
      <button data-action="duplicate">Dupliquer</button>
      <button data-action="delete" class="danger">Supprimer</button>
    </div>`;

  const nameInput = root.querySelector('.panel-name');
  const status = root.querySelector('.panel-status');
  const distances = root.querySelector('.panel-distances');
  const dimInputs = [...root.querySelectorAll('[data-dim]')];

  root.addEventListener('click', (event) => {
    const target = event.target.closest('button');
    const item = store.selected;
    if (!target || !item) return;
    if (target.dataset.color) return store.update(item.id, { color: target.dataset.color });
    switch (target.dataset.action) {
      case 'close': return store.select(null);
      case 'add': return onAddRequest();
      case 'rot90': return store.update(item.id, { rot: (item.rot + 90) % 360 });
      case 'rot15': return store.update(item.id, { rot: (item.rot + 15) % 360 });
      case 'duplicate': return store.duplicate(item.id);
      case 'delete': return store.remove(item.id);
    }
  });

  for (const input of dimInputs) {
    input.addEventListener('change', () => {
      const item = store.selected;
      if (!item) return;
      const value = Math.round(Number(input.value));
      if (!Number.isFinite(value) || value < SIZE_LIMITS.min || value > SIZE_LIMITS.max) {
        input.value = String(item[input.dataset.dim]);
        return;
      }
      store.update(item.id, { [input.dataset.dim]: value });
    });
  }

  nameInput.addEventListener('change', () => {
    const item = store.selected;
    const name = nameInput.value.trim();
    if (item && name) store.update(item.id, { name });
    else if (item) nameInput.value = item.name;
  });

  function render() {
    const item = store.selected;
    const visible = Boolean(item);
    if (root.hidden === visible) {
      root.hidden = !visible;
      onVisibilityChange(visible);
    }
    if (!item) return;

    if (document.activeElement !== nameInput) nameInput.value = item.name;
    for (const input of dimInputs) {
      if (document.activeElement !== input) input.value = String(item[input.dataset.dim]);
    }
    for (const sw of root.querySelectorAll('.swatch')) sw.classList.toggle('active', sw.dataset.color === item.color);

    const issues = placementIssues(item, store.items, store.room.obstacles, store.room.bounds);
    status.textContent = issues.length ? `⚠️ ${[...new Set(issues)].join(' · ')}` : '✅ Bien placé';
    status.classList.toggle('bad', issues.length > 0);

    const dist = wallDistances(item, store.room.bounds);
    distances.textContent = `Écart aux murs (cm) — côté porte-fenêtre ${dist.left} · côté entrée ${dist.right}`
      + ` · mur du fond ${dist.top} · côté fenêtre ${dist.bottom}`;
  }

  store.subscribe(render);
  render();
}
