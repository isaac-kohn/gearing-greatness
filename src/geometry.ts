import { normalize } from "three/src/math/MathUtils.js";
import {
  add,
  direction,
  magnitude,
  normal,
  scale,
  sub,
  type Vector2d,
} from "./vector";
export interface PolygonalLoop {
  // defined
  vertices: Vector2d[]; // vertices are relative to center
  center: Vector2d;
  // derived
  // cumulativeLengths: number[];
  // totalLength: number;
}

export const createPolygonalLoop = (
  center: Vector2d,
  vertices: Vector2d[],
) => {};

export const createLoopFromPolarFunction = (
  center: Vector2d,
  polarFunction: (theta: number) => number,
  numVertices: number,
): PolygonalLoop => {
  const vertices: Vector2d[] = [];
  for (let i = 0; i < numVertices; i++) {
    const theta = (i / numVertices) * 2 * Math.PI;
    vertices.push({
      x: center.x + polarFunction(theta) * Math.cos(theta),
      y: center.y + polarFunction(theta) * Math.sin(theta),
    });
  }

  return { vertices, center };
};

export const createConjugateLoop = (
  loop: PolygonalLoop,
  conjugateCenter: Vector2d,
): PolygonalLoop => {
  const dist = magnitude(sub(conjugateCenter, loop.center));
  const vertices = loop.vertices.map((vertex) => {
    const org = sub(vertex, loop.center);
    const dir = Math.PI - direction(org);
    const mag = dist - magnitude(org);
    return {
      x: conjugateCenter.x + mag * Math.cos(dir),
      y: conjugateCenter.y + mag * Math.sin(dir),
    };
  });
  return { vertices, center: conjugateCenter };
};

export const positionAtLoopDistance = (
  loop: PolygonalLoop,
  distance: number,
): Vector2d => {
  let distLeft = distance;

  return { x: 0, y: 0 };
};

export const createCircleLoop = (
  position: Vector2d,
  radius: number,
  numVertices: number,
): PolygonalLoop => {
  const vertices: Vector2d[] = [];
  for (let i = 0; i < numVertices; i++) {
    vertices.push({
      x: position.x + radius * Math.cos((i / numVertices) * 2 * Math.PI),
      y: position.y + radius * Math.sin((i / numVertices) * 2 * Math.PI),
    });
  }
  return { vertices, center: position };
};

export const dendumize = (
  loop: PolygonalLoop,
  distance: number,
): PolygonalLoop => {
  const vertices = loop.vertices.map((vertex) => {
    const v0 = sub(vertex, loop.center);
    const v1 = add(v0, scale(normal(v0), distance));
    return add(v1, loop.center);
  });
  return { vertices, center: loop.center };
};
