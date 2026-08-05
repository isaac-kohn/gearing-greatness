import * as THREE from "three";

export function createThreeView(): HTMLDivElement {
  const container = document.createElement("div");

  const scene = new THREE.Scene();

  const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);

  const renderer = new THREE.WebGLRenderer();
  renderer.setSize(600, 400);

  container.appendChild(renderer.domElement);

  camera.position.z = 5;

  const geometry = new THREE.BoxGeometry();
  const material = new THREE.MeshBasicMaterial({
    color: 0x00ff00,
  });

  const cube = new THREE.Mesh(geometry, material);
  scene.add(cube);

  function animate() {
    requestAnimationFrame(animate);

    cube.rotation.x += 0.01;
    cube.rotation.y += 0.01;

    renderer.render(scene, camera);
  }

  animate();

  return container;
}
