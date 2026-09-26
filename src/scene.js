import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

// Camera presets. The model's nose points to -Z.
const VIEWS = {
  three: { pos: [4.4, 1.5, -4.9], target: [0, 0.45, 0] },
  front: { pos: [0, 1.05, -6.4], target: [0, 0.5, 0] },
  side: { pos: [6.6, 0.95, 0], target: [0, 0.5, 0] },
  rear: { pos: [0, 1.3, 6.4], target: [0, 0.5, 0] },
  top: { pos: [0.001, 8.2, -0.4], target: [0, 0, 0] },
  // Looks down into the open cabin from beside the driver's door
  cabin: { pos: [5.3, 4.4, 0.9], target: [0, 0.35, 0.1] },
};

const BASE = import.meta.env.BASE_URL;
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

export function createScene({ canvas, container, onProgress, onLoad, onError }) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.95;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
  camera.position.set(...VIEWS.three.pos);

  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.enablePan = false;
  controls.minDistance = 2.2;
  controls.maxDistance = 13;
  controls.maxPolarAngle = Math.PI / 2 - 0.04;
  controls.target.set(...VIEWS.three.target);
  controls.autoRotateSpeed = 0.9;
  // OrbitControls blocks all touch scrolling. On touch screens let vertical swipes
  // scroll the page, and keep horizontal drags for rotating the car.
  if (window.matchMedia('(pointer: coarse)').matches) canvas.style.touchAction = 'pan-y';

  // Materials the configurator drives
  const materials = {
    body: new THREE.MeshPhysicalMaterial({
      color: 0x2b2e33,
      metalness: 0.65,
      roughness: 0.32,
      clearcoat: 1,
      clearcoatRoughness: 0.03,
    }),
    wheel: new THREE.MeshStandardMaterial({ color: 0xb8bcc2, metalness: 1, roughness: 0.35 }),
    caliper: new THREE.MeshStandardMaterial({ color: 0x1b1d20, metalness: 0.3, roughness: 0.45 }),
    leather: new THREE.MeshStandardMaterial({ color: 0x1c1d1f, roughness: 0.62 }),
    glass: new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      metalness: 0.25,
      roughness: 0,
      transmission: 1,
      thickness: 0.1,
    }),
    // Neutral trim used to replace the original manufacturer badges
    badge: new THREE.MeshStandardMaterial({ color: 0x17181a, metalness: 0.6, roughness: 0.4 }),
    rubber: new THREE.MeshStandardMaterial({ color: 0x161719, metalness: 0, roughness: 0.88 }),
    trim: new THREE.MeshStandardMaterial({ color: 0x8d9197, metalness: 1, roughness: 0.3 }),
  };

  let model = null;
  let shadowTex = null;

  const draco = new DRACOLoader();
  draco.setDecoderPath(`${BASE}draco/`);
  const loader = new GLTFLoader();
  loader.setDRACOLoader(draco);

  function load() {
    shadowTex = shadowTex || new THREE.TextureLoader().load(`${BASE}models/car_ao.png`);
    loader.load(
      `${BASE}models/car.glb`,
      (gltf) => {
        model = gltf.scene;
        applyMaterials(model);

        const shadow = new THREE.Mesh(
          new THREE.PlaneGeometry(0.655 * 4, 1.3 * 4),
          new THREE.MeshBasicMaterial({
            map: shadowTex,
            blending: THREE.MultiplyBlending,
            toneMapped: false,
            transparent: true,
            premultipliedAlpha: true,
          })
        );
        shadow.rotation.x = -Math.PI / 2;
        shadow.renderOrder = 2;
        model.add(shadow);

        scene.add(model);
        onLoad?.();
      },
      (e) => {
        if (e.lengthComputable) onProgress?.(e.loaded / e.total);
      },
      (err) => {
        console.error(err);
        onError?.(err);
      }
    );
  }

  function applyMaterials(root) {
    root.traverse((obj) => {
      if (!obj.isMesh) return;
      const name = obj.name;
      const matName = obj.material?.name || '';

      if (name === 'body') obj.material = materials.body;
      else if (name === 'glass') obj.material = materials.glass;
      else if (name.startsWith('rim_')) obj.material = materials.wheel;
      else if (name === 'brake') obj.material = materials.caliper;
      else if (name === 'leather' || name === 'steering_leather' || name === 'trim' || name === 'steering_trim')
        obj.material = materials.leather;
      // Former badge shields blend into whatever surface they sit on
      else if (name === 'yellow_trim') obj.material = materials.body;
      else if (name === 'centre') obj.material = materials.wheel;
      else if (name === 'steering_centre') obj.material = materials.leather;
      else if (matName === 'Ferrari_Yellow' || matName === '_0098_DodgerBlue') obj.material = materials.badge;
      else if (name === 'chrome') {
        stripEmblems(obj.geometry);
        obj.material = materials.trim;
      }
      else if (name.startsWith('wheel') && matName === 'metal_gray') obj.material = materials.rubber;
    });
  }

  // The source model carries the original manufacturer's emblems inside its chrome
  // mesh. Drop those triangles so the car reads as an unbadged Halde.
  // Local frame of this mesh: x = length (+x is the rear), y = width, z = height.
  function stripEmblems(geometry) {
    const pos = geometry.attributes.position;
    const index = geometry.index;
    if (!index) return;
    const isEmblem = (x, y, z) => {
      const ay = Math.abs(y);
      if (x > 1.7 && ay < 0.17 && z > 0) return true; // rear emblem and script
      if (x < -2.0 && ay < 0.05) return true; // nose badge
      if (x > -0.75 && x < -0.3 && ay < 0.14) return true; // steering wheel logo
      return false;
    };
    const kept = [];
    for (let i = 0; i < index.count; i += 3) {
      const a = index.getX(i);
      const b = index.getX(i + 1);
      const c = index.getX(i + 2);
      const x = (pos.getX(a) + pos.getX(b) + pos.getX(c)) / 3;
      const y = (pos.getY(a) + pos.getY(b) + pos.getY(c)) / 3;
      const z = (pos.getZ(a) + pos.getZ(b) + pos.getZ(c)) / 3;
      if (!isEmblem(x, y, z)) kept.push(a, b, c);
    }
    geometry.setIndex(kept);
  }

  // ---------- Background follows the page theme ----------
  function syncBackground() {
    const stage = getComputedStyle(document.documentElement).getPropertyValue('--stage').trim() || '#e7e9eb';
    scene.background = new THREE.Color(stage);
  }
  syncBackground();

  // ---------- Resize ----------
  let distanceScale = 1;
  function resize() {
    const w = container.clientWidth;
    const h = container.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // Push the camera back on narrow / portrait stages so the whole car fits
    distanceScale = Math.min(2, Math.max(1, 1.3 / camera.aspect));
    controls.maxDistance = 13 * distanceScale;
    camera.updateProjectionMatrix();
  }
  const ro = new ResizeObserver(() => {
    const prev = distanceScale;
    resize();
    if (prev !== distanceScale && !tween) setView(currentView, true);
  });
  ro.observe(container);
  resize();

  // ---------- Camera tweens ----------
  let tween = null;
  let currentView = 'three';

  function viewPosition(key) {
    const v = VIEWS[key];
    const target = new THREE.Vector3(...v.target);
    const pos = new THREE.Vector3(...v.pos).sub(target).multiplyScalar(distanceScale).add(target);
    return { pos, target };
  }

  function setView(key, instant = false) {
    if (!VIEWS[key]) return;
    currentView = key;
    const { pos, target } = viewPosition(key);
    if (instant || reduceMotion.matches) {
      camera.position.copy(pos);
      controls.target.copy(target);
      controls.update();
      tween = null;
      return;
    }
    tween = {
      fromPos: camera.position.clone(),
      fromTarget: controls.target.clone(),
      toPos: pos,
      toTarget: target,
      start: performance.now(),
      duration: 1100,
    };
  }
  setView('three', true);

  // Color tweens so paint changes feel physical rather than instant
  const colorTweens = new Map();
  function setColor(key, hex) {
    const mat = materials[key];
    if (!mat) return;
    const to = new THREE.Color(hex);
    if (reduceMotion.matches) {
      mat.color.copy(to);
      return;
    }
    colorTweens.set(key, { mat, from: mat.color.clone(), to, start: performance.now(), duration: 450 });
  }

  function setFinish(finish) {
    const m = materials.body;
    if (finish === 'satin') {
      m.roughness = 0.55;
      m.clearcoat = 0.25;
      m.clearcoatRoughness = 0.45;
    } else {
      m.roughness = 0.32;
      m.clearcoat = 1;
      m.clearcoatRoughness = 0.03;
    }
  }

  function setAutoRotate(on) {
    controls.autoRotate = on && !reduceMotion.matches;
  }

  const ease = (t) => 1 - Math.pow(1 - t, 4);

  // ---------- Render loop (paused when offscreen) ----------
  let visible = true;
  const io = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
  });
  io.observe(container);

  renderer.setAnimationLoop((now) => {
    if (!visible) return;

    if (tween) {
      const t = Math.min(1, (now - tween.start) / tween.duration);
      const k = ease(t);
      camera.position.lerpVectors(tween.fromPos, tween.toPos, k);
      controls.target.lerpVectors(tween.fromTarget, tween.toTarget, k);
      if (t >= 1) tween = null;
    }

    for (const [key, c] of colorTweens) {
      const t = Math.min(1, (now - c.start) / c.duration);
      c.mat.color.lerpColors(c.from, c.to, ease(t));
      if (t >= 1) colorTweens.delete(key);
    }

    controls.update();
    renderer.render(scene, camera);
  });

  // Cancel a running camera tween as soon as the user grabs the model
  controls.addEventListener('start', () => {
    tween = null;
  });

  if (import.meta.env.DEV) window.__halde = { THREE, scene, camera, renderer };

  return { load, setView, setColor, setFinish, setAutoRotate, syncBackground, controls };
}
