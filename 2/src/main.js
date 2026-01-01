// Inspiration: https://observablehq.com/@tarte0/animation-curves-with-three-js

import * as THREE from 'three/webgpu'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { clamp, Fn, oneMinus, positionLocal, positionWorld, smoothstep, texture, uv, vec3, vec4, instancedBufferAttribute, remap, positionView } from 'three/tsl';
import { float, vec2, dot, sin, fract, div, floor, mod, cos, sub, mul, mix, int, Break, If, Loop, uniform } from 'three/tsl';
import { circles, grid, polkaDots, roughClay, zebraLines } from 'tsl-textures';
import { RectAreaLightTexturesLib } from 'three/addons/lights/RectAreaLightTexturesLib.js';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);
scene.fog = new THREE.Fog(0x000000, 20, 40);
const camera = new THREE.PerspectiveCamera( 20, window.innerWidth / window.innerHeight, 0.1, 1000 );
camera.position.x = 15;
camera.position.y = 20;
camera.position.z = 15;

// --- WebGPU Renderer  ---
const renderer = new THREE.WebGPURenderer();
renderer.setSize( window.innerWidth, window.innerHeight );
renderer.setAnimationLoop( animate );
document.body.appendChild( renderer.domElement );

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 0, 0);

const timeUniform = uniform(0.0);

const ballGeometry = new THREE.SphereGeometry( 0.5, 32, 32 );
const ballMaterial = new THREE.MeshStandardNodeMaterial({ side: THREE.DoubleSide });

const positions = [];
const gridSize = 30;
const instanceCount = gridSize * gridSize;

// Generate colors for each instance
const dotColors = [];
const bgColors = [];
const timeOffsets = [];
for (let i = 0; i < instanceCount; i++) {
  const dotColor = randomColor();
  const bgColor = highContrastColor(dotColor);
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
const spacing = 1.3;
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
const ambientLight = new THREE.AmbientLight(0xffffff, 1);
scene.add(ambientLight);

THREE.RectAreaLightNode.setLTC( RectAreaLightTexturesLib.init() ); //  only relevant for WebGPURenderer
const intensity = 6; const width = 7; const height = 7;
const rectLight = new THREE.RectAreaLight( 0xffffff, intensity, width, height );
rectLight.position.set( 0, 4, 0 );
rectLight.lookAt( 0, 0, 0 );
scene.add( rectLight )

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

const clock = new THREE.Clock();
function animate() {
  timeUniform.value = clock.getElapsedTime();

  for (let i = 0; i < positions.length; i++) {
    const position = positions[i];
    instancedMesh.setMatrixAt(i, new THREE.Matrix4().makeTranslation(position[0], position[1], position[2]));
  }
  instancedMesh.instanceMatrix.needsUpdate = true;

  controls.update();
  renderer.render( scene, camera );
}













// Generate two random colors with high contrast for polka dots and background
function randomColor() {
  return new THREE.Color('hsl(' + Math.random() * 360 + ', 80%, 50%)');
}
function luminance(color) {
  // sRGB luminance
  return 0.2126 * color.r + 0.7152 * color.g + 0.0722 * color.b;
}
function highContrastColor(baseColor) {
  // If base is bright, return a dark color, else return a bright color
  const baseLum = luminance(baseColor);
  let c;
  if (baseLum > 0.5) {
    // Generate dark color
    do {
      c = randomColor();
    } while (luminance(c) > 0.4);
  } else {
    // Generate bright color
    do {
      c = randomColor();
    } while (luminance(c) < 0.6);
  }
  return c;
}