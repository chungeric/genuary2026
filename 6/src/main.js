import * as THREE from 'three/webgpu'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RapierPhysics } from 'three/addons/physics/RapierPhysics.js';
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
import { recordCanvas } from './recordCanvas.js';

init();

async function init() {

  const physics = await RapierPhysics();

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('black');
  // scene.fog = new THREE.FogExp2( 0x000000, 0.025 );
  const camera = new THREE.PerspectiveCamera( 20, window.innerWidth / window.innerHeight, 0.1, 1000 );
  camera.position.z = 150;
  camera.position.y = 56.25;

  const renderer = new THREE.WebGPURenderer();
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setSize( window.innerWidth, window.innerHeight );
  renderer.setAnimationLoop( animate );
  document.body.appendChild( renderer.domElement );

  const controls = new OrbitControls(camera, renderer.domElement);

  const sphereGeometry = new THREE.SphereGeometry( 1.5, 64, 64 );
  const sphereMaterial = new THREE.MeshStandardMaterial({ color: 'white', side: THREE.DoubleSide, roughness: 0.7 });

  const count = 30;

  const spheres = new THREE.InstancedMesh( sphereGeometry, sphereMaterial, count );
  spheres.instanceMatrix.setUsage( THREE.DynamicDrawUsage ); // will be updated every frame
  spheres.castShadow = true;
  spheres.receiveShadow = true;
  spheres.userData.physics = { mass: 1, restitution: 0.1, friction: 0.1 };
  scene.add( spheres );

  const matrix = new THREE.Matrix4();
	const color = new THREE.Color();

  const originalPositions = [];
  const velocities = [];
  const fireIntervals = [];

  for ( let i = 0; i < spheres.count; i ++ ) {
    const x = THREE.MathUtils.randFloatSpread( 25 );
    const y = 0;
    const z = THREE.MathUtils.randFloatSpread( 25 );
    matrix.setPosition( x, y, z );
    originalPositions.push( new THREE.Vector3( x, y, z ) );

    const leftZ = THREE.MathUtils.randFloatSpread( 25 );
    const rightZ = THREE.MathUtils.randFloatSpread( 25 );
    const topX = THREE.MathUtils.randFloatSpread( 25 );
    const bottomX = THREE.MathUtils.randFloatSpread( 25 );
    const targetZ = Math.random() > 0.5 ? leftZ : rightZ;
    const targetX = Math.random() > 0.5 ? topX : bottomX;

    const direction = new THREE.Vector3().subVectors( new THREE.Vector3(targetX, 0, targetZ), new THREE.Vector3(x, y, z) ).normalize();
    const speed = THREE.MathUtils.randInt( 15, 20 );

    const randomVelocity = direction.multiplyScalar(speed);

    velocities.push( randomVelocity );

    const interval = THREE.MathUtils.randInt( 1000, 2000 );
    fireIntervals.push( interval );

    spheres.setMatrixAt( i, matrix );
    spheres.setColorAt( i, color.setHex( 0xffffff * Math.random() ) );
  }

  const floorGeometry = new THREE.BoxGeometry( 300, 0.5, 300 );
  const floorMaterial = new THREE.MeshStandardMaterial({ color: 'white', side: THREE.DoubleSide });
  const floorMesh = new THREE.Mesh( floorGeometry, floorMaterial );
  floorMesh.position.y = -1.6;
  floorMesh.receiveShadow = true;
  // Set physics properties for static object (floor)
  // Mass of 0 makes it static (immovable)
  floorMesh.userData.physics = { mass: 0 };
  scene.add( floorMesh );

  //  --- Lights ---
  // const ambientLight = new THREE.AmbientLight( 0xccccff );
  // scene.add( ambientLight );

  // const directionalLight = new THREE.DirectionalLight( 0xffffff, 1.3 );
  // directionalLight.position.set( 5, 10, 7.5 );
  // scene.add( directionalLight );

  let lightsOn = false;
  let spotLightOnIntensity = 1000;
  // let ambientLightOnIntensity = 0.5;
  // let ambientLightIntensityTarget = lightsOn ? ambientLightOnIntensity : 0;
  let spotLightIntensityTarget = lightsOn ? spotLightOnIntensity : 0;

  const spotLight = new THREE.SpotLight( 0xffffff, lightsOn ? spotLightOnIntensity : 0 );
  spotLight.name = 'spotLight';
  // spotLight.map = textures[ 'disturb.jpg' ];
  spotLight.position.set( 0, 15, 0 );
  // spotLight.angle = Math.PI / 6;
  spotLight.penumbra = 1;
  spotLight.decay = 2;
  spotLight.distance = 0;

  spotLight.castShadow = true;
  spotLight.shadow.mapSize.width = 2048;
  spotLight.shadow.mapSize.height = 2048;
  spotLight.shadow.camera.near = 2;
  spotLight.shadow.camera.far = 10000;
  spotLight.shadow.focus = 1;
  spotLight.shadow.bias = - .003;
  spotLight.shadow.intensity = 1;
  scene.add( spotLight );

  // spotLight.lightHelper = new THREE.SpotLightHelper( spotLight );
  // // spotLight.lightHelper.visible = false;
  // scene.add( spotLight.lightHelper );

  // Add the scene to physics AFTER all objects are added
  physics.addScene( scene );

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
  
  const velocity = new THREE.Vector3();
  let leaveVelocitiesSet = false;
  const tempMatrix = new THREE.Matrix4();

  let lightLerpSpeed = 0.1;
  let lightsFullyOff = false;

  let lastFireTime = 0;

  let intervalIds = [];

  function animate() {

    lightsFullyOff = spotLight.intensity < 0.06;
    
    if (lightsOn && !leaveVelocitiesSet) {
      leaveVelocitiesSet = true;
      for ( let i = 0; i < spheres.count; i ++ ) {
        let intervalId = setInterval(() => {
          physics.setMeshVelocity( spheres, velocities[i], i );
        }, fireIntervals[i] );
        intervalIds.push( intervalId );
      }
    }

    if (!lightsOn && lightsFullyOff) {
      leaveVelocitiesSet = false;
      // reset spheres to new positions
      for ( let i = 0; i < spheres.count; i ++ ) {
        const x = THREE.MathUtils.randFloatSpread( 30 );
        const y = 0;
        const z = THREE.MathUtils.randFloatSpread( 30 );
        const newPosition = new THREE.Vector3( x, y, z );
        tempMatrix.setPosition( newPosition );
        spheres.setMatrixAt( i, tempMatrix );
        physics.setMeshPosition( spheres, newPosition, i );
      }
    }

    spotLight.intensity = THREE.MathUtils.lerp( spotLight.intensity, spotLightIntensityTarget, lightLerpSpeed );
    controls.update();
    renderer.render( scene, camera );
  }


  window.addEventListener('keydown', (e) => {
    if ( e.key === 'l' ) {
      lightsOn = !lightsOn;
      if (lightsOn) {
        lightLerpSpeed = 0.05;
        spotLightIntensityTarget = spotLightOnIntensity;
        // ambientLightIntensityTarget = ambientLightOnIntensity;
      } else {
        for ( let i = 0; i < intervalIds.length; i ++ ) {
          clearInterval( intervalIds[i] );
          intervalIds = [];
        }
        lightLerpSpeed = 0.08;
        leaveVelocitiesSet = false;
        spotLightIntensityTarget = 0;
        // ambientLightIntensityTarget = 0;
      }
    }
  });

  // window.addEventListener('keydown', (event) => {
  //   if (event.key === 'r') {
  //     console.log('recording...');
  //     recordCanvas(renderer.domElement, 22000);
  //   }
  // });
}

