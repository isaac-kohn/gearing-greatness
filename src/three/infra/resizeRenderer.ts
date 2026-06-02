import * as THREE from "three";

export function resizeRenderer(
  renderer: THREE.WebGLRenderer,
  camera: THREE.Camera,
) {
  const canvas = renderer.domElement;

  const pixelRatio = Math.min(window.devicePixelRatio, 2);

  const width = Math.floor(canvas.clientWidth * pixelRatio);

  const height = Math.floor(canvas.clientHeight * pixelRatio);

  const needResize = canvas.width !== width || canvas.height !== height;

  if (needResize) {
    renderer.setSize(width, height, false);

    if (camera instanceof THREE.PerspectiveCamera) {
      camera.aspect = canvas.clientWidth / canvas.clientHeight;

      camera.updateProjectionMatrix();
    }
  }
}
