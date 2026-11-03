// Top bar actions: view switch, low walls, photo, reset, help hint.

const HINT_KEY = 'plan3d.hint.v2'; // v2 = new touch controls, show the help again

async function sharePhoto(canvas) {
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (!blob) return;
  const file = new File([blob], 'plan-3d.png', { type: 'image/png' });
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: 'Mon plan 3D' });
      return;
    } catch (error) {
      if (error?.name === 'AbortError') return;
    }
  }
  const url = URL.createObjectURL(blob);
  const link = Object.assign(document.createElement('a'), { href: url, download: 'plan-3d.png' });
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

function readFlag(key) {
  try { return localStorage.getItem(key) === '1'; } catch { return false; }
}
function writeFlag(key) {
  try { localStorage.setItem(key, '1'); } catch { /* storage blocked: hint shows again next time */ }
}

export function createToolbar(sceneApi) {
  const viewBtn = document.getElementById('btn-view');
  const wallsBtn = document.getElementById('btn-walls');
  const hint = document.getElementById('hint');
  let lowWalls = false;

  viewBtn.addEventListener('click', () => {
    const next = sceneApi.view === '3d' ? 'top' : '3d';
    sceneApi.setView(next);
    viewBtn.textContent = next === '3d' ? 'Plan' : '3D';
  });

  wallsBtn.addEventListener('click', () => {
    lowWalls = !lowWalls;
    sceneApi.setLowWalls(lowWalls);
    wallsBtn.textContent = lowWalls ? 'Murs hauts' : 'Murs bas';
    wallsBtn.setAttribute('aria-pressed', String(lowWalls));
  });

  document.getElementById('btn-recenter').addEventListener('click', () => sceneApi.recenter());
  document.getElementById('btn-photo').addEventListener('click', () => sharePhoto(sceneApi.renderer.domElement));

  document.getElementById('btn-help').addEventListener('click', () => { hint.hidden = false; });
  hint.addEventListener('click', () => {
    hint.hidden = true;
    writeFlag(HINT_KEY);
  });
  hint.hidden = readFlag(HINT_KEY);
}
