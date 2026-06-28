import { createPolygonalLoop } from "./polygonalLoop";
import type { PolygonalLoop } from "./polygonalLoop";
import {
  lerp,
  normalizeAngle,
  polarToVertex,
  vertexToPolar,
  type PolarVector,
  type Vector2d,
} from "./vector";
import {
  arrayBinarySearch,
  integratePolarArray,
  numberRangeSearch,
  type PolarParamaterization,
} from "./calc";

export interface PitchCurve {
  // polar parameterization is the high fidelity source of truth
  polarParamaterization: PolarParamaterization;
  // polygonal loop defines rendering / export geometry
  polygonalLoop: PolygonalLoop;
  // when a conjugate curve is generated, the index of angleA will have the same index as the correct angleB
  thetaMap: number[];
  // the number of veritces to be used in the conjugate curve / theta maps
  fidelity: number;
  // the number of vertices to be used in the polygonalLoop rendering geometry
  renderFidelity: number;
  matedCurves: PitchCurve[];
}

const discretizePolarParamaterization = (
  polarParamaterization: PolarParamaterization,
  numSamples = 0,
): PolarVector[] => {
  if (numSamples === 0) numSamples = 50;
  const maxDom = polarParamaterization.domainMax;
  const minDom = polarParamaterization.domainMin;
  const paramSamples = Array.from(
    { length: numSamples },
    (_, k) => (k * (maxDom - minDom)) / numSamples,
  );
  return paramSamples.map(polarParamaterization.fn);
};

export const createPitchCurve = (
  polarParamaterization: PolarParamaterization,
  center: Vector2d = { x: -100, y: 0 },
  fidelity = 1000,
  renderFidelity = 100,
): PitchCurve => {
  const polarVectors = discretizePolarParamaterization(
    polarParamaterization,
    renderFidelity,
  );
  const polygonalLoop = createPolygonalLoop(center, polarVectors);
  return {
    polarParamaterization,
    polygonalLoop,
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
  const numSamples = pitchCurveA.fidelity;
  let polarArrayB: PolarVector[] = [];
  let thetaArrayA: number[] = [];
  let thetaB = 0;
  let thetaA = 0;
  for (let i = 0; i < numSamples; i++) {
    const maxDom = pitchCurveA.polarParamaterization.domainMax;
    const minDom = pitchCurveA.polarParamaterization.domainMin;
    const t = minDom + (i * (maxDom - minDom)) / numSamples;
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
  let polyPolars = discretizePolarParamaterization(
    polarParamB,
    pitchCurveA.renderFidelity,
  );
  // we mirror bro
  polyPolars = polyPolars.map((polar) => {
    return { mag: polar.mag, angle: Math.PI - polar.angle };
  });
  const centerPosA = pitchCurveA.polygonalLoop.center;
  const polygonalLoop = createPolygonalLoop(
    { x: centerPosA.x + L, y: centerPosA.y },
    polyPolars,
  );
  const thetaMapB = polarArrayB.map((polar) => polar.angle);
  pitchCurveA.thetaMap = thetaArrayA;
  const pitchCurveB: PitchCurve = {
    polarParamaterization: polarParamB,
    polygonalLoop,
    thetaMap: thetaMapB,
    fidelity: pitchCurveA.fidelity,
    renderFidelity: pitchCurveA.renderFidelity,
    matedCurves: [pitchCurveA],
  };
  pitchCurveA.matedCurves.push(pitchCurveB);
  return pitchCurveB;
};

export const setCurveAngle = (pitchCurve: PitchCurve, angle: number): void => {
  angle = normalizeAngle(angle);
  pitchCurve.polygonalLoop.rotation = angle;
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
    mate.polygonalLoop.rotation = -mateCurveTargetAngle;
    // setCurveAngle(mate, mateCurveTargetAngle);
  });
};
