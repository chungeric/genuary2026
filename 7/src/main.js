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
import { SUBTRACTION, INTERSECTION, ADDITION, Brush, Evaluator } from 'three-bvh-csg';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera( 20, window.innerWidth / window.innerHeight, 0.1, 1000 );
// camera.position.x = 5;
// camera.position.y = 5;
camera.position.z = 15;

const renderer = new THREE.WebGPURenderer();
// renderer.toneMapping = THREE.ACESFilmicToneMapping;
// renderer.toneMappingExposure = 1;
renderer.setPixelRatio( window.devicePixelRatio );
// renderer.shadowMap.enabled = true;
// renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.setSize( window.innerWidth, window.innerHeight );
renderer.setAnimationLoop( animate );
document.body.appendChild( renderer.domElement );

const controls = new OrbitControls(camera, renderer.domElement);

// create brushes
const evaluator = new Evaluator();

const baseBrush = new Brush(
  new THREE.SphereGeometry( 2, 64, 64 ),
  new THREE.MeshStandardMaterial( {
    color: 'white',
    polygonOffset: true,
    polygonOffsetUnits: 1,
    polygonOffsetFactor: 1,
  } ),
);

// const brush = new Brush(
//   new THREE.SphereGeometry( 1, 60, 60 ),
//   new THREE.MeshStandardMaterial( {
//     color: color2,
//     polygonOffset: true,
//     polygonOffsetUnits: 1,
//     polygonOffsetFactor: 1,
//   } ),
// );
// brush.position.set( 0, 0, 2.5 );
// brush.updateMatrixWorld();

const craters = 20;
const brushes = [];
const brushColor = new THREE.Color(`hsl(${Math.random() * 360}, 50%, 50%)`);

for ( let i = 0; i < craters; i ++ ) {
  const brush = new Brush(
    new THREE.SphereGeometry( 1, 16, 16 ),
    new THREE.MeshStandardMaterial( {
      color: brushColor,
      polygonOffset: true,
      polygonOffsetUnits: 1,
      polygonOffsetFactor: 1,
    } ),
  );

  // place brush at a random position on base sphere
  const phi = Math.acos( ( Math.random() * 2 ) - 1 );
  const theta = Math.random() * Math.PI * 2;
  const radius = 2; // baseBrush radius
  brush.position.setFromSphericalCoords( radius, phi, theta );
  // brush.lookAt( 0, 0, 0 );
  brush.updateMatrixWorld();
  brushes.push( brush );
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

function updateCSG() {

  let finalBrush = brushes[ 0 ];
	evaluator.useGroups = true;
	for ( let i = 1, l = brushes.length; i < l; i ++) {

		const b = brushes[ i ];
		finalBrush = evaluator.evaluate( finalBrush, b, ADDITION );
	}

	const result = evaluator.evaluate( baseBrush, finalBrush, SUBTRACTION );

  // result.castShadow = true;
  // result.receiveShadow = true;
  scene.add( result );

}
updateCSG();

function animate() {
  // update the csg
	// updateCSG();

  controls.update();
  renderer.render( scene, camera );
}