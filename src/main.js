import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import './style.css';

const canvas = document.querySelector('#character-canvas');
const stage = document.querySelector('.model-stage');
const loadingScreen = document.querySelector('#loading-screen');
const loadingBar = document.querySelector('#loading-bar');
const loadingPercent = document.querySelector('#loading-percent');
const errorMessage = document.querySelector('#error-message');
const hero = document.querySelector('.hero');
const cursor = document.querySelector('#cursor');
const cursorRing = cursor.querySelector('.cursor__ring');
const cursorDot = cursor.querySelector('.cursor__dot');
const telemetryYaw = document.querySelector('#telemetry-yaw');
const telemetryPitch = document.querySelector('#telemetry-pitch');
const hudMode = document.querySelector('#hud-mode');
const hudDot = document.querySelector('#hud-dot');

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
camera.position.set(0, 0.1, 8.5);

const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.18;

scene.add(new THREE.HemisphereLight(0xdce7ff, 0x17100e, 2.2));
const keyLight = new THREE.DirectionalLight(0xfff1df, 4.4);
keyLight.position.set(-3.5, 5, 5);
scene.add(keyLight);
const rimLight = new THREE.DirectionalLight(0xf5472e, 5.2);
rimLight.position.set(4, 1.4, -3.2);
scene.add(rimLight);
const fillLight = new THREE.PointLight(0x91f2c6, 2.2, 9);
fillLight.position.set(2.8, -1.8, 3.4);
scene.add(fillLight);

const characterRoot = new THREE.Group();
scene.add(characterRoot);
const clock = new THREE.Clock();
const pointer = new THREE.Vector2();
const look = new THREE.Vector2();
const gaze = new THREE.Vector2();
let loaded = false;
let characterBaseY = 0;

const loader = new GLTFLoader();
loader.setMeshoptDecoder(MeshoptDecoder);
loader.load(
  '/niloy_3D_Model.glb',
  ({ scene: model }) => {
    model.traverse((object) => {
      if (object.isMesh) {
        object.frustumCulled = true;
        object.castShadow = false;
        object.receiveShadow = false;
        if (Array.isArray(object.material)) {
          object.material.forEach((material) => { material.envMapIntensity = 1.15; });
        } else {
          object.material.envMapIntensity = 1.15;
        }
      }
    });

    const bounds = new THREE.Box3().setFromObject(model);
    const size = bounds.getSize(new THREE.Vector3());
    const center = bounds.getCenter(new THREE.Vector3());
    const targetHeight = Math.min(stage.clientHeight * 0.0062, 5.2);
    const scale = targetHeight / size.y;
    model.position.set(-center.x, -center.y, -center.z);
    model.scale.setScalar(scale);
    characterRoot.add(model);
    characterRoot.position.y = targetHeight * 0.47;
    characterBaseY = characterRoot.position.y;
    camera.position.z = Math.max(7.3, targetHeight * 1.9);
    camera.lookAt(0, characterBaseY, 0);
    loaded = true;
    loadingScreen.classList.add('is-hidden');
    hero.classList.add('is-ready');
    stage.classList.add('is-ready');
  },
  (event) => {
    if (event.total > 0) {
      const progress = Math.round((event.loaded / event.total) * 100);
      loadingBar.style.width = `${progress}%`;
      loadingPercent.textContent = `${String(progress).padStart(2, '0')}%`;
    }
  },
  () => {
    loadingScreen.classList.add('is-hidden');
    errorMessage.hidden = false;
  },
);

function resize() {
  const { width, height } = stage.getBoundingClientRect();
  if (!width || !height) return;
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  if (loaded) {
    const box = new THREE.Box3().setFromObject(characterRoot);
    const heightScale = Math.min(height * 0.0062, 5.2) / box.getSize(new THREE.Vector3()).y;
    characterRoot.scale.setScalar(heightScale);
  }
}

window.addEventListener('resize', resize);
window.addEventListener('pointermove', (event) => {
  pointer.set(
    THREE.MathUtils.clamp((event.clientX / window.innerWidth - 0.5) * 2, -1, 1),
    THREE.MathUtils.clamp((0.5 - event.clientY / window.innerHeight) * 2, -1, 1),
  );
  cursorRing.style.transform = `translate3d(${event.clientX}px, ${event.clientY}px, 0)`;
  cursorDot.style.transform = `translate3d(${event.clientX}px, ${event.clientY}px, 0)`;
}, { passive: true });
window.addEventListener('pointerleave', () => pointer.set(0, 0));
document.querySelectorAll('a, button').forEach((element) => {
  element.addEventListener('pointerenter', () => cursor.classList.add('is-hover'));
  element.addEventListener('pointerleave', () => cursor.classList.remove('is-hover'));
});
if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) cursor.style.display = 'block';
window.addEventListener('scroll', () => document.querySelector('#nav').classList.toggle('is-scrolled', window.scrollY > 8), { passive: true });
resize();

function animate() {
  requestAnimationFrame(animate);
  const delta = Math.min(clock.getDelta(), 0.05);
  const elapsed = clock.elapsedTime;
  look.x = THREE.MathUtils.damp(look.x, pointer.x, 2.3, delta);
  look.y = THREE.MathUtils.damp(look.y, pointer.y, 2.3, delta);
  gaze.x = THREE.MathUtils.damp(gaze.x, look.x, 3.8, delta);
  gaze.y = THREE.MathUtils.damp(gaze.y, look.y, 3.8, delta);

  if (loaded) {
    const idleYaw = Math.sin(elapsed * 0.62) * 0.045 + Math.sin(elapsed * 0.27) * 0.02;
    const idlePitch = Math.sin(elapsed * 0.48 + 1.2) * 0.018;
    characterRoot.position.y = characterBaseY + Math.sin(elapsed * 0.8) * 0.045;
    characterRoot.rotation.y = THREE.MathUtils.damp(characterRoot.rotation.y, idleYaw + gaze.x * 0.14, 2.8, delta);
    characterRoot.rotation.x = THREE.MathUtils.damp(characterRoot.rotation.x, idlePitch - gaze.y * 0.055, 2.8, delta);
    telemetryYaw.textContent = `${gaze.x >= 0 ? '+' : ''}${(gaze.x * 32).toFixed(1)}°`;
    telemetryPitch.textContent = `${gaze.y >= 0 ? '+' : ''}${(gaze.y * 18).toFixed(1)}°`;
    const tracking = Math.abs(pointer.x) + Math.abs(pointer.y) > 0.12;
    hudMode.textContent = tracking ? 'TRACKING' : 'IDLE';
    hudDot.classList.toggle('is-tracking', tracking);
    hudDot.classList.toggle('is-idle', !tracking);

  }

  renderer.render(scene, camera);
}
animate();