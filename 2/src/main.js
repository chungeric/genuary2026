// Inspiration: https://observablehq.com/@tarte0/animation-curves-with-three-js

import * as THREE from 'three/webgpu'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);
const camera = new THREE.PerspectiveCamera( 20, window.innerWidth / window.innerHeight, 0.1, 1000 );
camera.position.x = 20;
camera.position.y = 20;
camera.position.z = 20;

// --- WebGPU Renderer  ---
const renderer = new THREE.WebGPURenderer();
renderer.setSize( window.innerWidth, window.innerHeight );
renderer.setAnimationLoop( animate );
document.body.appendChild( renderer.domElement );

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 1.2, 0);

const ballGeometry = new THREE.SphereGeometry( 0.5, 32, 32 );
const ballMaterial = new THREE.MeshBasicNodeMaterial({ color: 0xff0000, side: THREE.DoubleSide });
// let time = uniform(0);
// material.colorNode = Fn(() => {
//   return vec4(uv(), 0, sin(time.mul(0.5)).mul(0.5).add(0.5));
// })();

const floorGeometry = new THREE.PlaneGeometry( 1.2, 1.2 );
const floorMaterial = new THREE.MeshBasicMaterial( { color: 0xffffff, side: THREE.DoubleSide } );

const gridItems = [];
const GRID_SIZE = 1;

function createGrid() {
  for (let i = -GRID_SIZE; i <= GRID_SIZE; i++) {
    for (let j = -GRID_SIZE; j <= GRID_SIZE; j++) {

      const gridItem = new THREE.Group();

      const ballGroup = new THREE.Group();
      const ball = new THREE.Mesh( ballGeometry, ballMaterial );
      ball.position.x = i * 2;
      ball.position.y = 0.5;
      ball.position.z = j * 2;
      ballGroup.add( ball );
      ballGroup.userData.timeScale = 2;
      ballGroup.userData.jumpHeight = 2;
      ballGroup.userData.squishTo = 0.4;
      ballGroup.userData.offset = Math.random() * 1000;
      gridItem.add( ballGroup );

      const floor = new THREE.Mesh( floorGeometry, floorMaterial );
      floor.rotation.x = - Math.PI / 2;
      floor.position.x = i * 2;
      floor.position.z = j * 2;
      floor.position.y = 0.5;
      gridItem.add( floor );

      gridItems.push( gridItem );

      scene.add( gridItem );
    }
  }
}

createGrid();

//  --- Lights ---
// const pointLight = new THREE.PointLight(0xffffff, 10);
// pointLight.position.set(2, 2, 2);
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
  gridItems.forEach((gridItem) => {
    const ballGroup = gridItem.children[0];
    const floor = gridItem.children[1];
    const jumpHeight = ballGroup.userData.jumpHeight;
    const squishTo = ballGroup.userData.squishTo;
    const timeScale = ballGroup.userData.timeScale;
    const offset = ballGroup.userData.offset;
    const t = Math.abs(Math.sin((clock.getElapsedTime() + offset) * timeScale)) * jumpHeight;
    ballGroup.position.y = t;
    if (t < 0.5) {
      ballGroup.scale.y = THREE.MathUtils.mapLinear(t, 0.5, 0, 1, squishTo);
      floor.position.y = THREE.MathUtils.mapLinear(t, 0.5, 0, 0.5, 0);
    } else {
      ballGroup.scale.y = 1;
      floor.position.y = 0.5;
    }
  });

  controls.update();
  renderer.render( scene, camera );
}