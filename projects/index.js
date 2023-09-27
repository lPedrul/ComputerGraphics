// ThreeJS and Third-party deps
import * as THREE from "three"
import * as dat from 'dat.gui'
import Stats from "three/examples/jsm/libs/stats.module"
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls"
import { RectAreaLightHelper } from "three/examples/jsm/helpers/RectAreaLightHelper"
import { RectAreaLightUniformsLib } from "three/examples/jsm/lights/RectAreaLightUniformsLib"
import { Water } from 'three/examples/jsm/objects/Water2';
import { BokehPass } from "three/examples/jsm/postprocessing/BokehPass"

// Core boilerplate code deps
import { createCamera, createComposer, createRenderer, runApp, updateLoadingProgressBar, getDefaultUniforms } from "./core-utils"

// Other deps
import Tile from './assets/water.gif'
import { loadModel, loadTexture } from "./common-utils"

THREE.ColorManagement.enabled = true

/**************************************************
 * 0. Tweakable parameters for the scene
 *************************************************/
const params = {
  // general scene params
  speed: 1,
  lightOneSwitch: true,
  lightTwoSwitch: true,
  lightThreeSwitch: true,
  // Bokeh pass properties
  focus: 0.0,
  aperture: 0.0,
  maxblur: 0.0,
  color: '#ffffff',
  scale: 4,
  flowX: 1,
  flowY: 1,
  reflectivity: 0.0,
}
const uniforms = {
  ...getDefaultUniforms(),
}


/**************************************************
 * 1. Initialize core threejs components
 *************************************************/
// Create the scene
let scene = new THREE.Scene()
let renderer = createRenderer({ antialias: true }, (_renderer) => {
  _renderer.outputColorSpace = THREE.SRGBColorSpace
})

renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.shadowMap.enabled = true;

// Create the camera
// Pass in fov, near, far and camera position respectively
let camera = createCamera(45, 1, 1000, { x: 0, y: 5, z: 15 })

// (Optional) Create the EffectComposer and passes for post-processing
// If you don't need post-processing, just comment/delete the following creation code, and skip passing any composer to 'runApp' at the bottom
let bokehPass = new BokehPass(scene, camera, {
  focus: params.focus,
  aperture: params.aperture,
  maxblur: params.maxblur
})

// The RenderPass is already created in 'createComposer'
let composer = createComposer(renderer, scene, camera, (comp) => {
  comp.addPass(bokehPass)
})

/**************************************************
 * 2. Build your scene in this threejs app
 * This app object needs to consist of at least the async initScene() function (it is async so the animate function can wait for initScene() to finish before being called)
 * initScene() is called after a basic threejs environment has been set up, you can add objects/lighting to you scene in initScene()
 * if your app needs to animate things(i.e. not static), include a updateScene(interval, elapsed) function in the app as well
 *************************************************/
let app = {
  async initScene() {
    // OrbitControls
    this.controls = new OrbitControls(camera, renderer.domElement)
    this.controls.enableDamping = true

    // Scene setup taken from https://threejs.org/examples/#webgl_lights_rectarealight
    // Create rect area lights
    RectAreaLightUniformsLib.init()

    await updateLoadingProgressBar(0.1)

    const hemiLight = new THREE.HemisphereLight( 0xffffff, 0xffffff, 2 );
		hemiLight.color.setHSL( 0.6, 1, 0.6 );
		hemiLight.groundColor.setHSL( 0.095, 1, 0.75 );
		hemiLight.position.set( 0, 500, 0 );
    scene.add( hemiLight );

    const dirLight = new THREE.DirectionalLight( 0xffffff, 4 );
		
    dirLight.castShadow = true;

    dirLight.position.set( 50, 500, 0 );

    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;

    dirLight.shadow.camera.near = 10;
    dirLight.shadow.camera.far = 4000;
    dirLight.shadow.camera.fov = 100;


		scene.add( dirLight );

    // spotLight.shadow.mapSize.width = 0; // default
    // spotLight.shadow.mapSize.height = 0; // default
    // spotLight.shadow.camera.near = 0.5; // default
    // spotLight.shadow.camera.far = 500; // default

    scene.add(new THREE.DirectionalLightHelper(dirLight))
    // scene.add(new RectAreaLightHelper(rectLight2))
    // scene.add(new RectAreaLightHelper(rectLight3))

    // Create the floor
    const video = document.getElementById("video")
    video.play();
    video.addEventListener( 'play', function () {

      this.currentTime = 3;

    } );

    const tex = new THREE.VideoTexture(video);

    //const tex = await loadTexture(Tile)
    tex.colorSpace = THREE.SRGBColorSpace
    tex.format = THREE.RGBAFormat;
    tex.wrapS = THREE.RepeatWrapping
    tex.wrapT = THREE.RepeatWrapping
    tex.repeat.set(10,10)

    const geoFloor = new THREE.PlaneGeometry(20,20)

    this.water = new Water( geoFloor, {
      color: params.color,
			scale: 0,
			flowDirection: new THREE.Vector2( params.flowX, params.flowY ),
			textureWidth: 1024,
			textureHeight: 1024,
      reflectivity: params.reflectivity,
      refractionRatio: 0.50,
      distortionScale: 10,
    });

    this.water.position.y = 0;
		this.water.rotation.x = Math.PI * - 0.5;

    console.log(this.water);

    scene.add(this.water);

    let texture = await loadTexture('./assets/background/top.png')

    scene.background = texture;

    await updateLoadingProgressBar(0.5)

    const geometry = new THREE.BoxGeometry(1.5, 1.5, 1.5, 16);
		const material = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0, metalness: 0});

    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.castShadow = true; //default is false
    this.mesh.position.set(10, 2, 0);
    // this.controls.target.copy(this.mesh.position)

		scene.add(this.mesh);

    let { model } = await loadModel('./models/Piscina.gltf');

    console.log(model);

    model.scale.set(20,20,20)
    model.position.set(0,-4.5,0)
    model.receiveShadow = true;

    scene.add(model)

    // Create the torus knot
    // const geoKnot = new THREE.TorusKnotGeometry(1.5, 0.5, 200, 16)
    // const matKnot = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0, metalness: 0 })
    // // save mesh to 'this' so that we can access it in the 'updateScene' function
    // this.meshKnot = new THREE.Mesh(geoKnot, matKnot)
    // this.meshKnot.position.set(0, 5, 0)
    // // update orbit controls to target meshKnot at center
    // this.controls.target.copy(this.meshKnot.position)
    // scene.add(this.meshKnot)

    // GUI controls
    const gui = new dat.GUI()

    gui.addColor( params, 'color' ).onChange( function ( value ) {

      this.water.material.uniforms[ 'color' ].value.set( value );

    } );
    gui.add( params, 'scale', 1, 10 ).onChange( function ( value ) {

      this.water.material.uniforms[ 'config' ].value.w = value;

    } );
    gui.add( params, 'reflectivity', 0, 1 ).onChange( function ( value ) {

      this.water.material.uniforms[ 'reflectivity' ].value = value;

    } );
    gui.add( params, 'flowX', - 1, 1 ).step( 0.01 ).onChange( function ( value ) {

      this.water.material.uniforms[ 'flowDirection' ].value.x = value;
      this.water.material.uniforms[ 'flowDirection' ].value.normalize();

    } );
    gui.add( params, 'flowY', - 1, 1 ).step( 0.01 ).onChange( function ( value ) {

      this.water.material.uniforms[ 'flowDirection' ].value.y = value;
      this.water.material.uniforms[ 'flowDirection' ].value.normalize();

    } );

    gui.add(params, "speed", 1, 10, 0.5)
    gui.add(params, "lightOneSwitch").name('Red light').onChange((val) => {
      rectLight1.intensity = val ? 5 : 0
    })
    gui.add(params, "lightTwoSwitch").name('Green light').onChange((val) => {
      rectLight2.intensity = val ? 5 : 0
    })
    gui.add(params, "lightThreeSwitch").name('Blue light').onChange((val) => {
      rectLight3.intensity = val ? 5 : 0
    })

    const matChanger = () => {
      bokehPass.uniforms['focus'].value = params.focus
      bokehPass.uniforms['aperture'].value = params.aperture * 0.00001
      bokehPass.uniforms['maxblur'].value = params.maxblur
    }

    let bokehFolder = gui.addFolder(`Bokeh Pass`)
    bokehFolder.add(params, 'focus', 0.0, 3000.0, 10).onChange(matChanger)
    bokehFolder.add(params, 'aperture', 0, 10, 0.1).onChange(matChanger)
    bokehFolder.add(params, 'maxblur', 0.0, 0.01, 0.001).onChange(matChanger)

    // Stats - show fps
    this.stats1 = new Stats()
    this.stats1.showPanel(0) // Panel 0 = fps
    this.stats1.domElement.style.cssText = "position:absolute;top:0px;left:0px;"
    // this.container is the parent DOM element of the threejs canvas element
    this.container.appendChild(this.stats1.domElement)

    this.rise = false;

    await updateLoadingProgressBar(1.0, 100)
  },
  // @param {number} interval - time elapsed between 2 frames
  // @param {number} elapsed - total time elapsed since app start
  updateScene(interval, elapsed) {
    this.controls.update()
    this.stats1.update()

    // rotate the torus
    // this.meshKnot.rotation.y = elapsed * params.speed
    // this.mesh.rotation.y = elapsed * params.speed

    if (this.rise) {
      this.water.position.y += 0.001
    } else {
      this.water.position.y -= 0.001
    }

    if (this.water.position.y > 0.2) {
      this.rise = false
    }
    if (this.water.position.y < -0.2) {
      this.rise = true
    }
    
  }
}

/**************************************************
 * 3. Run the app
 * 'runApp' will do most of the boilerplate setup code for you:
 * e.g. HTML container, window resize listener, mouse move/touch listener for shader uniforms, THREE.Clock() for animation
 * Executing this line puts everything together and runs the app
 * ps. if you don't use custom shaders, pass undefined to the 'uniforms'(2nd-last) param
 * ps. if you don't use post-processing, pass undefined to the 'composer'(last) param
 *************************************************/
runApp(app, scene, renderer, camera, true, uniforms, composer)