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
  hash,
  oneMinus,
  PI2
} from 'three/tsl';
import { recordCanvas } from './recordCanvas.js';

// Create a drawing canvas
const drawingCanvas = document.createElement('canvas');
drawingCanvas.width = 512;
drawingCanvas.height = 512;
// drawingCanvas.style.boxShadow = '0 0 20px rgba(0,0,0,0.5)';
// drawingCanvas.style.filter = 'invert(1)';
const drawingCanvasContext = drawingCanvas.getContext('2d');
drawingCanvasContext.fillStyle = 'white';
drawingCanvasContext.fillRect(0, 0, drawingCanvas.width, drawingCanvas.height);

// Draw 3x3 grid
const spriteBorderWidth = 16;
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

const drawingCanvasContainer = document.createElement('div');
drawingCanvasContainer.style.position = 'fixed';
drawingCanvasContainer.style.top = '0';
drawingCanvasContainer.style.left = '0';
drawingCanvasContainer.style.width = '100%';
drawingCanvasContainer.style.height = '100%';
drawingCanvasContainer.style.zIndex = '10';
drawingCanvasContainer.style.display = 'none';
drawingCanvasContainer.style.justifyContent = 'center';
drawingCanvasContainer.style.alignItems = 'center';
drawingCanvasContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.4)';
drawingCanvasContainer.style.backdropFilter = 'blur(2px)';

drawingCanvasContainer.appendChild(drawingCanvas);
document.body.appendChild(drawingCanvasContainer);

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
  drawingCanvasContext.lineWidth = 16;
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
scene.background = new THREE.Color(0x000000);
const camera = new THREE.PerspectiveCamera( 60, window.innerWidth / window.innerHeight, 0.1, 1000 );
camera.position.z = 5;

const renderer = new THREE.WebGPURenderer();
renderer.setSize( window.innerWidth, window.innerHeight );
renderer.setAnimationLoop( animate );
document.body.appendChild( renderer.domElement );

const controls = new OrbitControls(camera, renderer.domElement);
controls.autoRotate = true;
controls.autoRotateSpeed = 2;

const geometry = new THREE.PlaneGeometry( 3.2, 3.2, 256, 256 );

//  --- WebGPU Node Material Example ---
const debugMaterial = new THREE.MeshBasicNodeMaterial({ wireframe: false, side: THREE.DoubleSide });
const canvasTexture = new THREE.CanvasTexture( drawingCanvas );
debugMaterial.colorNode = Fn(() => {
  return texture(canvasTexture, uv());
})();

const debugPlane = new THREE.Mesh( geometry, debugMaterial );
// scene.add( debugPlane );

const count = 50;
const spriteMaterial = new THREE.MeshBasicNodeMaterial({  wireframe: false, side: THREE.DoubleSide  });
// spriteMaterial.depthWrite = false;

const randomSampleX = floor(range(0, 3));
const randomSampleY = floor(range(0, 3));
const drawingCanvasSample = texture(canvasTexture, uv().div(3).add(vec2(randomSampleX.div(3), randomSampleY.div(3))));


spriteMaterial.colorNode = Fn(() => {
  const randomColor = vec3(range(0, 1), range(0, 1), range(0, 1));
  return oneMinus(vec3(drawingCanvasSample.r)).mul(randomColor);
})();

const randomRotation = vec3(
  hash(float(instanceIndex)).mul(PI2),
  hash(float(instanceIndex).add(100)).mul(PI2),
  hash(float(instanceIndex).add(200)).mul(PI2)
);

const posRange = 2.5;
const randomPosition = vec3(
  range(-posRange, posRange),
  range(-posRange, posRange),
  range(-posRange, posRange)
);

spriteMaterial.positionNode = Fn(() => {
  // Start with the local vertex position, then offset by instance position
  const pos = positionLocal.add(randomPosition);

  // Apply rotation
  return rotate(
    pos,
    randomRotation
  );
})();

// spriteMaterial.normalNode = Fn(() => {
//   return normalize(rotate(normalLocal, randomRotation));
// })();

// spriteMaterial.opacityNode = oneMinus(drawingCanvasSample.r);

// spriteMaterial.alphaTestNode = drawingCanvasSample;
// spriteMaterial.alphaToCoverage = true;

const planeGeometry = new THREE.PlaneGeometry(0.5, 0.5, 1, 1);

// const points = new THREE.Sprite( spriteMaterial );
const points = new THREE.Mesh( planeGeometry, spriteMaterial );
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

// window.addEventListener('keydown', (e) => {
//   if (e.key === '1') {
//     recordCanvas(drawingCanvas, 30000);
//   }
//   if (e.key === '2') {
//     console.log('recording 3d canvas');
//     recordCanvas(renderer.domElement, 50000);
//   }
// });

const button = document.createElement('button');
button.style.position = 'fixed';
button.style.top = '20px';
button.style.left = '20px';
button.style.zIndex = '20';
button.style.fontSize = '20px';
button.style.appearance = 'none';
button.style.padding = '10px 20px';
button.style.backgroundColor = 'blue';
button.style.color = 'white';
button.style.border = 'none';
button.style.borderRadius = '8px';
button.style.cursor = 'pointer';

button.textContent = 'Draw';
button.onclick = () => {
  if (drawingCanvasContainer.style.display === 'none') {
    drawingCanvasContainer.style.display = 'flex';
    button.textContent = 'Close';
  } else {
    drawingCanvasContainer.style.display = 'none';
    button.textContent = 'Draw';
  }
};
document.body.appendChild(button);