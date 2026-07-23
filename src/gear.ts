import { createBaseCurve, type BaseCurve } from "./baseCurve";
import {
  discretePolarArrayToPolarParameterization,
  discretizePolarParamaterization,
  tangentAtIndexOfVertexArray,
  type PolarParamaterization,
} from "./calc";
import {
  createConjugatePitchCurve,
  createPitchCurve,
  findIndexOfCumulativeLength,
  type PitchCurve,
} from "./pitchCurve";
import { createPolygonalLoop, type PolygonalLoop } from "./polygonalLoop";
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
  normalLine: Line;
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
  fwdFlanks: ToothFlank[];
  bwdFlanks: ToothFlank[];
  // like for pitch curve, the polygonal loops are used for rendering, while the paramaterizations are used for high fidelity geometry computation
  polyAddendum: PolygonalLoop;
  polyDedendum: PolygonalLoop;
  fwdBaseCurve: BaseCurve;
  bwdBaseCurve: BaseCurve;
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
    const curvature = Math.abs(
      pitchCurve.fidelicDiscreteLoop.curvatureAtIndex(i),
    );
    const tang = tangentAtIndexOfVertexArray(pitchVertices, i);
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
  numTeeth: number,
  fidelicDiscreteLoop: PolygonalLoop,
): ToothRoot[] => {
  const numToothRoots = numTeeth * 2;
  const cumulativeLengths = fidelicDiscreteLoop.cumulativeLengths;
  const totalLength = fidelicDiscreteLoop.totalLength;
  const toothSpacing = totalLength / numToothRoots;
  const toothRoots: ToothRoot[] = [];
  for (let i = 0; i < numTeeth; i++) {
    const targetLength = i * toothSpacing;
    const targetIndex =
      fidelicDiscreteLoop.findIndexOfCumulativeLength(targetLength);
    const toothRootVertex = fidelicDiscreteLoop.vertices[targetIndex];
    const tangentVector: Vector2d =
      fidelicDiscreteLoop.tangentAtIndex(targetIndex);
    const normalLine: Line = { v0: toothRootVertex, v1: tangentVector };
    toothRoots.push({
      index: targetIndex,
      vertex: toothRootVertex,
      normalLine,
    });
  }
  return toothRoots;
};

const generateFlankSegments = (
  toothRoots: ToothRoot[],
  pitchCurve: PitchCurve,
  baseCurve: BaseCurve,
  turningDirection: 1 | -1,
): Vector2d[][] => {
  let rootIndices = toothRoots.map((root) => root.index);
  if (turningDirection === 1) rootIndices = rootIndices.reverse();
  const pitchPolars = pitchCurve.fidelicDiscreteLoop.polarVectors;
  const fidelity = pitchPolars.length;
  const pitchVertices = pitchCurve.fidelicDiscreteLoop.vertices;
  const baseVertices = baseCurve.fidelicDiscreteLoop.vertices;
  const flankSegments: Vector2d[][] = [];
  let index = rootIndices.at(-1);
  let baseStartCircum: number;
  const baseLengths = [...baseCurve.fidelicSignedCumulativeLengths];
  let tangentStartLength: number;
  let unwrapLength: number;
  let prevVertex: Vector2d; // = { ...pitchVertices[rootIndices.at(-1)] };
  if (turningDirection === -1)
    baseLengths[0] = baseCurve.fidelicSignedTotalLength;
  for (let n = 0; n < fidelity; n++) {
    index = ((index % fidelity) + fidelity) % fidelity;
    const baseVertex = baseVertices[index];
    const pitchVertex = pitchVertices[index];
    const curvatureSign = baseCurve.curvatureSignMap[index];
    if (index === rootIndices.at(-1)) {
      rootIndices.pop();
      flankSegments.push([]);
      baseStartCircum = baseLengths[index];
      tangentStartLength = distance(pitchVertex, baseVertex);
    } else if (curvatureSign === 0 || rootIndices.length === 0) {
      // the root indices length === 0 condition i have no idea why but it fixes things lol
      baseStartCircum = baseLengths[index];
      tangentStartLength = distance(prevVertex, baseVertex);
    }
    const tangentVector = sub(pitchVertex, baseVertex);
    unwrapLength = tangentStartLength + (baseLengths[index] - baseStartCircum);
    const unwrappedTangentVector = setMagnitude(tangentVector, unwrapLength);
    const vertex = add(baseVertex, unwrappedTangentVector);
    flankSegments[flankSegments.length - 1].push(vertex);
    prevVertex = vertex;
    index += turningDirection;
  }
  return flankSegments;
};

const generateToothFlanks = (
  toothRoots: ToothRoot[],
  pitchCurve: PitchCurve,
  fwdBaseCurve: BaseCurve,
  bwdBaseCurve: BaseCurve,
): { fwdFlanks: ToothFlank[]; bwdFlanks: ToothFlank[] } => {
  const fwdRoots = toothRoots.filter((_, i) => i % 2 == 0);
  const bwdRoots = toothRoots.filter((_, i) => i % 2 == 1);
  const fwdFlankTips = generateFlankSegments(
    fwdRoots,
    pitchCurve,
    fwdBaseCurve,
    1,
  );
  const fwdFlankBases = generateFlankSegments(
    fwdRoots,
    pitchCurve,
    fwdBaseCurve,
    -1,
  );
  const bwdFlankTips = generateFlankSegments(
    bwdRoots,
    pitchCurve,
    bwdBaseCurve,
    1,
  );
  const bwdFlankBases = generateFlankSegments(
    bwdRoots,
    pitchCurve,
    bwdBaseCurve,
    -1,
  );
  const fwdFlanks = fwdRoots.map((root, index): ToothFlank => {
    return { tip: fwdFlankTips[index], base: fwdFlankBases[index], root };
  });
  const bwdFlanks = bwdRoots.map((root, index): ToothFlank => {
    return { tip: bwdFlankTips[index], base: bwdFlankBases[index], root };
  });
  return { fwdFlanks, bwdFlanks };
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
  /*
  const toothRoots = generateToothRoots(
    numTeeth,
    pitchCurve.totalLength,
    pitchCurve.cumulativeLengths,
    pitchCurve.polarParamaterization,
  );*/
  const toothRoots = generateToothRoots(
    numTeeth,
    pitchCurve.fidelicDiscreteLoop,
  );
  const fwdBaseCurve = createBaseCurve(
    pitchCurve,
    (pressureAngle * Math.PI) / 180,
  );
  const bwdBaseCurve = createBaseCurve(
    pitchCurve,
    -(pressureAngle * Math.PI) / 180,
  );
  //const toothFlanks = generateForwardFlanks(toothRoots, pitchCurve, baseCurve);
  const toothFlanks = generateToothFlanks(
    toothRoots,
    pitchCurve,
    fwdBaseCurve,
    bwdBaseCurve,
  );
  const { fwdFlanks, bwdFlanks } = toothFlanks;
  return {
    pitchCurve,
    fwdBaseCurve,
    bwdBaseCurve,
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
    fwdFlanks,
    bwdFlanks,
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
