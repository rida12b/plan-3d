// Furniture catalogue. Default sizes in cm (w = width, d = depth, h = height).
// Front of each model faces +y on the plan (towards the bottom of the screen in top view).

/** @typedef {{type:string, name:string, icon:string, w:number, d:number, h:number, color:string, blocks:boolean}} CatalogEntry */

/** @type {CatalogEntry[]} */
export const CATALOG = [
  { type: 'bed', name: 'Lit double', icon: '🛏️', w: 160, d: 200, h: 50, color: '#d9d4cc', blocks: true },
  { type: 'bed', name: 'Lit simple', icon: '🛏️', w: 90, d: 190, h: 50, color: '#d9d4cc', blocks: true },
  { type: 'nightstand', name: 'Table de chevet', icon: '🗄️', w: 45, d: 40, h: 50, color: '#a47c55', blocks: true },
  { type: 'wardrobe', name: 'Armoire', icon: '🚪', w: 120, d: 60, h: 200, color: '#efe9e0', blocks: true },
  { type: 'dresser', name: 'Commode', icon: '🗄️', w: 100, d: 45, h: 80, color: '#a47c55', blocks: true },
  { type: 'sofa', name: 'Canapé 3 places', icon: '🛋️', w: 210, d: 90, h: 85, color: '#6f7d8c', blocks: true },
  { type: 'sofa', name: 'Canapé 2 places', icon: '🛋️', w: 160, d: 85, h: 85, color: '#6f7d8c', blocks: true },
  { type: 'corner-sofa', name: "Canapé d'angle", icon: '🛋️', w: 250, d: 160, h: 85, color: '#6f7d8c', blocks: true },
  { type: 'armchair', name: 'Fauteuil', icon: '💺', w: 80, d: 80, h: 85, color: '#b07a5a', blocks: true },
  { type: 'coffee-table', name: 'Table basse', icon: '🟫', w: 100, d: 55, h: 40, color: '#8a6a4b', blocks: true },
  { type: 'tv-stand', name: 'Meuble TV + TV', icon: '📺', w: 160, d: 40, h: 50, color: '#3b3b3b', blocks: true },
  { type: 'table', name: 'Table à manger', icon: '🍽️', w: 140, d: 80, h: 75, color: '#a47c55', blocks: true },
  { type: 'round-table', name: 'Table ronde', icon: '⚪', w: 100, d: 100, h: 75, color: '#a47c55', blocks: true },
  { type: 'chair', name: 'Chaise', icon: '🪑', w: 45, d: 50, h: 90, color: '#4a4a4a', blocks: true },
  { type: 'desk', name: 'Bureau', icon: '💻', w: 120, d: 60, h: 75, color: '#efe9e0', blocks: true },
  { type: 'bookcase', name: 'Étagère', icon: '📚', w: 80, d: 30, h: 180, color: '#efe9e0', blocks: true },
  { type: 'fridge', name: 'Frigo', icon: '🧊', w: 60, d: 65, h: 180, color: '#e8e8e8', blocks: true },
  { type: 'kitchen', name: 'Plan de cuisine', icon: '🍳', w: 180, d: 60, h: 90, color: '#f4f1ec', blocks: true },
  { type: 'rug', name: 'Tapis', icon: '🟪', w: 200, d: 140, h: 1, color: '#c9b8a6', blocks: false },
  { type: 'plant', name: 'Plante', icon: '🪴', w: 40, d: 40, h: 120, color: '#4f7a4a', blocks: true },
  { type: 'box', name: 'Meuble libre (boîte)', icon: '📦', w: 80, d: 50, h: 80, color: '#9aa6b2', blocks: true },
];

export const COLOR_SWATCHES = [
  '#efe9e0', '#d9d4cc', '#a47c55', '#8a6a4b', '#3b3b3b', '#6f7d8c', '#b07a5a', '#4f7a4a', '#c9b8a6', '#2f4b7c',
];
