// ThreeJS and Third-party deps

import { loadModel } from "./common-utils";
import { RectAreaLightHelper } from "three/examples/jsm/helpers/RectAreaLightHelper";

const fragmentShader = /* glsl */ `

#include <common>
#include <packing>
#include <fog_pars_fragment>

varying vec2 vUv;
uniform sampler2D tDepth;
uniform sampler2D tDudv;
uniform vec3 waterColor;
uniform vec3 foamColor;
uniform float cameraNear;
uniform float cameraFar;
uniform float time;
uniform float threshold;
uniform vec2 resolution;

float getDepth( const in vec2 screenPosition ) {
  #if DEPTH_PACKING == 1
    return unpackRGBAToDepth( texture2D( tDepth, screenPosition ) );
  #else
    return texture2D( tDepth, screenPosition ).x;
  #endif
}

float getViewZ( const in float depth ) {
  #if ORTHOGRAPHIC_CAMERA == 1
    return orthographicDepthToViewZ( depth, cameraNear, cameraFar );
  #else
    return perspectiveDepthToViewZ( depth, cameraNear, cameraFar );
  #endif
}

void main() {

  vec2 screenUV = gl_FragCoord.xy / resolution;

  float fragmentLinearEyeDepth = getViewZ( gl_FragCoord.z );
  float linearEyeDepth = getViewZ( getDepth( screenUV ) );

  float diff = saturate( fragmentLinearEyeDepth - linearEyeDepth );

  vec2 displacement = texture2D( tDudv, ( vUv * 2.0 ) - time * 0.05 ).rg;
  displacement = ( ( displacement * 2.0 ) - 1.0 ) * 1.0;
  diff += displacement.x;

  gl_FragColor.rgb = mix( foamColor, waterColor, step( threshold, diff ) );
  gl_FragColor.a = 1.0;

  #include <tonemapping_fragment>
  #include <encodings_fragment>
  #include <fog_fragment>

}
`;

const vertexShader = /* glsl */ `

#include <fog_pars_vertex>

varying vec2 vUv;

void main() {

  vUv = uv;

  #include <begin_vertex>
  #include <project_vertex>
  #include <fog_vertex>

}
`;

import * as THREE from "three";

import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GUI } from "dat.gui";

var camera, scene, renderer, renderTarget, depthMaterial, clock, piscina, sofa, boia, boia2, boia3, boia4, boia5, planta, planta2, planta3;

var water;

var params = {
  foamColor: 0xffffff,
  waterColor: 0x39afcf,
  threshold: 0.58,
  color: "#7dffd8",
  lightColor: "#ffffff",
  hemisColor: "#ff0096",
  lightIntensity: 4,
  switch: false
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

start();

async function start() {
  await init();
  animate();
}

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

async function init() {
  clock = new THREE.Clock();

  camera = createCamera(70, 1, 1000, { x: 0, y: 10, z: -34 });

  scene = new THREE.Scene();
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

  piscina = await loadModel("./models/Piscina.gltf");

  piscina = piscina.model;

  piscina.scale.set(20, 20, 20);
  piscina.position.set(0, -4.5, 3);
  piscina.receiveShadow = true;
  piscina.castShadow = true;

  scene.add(piscina);

  sofa = await loadModel("./models/Sofa.gltf");
  sofa = sofa.model;
  sofa.scale.set(20, 20, 20);
  sofa.position.set(2, 0.5, 26);
  sofa.receiveShadow = true;
  sofa.castShadow = true;

  scene.add(sofa);

  boia = await loadModel("./models/Boia.gltf");
  boia = boia.model;
  boia.scale.set(10, 10, 10);
  boia.position.set(3, 0.3, 0);
  boia.receiveShadow = true;
  boia.castShadow = true;

  scene.add(boia);

  boia2 = await loadModel("./models/Boia_Dois.gltf");
  boia2 = boia2.model;
  boia2.scale.set(10, 10, 10);
  boia2.position.set(-5, 0.2, -13);
  boia2.receiveShadow = true;
  boia2.castShadow = true;

  scene.add(boia2);

  boia3 = await loadModel("./models/Boia_Tres.gltf");
  boia3 = boia3.model;
  boia3.scale.set(10, 10, 10);
  boia3.position.set(12, 1, 15);
  boia3.rotation.y = Math.PI / 0.7;
  boia3.receiveShadow = true;
  boia3.castShadow = true;

  scene.add(boia3);

  boia4 = await loadModel("./models/Boia_Tres.gltf");
  boia4 = boia4.model;
  boia4.scale.set(10, 10, 10);
  boia4.position.set(-12, 1, -10);
  boia4.rotation.y = Math.PI / 1;
  boia4.receiveShadow = true;
  boia4.castShadow = true;

  scene.add(boia4);

  boia5 = await loadModel("./models/Boia_Tres.gltf");
  boia5 = boia5.model;
  boia5.scale.set(10, 10, 10);
  boia5.position.set(-2, 0, 15);
  boia5.rotation.y = Math.PI / 2.4;
  boia5.receiveShadow = true;
  boia5.castShadow = true;

  scene.add(boia5);

  planta = await loadModel("./models/Planta.gltf");
  planta = planta.model;
  planta.scale.set(15, 15, 15);
  planta.position.set(15, 0, -10);
  planta.rotation.y = Math.PI / 2.4;
  planta.receiveShadow = true;
  planta.castShadow = true;

  scene.add(planta);

  planta2 = await loadModel("./models/Planta.gltf");
  planta2 = planta2.model;
  planta2.scale.set(20, 20, 20);
  planta2.position.set(15, 0, 25);
  planta2.rotation.y = Math.PI / 1.3;
  planta2.receiveShadow = true;
  planta2.castShadow = true;

  scene.add(planta2);

  planta3 = await loadModel("./models/Planta.gltf");
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

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.gammaOutput = true;
  document.body.appendChild(renderer.domElement);

  var supportsDepthTextureExtension = !!renderer.extensions.get(
    "WEBGL_depth_texture"
  );

  var pixelRatio = renderer.getPixelRatio();

  renderTarget = new THREE.WebGLRenderTarget(
    window.innerWidth * pixelRatio,
    window.innerHeight * pixelRatio
  );
  renderTarget.texture.minFilter = THREE.NearestFilter;
  renderTarget.texture.magFilter = THREE.NearestFilter;
  renderTarget.texture.generateMipmaps = false;
  renderTarget.stencilBuffer = false;

  if (supportsDepthTextureExtension === true) {
    renderTarget.depthTexture = new THREE.DepthTexture();
    renderTarget.depthTexture.type = THREE.UnsignedShortType;
    renderTarget.depthTexture.minFilter = THREE.NearestFilter;
    renderTarget.depthTexture.maxFilter = THREE.NearestFilter;
  }

  depthMaterial = new THREE.MeshDepthMaterial();
  depthMaterial.depthPacking = THREE.RGBADepthPacking;
  depthMaterial.blending = THREE.NoBlending;

  // water

  var dudvMap = new THREE.TextureLoader().load(
    "https://i.imgur.com/hOIsXiZ.png"
  );
  dudvMap.wrapS = dudvMap.wrapT = THREE.RepeatWrapping;

  var uniforms = {
    time: {
      value: 0,
    },
    threshold: {
      value: 0.1,
    },
    tDudv: {
      value: null,
    },
    tDepth: {
      value: null,
    },
    cameraNear: {
      value: 0,
    },
    cameraFar: {
      value: 0,
    },
    resolution: {
      value: new THREE.Vector2(),
    },
    foamColor: {
      value: new THREE.Color(),
    },
    waterColor: {
      value: new THREE.Color(),
    },
  };

  var waterGeometry = new THREE.PlaneGeometry(17.5, 45);
  var waterMaterial = new THREE.ShaderMaterial({
    defines: {
      DEPTH_PACKING: supportsDepthTextureExtension === true ? 0 : 1,
      ORTHOGRAPHIC_CAMERA: 0,
    },
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib["fog"], uniforms]),
    vertexShader: document.getElementById("vertexShader").textContent,
    fragmentShader: document.getElementById("fragmentShader").textContent,
    fog: true,
  });

  waterMaterial.uniforms.cameraNear.value = camera.near;
  waterMaterial.uniforms.cameraFar.value = camera.far;
  waterMaterial.uniforms.resolution.value.set(
    window.innerWidth * pixelRatio,
    window.innerHeight * pixelRatio
  );
  waterMaterial.uniforms.tDudv.value = dudvMap;
  waterMaterial.uniforms.tDepth.value =
    supportsDepthTextureExtension === true
      ? renderTarget.depthTexture
      : renderTarget.texture;

  water = new THREE.Mesh(waterGeometry, waterMaterial);
  water.rotation.x = -Math.PI * 0.5;
  water.position.y = 0;
  scene.add(water);

  //

  var controls = new OrbitControls(camera, renderer.domElement);
  //controls.minDistance = 1;
  //controls.maxDistance = 50;

  //

  var gui = new GUI();

  gui.addColor(params, "foamColor");
  gui.addColor(params, "waterColor");
  gui.add(params, "threshold", 0.1, 1);
  gui.open();

  //

  window.addEventListener("resize", onWindowResize, false);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);

  var pixelRatio = renderer.getPixelRatio();

  renderTarget.setSize(
    window.innerWidth * pixelRatio,
    window.innerHeight * pixelRatio
  );
  water.material.uniforms.resolution.value.set(
    window.innerWidth * pixelRatio,
    window.innerHeight * pixelRatio
  );
}

function animate() {
  requestAnimationFrame(animate);

  animateBoia();

  // depth pass

  water.visible = false; // we don't want the depth of the water
  scene.overrideMaterial = depthMaterial;

  renderer.setRenderTarget(renderTarget);
  renderer.render(scene, camera);
  renderer.setRenderTarget(null);

  scene.overrideMaterial = null;
  water.visible = true;

  // beauty pass

  var time = clock.getElapsedTime();

  water.material.uniforms.threshold.value = params.threshold;
  water.material.uniforms.time.value = time;
  water.material.uniforms.foamColor.value.set(params.foamColor);
  water.material.uniforms.waterColor.value.set(params.waterColor);

  renderer.render(scene, camera);
}
