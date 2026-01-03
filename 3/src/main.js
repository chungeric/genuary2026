// import * as THREE from 'three';
import * as THREE from 'three/webgpu'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Fn, sin, uniform, uv, vec4, clamp } from 'three/tsl'

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);
const camera = new THREE.PerspectiveCamera( 45, window.innerWidth / window.innerHeight, 0.1, 100000 );
camera.position.z = 100;

const renderer = new THREE.WebGPURenderer();
renderer.setSize( window.innerWidth, window.innerHeight );
renderer.setAnimationLoop( animate );
document.body.appendChild( renderer.domElement );

const controls = new OrbitControls(camera, renderer.domElement);

// const geometry = new THREE.BoxGeometry( 1, 1, 1 );
// const material = new THREE.MeshNormalNodeMaterial({ side: THREE.DoubleSide });
// const material = new THREE.MeshBasicNodeMaterial({ color: 0x00ff00, side: THREE.DoubleSide });
// let time = uniform(0);
// material.colorNode = Fn(() => {
//   return vec4(uv(), 0, sin(time.mul(0.5)).mul(0.5).add(0.5));
// })();

// const cube = new THREE.Mesh( geometry, material );

const path = new THREE.Path();
path.moveTo(0, 0);
const sequence = [];
const directions = [
  new THREE.Vector2(-1, 0), // left
  new THREE.Vector2(0, -1), // down
  new THREE.Vector2(1, 0), // right
  new THREE.Vector2(0, 1), // up
];

const center = new THREE.Vector2(1, 0);
let directionIndex = 0;

for (let i = 0; i < 20; i++) {
  let value;
  if (i === 0 || i === 1) {
    value = 1;
  } else {
    value = sequence[i - 1] + sequence[i - 2];
  }
  sequence.push(value);

  const startAngle = ((i + 2) % 4) * (Math.PI / 2);
  const endAngle = startAngle + (Math.PI / 2);
  const radius = value;
  const direction = directions[directionIndex];

  if (i === 0) {
    path.absarc(center.x, center.y, radius, Math.PI, Math.PI / 2 * 3, false);
  }
  if (i === 1) {
    path.absarc(center.x, center.y, radius, Math.PI / 2 * 3, 0, false);
  }
  if (i > 1) {
    center.addScaledVector(direction, sequence[i - 2]);
    path.absarc(center.x, center.y, radius, startAngle, endAngle, false);
    directionIndex = (directionIndex + 1) % directions.length;
  }
}

const points = path.getPoints(); // Get points from the combined path
const geometry = new THREE.BufferGeometry().setFromPoints(points);
const material = new THREE.LineBasicMaterial({ color: 0xff0000 });
const line = new THREE.Line(geometry, material);
scene.add(line);

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
  // time.value += 0.1;
  // material.uniforms.time.value += 0.1;
  controls.update();
  renderer.render( scene, camera );
}