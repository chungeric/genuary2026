import * as THREE from 'three/webgpu'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
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
scene.background = new THREE.Color('blue');
const camera = new THREE.PerspectiveCamera( 20, window.innerWidth / window.innerHeight, 0.1, 1000 );
camera.position.x = 50;
camera.position.y = 70;
camera.position.z = 50;

const renderer = new THREE.WebGPURenderer();
renderer.setSize( window.innerWidth, window.innerHeight );
renderer.setAnimationLoop( animate );
document.body.appendChild( renderer.domElement );

const controls = new OrbitControls(camera, renderer.domElement);

const geometry = new THREE.BoxGeometry( 1, 1, 1 );
const material = new THREE.MeshStandardNodeMaterial({ color: 'white', side: THREE.DoubleSide, transparent: true });
// material.colorNode = Fn(() => {
//   return vec3(1, 1, 1);
// })();

material.opacityNode = Fn(() => {
  const isTopFace = step(0.9, normalLocal.y);
  const isBottomFace = step(normalLocal.y, -0.9);
  return mix(mix(uv().y, 1.0, isTopFace), 0.0, isBottomFace);
})();

const GRID_SIZE = 100;
const SPACING = 1.6;
const OFFSET = (GRID_SIZE - 1) * SPACING / 2;

for (let x = 0; x < GRID_SIZE; x++) {
  for (let z = 0; z < GRID_SIZE; z++) {
    const mesh = new THREE.Mesh( geometry, material );
    mesh.scale.setY(THREE.MathUtils.randFloat(1, 15));
    mesh.position.set(
      x * SPACING - OFFSET,
      mesh.scale.y / 2,
      z * SPACING - OFFSET
    );
    scene.add( mesh );
  }
}

//  --- Lights ---
const ambient = new THREE.HemisphereLight( 0xffffff, 0xbfd4d2, 3 );
scene.add( ambient );

const directionalLight = new THREE.DirectionalLight( 0xffffff, 0.3 );
directionalLight.position.set( 1, 4, 3 ).multiplyScalar( 3 );
// directionalLight.castShadow = true;
// directionalLight.shadow.mapSize.setScalar( 2048 );
directionalLight.shadow.bias = - 1e-4;
directionalLight.shadow.normalBias = 1e-4;
scene.add( directionalLight );

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

function animate() {
  // material.uniforms.time.value += 0.1;
  controls.update();
  renderer.render( scene, camera );
}