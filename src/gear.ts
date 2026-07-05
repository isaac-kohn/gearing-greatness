import {
  discretePolarArrayToPolarParameterization,
  discretizePolarParamaterization,
  type PolarParamaterization,
} from "./calc";
import {
  createPitchCurve,
  findIndexOfCumulativeLength,
  type PitchCurve,
} from "./pitchCurve";
import { createPolygonalLoop, type PolygonalLoop } from "./polygonalLoop";
import {
  add,
  normalizeVector,
  perp,
  polarToVertex,
  scale,
  sub,
  vertexToPolar,
  type Vector2d,
} from "./vector";

export interface Gear {
  pitchCurve: PitchCurve;
  numTeeth: number;
  addendum: number;
  dedendum: number;
  addendumFn: PolarParamaterization;
  dedendumFn: PolarParamaterization;
  // the t such that pitchCurve.fn(t) gives the point at which each tooth intersects the pitch curve
  toothRoots: { index: number; vertex: Vector2d }[];
  // like for pitch curve, the polygonal loops are used for rendering, while the paramaterizations are used for high fidelity geometry computation
  polyAddendum: PolygonalLoop;
  polyDedendum: PolygonalLoop;
  fidelity: number;
  renderFidelity: number;
  renderMode: "default" | "skeleton";
}

const generateAdendumFn = (
  pitchCurve: PitchCurve,
  addendum: number,
): PolarParamaterization => {
  const fidelity = pitchCurve.fidelity;
  const vertexArray: Vector2d[] = [];
  for (let i = 0; i < fidelity; i++) {
    const minDom = pitchCurve.polarParamaterization.domainMin;
    const maxDom = pitchCurve.polarParamaterization.domainMax;
    const sampleParam = minDom + (i * (maxDom - minDom)) / fidelity;
    const v0 = polarToVertex(pitchCurve.polarParamaterization.fn(sampleParam));
    const v1 = polarToVertex(
      pitchCurve.polarParamaterization.fn(
        i + 1 === fidelity ? 0 : sampleParam + 1 / fidelity,
      ),
    );
    const tangent = sub(v1, v0);
    const normal = normalizeVector(perp(tangent));
    vertexArray.push(add(v0, scale(normal, -addendum)));
  }
  const polarArray = vertexArray.map((v) => vertexToPolar(v));
  const polarParamaterization: PolarParamaterization =
    discretePolarArrayToPolarParameterization(polarArray);
  return polarParamaterization;
};

const generateToothRoots = (
  numTeeth,
  totalLength,
  cumulativeLengths,
  polarParamaterization: PolarParamaterization,
): { index: number; vertex: Vector2d }[] => {
  numTeeth *= 2;
  const fidelity = cumulativeLengths.length;
  const toothSpacing = totalLength / numTeeth;
  const { fn, domainMax, domainMin } = polarParamaterization;
  const toothRoots: { index: number; vertex: Vector2d }[] = [];
  for (let i = 0; i < numTeeth; i++) {
    const targetLength = i * toothSpacing;
    const targetIndex = findIndexOfCumulativeLength(
      cumulativeLengths,
      totalLength,
      targetLength,
    );
    const sampleParam =
      domainMin + (targetIndex * (domainMax - domainMin)) / fidelity;
    const toothVertex = polarToVertex(fn(sampleParam));
    toothRoots.push({ index: targetIndex, vertex: toothVertex });
  }
  return toothRoots;
};

const generateToothFlanks = () => {};

export const createGear = (
  polarParamaterization: PolarParamaterization,
  numTeeth: number,
  addendum: number,
  dedendum: number,
  center: Vector2d = { x: 0, y: 0 },
  fidelity: number = 1000,
  renderFidelity: number = 100,
): Gear => {
  const pitchCurve = createPitchCurve(
    polarParamaterization,
    center,
    fidelity,
    renderFidelity,
  );
  const addendumFn = generateAdendumFn(pitchCurve, addendum);
  const dedendumFn = generateAdendumFn(pitchCurve, -dedendum);
  const polyAddendum: PolygonalLoop = createPolygonalLoop(
    center,
    discretizePolarParamaterization(addendumFn, renderFidelity),
  );
  const polyDedendum = createPolygonalLoop(
    center,
    discretizePolarParamaterization(dedendumFn, renderFidelity),
  );
  const toothRoots = generateToothRoots(
    numTeeth,
    pitchCurve.totalLength,
    pitchCurve.cumulativeLengths,
    pitchCurve.polarParamaterization,
  );
  return {
    pitchCurve,
    numTeeth,
    addendum,
    dedendum,
    addendumFn,
    dedendumFn,
    polyAddendum,
    polyDedendum,
    fidelity,
    renderFidelity,
    renderMode: "default",
    toothRoots,
  };
};
