// Page chrome: landmark list, toolbar, details panel, sources dialog, evidence legend.
import * as THREE from 'three';
import { Geo } from './geo.js';
import { areaList, confidenceList } from './model.js';
import { sources, byKey, notRendered, SourceKind } from './data/bibliography.js';
import { CityScene } from './scene.js';
import { CityView } from './view.js';

const $ = (id) => document.getElementById(id);
const app = $('app');
const narrow = () => matchMedia('(max-width: 900px)').matches;
if (narrow()) app.classList.remove('show-sidebar', 'show-inspector');

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const cssColor = (c, a = 1) => `rgba(${c.rgb.map((v) => Math.round(v * 255)).join(',')},${a})`;
const badge = (c) => `<span class="badge" style="background:${cssColor(c)}" title="${esc(c.title)}">${c.letter}</span>`;
const citeShort = (c) => `${byKey[c.key]?.short ?? c.key}, ${c.locator}`;

const state = { selectedID: null, mode: 'orbit', overlay: false, labels: true, hour: 9.5, day: 80, search: '' };
let city = null, view = null;

// MARK: Loading

async function load() {
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  // SceneKit's camera used an exposure offset of -0.15 EV on its own filmic curve; ACES needs more to match it.
  renderer.toneMappingExposure = 0.62;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const viewport = $('viewport');
  viewport.prepend(renderer.domElement);

  let stageStart = performance.now(), stage = 'start';
  const progress = (f, text) => new Promise((resolve) => {
    if (text !== stage) { console.debug(`${stage}: ${Math.round(performance.now() - stageStart)} ms`); stage = text; stageStart = performance.now(); }
    $('loading-bar').style.width = `${Math.round(f * 100)}%`;
    $('loading-text').textContent = text;
    requestAnimationFrame(() => setTimeout(resolve, 0));
  });
  const t0 = performance.now();
  city = await CityScene.create(renderer, progress);
  view = new CityView(viewport, renderer, city);
  view.onPick = (id) => select(id, false);
  view.onModeInfo = (s) => { if (state.mode === 'walk') $('help').innerHTML = walkHelp + `<br>${esc(s)}`; };
  // Compile every shader once before the first frame, so the first interaction does not stall.
  await progress(0.97, 'Compiling shaders');
  if (renderer.compileAsync) await renderer.compileAsync(city.scene, view.camera);
  else renderer.compile(city.scene, view.camera);
  $('loading').hidden = true;
  console.info(`Built in ${Math.round(performance.now() - t0)} ms: ${city.features.length} features, ${city.triangleCount.toLocaleString()} triangles`);
  window.jerusalem = { city, view, select };
  renderLandmarks();
  renderInspector();
  const hash = decodeURIComponent(location.hash.slice(1));
  if (hash && city.featureByID[hash]) select(hash, true);
}

// MARK: Selection

function select(id, fly) {
  state.selectedID = id;
  city.setSelected(id);
  view.selectedID = id;
  view.labelsDirty = true;
  if (id) {
    if (!narrow() || !fly) app.classList.add('show-inspector');
    if (fly) view.focus(id);
    history.replaceState(null, '', `#${encodeURIComponent(id)}`);
  } else {
    history.replaceState(null, '', location.pathname + location.search);
  }
  renderLandmarks();
  renderInspector();
}

function renderLandmarks() {
  const q = state.search.trim().toLowerCase();
  const all = city.features.filter((f) => f.listed);
  const shown = q ? all.filter((f) => f.name.toLowerCase().includes(q) || (f.altName ?? '').toLowerCase().includes(q)) : all;
  let html = '';
  for (const area of areaList) {
    const items = shown.filter((f) => f.area === area);
    if (!items.length) continue;
    html += `<h3>${esc(area)}</h3>`;
    for (const f of items) {
      html += `<button class="lm${f.id === state.selectedID ? ' on' : ''}" data-id="${f.id}">${badge(f.confidence)}<span>${esc(f.name)}</span></button>`;
    }
  }
  $('landmarks').innerHTML = html || '<p style="padding:8px;color:var(--muted)">No landmark matches.</p>';
}

$('landmarks').addEventListener('click', (e) => {
  const b = e.target.closest('.lm');
  if (!b) return;
  select(b.dataset.id, true);
  if (narrow()) app.classList.remove('show-sidebar');
});
$('search').addEventListener('input', (e) => { state.search = e.target.value; renderLandmarks(); });

function renderInspector() {
  const el = $('inspector');
  const f = state.selectedID ? city.featureByID[state.selectedID] : null;
  const close = '<button class="btn close-insp" data-close>Close</button>';
  if (!f) {
    el.innerHTML = `${close}<h2>Jerusalem on the eve of the revolt</h2>
      <p>The city as it stood about 66 CE, four years before its destruction: Herod's Temple Mount, the three walls described by Josephus, the palaces and pools, and the tombs outside.</p>
      <p style="color:var(--muted)">Pick a landmark from the list or click any structure. Each one shows what it is based on and how sure that is. Turn on Evidence to colour the whole city by certainty.</p>`;
    return;
  }
  const c = f.confidence;
  const ll = Geo.latLon(f.anchor);
  el.innerHTML = `${close}
    <h2>${esc(f.name)}</h2>
    ${f.altName ? `<div class="alt">${esc(f.altName)}</div>` : ''}
    <div class="area">${esc(f.area)}</div>
    <div class="conf" style="background:${cssColor(c, 0.13)}">
      <div class="row">${badge(c)}${esc(c.title)}</div>
      <p>${esc(c.explanation)}</p>
      ${f.uncertainty > 0 ? `<p style="color:var(--text)">Position good to about ${Math.round(f.uncertainty)} m</p>` : ''}
    </div>
    <p>${esc(f.summary)}</p>
    ${f.dimensions.length ? `<h4>Measurements</h4><dl>${f.dimensions.map((d) => `<dt>${esc(d.label)}</dt><dd>${esc(d.value)}</dd>`).join('')}</dl>` : ''}
    <h4>Sources</h4>
    ${f.citations.map((ct) => `<div class="cite"><b>${esc(citeShort(ct))}</b>${byKey[ct.key] ? `<span>${esc(byKey[ct.key].full)}</span>` : ''}</div>`).join('')}
    <div class="coords">${ll.lat.toFixed(5)} N, ${ll.lon.toFixed(5)} E</div>
    <button class="btn" data-go>Go there</button>`;
}
$('inspector').addEventListener('click', (e) => {
  if (e.target.closest('[data-go]') && state.selectedID) { view.focus(state.selectedID); if (narrow()) app.classList.remove('show-inspector'); }
  if (e.target.closest('[data-close]')) app.classList.remove('show-inspector');
});

// MARK: Toolbar

const touch = matchMedia('(pointer: coarse)').matches;
const orbitHelp = touch
  ? 'Drag to orbit · pinch to zoom · two fingers to pan and turn · tap a building for its sources'
  : 'Drag to orbit · scroll or pinch to zoom · right-drag or Option-drag to pan · W A S D move, Q E turn · click a building for its sources';
const walkHelp = touch ? 'Drag to look · pick a landmark to stand beside it' : 'W A S D or arrows to walk · drag to look · Shift to run';

document.querySelectorAll('.segmented button').forEach((b) => b.addEventListener('click', () => {
  state.mode = b.dataset.mode;
  document.querySelectorAll('.segmented button').forEach((x) => { x.classList.toggle('on', x === b); x.setAttribute('aria-checked', x === b); });
  view?.setMode(state.mode);
  $('help').textContent = state.mode === 'walk' ? walkHelp : orbitHelp;
}));
$('help').textContent = orbitHelp;

const updateSun = () => {
  const h = Math.floor(state.hour), m = Math.floor((state.hour - h) * 60);
  $('time-label').textContent = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  city?.setSun(state.hour, state.day);
};
$('hour').addEventListener('input', (e) => { state.hour = +e.target.value; updateSun(); });
$('season').addEventListener('change', (e) => { state.day = +e.target.value; updateSun(); });
$('sky').addEventListener('change', (e) => city?.setCloudCover(+e.target.value));

const toggle = (btn, on) => { btn.classList.toggle('on', on); btn.setAttribute('aria-pressed', on); };
$('evidence').addEventListener('click', (e) => {
  state.overlay = !state.overlay;
  toggle(e.currentTarget, state.overlay);
  city?.setOverlay(state.overlay);
  $('legend').hidden = !state.overlay;
});
$('legend').innerHTML = '<b>Evidence</b>' + confidenceList.map((c) => `<div>${badge(c)}${esc(c.title)}</div>`).join('');
$('labels').addEventListener('click', (e) => {
  state.labels = !state.labels;
  toggle(e.currentTarget, state.labels);
  if (view) { view.showLabels = state.labels; view.labelsDirty = true; }
});
$('overview').addEventListener('click', () => view?.resetView());
$('toggle-sidebar').addEventListener('click', () => { app.classList.toggle('show-sidebar'); if (narrow()) app.classList.remove('show-inspector'); });
$('toggle-inspector').addEventListener('click', () => { app.classList.toggle('show-inspector'); if (narrow()) app.classList.remove('show-sidebar'); });

// MARK: Sources

$('sources-body').innerHTML = `
  <h4>How accurate is this?</h4>
  <p>There is no survey-grade digital record of the first-century city. Every structure here is entered by hand from published measurements and placed on a grid tied to the surviving corners of the Temple Mount. Standing and excavated remains sit within about 5 to 30 m of their true place. Structures known only from Josephus or the Mishnah have the right size but a reconstructed position. Ordinary houses are typical, not individual. The ground is a reconstruction of the ancient surface and can be 5 to 10 m off between control points.</p>
  <p class="muted">The Evidence overlay and the details panel say which of these applies to each item.</p>
  ${Object.entries(SourceKind).map(([k, title]) => `<h4>${esc(title)}</h4>${sources.filter((s) => s.kind === k).map((s) => `<p>${esc(s.full)}</p>`).join('')}`).join('')}
  <h4>Attested but not shown</h4>
  ${notRendered.map((n) => `<p><b>${esc(n.name)}</b><br>${esc(n.reason)}<br><span class="muted">${esc(n.citations.map(citeShort).join('; '))}</span></p>`).join('')}`;
$('sources').addEventListener('click', () => $('sources-dialog').showModal());
$('sources-done').addEventListener('click', () => $('sources-dialog').close());

load().catch((err) => {
  console.error(err);
  $('loading-text').textContent = `Could not build the scene: ${err.message}. This page needs WebGL.`;
  document.querySelector('.spinner').hidden = true;
});
