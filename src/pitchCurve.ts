import { createPolygonalLoop } from "./polygonalLoop";
import type { PolygonalLoop } from "./polygonalLoop";
import {
  lerp,
  polarToVertex,
  vertexToPolar,
  type PolarVector,
  type Vector2d,
} from "./vector";
import {
  integratePolarArray,
  numberRangeSearch,
  type PolarParamaterization,
} from "./calc";

export interface PitchCurve {
  // polar parameterization is the high fidelity source of truth
  polarParamaterization: PolarParamaterization;
  // polygonal loop defines rendering / export geometry
  polygonalLoop: PolygonalLoop;
}

const discretizePolarParamaterization = (
  polarParamaterization: PolarParamaterization,
): PolarVector[] => {
  const numSamples = 100;
  const maxDom = polarParamaterization.domainMax;
  const minDom = polarParamaterization.domainMin;
  const paramSamples = Array.from(
    { length: numSamples },
    (_, k) => (k * (maxDom - minDom)) / numSamples,
  );
  console.log(paramSamples);
  return paramSamples.map(polarParamaterization.fn);
};

export const createPitchCurve = (
  polarParamaterization: PolarParamaterization,
  center: Vector2d = { x: -100, y: 0 },
): PitchCurve => {
  const polarVectors = discretizePolarParamaterization(polarParamaterization);
  console.log(polarVectors);
  const polygonalLoop = createPolygonalLoop(center, polarVectors);
  return { polarParamaterization, polygonalLoop };
};

const findConjugateCenterDistance = (
  pitchCurveA: PitchCurve,
  periodRatio: { a: number; b: number } = { a: 1, b: 1 },
  fidelity: number = 100,
): number => {
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
    // console.log(integral);
    if (integral < q * 2 * Math.PI) return "high"; // if the sample distance is too high, the gear wont rotate far enough to reach q
    if (integral > q * 2 * Math.PI) return "low"; // if the sample distance is too low, the gear will rotate past q
    return "equal";
  });
};

export const createConjugatePitchCurve = (
  pitchCurveA: PitchCurve,
): PitchCurve => {
  const L = findConjugateCenterDistance(pitchCurveA);
  const numSamples = 1000;
  let polarArrayB: PolarVector[] = [];
  let thetaB = 0;
  let thetaA = 0;
  for (let i = 0; i < numSamples; i++) {
    const maxDom = pitchCurveA.polarParamaterization.domainMax;
    const minDom = pitchCurveA.polarParamaterization.domainMin;
    const t = (i * (maxDom - minDom)) / numSamples;
    const polarA = pitchCurveA.polarParamaterization.fn(t);
    const prevThetaA = thetaA;
    thetaA = polarA.angle;
    const deltaThetaA = thetaA - prevThetaA;
    const magA = polarA.mag;
    const magB = L - magA;
    polarArrayB.push({ angle: thetaB, mag: magB });
    thetaB += (deltaThetaA * magA) / magB;
  }
  console.log("polaB", polarArrayB);
  const bParamLerp = (u: number): PolarVector => {
    const baseIndex = Math.floor(u);
    const lerpRatio = u - baseIndex;
    const nextIndex = baseIndex + 1 < polarArrayB.length ? baseIndex + 1 : 0;
    const v0 = polarArrayB[baseIndex];
    const v1 = polarArrayB[nextIndex];
    return vertexToPolar(lerp(polarToVertex(v0), polarToVertex(v1), lerpRatio));
  };
  const polarParamB: PolarParamaterization = {
    fn: bParamLerp,
    domainMax: polarArrayB.length,
    domainMin: 0,
  };
  let polyPolars = discretizePolarParamaterization(polarParamB);
  const centerPosA = pitchCurveA.polygonalLoop.center;
  const polygonalLoop = createPolygonalLoop(
    { x: centerPosA.x + L, y: centerPosA.y },
    polyPolars,
  );
  return { polarParamaterization: polarParamB, polygonalLoop };
};
