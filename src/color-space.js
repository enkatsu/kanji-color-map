import './color-space.css';
import * as TWEEN from '@tweenjs/tween.js'
import * as THREE from 'three';
const OrbitControls = require('three-orbit-controls')(THREE);
import * as dat from 'dat.gui';

window.onload = (ev) => {
  const KANJI_JSON_URL = 'public/data/kanji-average.json';
  const FONT_JSON_URL = 'public/fonts/IPAGothic_Regular.json';
  const guiText = function() {
    this.focus = '';
    this.rotateSpeed = 1.0;
    this.autoRotate = false;
    this.gotoIndex = () => {
      document.location = './'
    };
  };
  const text = new guiText();
  const gui = new dat.GUI();
  const focusGui = gui.add(text, 'focus');
  const rotateSpeedGui = gui.add(text, 'rotateSpeed', 0.0, 5.0);
  const autoRotateGui = gui.add(text, 'autoRotate');
  gui.add(text, 'gotoIndex');

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
  const bgGeometry = new THREE.PlaneGeometry(2, 2);
  const bgMaterial = new THREE.ShaderMaterial({
    uniforms: uniforms,
    vertexShader: document.getElementById('vs').textContent,
    fragmentShader: document.getElementById('fs').textContent
  });
  const backgroundMesh = new THREE.Mesh(bgGeometry, bgMaterial);
  backgroundMesh.material.depthTest = false;
  backgroundMesh.material.depthWrite = false;
  backgroundScene.add(backgroundMesh);
  backgroundScene.add(backgroundCamera);

  const fileLoader = new THREE.FileLoader();
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
          const startPosition = {
            x: camera.position.x,
            y: camera.position.y,
            z: camera.position.z
          };
          const startTarget = {
            x: controls.target.x,
            y: controls.target.y,
            z: controls.target.z
          };
          const start = {
            positionX: startPosition.x,
            positionY: startPosition.y,
            positionZ: startPosition.z,
            targetX: startTarget.x,
            targetY: startTarget.y,
            targetZ: startTarget.z,
          };
          const endPosition = centerObj ? {
            x: centerObj.position.x,
            y: centerObj.position.y,
            z: centerObj.position.z + 100
          }: {
            x: axis.position.x,
            y: axis.position.y,
            z: axis.position.z + 400
          };
          const endTarget = centerObj ? {
            x: centerObj.position.x,
            y: centerObj.position.y,
            z: centerObj.position.z
          }: {
            x: axis.position.x,
            y: axis.position.y,
            z: axis.position.z
          };
          const end = {
            positionX: endPosition.x,
            positionY: endPosition.y,
            positionZ: endPosition.z,
            targetX: endTarget.x,
            targetY: endTarget.y,
            targetZ: endTarget.z,
          };
          const tween = new TWEEN.Tween(start)
            .to(end, 1000)
            .easing(TWEEN.Easing.Exponential.Out)
            .onUpdate(function() {
              console.log(start);
              camera.position.x = start.positionX;
              camera.position.y = start.positionY;
              camera.position.z = start.positionZ;
              controls.target.x = start.targetX;
              controls.target.y = start.targetY;
              controls.target.z = start.targetZ;
            })
            .start();
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
    TWEEN.update();
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
