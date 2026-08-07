import {
  arrayBinarySearch,
  curvatureAtIndexOfVertexArray,
  tangentAtIndexOfVertexArray,
} from "./calc";
import type { PolarVector, Vector2d } from "./vector";

import { polarToVertex, distance } from "./vector";

export interface PolygonalLoop {
  polarVectors: PolarVector[];
  // vertices are in local space (relative to an external orientation's center)
  vertices: Vector2d[];
  cumulativeLengths: number[];
  totalLength: number;
  curvatureAtIndex: (index: number) => number;
  findIndexOfCumulativeLength: (length: number) => number;
  tangentAtIndex: (index: number) => Vector2d;
}

const cumulativeLengthsOfVertexPath = (
  vertices: Vector2d[],
): { cumulativeLengths: number[]; totalLength: number } => {
  let cumulativeLengths: number[] = [0];
  for (let i = 0; i < vertices.length - 1; i++) {
    const segmentLength = distance(vertices[i], vertices[i + 1]);
    const lengthSoFar = cumulativeLengths[i];
    cumulativeLengths.push(lengthSoFar + segmentLength);
  }
  const totalLength =
    cumulativeLengths[cumulativeLengths.length - 1] +
    distance(vertices[vertices.length - 1], vertices[0]);
  const testLength1 = cumulativeLengths[cumulativeLengths.length - 1];
  const testLength2 = distance(vertices[vertices.length - 1], vertices[0]);
  console.log(totalLength, testLength1, testLength2, vertices);
  return { cumulativeLengths, totalLength };
};

export const createPolygonalLoop = (
  polarVectors: PolarVector[],
): PolygonalLoop => {
  const vertices = polarVectors.map(polarToVertex);
  const { cumulativeLengths, totalLength } =
    cumulativeLengthsOfVertexPath(vertices);
  return {
    polarVectors,
    vertices,
    cumulativeLengths,
    totalLength,
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
  targetLength = ((targetLength % totalLength) + totalLength) % totalLength;
  if (targetLength > cumulativeLengths[fidelity - 1]) {
    const baseIndex = fidelity;
    console.warn(
      "bug related to cumulative lengths. total Length is too long. see findIndexOfCumulativeLength",
    );
    return baseIndex;
  }
  const baseIndex = arrayBinarySearch(cumulativeLengths, (sampleLength) => {
    if (sampleLength > targetLength) return "high";
    if (sampleLength < targetLength) return "low";
    return "equal";
  });
  return baseIndex;
};
