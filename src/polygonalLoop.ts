import {
  arrayBinarySearch,
  curvatureAtIndexOfVertexArray,
  tangentAtIndexOfVertexArray,
} from "./calc";
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
  // functions
  curvatureAtIndex: (index: number) => number;
  findIndexOfCumulativeLength: (length: number) => number;
  tangentAtIndex: (index: number) => Vector2d;
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
    curvatureAtIndex: (index) => curvatureAtIndexOfVertexArray(vertices, index),
    tangentAtIndex: (index) => tangentAtIndexOfVertexArray(vertices, index),
    findIndexOfCumulativeLength: (length) =>
      findIndexOfCumulativeLength(cumulativeLengths, totalLength, length),
  };
};

const findIndexOfCumulativeLength = (
  cumulativeLengths: number[],
  totalLength: number,
  targetLength: number,
): number => {
  const fidelity = cumulativeLengths.length;
  targetLength = ((targetLength % totalLength) + targetLength) % totalLength;
  if (targetLength > cumulativeLengths[fidelity - 1]) {
    const baseIndex = fidelity;
    return baseIndex;
  }
  const baseIndex = arrayBinarySearch(cumulativeLengths, (sampleLength) => {
    if (sampleLength > targetLength) return "high";
    if (sampleLength < targetLength) return "low";
    return "equal";
  });
  return baseIndex;
};
