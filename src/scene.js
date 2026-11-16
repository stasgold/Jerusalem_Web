// Scene assembly: terrain, feature meshes, sun, sky dome, haze, evidence overlay and selection.
import * as THREE from 'three';
import { valueNoise } from './geo.js';
import { Bounds, insideCity } from './data/cityBase.js';
import { terrain as getTerrain } from './data/terrain.js';
import { buildFeatures } from './data/infill.js';
import { WalkGrid } from './walkGrid.js';
import { ShapeBuilder } from './meshBuilder.js';
import { MaterialLibrary, makeSkyMaterial } from './materials.js';

/** Position of the sun for Jerusalem (31.78 N), from local solar time and day of year. */
export function solarPosition(hour, dayOfYear) {
  const lat = 31.78 * Math.PI / 180;
  const decl = 23.44 * Math.PI / 180 * Math.sin(2 * Math.PI * (284 + dayOfYear) / 365);
  const ha = (hour - 12) * 15 * Math.PI / 180;
  const up = Math.sin(lat) * Math.sin(decl) + Math.cos(lat) * Math.cos(decl) * Math.cos(ha);
  const east = -Math.cos(decl) * Math.sin(ha);
  const north = Math.sin(decl) * Math.cos(lat) - Math.cos(decl) * Math.cos(ha) * Math.sin(lat);
  return { dir: [east, north, up], elevation: Math.asin(Math.min(Math.max(up, -1), 1)) };
}

const mix = (a, b, t) => { t = Math.min(Math.max(t, 0), 1); return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; };
const scale = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
const srgb = (c) => new THREE.Color().setRGB(Math.min(Math.max(c[0], 0), 1), Math.min(Math.max(c[1], 0), 1), Math.min(Math.max(c[2], 0), 1), THREE.SRGBColorSpace);

/** Light intensity scale: SceneKit's physically based units (1000 = 1) to three.js, where π gives full albedo. */
const LIGHT = Math.PI / 1000;

export class CityScene {
  /** Builds everything. `progress(fraction, text)` is awaited between stages so the page can repaint. */
  static async create(renderer, progress = async () => {}) {
    const city = new CityScene();
    // Masonry textures are cut in workers while the main thread builds the ground and the dataset.
    const materials = MaterialLibrary.create(renderer);
    await progress(0.05, 'Interpolating the ancient ground surface');
    city.terrain = getTerrain();
    city.walk = new WalkGrid(city.terrain);
    await progress(0.2, 'Laying out the dataset');
    city.features = buildFeatures();
    city.featureByID = Object.fromEntries(city.features.map((f) => [f.id, f]));
    await progress(0.3, 'Cutting the masonry textures');
    city.materials = await materials;
    await progress(0.55, 'Shaping the terrain');
    city.scene.add(city.makeTerrainMesh());
    await progress(0.6, 'Building the city');
    let k = 0;
    for (const f of city.features) {
      if (f.shapes.length) city.addFeature(f);
      if (++k % 12 === 0) await progress(0.6 + 0.35 * k / city.features.length, 'Building the city');
    }
    const t = city.featureByID.terrain;
    city.radii.terrain = 900;
    city.labelPoints.terrain = new THREE.Vector3(t.anchor[0], city.terrain.height(t.anchor) + 20, -t.anchor[1]);
    city.setupLights();
    city.setSun(9.5, 80);
    await progress(1, 'Ready');
    return city;
  }

  constructor() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0);
    this.meshes = {};
    this.labelPoints = {};
    this.radii = {};
    this.triangleCount = 0;
    this.cloudCover = 0.42;
    this.lastSun = { hour: 9.5, day: 80 };
    this.overlayOn = false;
    this.selected = null;
  }

  addFeature(f) {
    const b = new ShapeBuilder(this.terrain, this.walk);
    for (const s of f.shapes) b.add(s);
    const data = b.mesh.finish();
    if (!data) return;
    this.triangleCount += b.mesh.triangleCount;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(data.position, 3));
    g.setAttribute('normal', new THREE.BufferAttribute(data.normal, 3));
    g.setAttribute('uv', new THREE.BufferAttribute(data.uv, 2));
    g.setAttribute('color', new THREE.BufferAttribute(data.color, 3));
    g.setIndex(new THREE.BufferAttribute(data.index, 1));
    data.groups.forEach((gr, i) => g.addGroup(gr.start, gr.count, i));
    g.computeBoundingBox();
    g.computeBoundingSphere();
    const mesh = new THREE.Mesh(g, data.groups.map((gr) => this.materials.base[gr.mat]));
    mesh.name = f.id;
    mesh.userData.id = f.id;
    mesh.userData.mats = data.groups.map((gr) => gr.mat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.matrixAutoUpdate = false;
    this.scene.add(mesh);
    this.meshes[f.id] = mesh;

    const bb = g.boundingBox;
    const size = new THREE.Vector3().subVectors(bb.max, bb.min);
    this.radii[f.id] = Math.max(size.length() / 2, 8);
    const top = f.shapes.length > 400 || size.x > 400 || size.z > 400 ? this.terrain.height(f.anchor) + 18 : bb.max.y + 3;
    this.labelPoints[f.id] = new THREE.Vector3(f.anchor[0], top, -f.anchor[1]);
  }

  // MARK: Terrain

  makeTerrainMesh() {
    const T = this.terrain, nx = T.nx, ny = T.ny, cell = Bounds.cell;
    const pos = new Float32Array(nx * ny * 3), nrm = new Float32Array(nx * ny * 3), uv = new Float32Array(nx * ny * 2), col = new Float32Array(nx * ny * 3);
    for (let j = 0; j < ny; j++) {
      for (let i = 0; i < nx; i++) {
        const k = j * nx + i;
        const x = Bounds.minX + i * cell, y = Bounds.minY + j * cell;
        const h = T.node(i, j);
        pos[k * 3] = x; pos[k * 3 + 1] = h; pos[k * 3 + 2] = -y;
        const hl = T.node(Math.max(i - 1, 0), j), hr = T.node(Math.min(i + 1, nx - 1), j);
        const hd = T.node(i, Math.max(j - 1, 0)), hu = T.node(i, Math.min(j + 1, ny - 1));
        const gx = (hr - hl) / (2 * cell), gy = (hu - hd) / (2 * cell);
        const nl = Math.hypot(gx, 1, gy);
        nrm[k * 3] = -gx / nl; nrm[k * 3 + 1] = 1 / nl; nrm[k * 3 + 2] = gy / nl;
        uv[k * 2] = x; uv[k * 2 + 1] = y;

        // Colour: trodden earth inside the walls, scrub and bare rock outside, greener in the valleys.
        const slope = Math.hypot(gx, gy);
        const n1 = 0.5 * valueNoise(x / 260, y / 260, 3) + 0.3 * valueNoise(x / 95, y / 95, 7) + 0.2 * valueNoise(x / 37, y / 37, 8);
        const n2 = valueNoise(x / 14, y / 14, 4);
        let c;
        if (insideCity([x, y])) c = [0.76, 0.71, 0.63];
        else {
          const earth = [0.80, 0.68, 0.48], scrub = [0.46, 0.54, 0.30];
          const t = Math.min(Math.max((n1 + Math.max(0, 690 - h) / 260 - 0.40) / 0.24, 0), 1);
          c = mix(earth, scrub, t * t * (3 - 2 * t));
        }
        const rock = Math.min(Math.max((slope - 0.36) * 3, 0), 1);
        c = mix(c, [0.78, 0.74, 0.66], rock);
        c = scale(c, 0.90 + 0.20 * n2);
        col[k * 3] = c[0]; col[k * 3 + 1] = c[1]; col[k * 3 + 2] = c[2];
      }
    }
    const idx = new Uint32Array((nx - 1) * (ny - 1) * 6);
    let p = 0;
    for (let j = 0; j < ny - 1; j++) {
      for (let i = 0; i < nx - 1; i++) {
        const a = j * nx + i, b = a + 1, c = a + nx, d = c + 1;
        // Counter-clockwise seen from above (z points south).
        idx[p++] = a; idx[p++] = b; idx[p++] = d; idx[p++] = a; idx[p++] = d; idx[p++] = c;
      }
    }
    this.triangleCount += idx.length / 3;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('normal', new THREE.BufferAttribute(nrm, 3));
    g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    g.setIndex(new THREE.BufferAttribute(idx, 1));
    g.computeBoundingSphere();
    const mesh = new THREE.Mesh(g, this.materials.terrain);
    mesh.name = 'terrain';
    mesh.userData.id = 'terrain';
    mesh.receiveShadow = true;
    mesh.matrixAutoUpdate = false;
    this.terrainMesh = mesh;
    return mesh;
  }

  // MARK: Light

  setupLights() {
    const sun = new THREE.DirectionalLight(0xffffff, 1);
    sun.castShadow = true;
    sun.shadow.mapSize.set(4096, 4096);
    sun.shadow.bias = -0.0004;
    sun.shadow.normalBias = 0.4;
    sun.shadow.camera.near = 10;
    sun.shadow.camera.far = 9000;
    this.sun = sun;
    this.scene.add(sun, sun.target);

    this.ambient = new THREE.AmbientLight(0xffffff, 0);
    this.hemi = new THREE.HemisphereLight(0xffffff, 0x000000, 0);
    this.scene.add(this.ambient, this.hemi);

    this.skyMaterial = makeSkyMaterial();
    const dome = new THREE.Mesh(new THREE.SphereGeometry(30000, 48, 24), this.skyMaterial);
    dome.name = 'sky';
    dome.frustumCulled = false;
    dome.renderOrder = -1000;
    this.sky = dome;
    this.scene.add(dome);
    this.scene.fog = new THREE.FogExp2(0xbcd0e8, 0.00006);
  }

  /** Keeps the shadow map centred on what the camera looks at, sized to the view distance. */
  fitShadows(target, extent) {
    const e = Math.min(Math.max(extent, 60), 1800);
    const cam = this.sun.shadow.camera;
    if (cam.right !== e) {
      cam.left = -e; cam.right = e; cam.top = e; cam.bottom = -e;
      cam.updateProjectionMatrix();
    }
    this.sun.target.position.copy(target);
    this.sun.position.copy(target).addScaledVector(this.sunDirWorld, 4000);
    this.sun.target.updateMatrixWorld();
    this.shadowsDirty = true;
  }

  setCloudCover(c) {
    this.cloudCover = Math.min(Math.max(c, 0), 1);
    this.setSun(this.lastSun.hour, this.lastSun.day);
  }

  /** Moves the sun. `hour` is local solar time (12 = sun due south). */
  setSun(hour, dayOfYear) {
    this.lastSun = { hour, day: dayOfYear };
    this.shadowsDirty = true;
    const s = solarPosition(hour, dayOfYear);
    const day = Math.min(Math.max(Math.sin(s.elevation) * 4, 0), 1);            // 0 at the horizon, 1 above about 14 degrees
    const twilight = Math.min(Math.max((s.elevation + 0.16) / 0.16, 0), 1);     // fades in from -9 degrees
    const overcast = Math.max(0, this.cloudCover - 0.45) * 1.2;                  // thick cloud dims and softens the sun

    // Below the horizon a dim bluish moon takes over from a fixed direction.
    let dir = s.dir;
    if (s.elevation <= 0) { const l = Math.hypot(-0.45, -0.35, 0.82); dir = [-0.45 / l, -0.35 / l, 0.82 / l]; }
    this.sunDirWorld = new THREE.Vector3(dir[0], dir[2], -dir[1]);

    const warm = [1.0, 0.62, 0.34], white = [1.0, 0.98, 0.94], moon = [0.55, 0.65, 0.95];
    if (s.elevation > 0) {
      this.sun.intensity = (200 + 1350 * day) * (1 - overcast * 0.6) * LIGHT;
      this.sun.color = srgb(mix(warm, white, day));
    } else {
      this.sun.intensity = (40 + 160 * twilight) * LIGHT;
      this.sun.color = srgb(moon);
    }
    this.sun.shadow.radius = 2.5 + overcast * 10;
    this.ambient.intensity = (15 + 45 * twilight) * LIGHT;
    this.ambient.color = srgb(mix([0.40, 0.48, 0.80], [0.78, 0.86, 1.0], twilight));

    // Sky colours (linear, before tone mapping).
    let zenith, horizon, cloudLit, cloudDark, sunColor;
    if (s.elevation > 0) {
      zenith = mix([0.10, 0.14, 0.36], [0.10, 0.26, 0.68], day);
      horizon = mix([1.0, 0.52, 0.26], [0.62, 0.77, 0.96], day);
      cloudLit = mix([1.15, 0.66, 0.44], [1.12, 1.10, 1.06], day);
      cloudDark = mix([0.30, 0.25, 0.34], [0.52, 0.58, 0.68], day);
      sunColor = mix([1.0, 0.50, 0.20], [1.0, 0.95, 0.85], day);
    } else {
      zenith = mix([0.004, 0.007, 0.022], [0.10, 0.14, 0.36], twilight);
      horizon = mix([0.02, 0.03, 0.065], [1.0, 0.52, 0.26], twilight);
      cloudLit = mix([0.045, 0.055, 0.085], [1.15, 0.66, 0.44], twilight);
      cloudDark = mix([0.012, 0.016, 0.028], [0.30, 0.25, 0.34], twilight);
      sunColor = scale([1.0, 0.50, 0.20], twilight);
    }
    const u = this.skyMaterial.uniforms;
    u.sunDir.value.set(s.dir[0], s.dir[2], -s.dir[1]).normalize();
    u.zenithColor.value.set(...zenith);
    u.horizonColor.value.set(...horizon);
    u.sunColor.value.set(...sunColor);
    u.cloudLit.value.set(...cloudLit);
    u.cloudDark.value.set(...cloudDark);
    u.cloudCover.value = this.cloudCover;
    u.starAmount.value = 1 - twilight;

    // The same sky lights the scene (a hemisphere standing in for the sky cube) and tints the distance.
    const skyTop = mix(mix(zenith, cloudDark, this.cloudCover * 0.6), mix(horizon, cloudLit, this.cloudCover * 0.4), 0.55);
    const ground = scale([0.42, 0.38, 0.32], Math.max(horizon[0] + horizon[1] + horizon[2], 0.05) / 2.3);
    this.hemi.color.setRGB(...skyTop);
    this.hemi.groundColor.setRGB(...ground);
    this.hemi.intensity = (0.2 + 0.8 * twilight) * 1.6;
    const haze = mix(horizon, zenith, 0.12);
    this.scene.fog.color.setRGB(...haze);
    this.scene.fog.density = 0.00004 + 0.00005 * this.cloudCover;
  }

  // MARK: Appearance

  setOverlay(on) {
    this.overlayOn = on;
    for (const id of Object.keys(this.meshes)) this.applyAppearance(id);
  }

  setSelected(id) {
    const old = this.selected;
    this.selected = id;
    if (old) this.applyAppearance(old);
    if (id) this.applyAppearance(id);
  }

  applyAppearance(id) {
    const mesh = this.meshes[id], f = this.featureByID[id];
    if (!mesh || !f) return;
    const L = this.materials;
    let list = mesh.userData.mats.map((m) => (this.overlayOn ? (m === 'water' ? L.base.water : L.confidence[f.confidence.key]) : L.base[m]));
    if (id === this.selected) list = list.map((m) => L.highlighted(m));
    mesh.material = list;
  }
}
