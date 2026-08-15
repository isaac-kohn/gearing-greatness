import type { Gear } from "../generate/gear";
import { distance, scale, type Vector2d } from "../generate/vector";

export interface PolygonWithHoles {
  polygon: Vector2d[];
  holes: Vector2d[][];
}

export const compileGearToPolygon = (gear: Gear): PolygonWithHoles => {
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
  // again, this pipeline might be kind of stupid, since i keep separation between rendering / geometry everywhere else,
  // and yet my gear geometry is measured in html canvas pixels, but i don't see a reason to change it at the moment
  // so this here is just pixels -> mm conversion
  const resize = (vertices: Vector2d[]) =>
    vertices.map((v) => scale(v, gear.desiredAxleDistance / gear.axleDistance));
  return { polygon, holes: gear.holes };
  return { polygon: resize(polygon), holes: gear.holes.map(resize) }; //.map((v) => scale(v, 56 / gear.axleDistance));
};

import { Mesh, Shape, Path, ExtrudeGeometry, MeshBasicMaterial } from "three";

export const polygonToExtrudedMesh = (
  polygonWithHoles: PolygonWithHoles,
  height: number,
): Mesh => {
  const outer = polygonWithHoles.polygon;
  const holes = polygonWithHoles.holes;
  const shape = new Shape();

  shape.moveTo(outer[0].x, outer[0].y);
  for (let i = 1; i < outer.length; i++) {
    shape.lineTo(outer[i].x, outer[i].y);
  }
  shape.closePath();

  for (const points of holes) {
    const hole = new Path();
    hole.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      hole.lineTo(points[i].x, points[i].y);
    }
    hole.closePath();
    shape.holes.push(hole);
  }

  const geometry = new ExtrudeGeometry(shape, {
    depth: height,
    bevelEnabled: false,
  });

  const material = new MeshBasicMaterial();
  return new Mesh(geometry, material);
};
