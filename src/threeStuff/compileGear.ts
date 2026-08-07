import type { Gear } from "../generate/gear";
import { distance, type Vector2d } from "../generate/vector";

export const compileGearToPolygon = (gear: Gear): Vector2d[] => {
  const polygon: Vector2d[] = [];
  const { toothRoots, fwdFlanks, bwdFlanks } = gear;
  fwdFlanks.forEach((fwdFlank, i) => {
    const toothRootIndex = fwdFlank.root.fidelicIndex;
    //console.log(distance(fwdFlank.tip[0], fwdFlank.root.vertex));
    const bwdFlank = bwdFlanks[i];
    if (!gear.isConjugate) {
      const fwdBase = fwdFlank.base
        .splice(0, fwdFlank.base.length - 1)
        .reverse();
      const fwdTip = fwdFlank.tip.splice(0, fwdFlank.tip.length - 1);
      const bwdTip = bwdFlank.tip.splice(0, bwdFlank.tip.length - 1).reverse();
      const bwdBase = bwdFlank.base.splice(0, bwdFlank.base.length - 1);
      polygon.push(...bwdTip, ...bwdBase, ...fwdBase, ...fwdTip);
    } else {
      const fwdBase = fwdFlank.base.splice(0, fwdFlank.base.length - 1);
      const fwdTip = fwdFlank.tip.splice(0, fwdFlank.tip.length - 1).reverse();
      const bwdTip = bwdFlank.tip.splice(0, bwdFlank.tip.length - 1);
      const bwdBase = bwdFlank.base
        .splice(0, bwdFlank.base.length - 1)
        .reverse();
      polygon.push(...bwdBase, ...bwdTip, ...fwdTip, ...fwdBase);
    }
  });
  return polygon;
};

import * as THREE from "three";

export const polygonToExtrudedMesh = (
  outer: Vector2d[],
  holes: Vector2d[][],
  height: number,
): THREE.Mesh => {
  const shape = new THREE.Shape();

  shape.moveTo(outer[0].x, outer[0].y);
  for (let i = 1; i < outer.length; i++) {
    shape.lineTo(outer[i].x, outer[i].y);
  }
  shape.closePath();

  for (const points of holes) {
    const hole = new THREE.Path();
    hole.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      hole.lineTo(points[i].x, points[i].y);
    }
    hole.closePath();
    shape.holes.push(hole);
  }

  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: height,
    bevelEnabled: false,
  });

  const material = new THREE.MeshBasicMaterial();
  return new THREE.Mesh(geometry, material);
};
