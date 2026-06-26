import type { PolarVector, Vector2d } from "./vector";

import { polarToVertex, distance } from "./vector";

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
  const vertices = polarVectors.map((polar) => polarToVertex(polar));
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
