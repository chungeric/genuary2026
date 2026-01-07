import * as THREE from 'three/webgpu'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import gsap from 'gsap';
import {
  // Type constructors & conversions
  float, int, vec2, vec3, vec4, color,
  // Core nodes
  uniform, texture, Fn, attribute, varying,
  // Math operations
  add, sub, mul, div, mix, clamp, sin, cos, normalize, dot, cross,
  // Position & transformation
  positionLocal, positionWorld, positionView,
  normalLocal, normalWorld, normalView,
  modelViewMatrix, modelWorldMatrix, cameraProjectionMatrix,
  // UV & texture utilities
  uv, screenUV, matcapUV,
  // Material properties
  materialColor, materialNormal, materialOpacity,
  // Common utilities
  time, abs, pow, saturate, step, smoothstep
} from 'three/tsl';

const scene = new THREE.Scene();
const frustumSize = 20;
const aspect = window.innerWidth / window.innerHeight;
const camera = new THREE.OrthographicCamera(
  -frustumSize * aspect / 2, frustumSize * aspect / 2,
  frustumSize / 2, -frustumSize / 2,
  -1000, 1000
);
camera.position.z = 5;


const renderer = new THREE.WebGPURenderer();
// renderer.toneMapping = THREE.ACESFilmicToneMapping;
// renderer.toneMappingExposure = 2.0;
renderer.setSize( window.innerWidth, window.innerHeight );
renderer.setAnimationLoop( animate );
document.body.appendChild( renderer.domElement );

const controls = new OrbitControls(camera, renderer.domElement);

const geometry = new THREE.BoxGeometry( 2, 2, 2 );
const material = new THREE.MeshStandardNodeMaterial({ color: "#fcbf49", side: THREE.DoubleSide });

const GRID_SIZE = 10;
const GRID_SPACING = 2;
const GRID_OFFSET = (GRID_SIZE - 1) * GRID_SPACING / 2;
const positions = [];
const rotations = [];

for (let x = 0; x < GRID_SIZE; x++) {
  for (let y = 0; y < GRID_SIZE; y++) {
    positions.push([x * GRID_SPACING - GRID_OFFSET, y * GRID_SPACING - GRID_OFFSET, 0]);
    rotations.push({ x: 0, y: 0, z: 0 });
  }
}

const animating = new Set();

function rotateRandomCube() {
  const available = positions.map((_, i) => i).filter(i => !animating.has(i));
  if (available.length === 0) return;

  const i = available[Math.floor(Math.random() * available.length)];
  const axis = Math.random() < 0.5 ? 'x' : 'y';
  const direction = Math.random() < 0.5 ? 1 : -1;

  animating.add(i);
  gsap.to(rotations[i], {
    [axis]: rotations[i][axis] + direction * Math.PI / 2,
    duration: 0.5,
    ease: 'back.out',
    onComplete: () => animating.delete(i)
  });
}

setInterval(rotateRandomCube, 100);

const instancedMesh = new THREE.InstancedMesh(geometry, material, positions.length);
scene.add(instancedMesh);

const dummy = new THREE.Object3D();

//  --- Lights ---
const ambientLight = new THREE.AmbientLight( 0xcccccc, 2 );
scene.add( ambientLight );

const directionalLight = new THREE.DirectionalLight( 0xffffff, 3 );
directionalLight.position.set( 5, 10, 7.5 );
scene.add( directionalLight );

window.addEventListener('resize', () => {
  const aspect = window.innerWidth / window.innerHeight;
  camera.left = -frustumSize * aspect / 2;
  camera.right = frustumSize * aspect / 2;
  camera.top = frustumSize / 2;
  camera.bottom = -frustumSize / 2;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

function animate() {
  controls.update();

  for (let i = 0; i < positions.length; i++) {
    const pos = positions[i];
    const rot = rotations[i];
    dummy.position.set(pos[0], pos[1], pos[2]);
    dummy.rotation.set(rot.x, rot.y, 0);
    dummy.updateMatrix();
    instancedMesh.setMatrixAt(i, dummy.matrix);
  }
  instancedMesh.instanceMatrix.needsUpdate = true;

  renderer.render( scene, camera );
}