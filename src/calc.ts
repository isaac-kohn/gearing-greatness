import type { PolygonalLoop } from "./polygonalLoop";
import {
  distance,
  lerp,
  normalizeAngle,
  type PolarVector,
  type Vector2d,
} from "./vector";

// export type PolarFunction = (theta: number) => number;

export interface PolarParamaterization {
  fn: (u: number) => PolarVector;
  domainMax: number;
  domainMin: number;
}

export interface VectorParamaterization {
  fn: (u: number) => Vector2d;
  domainMax: number;
  domainMin: number;
}

export const numberRangeSearch = (
  lower: number,
  upper: number,
  orderRelation: (sample: number) => "high" | "low" | "equal",
  steps: number = 20,
): number => {
  let hi = upper;
  let lo = lower;
  let mid;
  let i = 0;
  while (i < steps) {
    //console.log(lo, hi);
    mid = (hi + lo) / 2;
    const order = orderRelation(mid);
    if (order === "high") hi = mid;
    else if (order === "low") lo = mid;
    else return mid;
    i++;
  }
  return (hi + lo) / 2;
};

export const arrayBinarySearch = <T>(
  array: Array<T>,
  orderRelation: (sample: T) => "high" | "low" | "equal",
): number => {
  let hi = array.length;
  let lo = 0;
  let mid;
  let i = 0;
  while (i < array.length) {
    // console.log(lo, hi);
    if (lo + 1 >= hi) {
      return lo;
    }
    // biased towards lo
    mid = Math.floor((hi + lo) / 2);
    const order = orderRelation(array[mid]);
    if (order === "high") hi = mid;
    else if (order === "low") lo = mid;
    else return mid;
    i++;
  }
  return lo;
};

export const integratePolarArray = (polarArray: PolarVector[]): number => {
  let sum = 0;
  const len = polarArray.length;
  const mags = polarArray.map((polar) => polar.mag);
  const angles = polarArray.map((polar) => polar.angle);
  for (let i = 0; i < len - 1; i++) {
    const angleFrac = angles[i + 1] - angles[i];
    sum += normalizeAngle(angleFrac) * mags[i];
  }
  const angleFrac = angles[0] - angles[len - 1];
  sum += normalizeAngle(angleFrac) * mags[len - 1];
  return sum;
};

// from wikipedia article https://en.wikipedia.org/wiki/Centripetal_Catmull%E2%80%93Rom_spline
export const catmullRomSegment = (
  // P0-P4 are control points, u: (0, 1) -> vectors on curve between P1 and P2
  P0: Vector2d,
  P1: Vector2d,
  P2: Vector2d,
  P3: Vector2d,
): ((u: number) => Vector2d) => {
  const t0 = 0;
  const t1 = t0 + Math.pow(distance(P0, P1), 0.5);
  const t2 = t1 + Math.pow(distance(P1, P2), 0.5);
  const t3 = t2 + Math.pow(distance(P2, P3), 0.5);
  const splineParamaterization = (t) => {
    const A1 = lerp(P0, P1, (t - t0) / (t1 - t0));
    const A2 = lerp(P1, P2, (t - t1) / (t2 - t1));
    const A3 = lerp(P2, P3, (t - t2) / (t3 - t2));
    const B1 = lerp(A1, A2, (t - t0) / (t2 - t0));
    const B2 = lerp(A2, A3, (t - t1) / (t3 - t1));
    const C = lerp(B1, B2, (t - t1) / (t2 - t1));
    return C;
  };
  // t = 0 starts at P0, but we want to start at u = 0 at P1 and u=1 at P2
  const correctedParam = (u: number) =>
    splineParamaterization(t1 + u * (t2 - t1));
  return correctedParam;
};

// creates a polar function paramaterization by taking in loop vertices as control points for a catmull-rom spline
export const catmullRomLoop = (
  vertices: Vector2d[],
): VectorParamaterization => {
  const len = vertices.length;
  let P0 = vertices[len - 1];
  let P1 = vertices[0];
  let P2 = vertices[1];
  let P3 = vertices[2];
  let segmentParameterizations: ((u: number) => Vector2d)[] = [];
  segmentParameterizations.push(catmullRomSegment(P0, P1, P2, P3));
  for (let i = 1; i + 2 < len; i++) {
    P0 = vertices[i - 1];
    P1 = vertices[i];
    P2 = vertices[i + 1];
    P3 = vertices[i + 2];
    segmentParameterizations.push(catmullRomSegment(P0, P1, P2, P3));
  }
  P0 = vertices[len - 2];
  P1 = vertices[len - 1];
  P2 = vertices[0];
  P3 = vertices[1];
  segmentParameterizations.push(catmullRomSegment(P0, P1, P2, P3));
  P0 = vertices[len - 3];
  P1 = vertices[len - 2];
  P2 = vertices[len - 1];
  P3 = vertices[0];
  segmentParameterizations.push(catmullRomSegment(P0, P1, P2, P3));
  const fullParamaterization: VectorParamaterization = {
    fn: (u: number): Vector2d => {
      u = ((u % len) + len) % len;
      const segmentIndex = Math.floor(u);
      return segmentParameterizations[segmentIndex](u - segmentIndex);
    },
    domainMax: len,
    domainMin: 0,
  };
  return fullParamaterization;
};

export const subdivideSegment = (
  // P0-P4 are control points
  P0: Vector2d,
  P1: Vector2d,
  P2: Vector2d,
  P3: Vector2d,
  // paramSamples should be in the range (0, 1), each will produce a vertex in the output
  paramSamples: number[],
): Vector2d[] => {
  const splineParamaterization = catmullRomSegment(P0, P1, P2, P3);
  const splinePoints = paramSamples.map(splineParamaterization);
  return splinePoints;
};
