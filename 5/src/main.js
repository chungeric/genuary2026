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
  time, abs, pow, saturate, step, smoothstep,
  rotate,
  PI,
  range,
  floor,
  instanceIndex,
  hash
} from 'three/tsl';


// Create a drawing canvas
const drawingCanvas = document.createElement('canvas');
drawingCanvas.width = 512;
drawingCanvas.height = 512;
drawingCanvas.style.position = 'fixed';
drawingCanvas.style.top = '0';
drawingCanvas.style.left = '0';
drawingCanvas.style.zIndex = '10';
drawingCanvas.style.border = '1px solid black';
const drawingCanvasContext = drawingCanvas.getContext('2d');
drawingCanvasContext.fillStyle = 'white';
drawingCanvasContext.fillRect(0, 0, drawingCanvas.width, drawingCanvas.height);

// Draw 3x3 grid
const spriteBorderWidth = 8;
drawingCanvasContext.strokeStyle = 'black';

// Vertical lines
drawingCanvasContext.lineWidth = spriteBorderWidth;
drawingCanvasContext.beginPath();
drawingCanvasContext.moveTo(0, 0);
drawingCanvasContext.lineTo(0, drawingCanvas.height);
drawingCanvasContext.stroke();

drawingCanvasContext.beginPath();
drawingCanvasContext.moveTo(drawingCanvas.width / 3, 0);
drawingCanvasContext.lineTo(drawingCanvas.width / 3, drawingCanvas.height);
drawingCanvasContext.stroke();

drawingCanvasContext.beginPath();
drawingCanvasContext.moveTo((drawingCanvas.width * 2) / 3, 0);
drawingCanvasContext.lineTo((drawingCanvas.width * 2) / 3, drawingCanvas.height);
drawingCanvasContext.stroke();

drawingCanvasContext.beginPath();
drawingCanvasContext.moveTo((drawingCanvas.width * 3) / 3, 0);
drawingCanvasContext.lineTo((drawingCanvas.width * 3) / 3, drawingCanvas.height);
drawingCanvasContext.stroke();

// Horizontal lines
drawingCanvasContext.beginPath();
drawingCanvasContext.moveTo(0, 0);
drawingCanvasContext.lineTo(drawingCanvas.width, 0);
drawingCanvasContext.stroke();

drawingCanvasContext.beginPath();
drawingCanvasContext.moveTo(0, drawingCanvas.height / 3);
drawingCanvasContext.lineTo(drawingCanvas.width, drawingCanvas.height / 3);
drawingCanvasContext.stroke();

drawingCanvasContext.beginPath();
drawingCanvasContext.moveTo(0, (drawingCanvas.height * 2) / 3);
drawingCanvasContext.lineTo(drawingCanvas.width, (drawingCanvas.height * 2) / 3);
drawingCanvasContext.stroke();

drawingCanvasContext.beginPath();
drawingCanvasContext.moveTo(0, (drawingCanvas.height * 3) / 3);
drawingCanvasContext.lineTo(drawingCanvas.width, (drawingCanvas.height * 3) / 3);
drawingCanvasContext.stroke();


drawingCanvasContext.beginPath();

document.body.appendChild(drawingCanvas);

let isDrawing = false;

// Helper function to get coordinates from mouse or touch event
function getCoordinates(e) {
  const rect = drawingCanvas.getBoundingClientRect();
  if (e.touches && e.touches.length > 0) {
    return {
      x: e.touches[0].clientX - rect.left,
      y: e.touches[0].clientY - rect.top
    };
  } else {
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  }
}

// Helper function to draw
function draw(e) {
  if (!isDrawing) return;
  const { x, y } = getCoordinates(e);
  drawingCanvasContext.lineWidth = 20;
  drawingCanvasContext.lineCap = 'round';
  drawingCanvasContext.strokeStyle = 'black';
  drawingCanvasContext.lineTo(x, y);
  drawingCanvasContext.stroke();
  drawingCanvasContext.beginPath();
  drawingCanvasContext.moveTo(x, y);
}

// Start drawing
function startDrawing(e) {
  if (e.type === 'touchstart') e.preventDefault();
  isDrawing = true;
}

// Stop drawing
function stopDrawing(e) {
  if (e.type.startsWith('touch')) e.preventDefault();
  isDrawing = false;
  drawingCanvasContext.beginPath();
}

// Unified event listeners
drawingCanvas.addEventListener('mousedown', startDrawing);
drawingCanvas.addEventListener('touchstart', startDrawing);

drawingCanvas.addEventListener('mouseup', stopDrawing);
drawingCanvas.addEventListener('touchend', stopDrawing);

drawingCanvas.addEventListener('mousemove', draw);
drawingCanvas.addEventListener('touchmove', (e) => {
  e.preventDefault();
  draw(e);
});


// Create 3d scene
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera( 60, window.innerWidth / window.innerHeight, 0.1, 1000 );
camera.position.z = 10;

const renderer = new THREE.WebGPURenderer();
renderer.setSize( window.innerWidth, window.innerHeight );
renderer.setAnimationLoop( animate );
document.body.appendChild( renderer.domElement );

const controls = new OrbitControls(camera, renderer.domElement);

const geometry = new THREE.PlaneGeometry( 3.2, 3.2, 256, 256 );

//  --- WebGPU Node Material Example ---
const debugMaterial = new THREE.MeshBasicNodeMaterial({ wireframe: false, side: THREE.DoubleSide });
const canvasTexture = new THREE.CanvasTexture( drawingCanvas );
debugMaterial.colorNode = Fn(() => {
  return texture(canvasTexture, uv());
})();

const debugPlane = new THREE.Mesh( geometry, debugMaterial );
// scene.add( debugPlane );

const count = 200;
const spriteMaterial = new THREE.MeshBasicNodeMaterial({  wireframe: false, side: THREE.DoubleSide });

spriteMaterial.colorNode = Fn(() => {
  const randomSampleX = floor(range(0, 3));
  const randomSampleY = floor(range(0, 3));
  return texture(canvasTexture, uv().div(3).add(vec2(randomSampleX.div(3), randomSampleY.div(3))));
})();

const posRange = 4;
spriteMaterial.positionNode = Fn(() => {
  const randomX = range(-posRange, posRange);
  const randomY = range(-posRange, posRange);
  const randomZ = range(-posRange, posRange);

  const randomRotation = vec3(
    range(0, PI.mul(2)),
    range(0, PI.mul(2)),
    range(0, PI.mul(2))
  );
  
  // Start with the local vertex position, then offset by instance position
  const pos = positionLocal.add(vec3(randomX, randomY, randomZ.add(0.1)));

  // Apply rotation
  return rotate(
    pos,
    randomRotation
  );
})();

const points = new THREE.Sprite( spriteMaterial );
points.count = count;
scene.add( points );

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

function animate() {
  controls.update();
  
  canvasTexture.needsUpdate = true;

  renderer.render( scene, camera );
}