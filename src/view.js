// The 3D view: camera control for orbit and walk modes, picking, and landmark labels.
import * as THREE from 'three';
import { Geo } from './geo.js';
import { Bounds } from './data/cityBase.js';

const HOME = { target: new THREE.Vector3(60, 735, -150), dist: 1500, yaw: 0.55, pitch: 0.62 };

export class CityView {
  constructor(container, renderer, city) {
    this.container = container;
    this.renderer = renderer;
    this.city = city;
    this.onPick = null;
    this.onModeInfo = null;
    this.mode = 'orbit';

    // Orbit camera: a target on the ground, a distance, and two angles.
    this.target = HOME.target.clone();
    this.dist = HOME.dist; this.yaw = HOME.yaw; this.pitch = HOME.pitch;
    // Walker: position on the local grid, feet level, heading (0 = north, clockwise) and look pitch.
    this.wpos = [5, -300]; this.feet = 0; this.heading = 0; this.wpitch = 0;
    this.fly = null;
    this.keys = new Set();
    this.shift = false;
    this.needsCamera = true;
    this.selectedID = null;
    this.showLabels = true;
    this.labelsDirty = true;
    this.idleTicks = 0;
    this.time = 0;

    this.camera = new THREE.PerspectiveCamera(50, 1, 2, 70000);
    this.raycaster = new THREE.Raycaster();

    this.labelHost = document.createElement('div');
    this.labelHost.className = 'labels';
    container.appendChild(this.labelHost);
    this.labels = [];
    for (const f of city.features) {
      if (!f.listed) continue;
      const el = document.createElement('div');
      el.className = 'label' + (f.major ? ' major' : '');
      el.textContent = f.name;
      el.hidden = true;
      this.labelHost.appendChild(el);
      this.labels.push({ id: f.id, el, major: f.major, w: 0, h: 0 });
    }

    this.bindInput();
    this.resize();
    new ResizeObserver(() => this.resize()).observe(container);
    this.last = performance.now();
    this.lastRender = 0;
    this.renderer.shadowMap.autoUpdate = false;
    this.renderer.setAnimationLoop(() => this.tick());
  }

  resize() {
    const w = this.container.clientWidth, h = this.container.clientHeight;
    if (!w || !h) return;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    for (const l of this.labels) { l.w = 0; }
    this.needsCamera = true;
  }

  // MARK: Public controls

  setMode(m) {
    if (m === this.mode) return;
    this.fly = null;
    const city = this.city;
    if (m === 'walk') {
      const f = this.selectedID ? city.featureByID[this.selectedID] : null;
      const start = f ? this.standingSpot(f) : [this.target.x, -this.target.z];
      this.wpos = this.lowestSpot(start, 6);
      this.feet = city.walk.surface(this.wpos);
      this.heading = -this.yaw;
      this.wpitch = 0;
      this.camera.near = 0.5;
      this.camera.fov = 62;
    } else {
      this.target.set(this.wpos[0], this.feet, -this.wpos[1]);
      this.dist = 320;
      this.yaw = -this.heading;
      this.pitch = 0.5;
      this.camera.near = 2;
      this.camera.fov = 50;
    }
    this.camera.updateProjectionMatrix();
    this.mode = m;
    this.needsCamera = true;
    this.container.focus();
  }

  /** Flies the orbit camera to a feature, or moves the walker next to it. */
  focus(id) {
    const city = this.city, f = city.featureByID[id], lp = city.labelPoints[id];
    if (!f || !lp) return;
    const r = city.radii[id] ?? 40;
    if (this.mode === 'walk') {
      this.wpos = this.standingSpot(f);
      this.feet = city.walk.surface(this.wpos);
      const d = [f.anchor[0] - this.wpos[0], f.anchor[1] - this.wpos[1]];
      if (Math.hypot(d[0], d[1]) > 0.5) this.heading = Math.atan2(d[0], d[1]);
      this.wpitch = 0.08;
      this.needsCamera = true;
      return;
    }
    const ground = Math.max(city.terrain.height(f.anchor), lp.y - r);
    const to = new THREE.Vector3(f.anchor[0], (ground + lp.y) / 2, -f.anchor[1]);
    this.fly = { t: 0, duration: 1.3, from: [this.target.clone(), this.dist, this.yaw, this.pitch], to: [to, Math.min(Math.max(r * 4.5, 110), 1900), this.yaw, 0.5] };
  }

  resetView() {
    if (this.mode !== 'orbit') return;
    this.fly = { t: 0, duration: 1.2, from: [this.target.clone(), this.dist, this.yaw, this.pitch], to: [HOME.target.clone(), HOME.dist, HOME.yaw, HOME.pitch] };
  }

  /** A free spot at ground level next to a feature. */
  standingSpot(f) {
    return this.lowestSpot(f.anchor, Math.min((this.city.radii[f.id] ?? 20) + 12, 70));
  }

  lowestSpot(c, radius) {
    const walk = this.city.walk;
    let best = c, bestLevel = walk.surface(c);
    for (let r = 3; r <= radius; r += 3) {
      for (let k = 0; k < 16; k++) {
        const a = k / 16 * 2 * Math.PI;
        const p = [c[0] + Math.cos(a) * r, c[1] + Math.sin(a) * r];
        const s = walk.surface(p);
        if (s < bestLevel - 0.4) { best = p; bestLevel = s; }
      }
    }
    return best;
  }

  // MARK: Frame update

  tick() {
    const city = this.city;
    const now = performance.now();
    const dt = Math.min((now - this.last) / 1000, 0.1);
    this.last = now;
    this.time += dt;
    let moved = this.needsCamera;
    this.needsCamera = false;

    if (this.fly) {
      const f = this.fly;
      f.t = Math.min(f.t + dt / f.duration, 1);
      const e = f.t * f.t * (3 - 2 * f.t);
      this.target.lerpVectors(f.from[0], f.to[0], e);
      this.dist = f.from[1] * Math.pow(f.to[1] / f.from[1], e);
      this.yaw = f.from[2] + (f.to[2] - f.from[2]) * e;
      this.pitch = f.from[3] + (f.to[3] - f.from[3]) * e;
      if (f.t >= 1) this.fly = null;
      moved = true;
    }

    const down = (...codes) => codes.some((c) => this.keys.has(c));
    const fwd = (down('KeyW', 'ArrowUp') ? 1 : 0) - (down('KeyS', 'ArrowDown') ? 1 : 0);
    const strafe = (down('KeyD') ? 1 : 0) - (down('KeyA') ? 1 : 0);
    const turn = (down('ArrowRight', 'KeyE') ? 1 : 0) - (down('ArrowLeft', 'KeyQ') ? 1 : 0);
    const fast = this.shift;

    if (this.mode === 'orbit') {
      if (fwd || strafe || turn) {
        this.fly = null;
        const speed = this.dist * (fast ? 1.6 : 0.7) * dt;
        const f = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw)), r = new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
        this.target.addScaledVector(f, fwd * speed).addScaledVector(r, strafe * speed);
        this.yaw -= turn * 1.2 * dt;
        this.clampTarget();
        moved = true;
      }
    } else {
      if (turn) { this.heading += turn * 1.7 * dt; moved = true; }
      if (fwd || strafe) {
        const speed = (fast ? 14 : 4.5) * dt;
        const sh = Math.sin(this.heading), ch = Math.cos(this.heading);
        const step = [sh * fwd * speed + ch * strafe * speed, ch * fwd * speed - sh * strafe * speed];
        // Try the full move, then each axis alone so the walker slides along walls.
        for (const cand of [[this.wpos[0] + step[0], this.wpos[1] + step[1]], [this.wpos[0] + step[0], this.wpos[1]], [this.wpos[0], this.wpos[1] + step[1]]]) {
          if (city.walk.step(this.feet, cand) !== null) { this.wpos = cand; break; }
        }
        moved = true;
      }
      const level = city.walk.step(this.feet, this.wpos) ?? city.walk.surface(this.wpos);
      if (level > this.feet) { this.feet = Math.min(level, this.feet + 9 * dt + (level - this.feet) * 0.35); moved = true; }
      else if (level < this.feet) { this.feet = Math.max(level, this.feet - 22 * dt); moved = true; }
    }

    if (moved) this.applyCamera();
    // Labels follow the camera, and are also refreshed a few times a second while idle.
    this.idleTicks = moved ? 0 : this.idleTicks + 1;
    if (moved || this.labelsDirty || this.idleTicks % 12 === 0) this.updateLabels();

    // Full rate while anything moves; otherwise a slow refresh is enough for the drifting clouds.
    if (!moved && now - this.lastRender < 66) return;
    this.lastRender = now;
    if (moved || city.shadowsDirty) {
      this.renderer.shadowMap.needsUpdate = true;
      city.shadowsDirty = false;
    }
    city.skyMaterial.uniforms.time.value = this.time;
    city.sky.position.copy(this.camera.position);
    this.renderer.render(city.scene, this.camera);
  }

  clampTarget() {
    const t = this.target;
    t.x = Math.min(Math.max(t.x, Bounds.minX + 50), Bounds.maxX - 50);
    t.z = Math.min(Math.max(t.z, -Bounds.maxY + 50), -Bounds.minY - 50);
    if (!this.fly) {
      const p = [t.x, -t.z];
      const g = this.city.walk.surface(p);
      t.y += (Math.min(g, this.city.terrain.height(p) + 60) - t.y) * 0.2;
    }
  }

  applyCamera() {
    const cam = this.camera, city = this.city;
    if (this.mode === 'orbit') {
      this.pitch = Math.min(Math.max(this.pitch, 0.04), 1.53);
      this.dist = Math.min(Math.max(this.dist, 12), 6500);
      const cp = Math.cos(this.pitch);
      const p = new THREE.Vector3(cp * Math.sin(this.yaw), Math.sin(this.pitch), cp * Math.cos(this.yaw)).multiplyScalar(this.dist).add(this.target);
      const ground = city.terrain.height([p.x, -p.z]) + 2.5;
      if (p.y < ground) p.y = ground;
      cam.position.copy(p);
      cam.up.set(0, 1, 0);
      cam.lookAt(this.target);
      const near = Math.max(1, this.dist * 0.004);
      if (Math.abs(cam.near - near) > 0.01) { cam.near = near; cam.updateProjectionMatrix(); }
      city.fitShadows(this.target, this.dist * 0.9);
    } else {
      this.wpitch = Math.min(Math.max(this.wpitch, -1.3), 1.3);
      const eye = new THREE.Vector3(this.wpos[0], this.feet + 1.7, -this.wpos[1]);
      const cw = Math.cos(this.wpitch);
      const f = new THREE.Vector3(Math.sin(this.heading) * cw, Math.sin(this.wpitch), -Math.cos(this.heading) * cw);
      cam.position.copy(eye);
      cam.lookAt(eye.clone().add(f));
      city.fitShadows(eye.clone().addScaledVector(new THREE.Vector3(f.x, 0, f.z).normalize(), 40), 90);
      const ll = Geo.latLon(this.wpos);
      this.onModeInfo?.(`${ll.lat.toFixed(5)} N, ${ll.lon.toFixed(5)} E  ·  ${this.feet.toFixed(0)} m above sea level`);
    }
    cam.updateMatrixWorld();
    this.labelsDirty = true;
  }

  // MARK: Labels

  updateLabels() {
    this.labelsDirty = false;
    const city = this.city;
    if (!this.showLabels) { for (const l of this.labels) l.el.hidden = true; return; }
    const W = this.container.clientWidth, H = this.container.clientHeight;
    const camPos = this.camera.position;
    const limit = this.mode === 'walk' ? 220 : 900;
    const majorLimit = this.mode === 'walk' ? 650 : 7000;
    const v = new THREE.Vector3();
    const cands = [];
    this.labels.forEach((l, i) => {
      const wp = city.labelPoints[l.id];
      if (!wp) { l.el.hidden = true; return; }
      const d = wp.distanceTo(camPos);
      const sel = l.id === this.selectedID;
      if (!(sel || d < limit || (l.major && d < majorLimit))) { l.el.hidden = true; return; }
      v.copy(wp).project(this.camera);
      const x = (v.x + 1) / 2 * W, y = (1 - v.y) / 2 * H;
      if (v.z >= 1 || v.z <= -1 || x < -50 || y < -20 || x > W + 50 || y > H + 20) { l.el.hidden = true; return; }
      cands.push({ i, x, y, d, pri: sel ? 0 : l.major ? 1 : 2 });
    });
    cands.sort((a, b) => (a.pri !== b.pri ? a.pri - b.pri : a.d - b.d));
    const placed = [];
    for (const c of cands) {
      const l = this.labels[c.i];
      if (!l.w) {
        l.el.hidden = false;
        l.w = l.el.offsetWidth; l.h = l.el.offsetHeight;
      }
      const rect = { x: c.x - l.w / 2, y: c.y - l.h, w: l.w, h: l.h };
      if (placed.some((p) => p.x < rect.x + rect.w + 3 && rect.x - 3 < p.x + p.w && p.y < rect.y + rect.h + 1 && rect.y - 1 < p.y + p.h)) {
        l.el.hidden = true;
        continue;
      }
      placed.push(rect);
      l.el.hidden = false;
      l.el.style.transform = `translate(${Math.round(rect.x)}px, ${Math.round(rect.y)}px)`;
      l.el.style.opacity = c.pri === 0 ? 1 : c.d > limit ? 0.8 : 1;
      l.el.classList.toggle('selected', c.pri === 0);
    }
  }

  // MARK: Input

  bindInput() {
    const el = this.renderer.domElement;
    el.style.touchAction = 'none';
    this.container.tabIndex = 0;
    const pointers = new Map();
    let dragged = false, pinch = null, panMode = false;

    el.addEventListener('contextmenu', (e) => e.preventDefault());
    el.addEventListener('pointerdown', (e) => {
      this.container.focus();
      el.setPointerCapture(e.pointerId);
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      dragged = false;
      panMode = e.button === 2 || e.button === 1 || e.altKey;
      if (pointers.size === 2) pinch = this.pinchState(pointers);
    });
    el.addEventListener('pointermove', (e) => {
      const p = pointers.get(e.pointerId);
      if (!p) return;
      const dx = e.clientX - p.x, dy = e.clientY - p.y;
      p.x = e.clientX; p.y = e.clientY;
      if (Math.abs(dx) + Math.abs(dy) > 0.5) dragged = true;
      if (pointers.size >= 2) {
        // Two fingers: pinch to zoom, move together to pan, twist to turn.
        const s = this.pinchState(pointers);
        if (pinch && this.mode === 'orbit') {
          this.fly = null;
          this.dist *= pinch.d / Math.max(s.d, 1);
          this.yaw -= s.a - pinch.a;
          this.pan((s.x - pinch.x) / 2, (s.y - pinch.y) / 2);
          this.needsCamera = true;
        }
        pinch = s;
        return;
      }
      if (panMode || e.altKey) { this.pan(dx, dy); return; }
      this.fly = null;
      if (this.mode === 'orbit') { this.yaw -= dx * 0.006; this.pitch += dy * 0.006; }
      else { this.heading += dx * 0.005; this.wpitch -= dy * 0.005; }
      this.needsCamera = true;
    });
    const end = (e) => {
      if (!pointers.has(e.pointerId)) return;
      const single = pointers.size === 1;
      pointers.delete(e.pointerId);
      if (pointers.size < 2) pinch = null;
      if (single && !dragged && e.type === 'pointerup') this.pick(e);
    };
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);
    el.addEventListener('wheel', (e) => {
      e.preventDefault();
      if (this.mode !== 'orbit') return;
      this.fly = null;
      const k = e.deltaMode === 1 ? 0.05 : 0.0015;
      this.dist *= Math.exp(e.deltaY * k);
      this.needsCamera = true;
    }, { passive: false });

    this.container.addEventListener('keydown', (e) => {
      if (e.metaKey || e.ctrlKey) return;
      if (e.code === 'Escape') { this.onPick?.(null); return; }
      this.shift = e.shiftKey;
      if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyQ', 'KeyE', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        this.keys.add(e.code);
        e.preventDefault();
      }
    });
    this.container.addEventListener('keyup', (e) => { this.keys.delete(e.code); this.shift = e.shiftKey; });
    this.container.addEventListener('blur', () => this.keys.clear());
  }

  pinchState(pointers) {
    const [a, b] = [...pointers.values()];
    return { d: Math.hypot(a.x - b.x, a.y - b.y), a: Math.atan2(b.y - a.y, b.x - a.x), x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  }

  pan(dx, dy) {
    if (this.mode !== 'orbit') return;
    this.fly = null;
    const k = this.dist * 0.0016;
    const f = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw)), r = new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
    this.target.addScaledVector(f, dy * k).addScaledVector(r, -dx * k);
    this.clampTarget();
    this.needsCamera = true;
  }

  pick(e) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    const ndc = new THREE.Vector2((e.clientX - rect.left) / rect.width * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
    this.raycaster.setFromCamera(ndc, this.camera);
    const targets = [this.city.terrainMesh, ...Object.values(this.city.meshes)];
    const hit = this.raycaster.intersectObjects(targets, false)[0];
    const id = hit?.object.userData.id;
    this.onPick?.(!id || id === 'terrain' ? null : id);
  }
}
