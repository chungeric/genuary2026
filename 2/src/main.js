// Inspiration: https://observablehq.com/@tarte0/animation-curves-with-three-js

import * as THREE from 'three/webgpu'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { clamp, Fn, oneMinus, positionLocal, positionWorld, smoothstep, texture, uv, vec3, vec4 } from 'three/tsl';
import { float, vec2, dot, sin, fract, div, floor, mod, cos, sub, mul, mix, int, Break, If, Loop } from 'three/tsl';
import { circles, grid, polkaDots, roughClay, zebraLines } from 'tsl-textures';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);
// scene.fog = new THREE.Fog(0x000000, 20, 60);
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

const ballGeometry = new THREE.SphereGeometry( 0.5, 32, 32 );

const floorThickness = 20;
const floorGeometry = new THREE.BoxGeometry( 1, floorThickness, 1 );

const gridItems = [];
const GRID_SIZE = 3;
const GRID_SPACING = 1.8;

function createGrid() {
  const gridOffset = (GRID_SIZE - 1) / 2;
  for (let i = 0; i < GRID_SIZE; i++) {
    for (let j = 0; j < GRID_SIZE; j++) {

      const gridItem = new THREE.Group();

      const ballGroup = new THREE.Group();
      const ballMaterial = new THREE.MeshStandardNodeMaterial({ side: THREE.DoubleSide, roughness: 1 });
      const dotColor = randomColor();
      const bgColor = highContrastColor(dotColor);
      ballMaterial.colorNode = polkaDots ( {
        count: 2,
        size: 0.56,
        blur: 0.25,
        color: dotColor,
        background: bgColor,
        flat: 0
      } );
      const ball = new THREE.Mesh( ballGeometry, ballMaterial );
      ball.castShadow = true;
      ball.position.x = (i - gridOffset) * GRID_SPACING;
      ball.position.y = 0.5;
      ball.position.z = (j - gridOffset) * GRID_SPACING;
      ball.userData.rotationAxis = ['x', 'z'][Math.floor(Math.random() * 2)];
      ball.userData.onSurface = false;
      ballGroup.add( ball );
      ballGroup.userData.timeScale = 2;
      ballGroup.userData.jumpHeight = 2;
      ballGroup.userData.squishTo = 0.5;
      ballGroup.userData.timeOffset = Math.random() * 1000;
      gridItem.add( ballGroup );

      const floorGroup = new THREE.Group();
      const floorColor = randomColor();
      const outlineColor = new THREE.Color(0x000000); // Black outline
      const outlineWidth = 0.12;
      const floorMaterial = new THREE.MeshStandardNodeMaterial({
        color: floorColor,
        emissive: floorColor,
        emissiveIntensity: 0,
        transparent: true,
        side: THREE.DoubleSide,
      });
      // Add a TSL outline effect using colorNode
      floorMaterial.colorNode = Fn(() => {
        return vec4(floorColor, 1);
      })();
      
      const floor = new THREE.Mesh(floorGeometry, floorMaterial);
      floor.receiveShadow = true;
      // floor.rotation.x = - Math.PI / 2;
      floor.position.x = (i - gridOffset) * GRID_SPACING;
      floor.position.z = (j - gridOffset) * GRID_SPACING;
      floor.position.y = - floorThickness / 2;
      floorGroup.add( floor );

      // Add a PointLight just above the floor tile to illuminate the ball
      const floorLight = new THREE.PointLight(floorColor);
      floorLight.position.set(floorGroup.position.x, floorGroup.position.y, floorGroup.position.z);
      floorGroup.add(floorLight);

      gridItem.add( floorGroup );

      gridItems.push( gridItem );

      scene.add( gridItem );
    }
  }
}

createGrid();

//  --- Lights ---
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(5, 10, 7.5);
directionalLight.castShadow = true;
scene.add(directionalLight);

// const pointLight = new THREE.PointLight(0xffffff, 100);
// pointLight.position.set(2, 10, 2);
// pointLight.castShadow = true;
// scene.add(pointLight);
// const pointLight2 = new THREE.PointLight(0xffffff, 80);
// pointLight2.position.set(-2, -2, -2);
// scene.add(pointLight2);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

const clock = new THREE.Clock();
function animate() {
  const delta = clock.getDelta();
  gridItems.forEach((gridItem) => {
    const ballGroup = gridItem.children[0];
    const ball = ballGroup.children[0];
    const floorGroup = gridItem.children[1];
    const floor = floorGroup.children[0];
    const impactLight = gridItem.children[1].children[1];
    const jumpHeight = ballGroup.userData.jumpHeight;
    const squishTo = ballGroup.userData.squishTo;
    const timeScale = ballGroup.userData.timeScale;
    const timeOffset = ballGroup.userData.timeOffset;
    const t = Math.abs(Math.sin((clock.getElapsedTime() + timeOffset) * timeScale)) * jumpHeight;
    ballGroup.position.y = t;
    if (t < 0.5) {
      if (!ball.userData.onSurface) {
        ball.userData.rotationAxis = ball.userData.rotationAxis === 'x' ? 'z' : 'x';
      }
      ballGroup.scale.y = THREE.MathUtils.mapLinear(t, 0.5, 0, 1, squishTo);
      floorGroup.position.y = THREE.MathUtils.mapLinear(t, 0.5, 0, 0.5, 0);
      ball.userData.onSurface = true;

      impactLight.intensity = THREE.MathUtils.mapLinear(t, 0.5, 0, 0, 20);
      floor.material.emissiveIntensity = THREE.MathUtils.mapLinear(t, 0.5, 0, 0, 1);
      // ball.material.emissiveIntensity = THREE.MathUtils.mapLinear(t, 0.5, 0, 0, 0.4);

    } else {
      ball.rotation[ball.userData.rotationAxis] += delta * 8;
      ballGroup.scale.y = 1;
      floorGroup.position.y = 0.5;
      ball.userData.onSurface = false;

      impactLight.intensity = 0;
      floor.material.emissiveIntensity = 0;
      // ball.material.emissiveIntensity = 0;
    }
  });

  controls.update();
  renderer.render( scene, camera );
}

// Generate two random colors with high contrast for polka dots and background
function randomColor() {
  return new THREE.Color(Math.random(), Math.random(), Math.random());
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