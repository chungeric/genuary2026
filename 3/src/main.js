// import * as THREE from 'three';
import * as THREE from 'three/webgpu'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Fn, sin, uniform, uv, vec4, clamp } from 'three/tsl'
import { MeshSurfaceSampler } from 'three/addons/math/MeshSurfaceSampler.js';
import gsap from 'gsap';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);
const camera = new THREE.PerspectiveCamera( 20, window.innerWidth / window.innerHeight, 0.1, 100000 );
camera.position.z = 70;
camera.position.y = -160;

const renderer = new THREE.WebGPURenderer();
renderer.setSize( window.innerWidth, window.innerHeight );
renderer.setAnimationLoop( animate );
document.body.appendChild( renderer.domElement );

const controls = new OrbitControls(camera, renderer.domElement);
// controls.target.set(0, -10, 0);

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

for (let i = 0; i < 12; i++) {
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

const points = path.getPoints();
const points3d = points.map((p, i) => new THREE.Vector3(p.x, p.y, 0));

const geometry = new THREE.BufferGeometry().setFromPoints(points3d);
const material = new THREE.LineBasicMaterial({ color: 0xff0000 });
const line = new THREE.Line(geometry, material);
line.visible = false;
scene.add(line);

// Create spheres for sampled points
const cubeGeometry = new THREE.BoxGeometry(1, 1, 1);
const cubeMaterial = new THREE.MeshNormalMaterial({ color: 0x00ff00 });
const sampledSpheres = [];

// Frustum for checking if point is in viewport
const frustum = new THREE.Frustum();
const projectionMatrix = new THREE.Matrix4();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

let scale = 1;
let clock = new THREE.Clock();
let lastSampleTime = 0;
let currentPointIndex = 0; // Track which point along the path we're at

function isPointInFrustum(point) {
  camera.updateMatrixWorld();
  projectionMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
  frustum.setFromProjectionMatrix(projectionMatrix);
  return frustum.containsPoint(point);
}

function spawnCubeAtCurrentPoint() {
  const tempPosition = new THREE.Vector3();
  
  // Get the current point along the path
  tempPosition.copy(points3d[currentPointIndex]);
  
  // Apply current scale transformation
  tempPosition.multiplyScalar(scale);
  
  const cube = new THREE.Mesh(cubeGeometry, cubeMaterial.clone());
    cube.position.copy(tempPosition);
    
    // Start with scale 0 and full opacity
    cube.scale.set(0, 0, 0);
    cube.material.opacity = 1;
    cube.material.transparent = true;
    
    scene.add(cube);
    sampledSpheres.push(cube);
    
    // Pop in animation
    gsap.to(cube.scale, {
      x: (currentPointIndex / points3d.length) * 6,
      y: (currentPointIndex / points3d.length) * 6,
      z: (currentPointIndex / points3d.length) * 6,
      duration: 0.5,
      ease: "back.out(1.7)"
    });

    gsap.to(cube.rotation, {
      x: Math.random() * Math.PI,
      y:  Math.random() * Math.PI,
      duration: 0.3,
      ease: "power2.out"
    });

    const randomDirectionVector = new THREE.Vector3(
      (Math.random() - 0.5) * 2,
      (Math.random() - 0.5) * 2,
      (Math.random() - 0.5) * 2
    ).normalize().multiplyScalar(2);
    gsap.to(cube.position, {
      x: cube.position.x + randomDirectionVector.x,
      y: cube.position.y + randomDirectionVector.y,
      z: cube.position.z + randomDirectionVector.z,
      duration: 0.3,
      ease: "power2.out"
    });
    
    // Fade out and remove after delay
    gsap.to(cube.material, {
      opacity: 0,
      duration: 0.5,
      delay: 0.6,
      ease: "power2.inOut",
      onComplete: () => {
        scene.remove(cube);
        const index = sampledSpheres.indexOf(cube);
        if (index > -1) {
          sampledSpheres.splice(index, 1);
        }
        cube.geometry.dispose();
        cube.material.dispose();
      }
    });
  
  // Move to next point, skip some points for spacing
  currentPointIndex = (currentPointIndex + 3) % points3d.length;
}

let minScale = sequence[sequence.length-5]/sequence[sequence.length-1];
console.log('minScale', minScale);

function animate() {
  const elapsed = clock.getElapsedTime();
  
  // Spawn cube at current point along path
  if (elapsed - lastSampleTime >= 0.01) {
    spawnCubeAtCurrentPoint();
    lastSampleTime = elapsed;
  }
  
  line.scale.set(scale, scale, scale);
  
  // Update sphere positions to match line scale
  sampledSpheres.forEach(sphere => {
    const originalPos = sphere.userData.originalPosition || sphere.position.clone();
    if (!sphere.userData.originalPosition) {
      sphere.userData.originalPosition = originalPos.clone();
    }
  });
  
  controls.update();
  renderer.render(scene, camera);

  // scale *= 0.99;

  // if (scale <= minScale) {
  //   scale = 1;
  // }
}