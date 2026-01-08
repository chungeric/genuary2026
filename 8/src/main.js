import * as THREE from 'three';
// import * as THREE from 'three/webgpu'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
// import {
//   // Type constructors & conversions
//   float, int, vec2, vec3, vec4, color,
//   // Core nodes
//   uniform, texture, Fn, attribute, varying,
//   // Math operations
//   add, sub, mul, div, mix, clamp, sin, cos, normalize, dot, cross,
//   // Position & transformation
//   positionLocal, positionWorld, positionView,
//   normalLocal, normalWorld, normalView,
//   modelViewMatrix, modelWorldMatrix, cameraProjectionMatrix,
//   // UV & texture utilities
//   uv, screenUV, matcapUV,
//   // Material properties
//   materialColor, materialNormal, materialOpacity,
//   // Common utilities
//   time, abs, pow, saturate, step, smoothstep
// } from 'three/tsl';

const scene = new THREE.Scene();
scene.background = new THREE.Color('black');
const camera = new THREE.PerspectiveCamera( 45, window.innerWidth / window.innerHeight, 0.1, 1000 );
camera.position.z = 5;

// --- WebGL Renderer ---
const renderer = new THREE.WebGLRenderer();
renderer.setSize( window.innerWidth, window.innerHeight );
renderer.setAnimationLoop( animate );
document.body.appendChild( renderer.domElement );

// --- WebGPU Renderer  ---
// const renderer = new THREE.WebGPURenderer();
// renderer.setSize( window.innerWidth, window.innerHeight );
// renderer.setAnimationLoop( animate );
// document.body.appendChild( renderer.domElement );

const controls = new OrbitControls(camera, renderer.domElement);

const geometry = new THREE.PlaneGeometry( 1, 1, 8, 8 );

// --- WebGL Shader Material Example ---
const material = new THREE.ShaderMaterial({
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    varying vec2 vUv;
    uniform float time;
    void main() {
      gl_FragColor = vec4(vUv, 0.0, sin(time * 0.5) * 0.5 + 0.5);
    }
  `,
  uniforms: {
    time: { value: 0.0 }
  },
  side: THREE.DoubleSide,
  transparent: true,
  wireframe: true
});

//  --- WebGPU Node Material Example ---
// const material = new THREE.MeshBasicNodeMaterial({ color: 0x00ff00, side: THREE.DoubleSide, transparent: true });
// material.colorNode = Fn(() => {
//   return vec4(uv(), 0, sin(time.mul(2)).mul(0.5).add(0.5));
// })();

const cube = new THREE.Mesh( geometry, material );
scene.add( cube );

//  --- Lights ---
// const pointLight = new THREE.PointLight(0xffffff, 80);
// pointLight.position.set(2, 2, 2);
// scene.add(pointLight);
// const pointLight2 = new THREE.PointLight(0xffffff, 80);
// pointLight2.position.set(-2, -2, -2);
// scene.add(pointLight2);

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