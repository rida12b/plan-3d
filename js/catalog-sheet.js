// Bottom sheet listing the furniture catalogue. Tapping an entry adds it in the room centre.
import { CATALOG } from './catalog.js';

export function createCatalogSheet(root, store) {
  root.innerHTML = `
    <div class="panel-head">
      <strong>Ajouter un meuble</strong>
      <button class="icon-btn" data-close aria-label="Fermer">✕</button>
    </div>
    <p class="sheet-tip">Tu pourras changer les dimensions après l'ajout.</p>
    <div class="catalog-grid">
      ${CATALOG.map((e, i) => `
        <button class="catalog-item" data-index="${i}">
          <span class="catalog-icon">${e.icon}</span>
          <span class="catalog-name">${e.name}</span>
          <span class="catalog-size">${e.w} × ${e.d} cm</span>
        </button>`).join('')}
    </div>`;

  const close = () => { root.hidden = true; };
  const open = () => { root.hidden = false; };

  root.addEventListener('click', (event) => {
    if (event.target.closest('[data-close]')) return close();
    const button = event.target.closest('.catalog-item');
    if (!button) return;
    store.add(CATALOG[Number(button.dataset.index)]);
    close();
  });

  return { open, close };
}
