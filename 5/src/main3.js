import * as THREE from 'three/webgpu'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import helvetiker_regular from 'three/examples/fonts/helvetiker_regular.typeface.json';
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
  PI
} from 'three/tsl';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera( 60, window.innerWidth / window.innerHeight, 0.1, 1000 );
camera.position.z = 20;
camera.position.y = 20;

const renderer = new THREE.WebGPURenderer();
renderer.setSize( window.innerWidth, window.innerHeight );
renderer.setAnimationLoop( animate );
document.body.appendChild( renderer.domElement );

const controls = new OrbitControls(camera, renderer.domElement);

const loader = new FontLoader();
const font = loader.parse(helvetiker_regular);
const geometry = new TextGeometry( 'genuary', {
	font: font,
	size: 4,
	depth: 5,
	curveSegments: 12,
  bevelEnabled: true,
  bevelThickness: 1,
  bevelSize: 0.5,
  bevelOffset: 0,
  bevelSegments: 5
} );
geometry.computeBoundingBox();

const centerOffset = - 0.5 * ( geometry.boundingBox.max.x - geometry.boundingBox.min.x );

// const geometry = new THREE.PlaneGeometry( 3.2, 3.2, 8, 8 );

//  --- WebGPU Node Material Example ---
const material = new THREE.MeshNormalNodeMaterial({ color: 0x00ff00, side: THREE.DoubleSide });
// material.colorNode = Fn(() => {
//   return vec4(uv(), 0, 1);
// })();
material.positionNode = rotate(
  positionLocal,
  vec3(PI.div(2), 0, 0),
)

const mesh = new THREE.Mesh( geometry, material );

mesh.position.x = centerOffset;


scene.add( mesh );

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
  controls.update();
  renderer.render( scene, camera );
}
