import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import Stats from "three/examples/jsm/libs/stats.module.js";

import { loadModel } from "./common-utils";
import { RectAreaLightHelper } from "three/examples/jsm/helpers/RectAreaLightHelper";
import { GUI } from "dat.gui";

function createCamera(
  fov = 45,
  near = 0.1,
  far = 100,
  camPos = { x: 0, y: 0, z: 5 },
  camLookAt = { x: 0, y: 0, z: 0 },
  aspect = window.innerWidth / window.innerHeight
) {
  const camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
  camera.position.set(camPos.x, camPos.y, camPos.z);
  camera.lookAt(camLookAt.x, camLookAt.y, camLookAt.z); // this only works when there's no OrbitControls
  camera.updateProjectionMatrix();
  return camera;
}

const frag = /*glsl*/ `
#include <packing>

uniform float time;
varying vec2 vUv;
varying vec3 vPosition;

uniform float depthFallOf;
uniform float depth;

uniform float waveDepth;
uniform float waveFallOf;

uniform vec3 color1;
uniform vec3 color2;

uniform float foamWidth;
uniform sampler2D foamTexture;


uniform float waveTiling;
uniform float waveAmount;
uniform float waveCutout;
uniform vec2 waveSpeed;

uniform sampler2D causticTexture;
uniform float causticCutout;
uniform vec3 causticColor;
uniform float causticTiling;
uniform float causticSpeed;

uniform sampler2D tDiffuse;
uniform sampler2D tDepth;
uniform float cameraNear;
uniform float cameraFar;

uniform vec2 resolution;

/* 
float readDepth0( sampler2D depthSampler, vec2 coord ) {
	float fragCoordZ = texture2D( depthSampler, coord ).x;
	float viewZ = perspectiveDepthToViewZ( fragCoordZ, cameraNear, cameraFar );
	return viewZToOrthographicDepth( viewZ, cameraNear, cameraFar );  
} 
*/

vec2 screenUV() {
    return gl_FragCoord.xy / resolution;
}

//return depth  
float readDepth( sampler2D depthSampler, vec2 coord ) {
    float fragCoordZ = texture2D( depthSampler, coord ).x;
    float viewZ = perspectiveDepthToViewZ( gl_FragCoord.z, cameraNear, cameraFar );
    float viewZ2 = perspectiveDepthToViewZ( fragCoordZ, cameraNear, cameraFar );
    return clamp( viewZ - viewZ2, 0.0, 1.0);
}

//
float depthFade( float localDepth, float localDepthFallOf) {
    float sceneDepth = readDepth( tDepth, screenUV() );
    //controls the white
    float waterdepth = 1.0-(sceneDepth/localDepth);
    //clamp limit value from 0 to 1 (saturate)
    waterdepth = clamp( waterdepth, 0.0, 1.0);
    //controls the fade 
    waterdepth = pow(waterdepth, localDepthFallOf);
    return waterdepth;
}  

float cutOut(float inp, float alpha){
    //float foam = ;//- alpha;
    //float foam = waterdepth - foamWidth;
    return ceil( inp - clamp( alpha, 0.0, 1.0));
    // returns the smallest number that is larger or equal to x
    //foam = ceil(foam); 
    //return foam;
}

void main()	{
//border

    //vec2 screenUV = gl_FragCoord.xy / resolution;

    float waterdepth = depthFade( depth, depthFallOf );
	//gl_FragColor = vec4( vec3( waterdepth ), 1.0 ); 
    
//color
    vec3 c1 = color1 * waterdepth;
    vec3 c2 = color2 * (1.0 - waterdepth);
    vec3 watercolor = c1 + c2;

   
//foam
    float tmpDepth = clamp( foamWidth, 0., 1.);
    float foam = cutOut( depthFade( 1., 1. ), foamWidth);

   /*  watercolor = watercolor * (1.0 - foam);
    watercolor = watercolor + foam ;
    gl_FragColor = vec4( vec3(watercolor), 1.0 ); 
 */
/////// waves

 //vec2 displacement = texture2D( tDudv, ( vUv * 2.0 ) - time * 0.05 ).rg;
//displacement.g = diff;
//gl_FragColor.rgb = vec3(displacement, 0);

    float dd = depthFade( waveDepth, waveFallOf);
    
    vec2 tmpUV = vUv; //screenUV();
    tmpUV.g = dd * waveAmount;

    vec2 tp1 = waveSpeed * time;
    //vec2 tp2 = vec2( vec2(screenUV().r, dd ) + waveTiling );

    vec2 tilingAndOffset = vec2(tmpUV.r * waveTiling + tp1.x , tmpUV.g * waveTiling + tp1.y );
    //vec2  tilingAndOffset = vec2(tmpUV.x * waveTiling + tp1, tmpUV.y * waveTiling + tp1);
    vec4 tx = texture2D(foamTexture, tilingAndOffset  );

    gl_FragColor = vec4( tilingAndOffset, 0., 1.0);
    //return;
    //foam += tx.r * dd;

    foam += cutOut( tx.r * dd, waveCutout);

    //foam += tx.r;
    /* float dd */ 
    //saturate
    foam = clamp( foam, 0.0, 1.0 );
    
   

    //vec2 tmpUV = vUv;
    //tmpUV.g = dd * waveAmount;
    float ctp1 = causticSpeed * time;
    vec2 causticTilingAndOffset = vec2(vUv * vec2( causticTiling) + ctp1);
    vec4 ct = texture2D(causticTexture, causticTilingAndOffset );
  
//invert to make white null
    float ctp2 =  -( causticSpeed * time);
    vec2 causticTilingAndOffset2 = vec2(vUv * vec2( causticTiling) + ctp2);
    vec4 ct2 = texture2D(causticTexture, causticTilingAndOffset2);
    vec4 ctTx = ct + ct2;

    float ctCut = cutOut( ctTx.r, causticCutout);
    vec3 ctColor = vec3(ctCut) * causticColor;

    // applay color
    watercolor = watercolor * ( (1.0 - foam) + (/* 1.0 - */ ctCut) ) + (foam + ctColor);
    // watercolor = watercolor * (foam + ctColor) ;

    gl_FragColor = vec4( vec3(watercolor), 1.0 ); 

    //gl_FragColor = vec4( 1.-vec3(ctCut), 1.);

   /*   float wd2 = 1.0 - sceneDepth/waveDepth;
    wd2 = clamp( wd2, 0.0, 1.0);
    wd2 = pow(wd2, waveFallOf);

    vec2 dUv = vec2(vUv.r, wd2); 
 
    //float offset = 6.;
    //float motion = time * 0.05;
    vec2 tp1 = vec2(0,waveSpeed)*time;
    vec2 tp2 = vec2(dUv * waveTiling.y );
    vec4 tx = texture2D(foamTexture, tp2 - tp1 );
    tx *= wd2;
    vec3 w = vec3(foam);
    w += tx.rgb;
    w = clamp( w, 0.0, 1.0);
    
    gl_FragColor = vec4( w+watercolor, 1.0 ); 
 */
//
}

`;

const vert = /*glsl*/ `
uniform float time;
varying vec2 vUv;
varying vec3 vPosition;


void main() {
  vUv = uv;
  vPosition = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  //gl_Position = vec4(position, 1.0)
}
`;

var params = {
  depthFallOf: 10,
  depth: 10,
  color: "#7dffd8",
  lightColor: "#ffffff",
  hemisColor: "#ff0096",
  lightIntensity: 4,
  foamWidth: 1,
  color1: 0xbebeff,
  color2: 0x2bbf2,
  waveDepth: 1,
  waveFallOf: 0.06,
  waveSpeedX: 0.0,
  waveSpeedY: -0.19,
  waveTiling: 1.4,
  waveAmount: 1.2,
  waveCutout: 0.5,
  causticColor: 0x1313ed,
  causticCutout: 0.7,
  causticTiling: 1.4,
  causticSpeed: 0.05,
};

let animateBoia = () => {
  if (params.switch) {
    boia.rotation.x += Math.PI * 0.0008;
    boia.rotation.y += Math.PI * 0.0004;
    setTimeout(() => {
      boia2.rotation.x += Math.PI * 0.0008;
      boia2.rotation.y += Math.PI * 0.0003;
    }, 400);
    setTimeout(() => {
      boia5.rotation.x -= Math.PI * 0.0006;
      boia5.rotation.y -= Math.PI * 0.0006;
    }, 500);
  } else {
    boia.rotation.x -= Math.PI * 0.0008;
    boia.rotation.y -= Math.PI * 0.0008;
    setTimeout(() => {
      boia2.rotation.y -= Math.PI * 0.0008;
      boia2.rotation.x -= Math.PI * 0.0008;
    }, 400);
    setTimeout(() => {
      boia5.rotation.x += Math.PI * 0.0006;
    }, 500);
  }

  if (boia.rotation.x > 0.1) {
    params.switch = false;
  }
  if (boia.rotation.x < -0.1) {
    params.switch = true;
  }
};

//#region GUI
let gui = new GUI();

//props
gui.add(params, "depthFallOf", 0, 10);
gui.add(params, "depth", 0, 10);
gui.add(params, "foamWidth", 0, 1);
gui.addColor(params, "color1");
gui.addColor(params, "color2");
gui.add(params, "waveDepth", 0, 1);
gui.add(params, "waveFallOf", 0, 1);
gui.add(params, "waveTiling", 0, 6, 0.1);
gui.add(params, "waveAmount", 0, 6, 0.1);
gui.add(params, "waveCutout", 0, 6, 0.1);

const velocity = gui.addFolder("waveSpeed");
velocity.add(params, "waveSpeedX", -2, 4, 0.01).name("X");
velocity.add(params, "waveSpeedY", -2, 4, 0.01).name("Y");

gui.addColor(params, "causticColor");
gui.add(params, "causticCutout", 0, 6, 0.1);
gui.add(params, "causticTiling", 0, 6, 0.1);
gui.add(params, "causticSpeed", -2, 4, 0.01);

//velocity.open();
//gui.open();

//#endregion

//sizes
const sizes = {};
sizes.width = window.innerWidth;
sizes.height = window.innerHeight;

//clock
const clock = new THREE.Clock();

//stats
const stats = new Stats();
document.body.appendChild(stats.dom);

//scene
const scene = new THREE.Scene();

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.gammaOutput = true;
document.body.appendChild(renderer.domElement);

renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(sizes.width, sizes.height);

let supportsExtension = true;

if (
  renderer.capabilities.isWebGL2 === false &&
  renderer.extensions.has("WEBGL_depth_texture") === false
) {
  supportsExtension = false;
  console.log("error!!!!!");
}

//camera
const camera = createCamera(70, 1, 1000, { x: 0, y: 10, z: -34 });

scene.add(camera);

let pixelRatio = renderer.getPixelRatio();
let target = new THREE.WebGLRenderTarget(
  window.innerWidth * pixelRatio,
  window.innerHeight * pixelRatio
);

target.texture.minFilter = THREE.NearestFilter;
target.texture.magFilter = THREE.NearestFilter;
target.texture.generateMipmaps = false;
target.stencilBuffer = false;

target.depthTexture = new THREE.DepthTexture();
target.depthTexture.type = THREE.UnsignedShortType;

const dudvMap = new THREE.TextureLoader().load("./textures/water/HsGbA.png");
dudvMap.wrapS = dudvMap.wrapT = THREE.RepeatWrapping;

const causMap = new THREE.TextureLoader().load("./textures/water/ifoerjf.png");
causMap.wrapS = causMap.wrapT = THREE.RepeatWrapping;

const material = new THREE.ShaderMaterial({
  extensions: {},
  uniforms: {
    time: { value: 1.0 },
    resolution: { value: new THREE.Vector2() },
    cameraNear: { value: camera.near },
    cameraFar: { value: camera.far },
    tDiffuse: { value: null },
    tDepth: { value: null },
    depthFallOf: { value: 1.0 },
    depth: { value: 1.0 },
    color1: { value: new THREE.Color() },
    color2: { value: new THREE.Color() },
    foamWidth: { value: 1.0 },
    foamTexture: { value: dudvMap },
    waveDepth: { value: 1.0 },
    waveFallOf: { value: 1.0 },
    waveSpeed: { value: new THREE.Vector2() },
    waveTiling: { value: 0.5 },
    waveAmount: { value: 0.5 },
    waveCutout: { value: 0.5 },
    causticCutout: { value: 0.5 },
    causticColor: { value: new THREE.Color() },
    causticTexture: { value: causMap },
    causticTiling: { value: 0.5 },
    causticSpeed: { value: 0.5 },
  },
  vertexShader: vert,
  fragmentShader: frag,
});

material.uniforms.tDepth.value = target.depthTexture;
material.uniforms.resolution.value.set(
  window.innerWidth * pixelRatio,
  window.innerHeight * pixelRatio
);

new THREE.TextureLoader().load("./textures/sky.jpg", (texture) => {
  scene.background = texture;
});

// lights

const hemiLight = new THREE.HemisphereLight(
  params.hemisColor,
  params.hemisColor,
  2
);
hemiLight.position.set(0, 500, 0);
scene.add(hemiLight);

const rectLight = new THREE.RectAreaLight(
  params.lightColor,
  params.lightIntensity,
  20,
  8
);
rectLight.rotation.x = Math.PI * -0.9;
rectLight.position.set(0, 18.5, 7);
rectLight.lookAt(0, 0, 7);

scene.add(rectLight);

const rectLight2 = new THREE.RectAreaLight(
  params.lightColor,
  params.lightIntensity,
  20,
  8
);
rectLight2.rotation.x = Math.PI * -0.9;
rectLight2.position.set(0, 18.5, 21.5);
rectLight2.lookAt(0, 0, 21.5);
scene.add(rectLight2);

const rectLight3 = new THREE.RectAreaLight(
  params.lightColor,
  params.lightIntensity,
  20,
  8
);
rectLight3.rotation.x = Math.PI * -0.9;
rectLight3.position.set(0, 18.5, -8.5);
rectLight3.lookAt(0, 0, -8.5);
scene.add(rectLight3);

rectLight.add(new RectAreaLightHelper(rectLight));
rectLight.add(new RectAreaLightHelper(rectLight2));
rectLight.add(new RectAreaLightHelper(rectLight3));

let ambientLight = new THREE.AmbientLight(0xcccccc, 0.1);
  scene.add(ambientLight);

const plane = new THREE.Mesh(new THREE.PlaneGeometry(17.5, 45), material);

scene.add(plane);

let piscina = await loadModel("./models/Piscina.gltf");

piscina = piscina.model;

piscina.scale.set(20, 20, 20);
piscina.position.set(0, -4.5, 3);
piscina.receiveShadow = true;
piscina.castShadow = true;

scene.add(piscina);

let sofa = await loadModel("./models/Sofa.gltf");
sofa = sofa.model;
sofa.scale.set(20, 20, 20);
sofa.position.set(2, 0.5, 26);
sofa.receiveShadow = true;
sofa.castShadow = true;

scene.add(sofa);

let boia = await loadModel("./models/Boia.gltf");
boia = boia.model;
boia.scale.set(10, 10, 10);
boia.position.set(3, 0.3, 0);
boia.receiveShadow = true;
boia.castShadow = true;

scene.add(boia);

let boia2 = await loadModel("./models/Boia_Dois.gltf");
boia2 = boia2.model;
boia2.scale.set(10, 10, 10);
boia2.position.set(-5, 0.2, -13);
boia2.receiveShadow = true;
boia2.castShadow = true;

scene.add(boia2);

let boia3 = await loadModel("./models/Boia_Tres.gltf");
boia3 = boia3.model;
boia3.scale.set(10, 10, 10);
boia3.position.set(12, 1, 15);
boia3.rotation.y = Math.PI / 0.7;
boia3.receiveShadow = true;
boia3.castShadow = true;

scene.add(boia3);

let boia4 = await loadModel("./models/Boia_Tres.gltf");
boia4 = boia4.model;
boia4.scale.set(10, 10, 10);
boia4.position.set(-12, 1, -10);
boia4.rotation.y = Math.PI / 1;
boia4.receiveShadow = true;
boia4.castShadow = true;

scene.add(boia4);

let boia5 = await loadModel("./models/Boia_Tres.gltf");
boia5 = boia5.model;
boia5.scale.set(10, 10, 10);
boia5.position.set(-2, 0, 15);
boia5.rotation.y = Math.PI / 2.4;
boia5.receiveShadow = true;
boia5.castShadow = true;

scene.add(boia5);

let planta = await loadModel("./models/Planta.gltf");
planta = planta.model;
planta.scale.set(15, 15, 15);
planta.position.set(15, 0, -10);
planta.rotation.y = Math.PI / 2.4;
planta.receiveShadow = true;
planta.castShadow = true;

scene.add(planta);

let planta2 = await loadModel("./models/Planta.gltf");
planta2 = planta2.model;
planta2.scale.set(20, 20, 20);
planta2.position.set(15, 0, 25);
planta2.rotation.y = Math.PI / 1.3;
planta2.receiveShadow = true;
planta2.castShadow = true;

scene.add(planta2);

let planta3 = await loadModel("./models/Planta.gltf");
planta3 = planta3.model;
planta3.scale.set(25, 25, 25);
planta3.position.set(-15, 0, 25);
planta3.rotation.y = Math.PI / 90;
planta3.receiveShadow = true;
planta3.castShadow = true;

scene.add(planta3);

let capybara = await loadModel("./models/Capybara.gltf");
    capybara = capybara.model;
    capybara.scale.set(5, 5, 5);
    capybara.position.set(-3, 2, 28);
    capybara.rotation.y = Math.PI / 1.2;
    capybara.receiveShadow = true;
    capybara.castShadow = true;

    scene.add(capybara);

new OrbitControls(camera, renderer.domElement);

const loop = () => {
  if (!supportsExtension) return;

  material.uniforms.tDepth.value = target.depthTexture;
  material.uniforms.resolution.value.set(
    window.innerWidth * pixelRatio,
    window.innerHeight * pixelRatio
  );

  animateBoia();

  renderer.setRenderTarget(target);
  renderer.render(scene, camera);
  renderer.setRenderTarget(null);

  const time = clock.getElapsedTime();
  plane.material.uniforms.time.value = time;

  plane.material.uniforms.depthFallOf.value = params.depthFallOf;
  plane.material.uniforms.depth.value = params.depth;
  plane.material.uniforms.foamWidth.value = params.foamWidth;

  plane.material.uniforms.color1.value.set(params.color1);
  plane.material.uniforms.color2.value.set(params.color2);

  plane.material.uniforms.waveFallOf.value = params.waveFallOf;
  plane.material.uniforms.waveDepth.value = params.waveDepth;

  plane.material.uniforms.waveTiling.value = params.waveTiling;
  plane.material.uniforms.waveAmount.value = params.waveAmount;
  plane.material.uniforms.waveSpeed.value.x = params.waveSpeedX;
  plane.material.uniforms.waveSpeed.value.y = params.waveSpeedY;

  plane.material.uniforms.waveCutout.value = params.waveCutout;

  plane.material.uniforms.causticCutout.value = params.causticCutout;
  plane.material.uniforms.causticColor.value.set(params.causticColor);
  plane.material.uniforms.causticTiling.value = params.causticTiling;
  plane.material.uniforms.causticSpeed.value = params.causticSpeed;

  plane.position.y = 0;
  plane.position.x = 0;
  plane.position.z = 0;
  plane.rotation.x = -Math.PI * 0.5;

  renderer.render(scene, camera);

  //stats
  stats.update();

  //keep looping
  window.requestAnimationFrame(loop);
};
loop();

window.addEventListener("resize", () => {
  //save sizes
  sizes.width = window.innerWidth;
  sizes.height = window.innerHeight;
  //update camera
  camera.aspect = sizes.width / sizes.height;
  camera.updateProjectionMatrix();
  // Update renderer
  renderer.setSize(sizes.width, sizes.height);
});
