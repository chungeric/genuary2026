import * as THREE from 'three';
// import * as THREE from 'three/webgpu'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
// import { Fn, sin, uniform, uv, vec4, clamp } from 'three/tsl'
import { createNoise2D } from 'simplex-noise';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPixelatedPass } from 'three/addons/postprocessing/RenderPixelatedPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const noise2D = createNoise2D();

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x87ceeb, 130, 140);
const camera = new THREE.PerspectiveCamera( 45, window.innerWidth / window.innerHeight, 0.1, 1000 );
const cameraHeight = 15;
camera.position.z = 0;
camera.position.y = cameraHeight;

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

const composer = new EffectComposer( renderer );
const renderPixelatedPass = new RenderPixelatedPass( 6, scene, camera );
composer.addPass( renderPixelatedPass );

const outputPass = new OutputPass();
composer.addPass( outputPass );

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(2, cameraHeight, -2);

const skySphereGeometry = new THREE.SphereGeometry( 500, 32, 32 );
const skySphereMaterial = new THREE.MeshBasicMaterial( { color: new THREE.Color(0x87ceeb), side: THREE.BackSide } );
const skySphere = new THREE.Mesh( skySphereGeometry, skySphereMaterial );
scene.add( skySphere );

const boxGeometry = new THREE.BoxGeometry( 1, 1, 1 );
const normalMaterial = new THREE.MeshNormalMaterial({ side: THREE.DoubleSide });
const greenMaterial = new THREE.MeshStandardMaterial({ color: new THREE.Color('green'), side: THREE.DoubleSide });
const whiteMaterial = new THREE.MeshBasicMaterial({ color: new THREE.Color('white'), side: THREE.DoubleSide, transparent: true, opacity: 0.4 });

// --- WebGL Shader Material Example ---
// const material = new THREE.ShaderMaterial({
//   vertexShader: `
//     varying vec2 vUv;
//     void main() {
//       vUv = uv;
//       gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
//     }
//   `,
//   fragmentShader: `
//     varying vec2 vUv;
//     uniform float time;
//     void main() {
//       gl_FragColor = vec4(vUv, 0.0, sin(time * 0.5) * 0.5 + 0.5);
//     }
//   `,
//   uniforms: {
//     time: { value: 0.0 }
//   },
//   side: THREE.DoubleSide,
//   transparent: true,
//   wireframe: true
// });

//  --- WebGPU Node Material Example ---
// const material = new THREE.MeshBasicNodeMaterial({ color: 0x00ff00, side: THREE.DoubleSide, transparent: true, wireframe: true });
// let time = uniform(0);
// material.colorNode = Fn(() => {
//   return vec4(uv(), 0, sin(time.mul(0.5)).mul(0.5).add(0.5));
// })();

const GRID_SIZE = 100;

// Hills
const spacingMultiplier = 1;
const cubeScale = 4;
for (let x = -Math.floor(GRID_SIZE / 2); x <= Math.floor(GRID_SIZE / 2); x++) {
  for (let z = -Math.floor(GRID_SIZE / 2); z <= Math.floor(GRID_SIZE / 2); z++) {
    const cube = new THREE.Mesh( boxGeometry, greenMaterial );
    cube.scale.set(cubeScale, cubeScale, cubeScale);
    cube.position.set(x * spacingMultiplier * cubeScale, 0, z * spacingMultiplier * cubeScale);
    const noiseScale = 0.03;
    const noiseValue = noise2D(x * noiseScale, z * noiseScale) * 0.5 + 0.5;
    const distanceFromCenter = Math.sqrt(x * x + z * z);
    const maxDistance = GRID_SIZE / 2;
    const flatRadius = 5;
    const distanceFactor = THREE.MathUtils.clamp((distanceFromCenter - flatRadius) / (maxDistance - flatRadius), 0.1, 1);
    const adjustedNoiseValue = noiseValue * (distanceFactor);
    const maxHillHeight = 33;
    cube.position.y = adjustedNoiseValue * maxHillHeight;
    scene.add(cube);
  }
}

// Clouds
for (let i = 0; i < 50; i++) {
  const cloudGroup = new THREE.Group();
  cloudGroup.name = 'cloud';
  const cloudLength = THREE.MathUtils.randInt(3, 7);
  for (let j = 0; j < cloudLength; j++) {
    const cloudCube = new THREE.Mesh( boxGeometry, whiteMaterial );
    cloudCube.scale.set(THREE.MathUtils.randFloat(20, 30), THREE.MathUtils.randFloat(2, 6), THREE.MathUtils.randFloat(8, 12));
    cloudCube.position.x = j * THREE.MathUtils.randFloat(1.5, 3);
    cloudCube.position.y = THREE.MathUtils.randFloat(-0.5, 0.5);
    cloudCube.position.z = THREE.MathUtils.randFloat(-0.5, 0.5);
    cloudGroup.add(cloudCube);
  }
  cloudGroup.position.x = THREE.MathUtils.randFloatSpread(GRID_SIZE * 4);
  cloudGroup.position.y = THREE.MathUtils.randFloat(35, 45);
  cloudGroup.position.z = THREE.MathUtils.randFloatSpread(GRID_SIZE * 3);

  // cloudGroup.rotation.y = Math.PI / 4

  scene.add(cloudGroup);
}


//  --- Lights ---
const ambientLight = new THREE.AmbientLight(0xffffff, 7);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 9);
dirLight.position.set(5, 10, 7.5);
scene.add(dirLight);

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
  composer.setSize( window.innerWidth, window.innerHeight );
});

function animate() {
  const clouds = scene.children.filter(child => child.name === 'cloud');
  clouds.forEach(cloud => {
    cloud.position.x += 0.1;
    if (cloud.position.x > GRID_SIZE * 2) {
      cloud.position.x = -GRID_SIZE * 2;
    }
  });
  // time.value += 0.1;
  // material.uniforms.time.value += 0.1;
  controls.update();
  // renderer.render( scene, camera );
  composer.render();
}