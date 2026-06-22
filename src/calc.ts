import {
  distance,
  lerp,
  normalizeAngle,
  type PolarVector,
  type Vector2d,
} from "./vector";

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

export const centripetalCatmullRom = (
  P0: Vector2d,
  P1: Vector2d,
  P2: Vector2d,
  P3: Vector2d,
  paramSamples: number[],
): Vector2d[] => {
  const t0 = 0;
  const t1 = t0 + Math.pow(distance(P0, P1), 0.5);
  const t2 = t1 + Math.pow(distance(P1, P2), 0.5);
  const t3 = t2 + Math.pow(distance(P2, P3), 0.5);
  const tSamples = paramSamples.map((u) => t1 + u * (t2 - t1));
  const splinePoints = tSamples.map((t) => {
    const A1 = lerp(P0, P1, (t - t0) / (t1 - t0));
    const A2 = lerp(P1, P2, (t - t1) / (t2 - t1));
    const A3 = lerp(P2, P3, (t - t2) / (t3 - t2));
    const B1 = lerp(A1, A2, (t - t0) / (t2 - t0));
    const B2 = lerp(A2, A3, (t - t1) / (t3 - t1));
    const C = lerp(B1, B2, (t - t1) / (t2 - t1));
    return C;
  });
  return splinePoints;
};
