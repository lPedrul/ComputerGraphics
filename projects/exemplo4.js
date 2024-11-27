// ThreeJS and Third-party deps
import * as THREE from "three";
import * as dat from "dat.gui";
import Stats from "three/examples/jsm/libs/stats.module";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { RectAreaLightHelper } from "three/examples/jsm/helpers/RectAreaLightHelper";
import { Water } from "three/examples/jsm/objects/Water2";
import { BokehPass } from "three/examples/jsm/postprocessing/BokehPass";

// Core boilerplate code deps
import {
  createCamera,
  createComposer,
  createRenderer,
  runApp,
  updateLoadingProgressBar,
  getDefaultUniforms,
} from "./core-utils";

import { loadModel } from "./common-utils";

THREE.ColorManagement.enabled = true;

/**************************************************
 * 0. Tweakable parameters for the scene
 *************************************************/
const params = {
  color: "#7dffd8",
  lightColor: "#ffffff",
  hemisColor: "#ff0096",
  lightIntensity: 4,
  scale: 1,
  flowX: 0,
  flowY: -1,
  reflectivity: 0.5,
  refractionRatio: 0.5,
  distortionScale: 10,

  foamColor: 0xffffff,
  waterColor: 0x14c6a5,
  threshold: 0.1,
};

const uniforms = {
  ...getDefaultUniforms(),
};

let scene = new THREE.Scene();
let renderer = createRenderer({ antialias: true }, (_renderer) => {
  _renderer.outputColorSpace = THREE.SRGBColorSpace;
});

let camera = createCamera(70, 1, 1000, { x: -34, y: 10, z: 1 });

let app = {
  async initScene() {
    this.controls = new OrbitControls(camera, renderer.domElement);
    this.controls.enableDamping = true;

    this.clock = new THREE.Clock();

    await updateLoadingProgressBar(0.1);

    //#region Lights

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
    rectLight.position.set(4, 18.5, 2);
    rectLight.lookAt(4, 0, 2);

    scene.add(rectLight);

    const rectLight2 = new THREE.RectAreaLight(
      params.lightColor,
      params.lightIntensity,
      20,
      8
    );
    rectLight2.rotation.x = Math.PI * -0.9;
    rectLight2.position.set(19, 18.5, 2);
    rectLight2.lookAt(19, 0, 2);
    scene.add(rectLight2);

    const rectLight3 = new THREE.RectAreaLight(
      params.lightColor,
      params.lightIntensity,
      20,
      8
    );
    rectLight3.rotation.x = Math.PI * -0.9;
    rectLight3.position.set(-11, 18.5, 2);
    rectLight3.lookAt(-11, 0, 2);
    scene.add(rectLight3);

    rectLight.add(new RectAreaLightHelper(rectLight));
    rectLight.add(new RectAreaLightHelper(rectLight2));
    rectLight.add(new RectAreaLightHelper(rectLight3));

    let ambientLight = new THREE.AmbientLight(0xcccccc, 0.1);
    scene.add(ambientLight);

    const poolLight = new THREE.RectAreaLight(params.color, 1.5, 45, 14);
    poolLight.rotation.x = Math.PI * -0.9;
    poolLight.position.set(0, 0, 3);
    poolLight.lookAt(0, -1, 3);
    scene.add(poolLight);

    //#endregion

    //#region water
    const geoFloor = new THREE.PlaneGeometry(17.5, 45);

    const water = new Water(geoFloor, {
      waterColor: params.color,
      textureWidth: 1024,
      textureHeight: 1024,
      waterNormals: new THREE.TextureLoader().load(
        "./textures/water/hOIsXiZ.png",
        (texture) => {
          texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
        }
      ),
      fog: scene.fog !== undefined,
    });

    water.position.y = 0;
    water.rotation.x = -Math.PI / 2;

    scene.add(water);

    await updateLoadingProgressBar(0.5);

    //#endregion

    this.render = () => {
      //water.material.uniforms["time"].value += 2.0 / 60.0;

      renderer.render(scene, camera);
    };

    //#region Models

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
    sofa.position.set(23, 0.5, 1);
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
    boia2.position.set(-15, 0.2, 8);
    boia2.receiveShadow = true;
    boia2.castShadow = true;

    scene.add(boia2);

    let boia3 = await loadModel("./models/Boia_Tres.gltf");
    boia3 = boia3.model;
    boia3.scale.set(10, 10, 10);
    boia3.position.set(-10, 1, 15);
    boia3.rotation.y = Math.PI / 0.7;
    boia3.receiveShadow = true;
    boia3.castShadow = true;
    
    scene.add(boia3);
    
    let boia4 = await loadModel("./models/Boia_Tres.gltf");
    boia4 = boia4.model;
    boia4.scale.set(10, 10, 10);
    boia4.position.set(-1, 1, -10);
    boia4.rotation.y = Math.PI / 2.4;
    boia4.receiveShadow = true;
    boia4.castShadow = true;

    scene.add(boia4);

    let boia5 = await loadModel("./models/Boia_Tres.gltf");
    boia5 = boia5.model;
    boia5.scale.set(10, 10, 10);
    boia5.position.set(14, 0, 8);
    boia5.rotation.y = Math.PI / 2.4;
    boia5.receiveShadow = true;
    boia5.castShadow = true;

    scene.add(boia5);

    let planta = await loadModel("./models/Planta.gltf");
    planta = planta.model;
    planta.scale.set(15, 15, 15);
    planta.position.set(0, 0, -17);
    planta.rotation.y = Math.PI / 2.4;
    planta.receiveShadow = true;
    planta.castShadow = true;

    scene.add(planta);

    let planta2 = await loadModel("./models/Planta.gltf");
    planta2 = planta2.model;
    planta2.scale.set(20, 20, 20);
    planta2.position.set(25, 0, -11);
    planta2.rotation.y = Math.PI / 1.3;
    planta2.receiveShadow = true;
    planta2.castShadow = true;

    scene.add(planta2);

    let planta3 = await loadModel("./models/Planta.gltf");
    planta3 = planta3.model;
    planta3.scale.set(25, 25, 25);
    planta3.position.set(25, 0, 20);
    planta3.rotation.y = Math.PI / 2.2;
    planta3.receiveShadow = true;
    planta3.castShadow = true;

    scene.add(planta3);

    let capybara = await loadModel("./models/Capybara.gltf");
    capybara = capybara.model;
    capybara.scale.set(5, 5, 5);
    capybara.position.set(25, 2, 2);
    capybara.rotation.y = Math.PI / -2.2;
    capybara.receiveShadow = true;
    capybara.castShadow = true;

    scene.add(capybara);

    this.animateBoia = () => {
      if (this.switch) {
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
        this.switch = false;
      }
      if (boia.rotation.x < -0.1) {
        this.switch = true;
      }
    };

    //#endregion

    water.rotation.z = Math.PI / 2 ;
    boia.rotation.y = Math.PI / 2;
    sofa.rotation.y = Math.PI / 2;
    piscina.rotation.y = Math.PI / 2 ;
    rectLight.rotation.z = Math.PI / 2 ;
    rectLight2.rotation.z = Math.PI / 2;
    rectLight3.rotation.z = Math.PI / 2;
    water.position.set(-1, 0, 3)
    new THREE.TextureLoader().load("./textures/sky.jpg", (texture) => {
      scene.background = texture;
    });

    //#region GUI

    // GUI controls
    const gui = new dat.GUI();

    gui.addColor(params, "color").onChange(function (value) {
      //water.material.uniforms["waterColor"].value.set(value);
      poolLight.color.set(value);
    });

    gui.add(params, "scale", 1, 10).onChange(function (value) {
      water.material.uniforms["config"].value.w = value;
    });

    gui.addColor(params, "hemisColor").onChange(function (value) {
      hemiLight.color.set(value);
      hemiLight.groundColor.set(value);
    });

    gui.addColor(params, "lightColor", 0, 1).onChange(function (value) {
      rectLight.color.set(value);
      rectLight2.color.set(value);
      rectLight3.color.set(value);
    });

    gui.add(params, "lightIntensity", 0, 5).onChange(function (value) {
      rectLight.intensity = value;
      rectLight2.intensity = value;
      rectLight3.intensity = value;
    });

    gui.add(params, "reflectivity", 0, 1).onChange(function (value) {
      water.material.uniforms["reflectivity"].value = value;
    });
    gui
      .add(params, "flowX", -1, 1)
      .step(0.01)
      .onChange(function (value) {
        water.material.uniforms["flowDirection"].value.x = value;
        water.material.uniforms["flowDirection"].value.normalize();
      });
    gui
      .add(params, "flowY", -1, 1)
      .step(0.01)
      .onChange(function (value) {
        water.material.uniforms["flowDirection"].value.y = value;
        water.material.uniforms["flowDirection"].value.normalize();
      });

    //#endregion

    this.stats1 = new Stats();
    this.stats1.showPanel(0);
    this.stats1.domElement.style.cssText =
      "position:absolute;top:0px;left:0px;";
    this.container.appendChild(this.stats1.domElement);

    this.switch = false;

    await updateLoadingProgressBar(1.0, 100);
  },
  updateScene() {
    this.controls.update();
    this.stats1.update();

    this.animateBoia();
    this.render();
  },
};

/**************************************************
 * 3. Run the app
 * 'runApp' will do most of the boilerplate setup code for you:
 * e.g. HTML container, window resize listener, mouse move/touch listener for shader uniforms, THREE.Clock() for animation
 * Executing this line puts everything together and runs the app
 * ps. if you don't use custom shaders, pass undefined to the 'uniforms'(2nd-last) param
 * ps. if you don't use post-processing, pass undefined to the 'composer'(last) param
 *************************************************/
runApp(app, scene, renderer, camera, true);
