import * as THREE from "three";

import { polygonToExtrudedMesh } from "./compileGear";
import type { Vector2d } from "../generate/vector";
import { STLExporter } from "three/examples/jsm/Addons.js";

export interface ThreeWindow {
  element: HTMLDivElement;
  addPolygon: (
    vertices: Vector2d[],
    holes: Vector2d[][],
    height: number,
  ) => void;
  downloadSTL: () => void;
}

export function createThreeWindow(): ThreeWindow {
  const element = document.createElement("div");

  const scene = new THREE.Scene();

  const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
  camera.position.z = 500;

  const renderer = new THREE.WebGLRenderer();
  renderer.setSize(600, 400);
  element.appendChild(renderer.domElement);

  function addPolygon(
    vertices: Vector2d[],
    holes: Vector2d[][],
    height: number,
  ) {
    const mesh = polygonToExtrudedMesh(vertices, holes, height);
    scene.add(mesh);
  }

  function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
  }

  function downloadSTL() {
    const exporter = new STLExporter();
    const stl = exporter.parse(scene);
    const blob = new Blob([stl], {
      type: "application/sla",
    });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = "gear.stl";
    link.click();

    URL.revokeObjectURL(url);
  }

  animate();

  return {
    element,
    addPolygon,
    downloadSTL,
  };
}
