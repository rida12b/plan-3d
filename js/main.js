// Entry point: wires the stores, the 3D scene and the UI together.
import { createRoomStore } from './room-store.js';
import { createStore } from './layout-store.js';
import { createScene } from './scene.js';
import { createFurnitureView } from './furniture-view.js';
import { attachDrag } from './drag-controller.js';
import { createItemPanel } from './item-panel.js';
import { createCatalogSheet } from './catalog-sheet.js';
import { createRoomSheet } from './room-sheet.js';
import { createToolbar } from './toolbar.js';
import { createLabelsView } from './labels-view.js';

const container = document.getElementById('viewport');
const addButton = document.getElementById('btn-add');
const roomSize = document.getElementById('room-size');
const catalogRoot = document.getElementById('catalog-sheet');
const roomRoot = document.getElementById('room-sheet');

// iOS ignores user-scalable=no: block the page pinch-zoom and double-tap zoom ourselves.
document.addEventListener('gesturestart', (event) => event.preventDefault());
document.addEventListener('dblclick', (event) => event.preventDefault(), { passive: false });

const DESKTOP_MIN_WIDTH = 900;
const DESKTOP_PANEL_WIDTH = 416;
const topbar = document.querySelector('.topbar');
/** Screen areas covered by the UI: the room is framed in what is left. Constant per screen size,
 *  so opening a panel never moves the camera. */
function getInsets() {
  const top = topbar.offsetHeight + 8;
  if (window.innerWidth >= DESKTOP_MIN_WIDTH) return { top, right: DESKTOP_PANEL_WIDTH, bottom: 16, left: 16 };
  return { top, right: 8, bottom: Math.min(300, window.innerHeight * 0.42), left: 8 };
}

const roomStore = createRoomStore();
const store = createStore(roomStore);
const sceneApi = createScene(container, roomStore.room, getInsets);
const furnitureView = createFurnitureView(sceneApi.scene, store);
attachDrag({ container, ...sceneApi }, furnitureView, store);
const labels = createLabelsView(container, sceneApi.camera, store);
sceneApi.onFrame(labels.update);

const formatMetres = (cm) => (cm / 100).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
function onRoomChange() {
  const { maxX, maxY } = roomStore.room.bounds;
  roomSize.textContent = `${formatMetres(maxX)} × ${formatMetres(maxY)} m`;
}
roomStore.subscribe(() => {
  sceneApi.setRoom(roomStore.room);
  onRoomChange();
});
onRoomChange();

const catalog = createCatalogSheet(catalogRoot, store);
const roomSheet = createRoomSheet(roomRoot, roomStore, store);

const openCatalog = () => {
  store.select(null);
  roomRoot.hidden = true;
  catalog.open();
};
createItemPanel(document.getElementById('item-panel'), store, {
  onVisibilityChange: (visible) => { addButton.hidden = visible; },
  onAddRequest: openCatalog,
});
createToolbar(sceneApi);
// One bottom sheet at a time: selecting a piece of furniture closes the other sheets.
store.subscribe(() => {
  if (store.selected) {
    roomRoot.hidden = true;
    catalog.close();
  }
});
addButton.addEventListener('click', openCatalog);
document.getElementById('btn-room').addEventListener('click', () => {
  if (!roomRoot.hidden) {
    roomRoot.hidden = true;
    return;
  }
  catalog.close();
  roomSheet.open();
});
