import { createPolygonalLoop } from "./polygonalLoop";
import type { PolygonalLoop } from "./polygonalLoop";
import {
  distance,
  lerp,
  normalizeAngle,
  polarToVertex,
  vertexToPolar,
  type PolarVector,
  type Vector2d,
} from "./vector";
import {
  arrayBinarySearch,
  discretePolarArrayToPolarParameterization,
  discretizePolarParamaterization,
  integratePolarArray,
  numberRangeSearch,
  type PolarParamaterization,
} from "./calc";

export interface PitchCurve {
  // polar parameterization is the "true" analytic curve.
  // idk if i will keep this though, since i'm pretty sure its non-trivial to get this for the conjugate pitch curve
  // meaning i'd have to resort to discrete sampling anyways, so i'll have to prove the value/lack of value of this when things are clearer
  polarParamaterization: PolarParamaterization;
  // but in practice, we can't analytically solve for everything, so we use fidelicDiscrete loop which is a densely sampled array of the above
  fidelicDiscreteLoop: PolygonalLoop;
  // we don't need as many vertices as fidelicDiscreteLoop for rendering / export geometry, so we use renderedDiscreteLoop
  renderedDiscreteLoop: PolygonalLoop;
  // when a conjugate curve is generated, the index of angleA will have the same index as the correct angleB
  thetaMap: number[];
  // distance travelled along the curve at each sample for a linear sample in polar's param with #fidelity points
  cumulativeLengths: number[];
  totalLength: number;
  // average magnitude of the polar vector loop that defines the pitch curve, used to guage size
  averageRadius: number;
  // the number of veritces to be used in fidelicDiscreteLoop
  fidelity: number;
  // the number of vertices to be used in the renderedDiscreteLoop rendering geometry
  renderFidelity: number;
  matedCurves: PitchCurve[];
}

export const createPitchCurve = (
  polarParamaterization: PolarParamaterization,
  center: Vector2d = { x: -100, y: 0 },
  fidelity = 1000,
  renderFidelity = 100,
): PitchCurve => {
  const renderedPolarVectors = discretizePolarParamaterization(
    polarParamaterization,
    renderFidelity,
  );
  const fidelicPolarVectors = discretizePolarParamaterization(
    polarParamaterization,
    fidelity,
  );
  const polygonalLoop = createPolygonalLoop(center, renderedPolarVectors);
  const fidelicDiscreteLoop = createPolygonalLoop(center, fidelicPolarVectors);
  const { cumulativeLengths, totalLength } = generateCumulativeLengths(
    polarParamaterization,
    fidelity,
  );
  let radiusSum = 0;
  fidelicPolarVectors.forEach((polar) => {
    radiusSum += polar.mag;
  });
  const averageRadius = radiusSum / fidelity;
  return {
    polarParamaterization,
    renderedDiscreteLoop: polygonalLoop,
    fidelicDiscreteLoop,
    cumulativeLengths,
    totalLength,
    averageRadius,
    thetaMap: [],
    fidelity,
    renderFidelity,
    matedCurves: [],
  };
};

const findConjugateCenterDistance = (
  pitchCurveA: PitchCurve,
  periodRatio: { a: number; b: number } = { a: 1, b: 1 },
): number => {
  const fidelity = pitchCurveA.fidelity;
  const q = periodRatio.b / periodRatio.a;
  const maxDom = pitchCurveA.polarParamaterization.domainMax;
  const minDom = pitchCurveA.polarParamaterization.domainMin;
  const polarsA = Array.from(
    { length: fidelity },
    (_, k) => minDom + (k * (maxDom - minDom)) / fidelity,
  ).map(pitchCurveA.polarParamaterization.fn);
  let supA = Math.max(...polarsA.map((polar) => polar.mag));
  return numberRangeSearch(supA, supA / q + supA, (sampleLength: number) => {
    const integrand = polarsA.map((polar): PolarVector => {
      return {
        angle: polar.angle,
        mag: polar.mag / (sampleLength - polar.mag),
      };
    });
    const integral = integratePolarArray(integrand);
    if (integral < q * 2 * Math.PI) return "high"; // if the sample distance is too high, the gear wont rotate far enough to reach q
    if (integral > q * 2 * Math.PI) return "low"; // if the sample distance is too low, the gear will rotate past q
    return "equal";
  });
};

export const createConjugatePitchCurve = (
  pitchCurveA: PitchCurve,
): PitchCurve => {
  const L = findConjugateCenterDistance(pitchCurveA);
  const fidelity = pitchCurveA.fidelity;
  let polarArrayB: PolarVector[] = [];
  let thetaArrayA: number[] = [];
  let thetaB = 0;
  let thetaA = 0;
  for (let i = 0; i < fidelity; i++) {
    const maxDom = pitchCurveA.polarParamaterization.domainMax;
    const minDom = pitchCurveA.polarParamaterization.domainMin;
    const t = minDom + (i * (maxDom - minDom)) / fidelity;
    const polarA = pitchCurveA.polarParamaterization.fn(t);
    const prevThetaA = thetaA;
    thetaA = polarA.angle;
    const deltaThetaA = thetaA - prevThetaA;
    const magA = polarA.mag;
    const magB = L - magA;
    polarArrayB.push({ angle: thetaB, mag: magB });
    thetaB += (deltaThetaA * magA) / magB;
    thetaArrayA.push(prevThetaA);
  }
  const polarParamB: PolarParamaterization =
    discretePolarArrayToPolarParameterization(polarArrayB);
  let polyPolars = discretizePolarParamaterization(
    polarParamB,
    pitchCurveA.renderFidelity,
  );
  // we mirror bro
  polyPolars = polyPolars.map((polar) => {
    return { mag: polar.mag, angle: Math.PI - polar.angle };
  });
  const centerPosA = pitchCurveA.renderedDiscreteLoop.center;
  const polygonalLoop = createPolygonalLoop(
    { x: centerPosA.x + L, y: centerPosA.y },
    polyPolars,
  );
  let fidelicPolyPolars = discretizePolarParamaterization(
    polarParamB,
    pitchCurveA.fidelity,
  );
  // we mirror bro
  fidelicPolyPolars = polyPolars.map((polar) => {
    return { mag: polar.mag, angle: Math.PI - polar.angle };
  });
  const fidelicDiscreteLoop = createPolygonalLoop(
    { x: centerPosA.x + L, y: centerPosA.y },
    fidelicPolyPolars,
  );
  const thetaMapB = polarArrayB.map((polar) => polar.angle);
  pitchCurveA.thetaMap = thetaArrayA;
  const { cumulativeLengths, totalLength } = generateCumulativeLengths(
    polarParamB,
    fidelity,
  );
  let radiusSum = 0;
  fidelicDiscreteLoop.polarVectors.forEach((polar) => {
    radiusSum += polar.mag;
  });
  const averageRadius = radiusSum / fidelity;
  const pitchCurveB: PitchCurve = {
    polarParamaterization: polarParamB,
    renderedDiscreteLoop: polygonalLoop,
    fidelicDiscreteLoop,
    thetaMap: thetaMapB,
    cumulativeLengths,
    totalLength,
    averageRadius,
    fidelity: pitchCurveA.fidelity,
    renderFidelity: pitchCurveA.renderFidelity,
    matedCurves: [pitchCurveA],
  };
  pitchCurveA.matedCurves.push(pitchCurveB);
  return pitchCurveB;
};

export const setCurveAngle = (pitchCurve: PitchCurve, angle: number): void => {
  angle = normalizeAngle(angle);
  pitchCurve.renderedDiscreteLoop.rotation = angle;
  pitchCurve.fidelicDiscreteLoop.rotation = angle;
  // search thetaMap for the an index approximation to the given angle
  const baseIndex = arrayBinarySearch(pitchCurve.thetaMap, (sampleAngle) => {
    sampleAngle = normalizeAngle(sampleAngle);
    if (sampleAngle > angle) return "high";
    if (sampleAngle < angle) return "low";
    return "equal";
  });
  // even though it's prob not the most accurate, we just do a lerp for the anlge overshoot, as error will disappear with higher fidelity
  const baseAngle = pitchCurve.thetaMap[baseIndex];
  const angleOvershoot = angle - baseAngle;
  const nextIndex =
    baseIndex + 1 < pitchCurve.thetaMap.length ? baseIndex + 1 : 0;
  const nextAngle = pitchCurve.thetaMap[nextIndex];
  const decimalIndex = baseIndex + angleOvershoot / (nextAngle - baseAngle);
  pitchCurve.matedCurves.forEach((mate) => {
    const lerpRatio = decimalIndex - baseIndex;
    const mateCurveTargetAngle =
      mate.thetaMap[baseIndex] +
      lerpRatio * (mate.thetaMap[nextIndex] - mate.thetaMap[baseIndex]);
    mate.renderedDiscreteLoop.rotation = -mateCurveTargetAngle;
    // setCurveAngle(mate, mateCurveTargetAngle);
  });
};

export const findIndexOfCumulativeLength = (
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

const generateCumulativeLengths = (
  polarParamaterization: PolarParamaterization,
  fidelity: number,
): { cumulativeLengths: number[]; totalLength: number } => {
  const t0 = polarParamaterization.domainMin;
  const tf = polarParamaterization.domainMax;
  let v0: Vector2d;
  let v1: Vector2d;
  let totalLength = 0;
  let cumulativeLengths: number[] = [0];
  for (let i = 0; i + 1 < fidelity; i++) {
    const sample0 = t0 + (i * (tf - t0)) / fidelity;
    const sample1 = t0 + ((i + 1) * (tf - t0)) / fidelity;
    v0 = polarToVertex(polarParamaterization.fn(sample0));
    v1 = polarToVertex(polarParamaterization.fn(sample1));
    const d = distance(v0, v1);
    totalLength += d;
    cumulativeLengths.push(totalLength);
  }
  const sample0 = t0 + ((fidelity - 1) * (tf - t0)) / fidelity;
  const sample1 = t0;
  v0 = polarToVertex(polarParamaterization.fn(sample0));
  v1 = polarToVertex(polarParamaterization.fn(sample1));
  const d = distance(v0, v1);
  totalLength += d;
  return { cumulativeLengths, totalLength };
};
