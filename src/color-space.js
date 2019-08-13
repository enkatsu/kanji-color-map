import "./index.css";
import * as THREE from 'three';
const OrbitControls = require('three-orbit-controls')(THREE);
import * as dat from 'dat.gui';

window.onload = (ev) => {
  const guiText = function() {
    this.focus = '';
    this.rotateSpeed = 1.0;
    this.autoRotate = false;
  };
  const text = new guiText();
  const gui = new dat.GUI();
  const focusGui = gui.add(text, 'focus');
  const rotateSpeedGui = gui.add(text, 'rotateSpeed', 0.0, 5.0);
  const autoRotateGui = gui.add(text, 'autoRotate');

  const radians = degree => degree * (Math.PI / 180);
  const scene = new THREE.Scene();
  const aspect = window.innerWidth / window.innerHeight;
  const camera = new THREE.PerspectiveCamera(75, aspect, 0.1, 1000);
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableKeys = false;
  autoRotateGui.onChange( v => { controls.autoRotate = v; });
  rotateSpeedGui.onChange( v => { controls.autoRotateSpeed = v; });
  const axis = new THREE.AxesHelper(100);
  const light = new THREE.DirectionalLight(0xb4e7f2, 1.5);
  light.position.set(1, 1, 1);
  light.target.position.set(0, 0, 0);
  scene.add(axis);
  scene.add(light);
  scene.add(light.target);
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);
  camera.position.set(50, 50, 400);

  const uniforms = {
    time: { type: 'f', value: 1.0 },
    resolution: { type: 'v2', value: new THREE.Vector2() }
  };
  const backgroundScene = new THREE.Scene();
  const backgroundCamera = new THREE.Camera();
  const bgMaterial = new THREE.ShaderMaterial({
    uniforms: uniforms,
    vertexShader: document.getElementById('vs').textContent,
    fragmentShader: document.getElementById('fs').textContent
  });
  const backgroundMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(2, 2, 0),
    bgMaterial
  );
  backgroundMesh.material.depthTest = false;
  backgroundMesh.material.depthWrite = false;
  backgroundScene.add(backgroundMesh);
  backgroundScene.add(backgroundCamera);

  const fileLoader = new THREE.FileLoader();
  const KANJI_JSON_URL = 'kanji-average.json';
  const FONT_JSON_URL = 'fonts/IPAGothic_Regular.json';
  fileLoader.load(KANJI_JSON_URL, (data) => {
      const fontLoader = new THREE.FontLoader();
      fontLoader.load(FONT_JSON_URL, (font) => {
        const kanjis = JSON.parse(data).kanjis;
        // *** focus text input ***
        const focusInput = focusGui.domElement.getElementsByTagName('input')[0];
        focusInput.setAttribute('list', 'kanjis');
        const kanjiDataList = document.createElement('datalist');
        kanjiDataList.setAttribute('id', 'kanjis');
        kanjis.forEach( kanji => {
          const kanjiOption = document.createElement('option');
          kanjiOption.setAttribute('value', kanji.name);
          kanjiDataList.appendChild(kanjiOption);
        });
        focusGui.domElement.appendChild(kanjiDataList);
        focusGui.onFinishChange( ev => {
          const centerObj = scene.getObjectByName(`kanji-${ev}`);
          if (centerObj) {
            controls.target = centerObj.position;
          } else {
            controls.target = axis.position;
          }
        });

        const meshs = kanjis.map(kanji => {
          const geometory = new THREE.TextGeometry(kanji.name, {
            font: font,
            size: 20,
            height: 5,
            curveSegments: 6,
          });
          const materials = [
            new THREE.MeshBasicMaterial({
              color: parseInt(`0x${kanji.hex}`)
            }),
            new THREE.MeshBasicMaterial({
              color: 0x000000
            })
          ];
          const mesh = new THREE.Mesh(geometory, materials);
          const scale = 500;
          const h = radians(kanji.hls[0]);
          const l = kanji.hls[1] / 100.0;
          const s = kanji.hls[2] / 100.0;
          const z = Math.cos(h) * s * scale / 2;
          const x = Math.sin(h) * s * scale / 2;
          const y = l * scale - scale / 2;
          mesh.position.set(x, y, z);
          // mesh.position.set(...kanji.rgb);
          mesh.name = `kanji-${kanji.name}`;
          return mesh;
        });
        const kanjiGroup = new THREE.Group();
        kanjiGroup.name = 'kanji-group';
        kanjiGroup.add(...meshs)
        scene.add(kanjiGroup);
      });
    },
    (xhr) => {
      console.log((xhr.loaded / xhr.total * 100) + '% loaded')
    },
    (err) => {
      console.error('An error happened', err)
    }
  );

  const render = () => {
    uniforms.time.value += 0.05;
    requestAnimationFrame(render);
    controls.update();
    const kanjiGroup = scene.getObjectByName('kanji-group');
    if (kanjiGroup) {
      for (const child of kanjiGroup.children) {
        child.lookAt(camera.position);
      }
    }
    // renderer.setClearColor(0xaabbcc, 1.0);
    renderer.autoClear = false;
    renderer.clear();
    renderer.render(backgroundScene, backgroundCamera);
    renderer.render(scene, camera);
  };

  const onWindowResize = (_) => {
    renderer.setSize(window.innerWidth, window.innerHeight);
    uniforms.resolution.value.x = renderer.domElement.width;
    uniforms.resolution.value.y = renderer.domElement.height;
  };
  onWindowResize();
  window.addEventListener('resize', onWindowResize, false);
  render();
};