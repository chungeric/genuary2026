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
const camera = new THREE.PerspectiveCamera( 20, window.innerWidth / window.innerHeight, 0.1, 1000 );
camera.position.x = 5;
camera.position.y = 5;
camera.position.z = 5;


const renderer = new THREE.WebGPURenderer();
// renderer.toneMapping = THREE.ACESFilmicToneMapping;
// renderer.toneMappingExposure = 2.0;
renderer.setSize( window.innerWidth, window.innerHeight );
renderer.setAnimationLoop( animate );
document.body.appendChild( renderer.domElement );

const controls = new OrbitControls(camera, renderer.domElement);

const geometry = new THREE.BoxGeometry( 1, 1, 1 );
const material = new THREE.MeshStandardNodeMaterial({ color: "#fcbf49", side: THREE.DoubleSide });

const cube1 = new THREE.Mesh( geometry, material );
scene.add( cube1 );
const cube2 = new THREE.Mesh( geometry, material );
cube2.position.x = 0.75;
cube2.scale.set(0.5, 0.5, 0.5);
scene.add( cube2 );

const gradientSkySphere = new THREE.SphereGeometry( 500, 32, 15 );
const skyMaterial = new THREE.MeshBasicNodeMaterial({ side: THREE.BackSide });
const topColor = color("#d62828");
const bottomColor = color('#003049');
const v = sub( normalWorld.y, float(0.5) );
const skyColor = mix( bottomColor, topColor, v );
skyMaterial.colorNode = skyColor;
const sky = new THREE.Mesh( gradientSkySphere, skyMaterial );
// sky.scale.set( -1, 1, 1 );
scene.add( sky );

//  --- Lights ---
const ambientLight = new THREE.AmbientLight( 0xcccccc, 2 );
scene.add( ambientLight );

const directionalLight = new THREE.DirectionalLight( 0xffffff, 3 );
directionalLight.position.set( 5, 10, 7.5 );
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