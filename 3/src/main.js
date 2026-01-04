// import * as THREE from 'three';
import * as THREE from 'three/webgpu'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Fn, sin, uniform, uv, vec4, clamp } from 'three/tsl'
import { MeshSurfaceSampler } from 'three/addons/math/MeshSurfaceSampler.js';
import gsap from 'gsap';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);
scene.fog = new THREE.Fog(0x000000, 10, 1000);
const camera = new THREE.PerspectiveCamera( 30, window.innerWidth / window.innerHeight, 0.1, 100000 );
camera.position.z = 60;
// camera.position.y = 100;

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

for (let i = 0; i < 15; i++) {
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

const instances = 100;

const points = path.getPoints(instances).map((p, i) => new THREE.Vector3(p.x, p.y, 0));

const geometry = new THREE.BufferGeometry().setFromPoints(points);
const material = new THREE.LineBasicMaterial({ color: 0xff0000 });
const fibSpiralLine = new THREE.Line(geometry, material);
fibSpiralLine.visible = false;
scene.add(fibSpiralLine);

const cubeGeometry = new THREE.BoxGeometry(1, 1, 1);
const cubeMaterial = new THREE.MeshNormalMaterial();

const cubesMesh = new THREE.InstancedMesh(cubeGeometry, cubeMaterial, instances);
scene.add(cubesMesh);

const cubes = generateCubes(instances);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

const clock = new THREE.Clock();

const dummy = new THREE.Object3D();

function animate() {
  const t = clock.getElapsedTime();
  fibSpiralLine.rotation.z = t;
  fibSpiralLine.updateMatrixWorld();

  for (let i = 0; i < cubes.length; i++) {
    const {
      position, originalPosition, targetPosition,
      scale, currentScale, targetScale,
      rotation, currentRotation, targetRotation,
    } = cubes[i];

    const animationStarted = t > (i * 0.05);

    if (animationStarted && !cubes[i].isAnimating) {
      cubes[i].isAnimating = true;
      const tl = gsap.timeline();
      tl.to(position, {
        x: targetPosition.x,
        y: targetPosition.y,
        z: targetPosition.z,
        duration: 1,
        ease: "power2.out",
      }, 0);
      tl.to(cubes[i], {
        scale: targetScale,
        duration: 1,
        ease: "power2.out",
      }, 0);
      tl.to(rotation, {
        x: targetRotation.x,
        y: targetRotation.y,
        z: targetRotation.z,
        duration: 1,
        ease: "power2.out",
      }, 0);
      tl.to(cubes[i], {
        scale: 0,
        duration: 0.2,
        delay: 0.1,
        ease: "power2",
        onComplete: () => {
          const rotatedOriginalPosition = new THREE.Vector3(originalPosition.x, originalPosition.y, originalPosition.z);
          rotatedOriginalPosition.applyMatrix4(fibSpiralLine.matrixWorld);
          cubes[i].position = rotatedOriginalPosition.clone();
          const targetPositionRandomDirection = new THREE.Vector3(
            THREE.MathUtils.mapLinear(Math.random(), 0, 1, -1, 1),
            THREE.MathUtils.mapLinear(Math.random(), 0, 1, -1, 1),
            THREE.MathUtils.mapLinear(Math.random(), 0, 1, -1, 1)
          ).normalize();
          const targetPositionRandomDistance = THREE.MathUtils.mapLinear(Math.random(), 0, 1, 1, 1.5);
          const targetPos = rotatedOriginalPosition.clone().addScaledVector(targetPositionRandomDirection, targetPositionRandomDistance);
          targetPos.z = i * 0.4;
          cubes[i].targetPosition = targetPos;
          cubes[i].rotation = new THREE.Euler(0, 0, 0);
          cubes[i].scale = 0;
        }
      }, 1);
      
      tl.set(cubes[i], { isAnimating: false }, 1.3);
    }
    
    // const rotatedOriginalPoint = new THREE.Vector3(originalPosition.x, originalPosition.y, originalPosition.z);
    // rotatedOriginalPoint.applyMatrix4(fibSpiralLine.matrixWorld);
    dummy.position.copy(position);
    dummy.scale.set(scale, scale, scale);
    dummy.rotation.set(rotation.x, rotation.y, rotation.z);
    
    dummy.updateMatrix();
    cubesMesh.setMatrixAt(i, dummy.matrix);
  }
  cubesMesh.instanceMatrix.needsUpdate = true;
  
  controls.update();
  renderer.render(scene, camera);
}

function generateCubes(instances) {
  const cubes = [];
  for (let i = 0; i < instances; i++) {
    const t = i / instances;
    const pointIndex = Math.floor(t * (points.length - 1));
    const point = points[pointIndex];
    const targetPositionRandomDirection = new THREE.Vector3(
      THREE.MathUtils.mapLinear(Math.random(), 0, 1, -1, 1),
      THREE.MathUtils.mapLinear(Math.random(), 0, 1, -1, 1),
      THREE.MathUtils.mapLinear(Math.random(), 0, 1, -1, 1)
    ).normalize();
    const targetPositionRandomDistance = THREE.MathUtils.mapLinear(Math.random(), 0, 1, 1, 1.5);
    const targetPos = point.clone().addScaledVector(targetPositionRandomDirection, targetPositionRandomDistance);
    targetPos.z = i * 0.4;
    const obj = {
      position: point.clone(),
      originalPosition: point.clone(),
      targetPosition: targetPos,
      scale: 0,
      currentScale: 0,
      targetScale: THREE.MathUtils.mapLinear(i, 0, instances, 0.3, 4),
      rotation: new THREE.Euler(0, 0, 0),
      currentRotation: new THREE.Euler(0, 0, 0),
      targetRotation: new THREE.Euler(
        THREE.MathUtils.mapLinear(Math.random(), 0, 1, 0, Math.PI),
        THREE.MathUtils.mapLinear(Math.random(), 0, 1, 0, Math.PI),
        THREE.MathUtils.mapLinear(Math.random(), 0, 1, 0, Math.PI)
      ),
      isAnimating: false,
    };
    cubes.push(obj);
  }
  return cubes;
}