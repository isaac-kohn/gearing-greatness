import { createBaseCurve, type BaseCurve } from "./baseCurve";
import {
  discretePolarArrayToPolarParameterization,
  discretizePolarParamaterization,
  type PolarParamaterization,
} from "./calc";
import {
  createConjugatePitchCurve,
  createPitchCurve,
  findIndexOfCumulativeLength,
  type PitchCurve,
} from "./pitchCurve";
import {
  createPolygonalLoop,
  curvatureAtIndex,
  tangentAtIndex,
  type PolygonalLoop,
} from "./polygonalLoop";
import {
  add,
  distance,
  getAngle,
  lineIntersection,
  magnitude,
  normalizeVector,
  perp,
  polarToVertex,
  rotate,
  scale,
  setMagnitude,
  sub,
  vertexToPolar,
  type Line,
  type PolarVector,
  type Vector2d,
} from "./vector";

export interface ToothRoot {
  index: number;
  vertex: Vector2d;
}

export interface ToothFlank {
  root: ToothRoot;
  tip: Vector2d[];
  base: Vector2d[];
}

export interface Gear {
  pitchCurve: PitchCurve;
  numTeeth: number;
  addendum: number;
  dedendum: number;
  addendumFn: PolarParamaterization;
  // the t such that pitchCurve.fn(t) gives the point at which each tooth intersects the pitch curve
  toothRoots: { index: number; vertex: Vector2d }[];
  toothFlanks: ToothFlank[];
  // like for pitch curve, the polygonal loops are used for rendering, while the paramaterizations are used for high fidelity geometry computation
  polyAddendum: PolygonalLoop;
  polyDedendum: PolygonalLoop;
  baseCurve: BaseCurve;
  fidelity: number;
  renderFidelity: number;
  renderMode: "default" | "skeleton";
  setDirection: (angle: number) => void;
  getDirection: () => number;
  getCenter: () => Vector2d;
  setCenter: (v: Vector2d) => void;
}

const generateDedendumFn = (pitchCurve: PitchCurve): PolygonalLoop => {
  const pressureAngle = (30 * Math.PI) / 180;
  const fidelity = pitchCurve.fidelity;
  const pitchVertices = pitchCurve.fidelicDiscreteLoop.vertices;
  const vertexArray = pitchVertices.map((vertex, i) => {
    const curvature = Math.abs(curvatureAtIndex(pitchVertices, i));
    const tang = tangentAtIndex(pitchVertices, i);
    const pitchRadius = curvature === 0 ? Infinity : 1 / curvature;
    const offsetMag = Math.min(pitchRadius, 1000) * Math.sin(pressureAngle);
    const offsetDir = getAngle(tang) + pressureAngle;
    const polarOffset: PolarVector = { mag: offsetMag, angle: offsetDir };
    return add(polarToVertex(polarOffset), vertex);
  });
  const polarArray: PolarVector[] = vertexArray.map(vertexToPolar);
  return createPolygonalLoop(pitchCurve.fidelicDiscreteLoop.center, polarArray);
};

const generateAdendumFn = (
  pitchCurve: PitchCurve,
  addendum: number,
): PolarParamaterization => {
  const fidelity = pitchCurve.fidelity;
  const minDom = pitchCurve.polarParamaterization.domainMin;
  const maxDom = pitchCurve.polarParamaterization.domainMax;
  const vertexArray: Vector2d[] = [];
  for (let i = 0; i < fidelity; i++) {
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
  const numToothRoots = numTeeth * 2;
  const fidelity = cumulativeLengths.length;
  const toothSpacing = totalLength / numToothRoots;
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

const generateForwardFlanks = (
  toothRoots: ToothRoot[],
  pitchCurve: PitchCurve,
  fwdBaseCurve: BaseCurve,
): ToothFlank[] => {
  const fwdRoots = toothRoots.filter((_, i) => i % 2 == 0);
  let fwdRootIndices = fwdRoots.map((root) => root.index).reverse();
  const pitchPolars = pitchCurve.fidelicDiscreteLoop.polarVectors;
  const fidelity = pitchPolars.length;
  const pitchVertices = pitchCurve.fidelicDiscreteLoop.vertices;
  const fwdBaseVertices = fwdBaseCurve.fidelicDiscreteLoop.vertices;
  const fwdFlankTips: Vector2d[][] = [];
  let index = fwdRootIndices.at(-1);
  let baseStartCircum: number;
  const baseLengths = [...fwdBaseCurve.fidelicSignedCumulativeLengths];
  let tangentStartLength: number;
  let unwrapLength: number;
  let prevVertex: Vector2d;
  // fwd flank tips
  for (let n = 0; n < fidelity; n++) {
    const baseVertex = fwdBaseVertices[index];
    const pitchVertex = pitchVertices[index];
    const curvatureSign = fwdBaseCurve.curvatureSignMap[index];
    if (index === fwdRootIndices.at(-1)) {
      fwdRootIndices.pop();
      fwdFlankTips.push([]);
      baseStartCircum = baseLengths[index];
      tangentStartLength = distance(pitchVertex, baseVertex);
    } else if (curvatureSign === 0) {
      baseStartCircum = baseLengths[index];
      tangentStartLength = distance(prevVertex, baseVertex);
    }
    const tangentVector = sub(pitchVertex, baseVertex);
    unwrapLength = tangentStartLength + (baseLengths[index] - baseStartCircum);
    const unwrappedTangentVector = setMagnitude(tangentVector, unwrapLength);
    const vertex = add(baseVertex, unwrappedTangentVector);
    fwdFlankTips[fwdFlankTips.length - 1].push(vertex);
    prevVertex = vertex;
    index++;
    index = ((index % fidelity) + fidelity) % fidelity;
  }
  // fwd flank bases
  fwdRootIndices = fwdRoots.map((root) => root.index);
  index = fwdRootIndices.at(-1);
  const fwdFlankBases: Vector2d[][] = [];
  baseLengths[0] = fwdBaseCurve.fidelicSignedTotalLength;
  for (let n = 0; n < fidelity; n++) {
    const baseVertex = fwdBaseVertices[index];
    const pitchVertex = pitchVertices[index];
    const curvatureSign = fwdBaseCurve.curvatureSignMap[index];
    if (index === fwdRootIndices.at(-1)) {
      fwdRootIndices.pop();
      fwdFlankBases.push([]);
      baseStartCircum = baseLengths[index];
      tangentStartLength = distance(pitchVertex, baseVertex);
    } else if (curvatureSign === 0) {
      baseStartCircum = baseLengths[index];
      tangentStartLength = distance(prevVertex, baseVertex);
    }
    const tangentVector = sub(pitchVertex, baseVertex);
    unwrapLength = tangentStartLength + (baseLengths[index] - baseStartCircum);
    const unwrappedTangentVector = setMagnitude(tangentVector, unwrapLength);
    const vertex = add(baseVertex, unwrappedTangentVector);
    fwdFlankBases[fwdFlankBases.length - 1].push(vertex);
    prevVertex = vertex;
    index--;
    index = ((index % fidelity) + fidelity) % fidelity;
  }
  const fwdFlanks = fwdRoots.map((root, index): ToothFlank => {
    return { tip: fwdFlankTips[index], base: fwdFlankBases[index], root };
  });
  return fwdFlanks;
};

export const createGear = (
  polarParamaterization: PolarParamaterization,
  pressureAngle: number,
  numTeeth: number,
  addendum: number,
  dedendum: number,
  fidelity: number = 1000,
  renderFidelity: number = 100,
): Gear => {
  let direction = 0;
  let center: Vector2d = { x: 0, y: 0 };
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
  ); //generateDedendumFn(pitchCurve);

  const toothRoots = generateToothRoots(
    numTeeth,
    pitchCurve.totalLength,
    pitchCurve.cumulativeLengths,
    pitchCurve.polarParamaterization,
  );
  const baseCurve = createBaseCurve(
    pitchCurve,
    (pressureAngle * Math.PI) / 180,
  );
  const toothFlanks = generateForwardFlanks(toothRoots, pitchCurve, baseCurve);
  return {
    pitchCurve,
    baseCurve,
    numTeeth,
    addendum,
    dedendum,
    addendumFn,
    polyAddendum,
    polyDedendum,
    fidelity,
    renderFidelity,
    renderMode: "default",
    toothRoots,
    toothFlanks,
    getDirection: () => direction,
    setDirection: (angle: number) => {
      direction = angle;
    },
    getCenter: () => center,
    setCenter: (v: Vector2d) => {
      center = v;
    },
  };
};

export const createConjugateGear = (gearA: Gear): Gear => {
  const conjPolarParam = createConjugatePitchCurve(gearA.pitchCurve);
  return createGear(
    conjPolarParam.polarParamaterization,
    gearA.numTeeth,
    gearA.addendum,
    gearA.dedendum,
    conjPolarParam.fidelity,
    conjPolarParam.renderFidelity,
  );
};
