import { cross, dot, normalizeVector } from "./vector";
import type { PolarVector, Vector2d } from "./vector";

import { polarToVertex, distance, sub, getAngle, rotate } from "./vector";

export interface PolygonalLoop {
  polarVectors: PolarVector[];
  // defined
  center: Vector2d;
  // derived
  vertices: Vector2d[]; // vertices are relative to center
  cumulativeLengths: number[];
  totalLength: number;
  // default
  rotation: number;
}

const cumulativeLengthsOfVertexPath = (
  vertices: Vector2d[],
): { cumulativeLengths; totalLength } => {
  let cumulativeLengths: number[] = [0];
  for (let i = 0; i < vertices.length - 1; i++) {
    const segmentLength = distance(vertices[i], vertices[i + 1]);
    const lengthSoFar = cumulativeLengths[i];
    cumulativeLengths.push(lengthSoFar + segmentLength);
  }
  const totalLength =
    cumulativeLengths[cumulativeLengths.length - 1] +
    distance(vertices[vertices.length - 1], vertices[0]);
  return { cumulativeLengths, totalLength };
};

export const createPolygonalLoop = (
  center: Vector2d,
  polarVectors: PolarVector[],
): PolygonalLoop => {
  const vertices = polarVectors.map(polarToVertex);
  const { cumulativeLengths, totalLength } =
    cumulativeLengthsOfVertexPath(vertices);
  return {
    center,
    polarVectors,
    vertices,
    cumulativeLengths,
    totalLength,
    rotation: 0,
  };
};

export const tangentAtIndex = (
  vertices: Vector2d[],
  index: number,
): Vector2d => {
  const nextIndex = index + 1 < vertices.length ? index + 1 : 0;
  return normalizeVector(sub(vertices[nextIndex], vertices[index]));
};

// menger curvature: https://en.wikipedia.org/wiki/Menger_curvature
export const curvatureAtIndex = (
  vertices: Vector2d[],
  index: number,
): number => {
  index = Math.round(index);
  const len = vertices.length;
  if (len < 3) return 0;

  const i0 = ((index % len) - 1 + len) % len;
  const i1 = ((index % len) + len) % len;
  const i2 = (((index + 1) % len) + len) % len;

  const v0 = vertices[i0];
  const v1 = vertices[i1];
  const v2 = vertices[i2];

  const tang0 = sub(v1, v0);
  const tang1 = sub(v2, v1);

  const side0 = distance(v0, v1);
  const side1 = distance(v1, v2);
  const side2 = distance(v0, v2);

  if (side0 === 0 || side1 === 0 || side2 === 0) return 0;

  const theta = Math.atan2(cross(tang0, tang1), dot(tang0, tang1));
  return (2 * Math.sin(theta)) / side2;
};
