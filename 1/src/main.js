// import * as THREE from 'three';
import * as THREE from 'three/webgpu'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Fn, sin, uniform, uv, vec4, clamp, vec2, distance, step, smoothstep } from 'three/tsl'
import { mapLinear } from 'three/src/math/MathUtils.js';

const randomColour = new THREE.Color(Math.random(), Math.random(), Math.random());

const scene = new THREE.Scene();
scene.background = randomColour;
scene.fog = new THREE.Fog( randomColour, 5, 27 );
const camera = new THREE.PerspectiveCamera( 20, window.innerWidth / window.innerHeight, 0.1, 1000 );
camera.position.z = 20;

// --- WebGL Renderer ---
// const renderer = new THREE.WebGLRenderer();
// renderer.setSize( window.innerWidth, window.innerHeight );
// renderer.setAnimationLoop( animate );
// document.body.appendChild( renderer.domElement );

// --- WebGPU Renderer  ---
const renderer = new THREE.WebGPURenderer();
renderer.setSize( window.innerWidth, window.innerHeight );
renderer.setAnimationLoop( animate );
document.body.appendChild( renderer.domElement );

const controls = new OrbitControls(camera, renderer.domElement);
// controls.autoRotate = true;
// controls.autoRotateSpeed = 0.3;
controls.enableDamping = true;
controls.dampingFactor = 0.2;
controls.enablePan = false;
controls.enableZoom = false;
// controls.enableRotate = false;
controls.minPolarAngle = Math.PI / 2 - Math.PI / 8;
controls.maxPolarAngle = Math.PI / 2 + Math.PI / 8;
// controls.minAzimuthAngle = - Math.PI / 4;
// controls.maxAzimuthAngle = Math.PI / 4;

// Create a simple triangle geometry
const geometry = new THREE.BufferGeometry();
const vertices = new Float32Array([
  0, 0, 0, // center
  0, -0.4, 0, // tip
  -0.3, 0.1, 0, // left
  0, 0, 0, // center
  0.3, 0.1, 0, // right
  0, -0.4, 0,  // tip
]);
geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
// Add normals so the geometry reacts to light
const normals = new Float32Array([
  0, 0, -1,
  0, 0, -1,
  0, 0, -1,
  0, 0, -1,
  0, 0, -1,
  0, 0, -1,
]);
geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3));

const material = new THREE.MeshStandardNodeMaterial({
  side: THREE.DoubleSide,
  color: randomColour,
  wireframe: false,
  // roughness: 0.5,
  // metalness: 0.0
});
// material.colorNode = Fn(() => {
//   // vertical alpha gradient
//   return vec4(0, 0, 0, smoothstep(0, 0.5, uv().y.oneMinus()));
// })();

// Blue noise (Mitchell's best-candidate) for even triangle distribution
function blueNoise2D(count, xMin, xMax, yMin, yMax, candidates = 10) {
  const points = [];
  for (let i = 0; i < count; i++) {
    let best, bestDist = -1;
    for (let j = 0; j < candidates; j++) {
      const x = Math.random() * (xMax - xMin) + xMin;
      const y = Math.random() * (yMax - yMin) + yMin;
      let minDist = Infinity;
      for (let k = 0; k < points.length; k++) {
        const dx = x - points[k][0];
        const dy = y - points[k][1];
        const d = dx * dx + dy * dy;
        if (d < minDist) minDist = d;
      }
      if (minDist > bestDist) {
        bestDist = minDist;
        best = [x, y];
      }
    }
    points.push(best);
  }
  return points;
}

const PLANE_COUNT = 500;
// const FALL_SPEED_MIN = 0.02;
// const FALL_SPEED_MAX = 0.02;
const FALL_SPEED = 0.02;
const ROTATE_SPEED_MIN = 0.005;
const ROTATE_SPEED_MAX = 0.05;
const Y_MIN = -7;
const Y_MAX = 7;
const X_MIN = -4;
const X_MAX = 4;

// Generate blue noise points for x/y
const blueNoisePoints = blueNoise2D(PLANE_COUNT, X_MIN, X_MAX, Y_MIN, Y_MAX, 20);

// Arrays to store per-instance data
const positions = [];
const scales = [];
const rotations = [];
// const fallSpeeds = [];
const rotateSpeeds = [];

// Prepare per-instance data
for (let i = 0; i < PLANE_COUNT; i++) {
  const scaleX = mapLinear(Math.random(), 0, 1, 0.5, 0.6);
  const scaleY = mapLinear(Math.random(), 0, 1, 0.7, 0.8);
  const posX = blueNoisePoints[i][0];
  const posY = blueNoisePoints[i][1];
  const posZ = (Math.random() - 0.5) * 8;
  // const rotY = Math.random() * Math.PI;
  // const rotX = Math.random() * Math.PI;
  const rotY = 0;
  const rotX = 0;
  positions.push([posX, posY, posZ]);
  scales.push([scaleX, scaleY, 1]);
  // scales.push([1, 1, 1]);
  rotations.push([rotX, rotY, 0]);
  // fallSpeeds.push(Math.random() * (FALL_SPEED_MAX - FALL_SPEED_MIN) + FALL_SPEED_MIN);
  rotateSpeeds.push(Math.random() * (ROTATE_SPEED_MAX - ROTATE_SPEED_MIN) + ROTATE_SPEED_MIN);
}

// Create InstancedMesh
const instancedMesh = new THREE.InstancedMesh(geometry, material, PLANE_COUNT);
scene.add(instancedMesh);

//  --- Lights ---
const intensity = 60;
const pointLight = new THREE.PointLight(randomColour, intensity, 10, 0.3);
scene.add(pointLight);
// const sphereSize = 0.3;
// const pointLightHelper = new THREE.PointLightHelper( pointLight, sphereSize, 0xffffff );
// scene.add( pointLightHelper );

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

let lastTime = performance.now();
const dummy = new THREE.Object3D();
function animate() {
  const now = performance.now();
  let delta = (now - lastTime) / 1000; // seconds
  lastTime = now;
  // Cap delta to avoid clumping when tab is inactive
  if (delta > 0.07) delta = 0.07;

  for (let i = 0; i < PLANE_COUNT; i++) {
    // Update position and rotation
    positions[i][1] -= FALL_SPEED * delta * 60;
    // rotations[i][0] += rotateSpeeds[i] * (0.5 + Math.random()) * delta * 60; // x
    rotations[i][1] += rotateSpeeds[i] * (0.5 + Math.random()) * delta * 60; // y
    // rotations[i][2] += rotateSpeeds[i] * (0.5 + Math.random()) * delta * 60; // z
    if (positions[i][1] < Y_MIN) {
      positions[i][1] = Y_MAX;
      // Keep x and z the same, only reset y
    }
    // Set transform for this instance
    dummy.position.set(positions[i][0], positions[i][1], positions[i][2]);
    dummy.scale.set(scales[i][0], scales[i][1], scales[i][2]);
    dummy.rotation.set(rotations[i][0], rotations[i][1], rotations[i][2]);
    dummy.updateMatrix();
    instancedMesh.setMatrixAt(i, dummy.matrix);
  }
  instancedMesh.instanceMatrix.needsUpdate = true;
  controls.update();
  renderer.render(scene, camera);
}