import type { Vector2d, PolarVector, Line } from "./vector";
import {
  getAngle,
  distance,
  lerp,
  lineIntersection,
  magnitude,
  normalizeAngle,
  polarToVertex,
  sub,
} from "./vector";
import {
  arrayBinarySearch,
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
    return { mag: magnitude(vertex), angle: getAngle(vertex) };
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
    // console.log(integral);
    if (integral < q * 2 * Math.PI) return "high"; // if the sample distance is too high, the gear wont rotate far enough to reach q
    if (integral > q * 2 * Math.PI) return "low"; // if the sample distance is too low, the gear will rotate past q
    return "equal";
  });
};

export const getDecimalIndexFromCumulativeLength = (
  loop: PolygonalLoop,
  length: number,
): number => {
  if (length > loop.totalLength) return -1;
  if (length === loop.totalLength) return 0;
  const baseIndex = arrayBinarySearch(loop.cumulativeLengths, (sample) => {
    if (sample > length) return "high";
    if (sample < length) return "low";
    return "equal";
  });
  const nextIndex =
    baseIndex + 1 < loop.cumulativeLengths.length ? baseIndex + 1 : 0;
  const endEdgeLength =
    loop.cumulativeLengths[nextIndex] - loop.cumulativeLengths[baseIndex];
  const distanceLeft = length - loop.cumulativeLengths[baseIndex];
  return baseIndex + distanceLeft / endEdgeLength;
};

export const getDecimalIndexFromAngle = (
  loop: PolygonalLoop,
  angle: number,
): number => {
  angle = normalizeAngle(angle);
  const baseIndex = arrayBinarySearch(loop.polarVectors, (sample) => {
    if (sample.angle > angle) return "high";
    if (sample.angle < angle) return "low";
    return "equal";
  });
  const nextIndex = baseIndex + 1 < loop.vertices.length ? baseIndex + 1 : 0;
  const v0 = loop.vertices[baseIndex];
  const v1 = loop.vertices[nextIndex];
  const edgeLine: Line = { v0, v1 };
  const radialVector: PolarVector = { mag: 1, angle };
  const radialLine: Line = {
    v0: { x: 0, y: 0 },
    v1: polarToVertex(radialVector),
  };
  const intersectionVertex = lineIntersection(radialLine, edgeLine);
  const percentToNextIndex =
    distance(loop.vertices[baseIndex], intersectionVertex) /
    distance(loop.vertices[nextIndex], loop.vertices[baseIndex]);
  return baseIndex + percentToNextIndex;
};

export const getVertexFromLoopDecimalIndex = (
  loop: PolygonalLoop,
  index: number,
): Vector2d => {
  const baseIndex = Math.floor(index);
  const nextIndex = baseIndex + 1 < loop.vertices.length ? baseIndex + 1 : 0;
  const lerpRatio = index - baseIndex;
  return lerp(loop.vertices[baseIndex], loop.vertices[nextIndex], lerpRatio);
};

export const createConjugateLoop = (
  loopA: PolygonalLoop,
  periodRatio: { a: number; b: number } = { a: 1, b: 1 },
): PolygonalLoop => {
  const centerDist = findConjugateCenterDistance(loopA, periodRatio);
  const ind = getDecimalIndexFromCumulativeLength(loopA, 200);
  console.log(ind);
  const ver = getVertexFromLoopDecimalIndex(loopA, ind);
  const ang = getAngle(ver);
  const dec = getDecimalIndexFromAngle(loopA, ang);
  console.log(dec);

  const lenA = loopA.polarVectors.length;
  let indexA = 0;
  let indexB = 0;
  let polarVectorsB: PolarVector[] = [];
  let anlgeB = 0;
  let angleA = 0;
  const rotationInterval = (2 * Math.PI) / lenA;
  while (indexB < lenA) {
    const pitchA = loopA.polarVectors[indexA].mag;
    const pitchB = centerDist - pitchA;
    polarVectorsB.push({ angle: Math.PI - anlgeB, mag: pitchB });
    if (pitchB > pitchA) {
      const speedRatio = pitchA / pitchB;
      anlgeB += rotationInterval;
      angleA += speedRatio * rotationInterval;
    }
    indexB++;
    indexA++;
  }

  return createPolygonalLoop(
    {
      x: loopA.center.x + centerDist,
      y: loopA.center.y,
    },
    polarVectorsB,
  );
};

export const uniformizePolygonalLoopAngles = (
  loop: PolygonalLoop,
): PolygonalLoop => {
  return;
};

// uses centripital catmull-rom to add curvature between polygonal loop's existing points, kind of like subdivision in blender
export const subdividePolygonalLoop = (
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
