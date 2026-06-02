import { normalize } from "three/src/math/MathUtils.js";
import {
  add,
  direction,
  distance,
  lerp,
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
  cumulativeLengths: number[];
  totalLength: number;
}

export const createPolygonalLoop = (
  vertices: Vector2d[],
  center: Vector2d,
): PolygonalLoop => {
  let cumulativeLengths: number[] = [0];
  for (let i = 0; i < vertices.length - 1; i++) {
    const segmentLength = distance(vertices[i], vertices[i + 1]);
    const lengthSoFar = cumulativeLengths[i];
    cumulativeLengths.push(lengthSoFar + segmentLength);
  }
  return {
    center,
    vertices,
    cumulativeLengths,
    totalLength:
      cumulativeLengths[cumulativeLengths.length - 1] +
      distance(vertices[vertices.length - 1], vertices[0]),
  };
};

15;
0;

15 > 0;
1;

15 > 12;
2;

15 <= 20;
2;

0;
12;
20;
43;

export const positionAtLoopDistance = (
  loop: PolygonalLoop,
  dist: number,
): Vector2d => {
  dist = ((dist % loop.totalLength) + loop.totalLength) % loop.totalLength;
  let i = 0;
  while (
    dist > loop.cumulativeLengths[i] &&
    i < loop.cumulativeLengths.length
  ) {
    i++;
  }
  if (dist === loop.cumulativeLengths[i]) {
    return loop.vertices[i];
  }
  const baseIndex = i - 1;
  const nextIndex = i < loop.cumulativeLengths.length ? i : 0; // preserves looping behaviour
  const baseVector = loop.vertices[baseIndex];
  const nextVector = loop.vertices[nextIndex];
  const distToNext = distance(nextVector, baseVector);
  const distLeftAfterBase = dist - loop.cumulativeLengths[baseIndex];
  const lerpRatio = distLeftAfterBase / distToNext;

  return lerp(baseVector, nextVector, lerpRatio);
};

export const createLoopFromPolarFunction = (
  center: Vector2d,
  polarFunction: (theta: number) => number,
  numVertices: number,
): PolygonalLoop => {
  const vertices: Vector2d[] = [];
  for (let i = 0; i < numVertices; i++) {
    const theta = (i / numVertices) * 2 * Math.PI;
    vertices.push({
      x: polarFunction(theta) * Math.cos(theta),
      y: polarFunction(theta) * Math.sin(theta),
    });
  }

  return createPolygonalLoop(vertices, center);
};

export const createConjugateLoop = (
  loop: PolygonalLoop,
  conjugateCenter: Vector2d,
): PolygonalLoop => {
  const dist = magnitude(sub(conjugateCenter, loop.center));
  const conjugateVertices = loop.vertices.map((vertex) => {
    const dir = Math.PI - direction(vertex);
    const mag = dist - magnitude(vertex);
    return {
      x: mag * Math.cos(dir),
      y: mag * Math.sin(dir),
    };
  });
  return createPolygonalLoop(conjugateVertices, conjugateCenter);
};

export const createCircleLoop = (
  center: Vector2d,
  radius: number,
  numVertices: number,
): PolygonalLoop => {
  const vertices: Vector2d[] = [];
  for (let i = 0; i < numVertices; i++) {
    vertices.push({
      x: radius * Math.cos((i / numVertices) * 2 * Math.PI),
      y: radius * Math.sin((i / numVertices) * 2 * Math.PI),
    });
  }
  return createPolygonalLoop(vertices, center);
};

export const dendumize = (
  loop: PolygonalLoop,
  distance: number,
): PolygonalLoop => {
  const vertices = loop.vertices.map((vertex) =>
    add(vertex, scale(normal(vertex), distance)),
  );
  return createPolygonalLoop(vertices, loop.center);
};
