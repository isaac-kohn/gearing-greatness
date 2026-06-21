import type { Vector2d, PolarVector } from "./vector";
import { direction, distance, magnitude, polarToVertex } from "./vector";
import {
  centripetalCatmullRom,
  integratePolarArray,
  numberRangeSearch,
} from "./calc";

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

export const createPolygonalLoopFromVertices = (
  center: Vector2d,
  vertices: Vector2d[],
): PolygonalLoop => {
  const polarVectors = vertices.map((vertex): PolarVector => {
    return { mag: magnitude(vertex), angle: direction(vertex) };
  });
  const { cumulativeLengths, totalLength } =
    cumulativeLengthsOfVertexPath(vertices);
  return {
    center,
    vertices,
    polarVectors,
    cumulativeLengths,
    totalLength,
    rotation: 0,
  };
};

const findConjugateCenterDistance = (
  loopA: PolygonalLoop,
  periodRatio: { a: number; b: number } = { a: 1, b: 1 },
) => {
  const q = periodRatio.b / periodRatio.a;
  const magsA = loopA.polarVectors.map((polar) => polar.mag);
  let supA = Math.max(...magsA);
  return numberRangeSearch(supA, supA / q + supA, (sampleLength: number) => {
    const integrand = loopA.polarVectors.map((polar): PolarVector => {
      return {
        angle: polar.angle,
        mag: polar.mag / (sampleLength - polar.mag),
      };
    });
    const integral = integratePolarArray(integrand);
    console.log(integral);
    if (integral < q * 2 * Math.PI) return "high"; // if the sample distance is too high, the gear wont rotate far enough to reach q
    if (integral > q * 2 * Math.PI) return "low"; // if the sample distance is too low, the gear will rotate past q
    return "equal";
  });
};

export const createConjugateLoop = (
  loopA: PolygonalLoop,
  periodRatio: { a: number; b: number } = { a: 1, b: 1 },
): PolygonalLoop => {
  const centerDist = findConjugateCenterDistance(loopA, periodRatio);

  return createPolygonalLoop(
    {
      x: loopA.center.x + centerDist,
      y: loopA.center.y,
    },
    [
      { mag: 10, angle: 0 },
      { mag: 20, angle: 1 },
      { mag: 30, angle: 2 },
    ],
  );
};

export const uniformizePolygonalLoopAngles = (
  loop: PolygonalLoop,
): PolygonalLoop => {
  return;
};

export const interpolatePolygonalLoop = (
  loop: PolygonalLoop,
  resolutionMultiplier = 10,
): PolygonalLoop => {
  const n = resolutionMultiplier;
  const tSamples = Array.from({ length: n }, (_, k) => k / n);
  let newVertices = [];
  let P0 = loop.vertices[loop.vertices.length - 1];
  let P1 = loop.vertices[0];
  let P2 = loop.vertices[1];
  let P3 = loop.vertices[2];
  let interpolatedSegment = centripetalCatmullRom(P0, P1, P2, P3, tSamples);
  newVertices.push(...interpolatedSegment);
  for (let i = 1; i < loop.vertices.length - 2; i++) {
    P0 = loop.vertices[i - 1];
    P1 = loop.vertices[i];
    P2 = loop.vertices[i + 1];
    P3 = loop.vertices[i + 2];
    interpolatedSegment = centripetalCatmullRom(P0, P1, P2, P3, tSamples);
    newVertices.push(...interpolatedSegment);
  }
  P0 = loop.vertices[loop.vertices.length - 3];
  P1 = loop.vertices[loop.vertices.length - 2];
  P2 = loop.vertices[loop.vertices.length - 1];
  P3 = loop.vertices[0];
  interpolatedSegment = centripetalCatmullRom(P0, P1, P2, P3, tSamples);
  newVertices.push(...interpolatedSegment);
  P0 = loop.vertices[loop.vertices.length - 2];
  P1 = loop.vertices[loop.vertices.length - 1];
  P2 = loop.vertices[0];
  P3 = loop.vertices[1];
  interpolatedSegment = centripetalCatmullRom(P0, P1, P2, P3, tSamples);
  newVertices.push(...interpolatedSegment);
  return createPolygonalLoopFromVertices(loop.center, newVertices);
};
