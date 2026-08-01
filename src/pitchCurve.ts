import { createPolygonalLoop } from "./polygonalLoop";
import type { PolygonalLoop } from "./polygonalLoop";
import {
  distance,
  magnitude,
  normalizeAngle,
  polarToVertex,
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
  angleSyncMap: number[];
  // distance travelled along the curve at each sample for a linear sample in polar's param with #fidelity points
  cumulativeLengths: number[];
  totalLength: number;
  // average magnitude of the polar vector loop that defines the pitch curve, used to guage size
  averageRadius: number;
  // the number of veritces to be used in fidelicDiscreteLoop
  fidelity: number;
  // the number of vertices to be used in the renderedDiscreteLoop rendering geometry
  renderFidelity: number;
}

export const createPitchCurveFromPolarParam = (
  polarParamaterization: PolarParamaterization,
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
  const polygonalLoop = createPolygonalLoop(renderedPolarVectors);
  const fidelicDiscreteLoop = createPolygonalLoop(fidelicPolarVectors);
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
    angleSyncMap: [],
    fidelity,
    renderFidelity,
  };
};

export const findConjugateCenterDistance = (
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

// shoutout to captain campea for saving my stupid ass with this shit
export const createConjugatePitchCurve = (
  pitchCurveA: PitchCurve,
  conjugateCenterDistance: number,
): PitchCurve => {
  const L = conjugateCenterDistance;
  const fidelity = pitchCurveA.fidelity;
  const polarArrayA = pitchCurveA.fidelicDiscreteLoop.polarVectors;
  const polarArrayB: PolarVector[] = [];
  let beta = 0;
  const betaArray = [];
  const alphaArray = [];
  for (let i = 0; i < fidelity; i++) {
    const index = ((i % fidelity) + fidelity) % fidelity;
    const prevIndex = (((i - 1) % fidelity) + fidelity) % fidelity;
    const magA = polarArrayA[index].mag;
    const magB = L - magA;
    const theta = polarArrayA[index].angle;
    const prevTheta = polarArrayA[prevIndex].angle;
    const thetaPrime = theta - prevTheta;
    const alpha = -theta;
    const integrand = (magA / magB) * thetaPrime;
    beta += integrand;
    betaArray.push(beta);
    alphaArray.push(alpha);
    polarArrayB.push({ mag: magB, angle: Math.PI - beta });
  }

  /*const maxDom = pitchCurveA.polarParamaterization.domainMax;
  const minDom = pitchCurveA.polarParamaterization.domainMin;
  const polarArrayB: PolarVector[] = [];
  const alphaArray: number[] = [];
  const firstPolarA = pitchCurveA.polarParamaterization.fn(minDom);
  let alpha = firstPolarA.angle;
  let theta = -alpha;
  let prevTheta = theta;
  let beta = 0;
  alphaArray.push(alpha);
  polarArrayB.push({ angle: beta, mag: L - firstPolarA.mag });
  polarArrayB.push({ angle: theta, mag: L - firstPolarA.mag });
  for (let i = 1; i < fidelity; i++) {
    const u = minDom + (i * (maxDom - minDom)) / fidelity;
    const polarA = pitchCurveA.polarParamaterization.fn(u);
    alpha = polarA.angle;
    prevTheta = theta;
    theta = -alpha;
    const deltaTheta = theta - prevTheta;
    const magA = polarA.mag;
    const magB = L - magA;
    beta += -(deltaTheta * magA) / magB;
    polarArrayB.push({ angle: beta, mag: magB });
    alphaArray.push(alpha);
  }
  const betaArray = polarArrayB.map((polar) => polar.angle);
  pitchCurveA.thetaMap = alphaArray;*/
  pitchCurveA.angleSyncMap = alphaArray;
  const polarParamB: PolarParamaterization =
    discretePolarArrayToPolarParameterization(polarArrayB);
  const polyPolars = discretizePolarParamaterization(
    polarParamB,
    pitchCurveA.renderFidelity,
  );
  const polygonalLoop = createPolygonalLoop(polyPolars);
  const fidelicPolyPolars = discretizePolarParamaterization(
    polarParamB,
    pitchCurveA.fidelity,
  );
  const fidelicDiscreteLoop = createPolygonalLoop(fidelicPolyPolars);
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
    angleSyncMap: betaArray,
    cumulativeLengths,
    totalLength,
    averageRadius,
    fidelity: pitchCurveA.fidelity,
    renderFidelity: pitchCurveA.renderFidelity,
  };
  return pitchCurveB;
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
