/*import { createApp } from "./ui/createApp";

createApp();

import "./style.css";

import * as THREE from "three";

import { resizeRenderer } from "./infra/resizeRenderer";

const canvas = document.querySelector("#c") as HTMLCanvasElement;

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
});

const scene = new THREE.Scene();

scene.background = new THREE.Color(0x111111);

const camera = new THREE.PerspectiveCamera(75, 2, 0.1, 1000);

camera.position.z = 5;

const cube = new THREE.Mesh(
  new THREE.BoxGeometry(),
  new THREE.MeshNormalMaterial(),
);

scene.add(cube);

// note to self: ask gippity about threejs orbit controls
function animate() {
  resizeRenderer(renderer, camera);

  cube.rotation.x += 0.01;
  cube.rotation.y += 0.01;

  renderer.render(scene, camera);

  requestAnimationFrame(animate);
}

animate();
*/
