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

const container = document.getElementById('viewport');
const addButton = document.getElementById('btn-add');
const roomSize = document.getElementById('room-size');
const catalogRoot = document.getElementById('catalog-sheet');
const roomRoot = document.getElementById('room-sheet');

const roomStore = createRoomStore();
const store = createStore(roomStore);
const sceneApi = createScene(container, roomStore.room);
const furnitureView = createFurnitureView(sceneApi.scene, store);
attachDrag({ container, ...sceneApi }, furnitureView, store);

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
