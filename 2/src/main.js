// Inspiration: https://observablehq.com/@tarte0/animation-curves-with-three-js

import * as THREE from 'three/webgpu'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { vec3, instancedBufferAttribute, mul, mix, uniform } from 'three/tsl';
import { polkaDots } from 'tsl-textures';
import { RectAreaLightTexturesLib } from 'three/addons/lights/RectAreaLightTexturesLib.js';
import { recordCanvas } from './recordCanvas';
import gsap from 'gsap';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);
scene.fog = new THREE.Fog(0x000000, 50, 60);
const camera = new THREE.PerspectiveCamera( 10, window.innerWidth / window.innerHeight, 0.1, 1000 );
camera.position.x = 30;
camera.position.y = 5;
camera.position.z = 30;

// --- WebGPU Renderer  ---
const renderer = new THREE.WebGPURenderer({ antialias: true, alpha: false, powerPreference: "high-performance" });
renderer.setSize( window.innerWidth, window.innerHeight );
renderer.setAnimationLoop( animate );
document.body.appendChild( renderer.domElement );

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 0, 0);
controls.minAzimuthAngle = Math.PI / 6;
controls.maxAzimuthAngle = Math.PI / 6 + Math.PI / 6;
controls.minPolarAngle = 0;
controls.maxPolarAngle = Math.PI / 8 * 3.6;
controls.minDistance = 20;
controls.maxDistance = 50;
controls.enablePan = false;
controls.enableDamping = true;
controls.dampingFactor = 0.1;

const ballGeometry = new THREE.SphereGeometry( 0.5, 32, 32 );
const ballMaterial = new THREE.MeshStandardNodeMaterial({ side: THREE.DoubleSide, roughness: 0.35 });

const gridSize = 32;
const instanceCount = gridSize * gridSize;

// Generate colors for each instance
const dotColors = [];
const bgColors = [];
const timeOffsets = [];
let palettes = [
  // ["#606c38","#283618","#fefae0","#dda15e","#bc6c25"], //Olive Garden Feast
  // ["#191716","#e6af2e","#e0e2db"], //Mystic Golden Glow
  // ["#002642","#840032","#e59500","#e5dada","#02040f"], //Vintage Sunset
  // ["#d9ed92","#b5e48c","#99d98c","#76c893","#52b69a","#34a0a4","#168aad","#1a759f","#1e6091","#184e77"], //Meadow Green
  // ["#335c67","#fff3b0","#e09f3e","#9e2a2b","#540b0e"], //Dark Sunset
  ["#1c110a","#e4d6a7","#e9b44c","#9b2915","#50a2a7"], //Sunny Side Up
  // ["#132a13","#31572c","#4f772d","#90a955","#ecf39e"], //Leafy Green Garden
  // ["#ef476f","#ffd166","#06d6a0","#118ab2","#073b4c"], // Watermelon Sorbet
];
for (let i = 0; i < instanceCount; i++) {
  let palette = palettes[Math.floor(Math.random() * palettes.length)].slice();
  const dotColor = new THREE.Color(palette.splice(Math.floor(Math.random() * palette.length), 1)[0]);
  const bgColor = new THREE.Color(palette.splice(Math.floor(Math.random() * palette.length), 1)[0]);
  dotColors.push(dotColor.r, dotColor.g, dotColor.b);
  bgColors.push(bgColor.r, bgColor.g, bgColor.b);
  timeOffsets.push(i);
}

// Create instance color attributes
const timeOffsetAttribute = new THREE.InstancedBufferAttribute(new Float32Array(timeOffsets), 1);
const dotColorAttribute = new THREE.InstancedBufferAttribute(new Float32Array(dotColors), 3);
const bgColorAttribute = new THREE.InstancedBufferAttribute(new Float32Array(bgColors), 3);

// Set instance attributes on the geometry
ballGeometry.setAttribute('instanceTimeOffset', timeOffsetAttribute);
ballGeometry.setAttribute('instanceDotColor', dotColorAttribute);
ballGeometry.setAttribute('instanceBgColor', bgColorAttribute);

const instancedMesh = new THREE.InstancedMesh( ballGeometry, ballMaterial, instanceCount );
scene.add(instancedMesh);

// Generate positions
const spacing = 1.05;
const positions = [];
for (let x = 0; x < gridSize; x++) {
  for (let z = 0; z < gridSize; z++) {
    positions.push([(x - gridSize / 2) * spacing, 0, (z - gridSize / 2) * spacing]);
  }
}

// Use instance colors in the material
const instanceTimeOffset = instancedBufferAttribute(timeOffsetAttribute);
const instanceDotColor = instancedBufferAttribute(dotColorAttribute);
const instanceBgColor = instancedBufferAttribute(bgColorAttribute);

// Create polkaDots pattern and mix with instance colors
const polkaPattern = polkaDots({
  count: 2,
  size: 0.56,
  blur: 0.25,
  color: vec3(1, 1, 1), // White pattern mask
  background: vec3(0, 0, 0), // Black pattern mask
  flat: 0
});

// Mix instance colors based on pattern
const ballColor = mix(instanceBgColor, instanceDotColor, polkaPattern.r);

// const ballBrightness = remap(instanceTimeOffset, 0, instanceCount, 0.7, 1);
const ballBrightness = 1;

ballMaterial.colorNode = mul(ballColor, ballBrightness);

// ballMaterial.positionNode = positionWorld.add(positionView.x.mul(0.01));

//  --- Lights ---
const ambientLight = new THREE.AmbientLight("#ccc", 0.5);
scene.add(ambientLight);

THREE.RectAreaLightNode.setLTC( RectAreaLightTexturesLib.init() ); //  only relevant for WebGPURenderer
const intensity = 3; const width = 12; const height = 12;
const rectLight = new THREE.RectAreaLight( "#fff5cb", intensity, width, height );
rectLight.position.set( 0, 7, 0 );
rectLight.lookAt( 0, 0, 0 );
scene.add( rectLight )

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Track Y positions, scales, rotations, and active animations
const yPositions = new Array(instanceCount).fill(0);
const scaleY = new Array(instanceCount).fill(1);
const rotY = new Array(instanceCount).fill(0);
const animatingIndices = new Set();
const peakY = 2;

// Frustum for viewport checking
const frustum = new THREE.Frustum();
const projScreenMatrix = new THREE.Matrix4();

function getVisibleIndices() {
  projScreenMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
  frustum.setFromProjectionMatrix(projScreenMatrix);

  const visible = [];
  for (let i = 0; i < instanceCount; i++) {
    const pos = positions[i];
    if (frustum.containsPoint(new THREE.Vector3(pos[0], 0, pos[2]))) {
      visible.push(i);
    }
  }
  return visible;
}

// Pick a random visible grid item every 200ms
setInterval(() => {
  // Only run if the tab/window is active
  if (document.visibilityState !== 'visible') return;

  const visibleIndices = getVisibleIndices();
  if (visibleIndices.length === 0) return;

  const randomIndex = visibleIndices[Math.floor(Math.random() * visibleIndices.length)];
  if (!animatingIndices.has(randomIndex)) {
    animatingIndices.add(randomIndex);

    // Timeline for coordinated Y and scale animation
    const tl = gsap.timeline({
      onComplete: () => animatingIndices.delete(randomIndex)
    });

    // Squeeze
    tl.to(scaleY, { [randomIndex]: 0.5, duration: 0.5 }, 0);
    tl.to(rotY, { [randomIndex]: -Math.PI / 2, duration: 0.5 }, 0);

    // Pop
    tl.to(yPositions, { [randomIndex]: peakY, duration: 0.5, ease: "power2.out" }, 0.5);
    tl.to(scaleY, { [randomIndex]: 1.3, duration: 0.2, ease: "power2.out" }, 0.5);
    tl.to(rotY, { [randomIndex]: Math.PI / 2, duration: 0.7, ease: "power2.out" }, 0.5);
    tl.to(scaleY, { [randomIndex]: 1, duration: 0.2 }, 0.7);

    // Rotation (tweak these values)

    // Fall
    tl.to(yPositions, { [randomIndex]: 0, duration: 0.7, ease: "bounce.out" });
  }
}, 200);

// Initialize all instances at their starting positions
const dummy = new THREE.Object3D();
for (let i = 0; i < instanceCount; i++) {
  const pos = positions[i];
  dummy.position.set(pos[0], 0, pos[2]);
  dummy.rotation.y = 0;
  dummy.updateMatrix();
  instancedMesh.setMatrixAt(i, dummy.matrix);
}
instancedMesh.instanceMatrix.needsUpdate = true;

function animate() {
  // Update all instance matrices based on current yPositions, scaleY, and rotY
  for (let i = 0; i < instanceCount; i++) {
    const originalPos = positions[i];
    dummy.position.set(originalPos[0], yPositions[i], originalPos[2]);
    dummy.rotation.y = rotY[i];
    dummy.scale.set(1, scaleY[i], 1);
    dummy.updateMatrix();
    instancedMesh.setMatrixAt(i, dummy.matrix);
  }
  instancedMesh.instanceMatrix.needsUpdate = true;

  controls.update();
  renderer.render( scene, camera );
}


window.addEventListener('keydown', (event) => {
  if (event.key === 'r') {
    recordCanvas(renderer.domElement, 5000);
  }
});











// Generate two random colors with high contrast for polka dots and background
// function randomColor() {
//   return new THREE.Color('hsl(' + Math.random() * 360 + ', 80%, 50%)');
// }
// function luminance(color) {
//   // sRGB luminance
//   return 0.2126 * color.r + 0.7152 * color.g + 0.0722 * color.b;
// }
// function highContrastColor(baseColor) {
//   // If base is bright, return a dark color, else return a bright color
//   const baseLum = luminance(baseColor);
//   let c;
//   if (baseLum > 0.5) {
//     // Generate dark color
//     do {
//       c = randomColor();
//     } while (luminance(c) > 0.4);
//   } else {
//     // Generate bright color
//     do {
//       c = randomColor();
//     } while (luminance(c) < 0.6);
//   }
//   return c;
// }